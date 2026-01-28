import { GoogleGenerativeAI } from "@google/generative-ai";
import { getUserProfile } from "./user.service.js";
import { calculateDailySugarLimit } from "../utils/calculator.js";
import { GET_SYSTEM_INSTRUCTION } from "../utils/prompts.js";
import { createFoodLog } from "./foodlog.service.js";
import { parseLogEntry } from "../utils/calculator.js";
import { trackVideoCallDuration } from "./videocall-usage.service.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Model configuration for Live API
const MODEL_NAME = "gemini-2.0-flash-exp";
const GENERATION_CONFIG = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
};

class VideoCallService {
  constructor() {
    this.activeSessions = new Map(); // userId -> session data
  }

  /**
   * Start video call session
   * @param {string} userId - User ID
   * @param {object} io - Socket.io instance
   * @param {object} socket - Socket connection
   */
  async startSession(userId, io, socket) {
    try {
      // Get user profile
      const profile = await getUserProfile(userId);
      if (!profile) {
        throw new Error("User profile not found");
      }

      // Calculate daily sugar limit
      const dailyLimit = calculateDailySugarLimit(profile);

      // Get system instruction
      const systemInstruction = GET_SYSTEM_INSTRUCTION(dailyLimit, profile);

      // Initialize Gemini model
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: systemInstruction,
      });

      // Start chat session
      const chat = model.startChat({
        generationConfig: GENERATION_CONFIG,
        history: [],
      });

      // Store session
      this.activeSessions.set(userId, {
        chat: chat,
        profile: profile,
        dailyLimit: dailyLimit,
        startTime: new Date(),
        conversationHistory: [],
        socket: socket,
      });

      console.log(`✅ Video call session started for user ${userId}`);

      // Send initial greeting (VIDEO_CALL_STARTED protocol)
      await this.sendInitialGreeting(userId);

