import aiService from "../service/ai.service.js";
import { getUserProfile } from "../service/user.service.js";
import {
  createFoodLog,
  getTodaySugarTotal,
} from "../service/foodlog.service.js";
import { parseLogEntry } from "../utils/calculator.js";
import chatSessionService from "../service/chatSession.service.js";

/**
 * Chat dengan Moriesly AI
 * POST /api/chat/message
 */
export const sendMessage = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { message, context, conversationHistory, sessionId, imageBase64 } =
      req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Pesan tidak boleh kosong",
      });
    }

    // Get user profile
    const profile = await getUserProfile(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error:
          "Profil pengguna tidak ditemukan. Silakan lengkapi profil terlebih dahulu.",
      });
    }

    // Validate conversationHistory format if provided
    if (conversationHistory && !Array.isArray(conversationHistory)) {
      return res.status(400).json({
        success: false,
        error: "Format riwayat percakapan tidak valid",
      });
    }

    // Chat with AI (with optional image)
    const response = await aiService.chatWithUser(
      userId,
      profile,
      message.trim(),
      conversationHistory || [],
      imageBase64,
    );

    if (!response || !response.text) {
      throw new Error("Respons AI kosong atau tidak valid");
    }

    // Parse LOG_ENTRY if exists
    const logEntry = parseLogEntry(response.text);

    let savedLog = null;
    if (logEntry) {
      try {
        // Save to food log
        savedLog = await createFoodLog(userId, logEntry);
      } catch (logError) {
        console.error("Error saving food log:", logError);
        // Don't fail the whole request if log saving fails
      }
    }

    // Get today's total sugar
    const todayTotal = await getTodaySugarTotal(userId);

    // ==========================================
    // AUTO-SAVE CHAT SESSION
    // ==========================================
    let currentSessionId = sessionId;
    let sessionTitle = null;

    try {
      const newMessages = [
        { role: "user", text: message.trim() },
        { role: "model", text: response.text },
      ];

      if (currentSessionId) {
        // Update existing session
        const session = await chatSessionService.getChatSessionById(
          currentSessionId,
          userId,
        );

        if (session) {
          const updatedMessages = [...(session.messages || []), ...newMessages];
          await chatSessionService.updateChatSession(currentSessionId, userId, {
            messages: updatedMessages,
          });
          sessionTitle = session.title;
        } else {
          // Session ID provided but not found, create new
          console.warn(
            `Session ${currentSessionId} not found, creating new one`,
          );
          currentSessionId = null; // Reset to trigger creation
        }
      }

      if (!currentSessionId) {
        // Create new session
        const session = await chatSessionService.createChatSession(userId, {
          messages: newMessages,
          title: "New Chat",
        });
        currentSessionId = session.id;

        // Auto-generate title for new session
        try {
          const newTitle = await aiService.generateChatTitle(
            message.trim(),
            response.text,
          );
          await chatSessionService.updateChatSession(currentSessionId, userId, {
            title: newTitle,
          });
          sessionTitle = newTitle;
        } catch (titleError) {
          console.error("Error generating title:", titleError);
          sessionTitle = "New Chat";
        }
      }
    } catch (sessionError) {
      console.error("Error auto-saving chat session:", sessionError);
      // Don't fail the request if saving fails, just log it
    }

    res.json({
      success: true,
      data: {
        message: response.text.replace(/\[\[LOG_ENTRY.*?\]\]/, "").trim(), // Remove tag from displayed text
        dailyLimit: response.dailyLimit,
        todayTotal: todayTotal,
        remaining: Math.max(0, response.dailyLimit - todayTotal),
        logEntry: savedLog,
        profile: response.profile,
        context: context || "general",
        sessionId: currentSessionId,
        sessionTitle: sessionTitle,
      },
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);

    // Handle specific errors
    if (error.message?.includes("quota") || error.message?.includes("limit")) {
      return res.status(429).json({
        success: false,
        error: "Batas penggunaan AI tercapai. Coba lagi nanti ya! 🙏",
      });
    }

    if (error.message?.includes("API key")) {
      return res.status(500).json({
        success: false,
        error: "Konfigurasi AI bermasalah. Hubungi admin! 🔧",
      });
    }

    next(error);
  }
};

/**
 * Get today's summary
 * GET /api/chat/summary
 */
export const getTodaySummary = async (req, res, next) => {
  try {
    const userId = req.user.uid;

    const profile = await getUserProfile(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error:
          "Profil pengguna tidak ditemukan. Silakan lengkapi profil terlebih dahulu.",
      });
    }

    const { calculateDailySugarLimit } = await import("../utils/calculator.js");
    const dailyLimit = calculateDailySugarLimit(profile);
    const todayTotal = await getTodaySugarTotal(userId);

    const percentage = ((todayTotal / dailyLimit) * 100).toFixed(1);

    res.json({
      success: true,
      data: {
        dailyLimit: dailyLimit,
        todayTotal: todayTotal,
        remaining: Math.max(0, dailyLimit - todayTotal),
        percentage: percentage,
        status:
          todayTotal > dailyLimit
            ? "exceeded"
            : todayTotal > dailyLimit * 0.8
              ? "warning"
              : "good",
        profile: {
          name: profile.name,
          gender: profile.gender,
          age: profile.age,
          weight: profile.weight,
          height: profile.height,
        },
      },
    });
  } catch (error) {
    console.error("Error in getTodaySummary:", error);
    next(error);
  }
};

/**
 * Create new chat session
 * POST /api/chat/sessions
 */
export const createChatSession = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { title, messages } = req.body;

    const session = await chatSessionService.createChatSession(userId, {
      title,
      messages: messages || [],
    });

    res.json({
      success: true,
      data: session,
      message: "Chat session created successfully",
    });
  } catch (error) {
    console.error("Error in createChatSession:", error);
    next(error);
  }
};

/**
 * Get all user's chat sessions
 * GET /api/chat/sessions
 */
export const getChatSessions = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { limit: limitCount, includeInactive } = req.query;

    const options = {};
    if (limitCount) options.limitCount = parseInt(limitCount);
    if (includeInactive === "true") options.includeInactive = true;

    const sessions = await chatSessionService.getChatSessionsByUserId(
      userId,
      options,
    );

    res.json({
      success: true,
      data: sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error("Error in getChatSessions:", error);
    next(error);
  }
};

/**
 * Get specific chat session by ID
 * GET /api/chat/sessions/:sessionId
 */
export const getChatSessionById = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { sessionId } = req.params;

    const session = await chatSessionService.getChatSessionById(
      sessionId,
      userId,
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Chat session tidak ditemukan atau Anda tidak memiliki akses",
      });
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error("Error in getChatSessionById:", error);
    next(error);
  }
};

/**
 * Update chat session (save messages)
 * PUT /api/chat/sessions/:sessionId
 */
export const updateChatSession = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { sessionId } = req.params;
    const { messages, title } = req.body;

    const updates = {};
    if (messages) updates.messages = messages;
    if (title) updates.title = title;

    const updatedSession = await chatSessionService.updateChatSession(
      sessionId,
      userId,
      updates,
    );

    res.json({
      success: true,
      data: updatedSession,
      message: "Chat session updated successfully",
    });
  } catch (error) {
    console.error("Error in updateChatSession:", error);

    if (
      error.message?.includes("not found") ||
      error.message?.includes("access denied")
    ) {
      return res.status(404).json({
        success: false,
        error: "Chat session tidak ditemukan atau Anda tidak memiliki akses",
      });
    }

    next(error);
  }
};

/**
 * Delete chat session
 * DELETE /api/chat/sessions/:sessionId
 */
export const deleteChatSession = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { sessionId } = req.params;
    const { hardDelete } = req.query;

    await chatSessionService.deleteChatSession(
      sessionId,
      userId,
      hardDelete === "true",
    );

    res.json({
      success: true,
      message: "Chat session deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteChatSession:", error);

    if (
      error.message?.includes("not found") ||
      error.message?.includes("access denied")
    ) {
      return res.status(404).json({
        success: false,
        error: "Chat session tidak ditemukan atau Anda tidak memiliki akses",
      });
    }

    next(error);
  }
};

/**
 * Generate chat title using Dual Call Strategy
 * POST /api/chat/sessions/:sessionId/generate-title
 */
export const generateChatTitle = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { sessionId } = req.params;
    const { userMessage, aiResponse } = req.body;

    // Validate input
    if (!userMessage || !aiResponse) {
      return res.status(400).json({
        success: false,
        error: "userMessage dan aiResponse diperlukan",
      });
    }

    // Verify session ownership
    const session = await chatSessionService.getChatSessionById(
      sessionId,
      userId,
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Chat session tidak ditemukan atau Anda tidak memiliki akses",
      });
    }

    // Generate title using AI
    const title = await aiService.generateChatTitle(userMessage, aiResponse);

    // Update session with new title
    const updatedSession = await chatSessionService.updateChatSession(
      sessionId,
      userId,
      { title },
    );

    res.json({
      success: true,
      data: {
        title,
        sessionId,
      },
      message: "Chat title generated successfully",
    });
  } catch (error) {
    console.error("Error in generateChatTitle:", error);

    if (
      error.message?.includes("not found") ||
      error.message?.includes("access denied")
    ) {
      return res.status(404).json({
        success: false,
        error: "Chat session tidak ditemukan atau Anda tidak memiliki akses",
      });
    }

    next(error);
  }
};