      return {
        success: true,
        message: "Video call session started",
        dailyLimit: dailyLimit,
        profile: {
          name: profile.name,
          gender: profile.gender,
          age: profile.age,
        },
      };
    } catch (error) {
      console.error("Error starting video call session:", error);
      throw error;
    }
  }

  /**
   * Send initial greeting when video call starts
   * Implements VIDEO_CALL_STARTED greeting protocol
   */
  async sendInitialGreeting(userId) {
    try {
      const session = this.activeSessions.get(userId);
      if (!session) {
        throw new Error("Session not found");
      }

      const greetingMessage = `[VIDEO_CALL_STARTED: Please greet the user now as instructed in your system prompt]`;

      // Send to Gemini
      const result = await session.chat.sendMessage(greetingMessage);
      const response = result.response;
      const text = response.text();

      // Parse LOG_ENTRY if exists
      const logEntry = parseLogEntry(text);
      if (logEntry) {
        await createFoodLog(userId, logEntry);
      }

      // Remove LOG_ENTRY tag from displayed text
      const cleanText = text.replace(/\[\[LOG_ENTRY.*?\]\]/, "").trim();

      // Add to conversation history
      session.conversationHistory.push({
        role: "user",
        content: greetingMessage,
        timestamp: new Date(),
      });
      session.conversationHistory.push({
        role: "assistant",
        content: cleanText,
        timestamp: new Date(),
      });

      // Send greeting to client via WebSocket
      session.socket.emit("ai-message", {
        type: "greeting",
        text: cleanText,
        timestamp: new Date().toISOString(),
      });

      console.log(`✨ Initial greeting sent to user ${userId}`);
    } catch (error) {
      console.error("Error sending initial greeting:", error);
      throw error;
    }
  }

  /**
   * Process text message during video call
   * @param {string} userId - User ID
   * @param {string} message - User message
   */
  async processTextMessage(userId, message) {
    try {
      const session = this.activeSessions.get(userId);
      if (!session) {
        throw new Error("Session not found. Please start a video call first.");
      }

      // Send message to Gemini
      const result = await session.chat.sendMessage(message);
      const response = result.response;
      const text = response.text();

      // Parse LOG_ENTRY if exists
      const logEntry = parseLogEntry(text);
      if (logEntry) {
        await createFoodLog(userId, logEntry);
      }

      // Remove LOG_ENTRY tag from displayed text
      const cleanText = text.replace(/\[\[LOG_ENTRY.*?\]\]/, "").trim();

      // Add to conversation history
      session.conversationHistory.push({
        role: "user",
        content: message,
        timestamp: new Date(),
      });
      session.conversationHistory.push({
        role: "assistant",
        content: cleanText,
        timestamp: new Date(),
      });

      return {
        text: cleanText,
        logEntry: logEntry,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error processing text message:", error);
      throw error;
    }
  }

  /**
   * Process video frame during video call
   * @param {string} userId - User ID
   * @param {string} base64Image - Base64 encoded image frame
   * @param {string} prompt - Optional prompt to analyze the frame
   */
  async processVideoFrame(userId, base64Image, prompt = null) {
    try {
      const session = this.activeSessions.get(userId);
      if (!session) {
        throw new Error("Session not found. Please start a video call first.");
      }

      // Default prompt if not provided
      const analysisPrompt =
        prompt ||
        "What food or drink do you see in this image? Analyze it briefly and mention the sugar content if relevant.";

      // Create message parts with image
      const messageParts = [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
        { text: analysisPrompt },
      ];

      // Send to Gemini
      const result = await session.chat.sendMessage(messageParts);
      const response = result.response;
      const text = response.text();

      // Parse LOG_ENTRY if exists
      const logEntry = parseLogEntry(text);
      if (logEntry) {
        await createFoodLog(userId, logEntry);
      }

      // Remove LOG_ENTRY tag from displayed text
      const cleanText = text.replace(/\[\[LOG_ENTRY.*?\]\]/, "").trim();

      // Add to conversation history
      session.conversationHistory.push({
        role: "user",
        content: "[Video Frame Analyzed]",
        timestamp: new Date(),
      });
      session.conversationHistory.push({
        role: "assistant",
        content: cleanText,
        timestamp: new Date(),
      });

      return {
        text: cleanText,
        logEntry: logEntry,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error processing video frame:", error);
      throw error;
    }
  }

  /**
   * Process audio chunk (for future implementation with native audio API)
   * Currently returns a placeholder
   */
  async processAudioChunk(userId, audioData) {
    try {
      const session = this.activeSessions.get(userId);
      if (!session) {
        throw new Error("Session not found");
      }

      // Note: Gemini 2.0 Flash Exp doesn't support direct audio streaming yet
      // This is a placeholder for future implementation
      console.log(
        `📢 Audio chunk received from user ${userId} (${audioData.length} bytes)`,
      );

      return {
        success: true,
        message:
          "Audio processing not yet supported. Please use text or video.",
      };
    } catch (error) {
      console.error("Error processing audio chunk:", error);
      throw error;
    }
  }

  /**
   * End video call session
   * @param {string} userId - User ID
   */
  async endSession(userId) {
    try {
      const session = this.activeSessions.get(userId);
      if (!session) {
        return {
          success: true,
          message: "No active session found",
        };
      }

      // Calculate session duration
      const endTime = new Date();
      const durationSeconds = Math.round((endTime - session.startTime) / 1000);
      const durationMinutes = Math.ceil(durationSeconds / 60);

      // ✅ TRACK VIDEO CALL DURATION
      let usageTracked = false;
      try {
        await trackVideoCallDuration(userId, durationMinutes);
        usageTracked = true;
        console.log(`✅ Tracked ${durationMinutes} minutes for user ${userId}`);
      } catch (trackError) {
        console.error("Error tracking video call duration:", trackError);
        // Don't fail the session end if tracking fails
      }

      // Get session summary
      const summary = {
        duration: durationSeconds,
        durationMinutes: durationMinutes,
        messageCount: session.conversationHistory.length,
        startTime: session.startTime,
        endTime: endTime,
        usageTracked: usageTracked,
      };

      // Remove session
      this.activeSessions.delete(userId);

      console.log(
        `✅ Video call session ended for user ${userId} (${durationSeconds}s / ${durationMinutes}min)`,
      );

      return {
        success: true,
        message: "Video call session ended",
        summary: summary,
      };
    } catch (error) {
      console.error("Error ending video call session:", error);
      throw error;
    }
  }

  /**
   * Get active session info
   * @param {string} userId - User ID
   */
  getSession(userId) {
    const session = this.activeSessions.get(userId);
    if (!session) {
      return null;
    }

    return {
      isActive: true,
      startTime: session.startTime,
      profile: session.profile,
      dailyLimit: session.dailyLimit,
      messageCount: session.conversationHistory.length,
    };
  }

  /**
   * Get all active sessions (for monitoring)
   */
  getActiveSessions() {
    return Array.from(this.activeSessions.keys());
  }
}

export default new VideoCallService();
