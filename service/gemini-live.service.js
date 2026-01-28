/**
 * Gemini Live backend bridge service
 *
 * Purpose:
 * - Open a persistent Live session to Gemini via @google/genai (WebSocket)
 * - Forward AI text/audio outputs to the user's Socket.io connection
 * - Receive user text, audio chunks, and video frames from FE and stream them to Gemini
 *
 * This is a "bridge" only. It does NOT do any audio decode/encode in Node.
 * FE is responsible for capturing mic input, encoding (e.g., PCM 16k), and sending to BE.
 *
 * Socket event contracts (suggested):
 * - Client -> Server:
 *    - 'live:start'               payload: { } (optional: { systemInstruction?: string, voiceName?: string })
 *    - 'live:text'                payload: { text: string }
 *    - 'live:audio-chunk'         payload: { base64: string, sampleRate?: number, mimeType?: string }
 *                                  default mimeType assumed: 'audio/pcm; rate=16000'
 *    - 'live:video-frame'         payload: { base64: string, mimeType?: string } default mimeType: 'image/jpeg'
 *    - 'live:stop'                payload: { }
 *
 * - Server -> Client:
 *    - 'live:opened'              payload: { }
 *    - 'live:user-text'           payload: { text: string }          // Gemini transcribed user speech
 *    - 'live:assistant-text'      payload: { text: string }          // Gemini transcribed assistant speech
 *    - 'live:audio-chunk'         payload: { base64: string, mimeType: string } // Gemini TTS audio (base64)
 *    - 'live:interrupted'         payload: { }
 *    - 'live:error'               payload: { message: string }
 *    - 'live:closed'              payload: { }
 *
 * Usage in controller (example):
 *   import geminiLiveService from '../service/gemini-live.service.js';
 *
 *   io.on('connection', (socket) => {
 *     // ... your auth here ...
 *     const userId = socket.userId;
 *
 *     socket.on('live:start', async (data) => {
 *       await geminiLiveService.startLiveSession(userId, socket, data);
 *     });
 *
 *     socket.on('live:text', async ({ text }) => {
 *       await geminiLiveService.sendText(userId, text);
 *     });
 *
 *     socket.on('live:audio-chunk', async ({ base64, sampleRate, mimeType }) => {
 *       await geminiLiveService.sendAudioChunk(userId, base64, sampleRate, mimeType);
 *     });
 *
 *     socket.on('live:video-frame', async ({ base64, mimeType }) => {
 *       await geminiLiveService.sendVideoFrame(userId, base64, mimeType);
 *     });
 *
 *     socket.on('live:stop', async () => {
 *       await geminiLiveService.endLiveSession(userId);
 *     });
 *
 *     socket.on('disconnect', async () => {
 *       await geminiLiveService.endLiveSession(userId);
 *     });
 *   });
 */

import { ai } from "../config/gemini.config.js";
import { GET_SYSTEM_INSTRUCTION } from "../utils/prompts.js";
import { getUserProfile } from "./user.service.js";
import { calculateDailySugarLimit } from "../utils/calculator.js";

const LIVE_MODEL = "gemini-2.0-flash-exp";
// Default voice for TTS
const DEFAULT_VOICE = "Kore";
// Default audio mime type for incoming PCM chunks from FE
const DEFAULT_PCM_MIMETYPE = "audio/pcm; rate=16000";

class GeminiLiveService {
  constructor() {
    /**
     * Map<userId, LiveSession>
     * LiveSession: {
     *   sessionPromise: Promise<any>,
     *   session: any | null,
     *   socket: import('socket.io').Socket,
     *   createdAt: Date,
     *   isOpen: boolean,
     * }
     */
    this.sessions = new Map();
  }

  /**
   * Start a Live session for a user.
   * Computes systemInstruction using the existing profile/diet helpers unless overridden by payload.systemInstruction.
   *
   * @param {string} userId
   * @param {import('socket.io').Socket} socket
   * @param {{ systemInstruction?: string, voiceName?: string }=} payload
   */
  async startLiveSession(userId, socket, payload = {}) {
    console.log(`🚀 [GeminiLive] Starting live session for user ${userId}...`);

    if (this.sessions.has(userId)) {
      // If there's an existing session, end it before starting a new one to keep things simple
      console.log(
        `⚠️ [GeminiLive] Existing session found for user ${userId}, ending it first`,
      );
      await this.endLiveSession(userId);
    }

    const voiceName = payload.voiceName || DEFAULT_VOICE;
    console.log(`🎤 [GeminiLive] Using voice: ${voiceName}`);

    // Resolve system instruction
    let systemInstruction = payload.systemInstruction;
    if (!systemInstruction) {
      const profile = await getUserProfile(userId);
      if (!profile) {
        throw new Error("User profile not found");
      }
      const dailyLimit = calculateDailySugarLimit(profile);
      systemInstruction = GET_SYSTEM_INSTRUCTION(dailyLimit, profile);
      console.log(
        `📋 [GeminiLive] System instruction prepared (${systemInstruction.length} chars)`,
      );
    }

    // Create a Live session via @google/genai
    console.log(
      `🔌 [GeminiLive] Connecting to Gemini Live API for user ${userId}...`,
    );
    const sessionPromise = ai.live.connect({
      model: LIVE_MODEL,
      config: {
        systemInstruction,
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } },
        },
        // Enable automatic speech-to-text for user input and assistant output
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: async () => {
          const entry = this.sessions.get(userId);
          if (!entry) return;
          entry.isOpen = true;
          console.log(`📡 [GeminiLive] Session opened for user ${userId}`);
          entry.session = await entry.sessionPromise.catch(() => null);

          // Notify client
          socket.emit("live:opened", {});
          console.log(
            `✅ [GeminiLive] 'live:opened' emitted for user ${userId}`,
          );

          // Kickstart greeting with delay and retry
          setTimeout(async () => {
            try {
              const kickoff = '[VIDEO_CALL_STARTED: Please greet the user warmly now as instructed in your system prompt]';
              await entry.session?.sendRealtimeInput({ text: kickoff });
              console.log(`✅ [GeminiLive] Greeting kickoff sent for user ${userId}`);

              // Retry after 3 seconds if still no response
              setTimeout(async () => {
                try {
                  await entry.session?.sendRealtimeInput({ text: '[REMINDER: Please say hello to the user now!]' });
                  console.log(`🔄 [GeminiLive] Greeting retry sent for user ${userId}`);
                } catch (e) {
                  console.warn(`⚠️ [GeminiLive] Greeting retry failed for user ${userId}`);
                }
              }, 3000);
            } catch (e) {
              console.error(
                `❌ [GeminiLive] Greeting kickoff failed for user ${userId}:`,
                e,
              );
            }
          }, 500);
        },

        onmessage: async (message) => {
          try {
            // Forward output transcription (assistant)
            const outText = message?.serverContent?.outputTranscription?.text;
            if (outText) {
              console.log(
                `💬 [GeminiLive] AI transcript for user ${userId}:`,
                outText,
              );
              socket.emit("live:assistant-text", { text: outText });
            }

            // Forward input transcription (user)
            const inText = message?.serverContent?.inputTranscription?.text;
            if (inText) {
              console.log(
                `💬 [GeminiLive] User transcript for user ${userId}:`,
                inText,
              );
              socket.emit("live:user-text", { text: inText });
            }

            // Forward audio chunks (assistant TTS) as base64 to client
            const base64Audio =
              message?.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            const mimeType =
              message?.serverContent?.modelTurn?.parts?.[0]?.inlineData
                ?.mimeType || "audio/wav";
            if (base64Audio) {
              console.log(
                `🔊 [GeminiLive] AI audio chunk for user ${userId} (${base64Audio.length} chars, ${mimeType})`,
              );
              socket.emit("live:audio-chunk", {
                base64: base64Audio,
                mimeType,
              });
            }

            // Interruption signal
            if (message?.serverContent?.interrupted) {
              console.log(
                `⚠️ [GeminiLive] Interruption signal for user ${userId}`,
              );
              socket.emit("live:interrupted", {});
            }

            // Log any other message types for debugging
            if (
              !outText &&
              !inText &&
              !base64Audio &&
              !message?.serverContent?.interrupted
            ) {
              console.log(
                `📨 [GeminiLive] Other message type for user ${userId}:`,
                JSON.stringify(message).substring(0, 200),
              );
            }
          } catch (err) {
            console.error(
              `❌ [GeminiLive] Error processing message for user ${userId}:`,
              err,
            );
            socket.emit("live:error", { message: asErrorMessage(err) });
          }
        },

        onerror: (err) => {
          socket.emit("live:error", { message: asErrorMessage(err) });
        },

        onclose: () => {
          socket.emit("live:closed", {});
          // Clean up entry
          this.sessions.delete(userId);
        },
      },
    });

    // Store session entry
    this.sessions.set(userId, {
      sessionPromise,
      session: null,
      socket,
      createdAt: new Date(),
      isOpen: false,
    });
    console.log(
      `✅ [GeminiLive] Session entry stored in map for user ${userId}`,
    );
    console.log(`📊 [GeminiLive] Total active sessions: ${this.sessions.size}`);
  }

  /**
   * Send a text message to Gemini Live
   * @param {string} userId
   * @param {string} text
   */
  async sendText(userId, text) {
    const entry = this.sessions.get(userId);
    if (!entry) {
      throw new Error("Live session not found. Start the session first.");
    }
    try {
      const session = await entry.sessionPromise;
      session?.sendRealtimeInput({ text });
    } catch (err) {
      throw new Error(`Failed to send text: ${asErrorMessage(err)}`);
    }
  }

  /**
   * Send an audio chunk (PCM base64) to Gemini Live
   * @param {string} userId
   * @param {string} base64Audio - base64-encoded audio bytes
   * @param {number=} sampleRate - optional sample rate hint (e.g., 16000)
   * @param {string=} mimeType - optional mime type, default 'audio/pcm; rate=16000'
   */
  async sendAudioChunk(userId, base64Audio, sampleRate, mimeType) {
    const entry = this.sessions.get(userId);
    if (!entry) {
      // Session not ready yet - silently ignore (audio will start after session opens)
      console.log(
        `⏳ [GeminiLive] Audio chunk received but session not ready yet for user ${userId}`,
      );
      return;
    }

    const resolvedMime =
      mimeType ||
      (sampleRate ? `audio/pcm; rate=${sampleRate}` : DEFAULT_PCM_MIMETYPE);

    try {
      const session = await entry.sessionPromise;
      if (!session) {
        console.log(
          `⏳ [GeminiLive] Session not ready, skipping audio chunk for user ${userId}`,
        );
        return; // Session not ready, skip this chunk
      }

      const buffer = Buffer.from(base64Audio, "base64");
      const chunkSize = buffer.length;

      session?.sendRealtimeInput({
        media: {
          mimeType: resolvedMime,
          data: buffer,
        },
      });

      // Log periodically (every 50 chunks = ~5 seconds at 10 chunks/sec)
      if (!this._audioChunkCount) this._audioChunkCount = {};
      if (!this._audioChunkCount[userId]) this._audioChunkCount[userId] = 0;
      this._audioChunkCount[userId]++;

      if (this._audioChunkCount[userId] % 50 === 1) {
        console.log(
          `🎤 [GeminiLive] Sent ${this._audioChunkCount[userId]} audio chunks to Gemini for user ${userId} (${chunkSize} bytes, ${resolvedMime})`,
        );
      }
    } catch (err) {
      // Non-fatal: just log and continue
      console.warn(
        `❌ [GeminiLive] Failed to send audio chunk for user ${userId}:`,
        asErrorMessage(err),
      );
    }
  }

  /**
   * Send a video frame (base64) to Gemini Live for real-time vision
   * @param {string} userId
   * @param {string} base64Image - base64-encoded image bytes
   * @param {string=} mimeType - default 'image/jpeg'
   */
  async sendVideoFrame(userId, base64Image, mimeType = "image/jpeg") {
    const entry = this.sessions.get(userId);
    if (!entry) {
      // Session not ready yet - silently ignore
      return;
    }

    try {
      const session = await entry.sessionPromise;
      if (!session) return; // Session not ready, skip this frame

      const buffer = Buffer.from(base64Image, "base64");
      session?.sendRealtimeInput({
        media: {
          mimeType,
          data: buffer,
        },
      });
    } catch (err) {
      // Non-fatal: just log and continue
      console.warn(
        `[GeminiLive] Failed to send video frame for user ${userId}:`,
        asErrorMessage(err),
      );
    }
  }

  /**
   * Stop a Live session for a user
   * @param {string} userId
   */
  async endLiveSession(userId) {
    const entry = this.sessions.get(userId);
    if (!entry) {
      return { success: true, message: "No active Live session found" };
    }

    try {
      const session = await entry.sessionPromise.catch(() => null);
      if (session && typeof session.close === "function") {
        await session.close();
      } else if (session && typeof session.end === "function") {
        await session.end();
      }
    } catch (err) {
      // Log and continue cleanup
      console.error("Error closing Live session:", err);
    } finally {
      this.sessions.delete(userId);
    }

    return { success: true, message: "Live session ended" };
  }

  /**
   * Get session info for monitoring
   * @param {string} userId
   */
  getLiveSession(userId) {
    const entry = this.sessions.get(userId);
    if (!entry) return null;
    return {
      isActive: true,
      isOpen: entry.isOpen,
      createdAt: entry.createdAt,
    };
  }

  /**
   * Register socket handlers for a single socket
   * This helper is optional. You can wire events in your controller manually.
   *
   * @param {string} userId
   * @param {import('socket.io').Socket} socket
   */
  bindSocketHandlers(userId, socket) {
    socket.on("live:start", async (payload = {}) => {
      console.log(
        `📡 [GeminiLive] Received 'live:start' event for user ${userId}`,
      );
      try {
        await this.startLiveSession(userId, socket, payload);
        console.log(
          `✅ [GeminiLive] startLiveSession completed for user ${userId}`,
        );
      } catch (err) {
        console.error(
          `❌ [GeminiLive] startLiveSession failed for user ${userId}:`,
          err,
        );
        socket.emit("live:error", { message: asErrorMessage(err) });
      }
    });

    socket.on("live:text", async ({ text }) => {
      if (!text) return;
      try {
        await this.sendText(userId, text);
      } catch (err) {
        socket.emit("live:error", { message: asErrorMessage(err) });
      }
    });

    socket.on("live:audio-chunk", async ({ base64, sampleRate, mimeType }) => {
      if (!base64) return;
      try {
        await this.sendAudioChunk(userId, base64, sampleRate, mimeType);
      } catch (err) {
        socket.emit("live:error", { message: asErrorMessage(err) });
      }
    });

    socket.on("live:video-frame", async ({ base64, mimeType }) => {
      if (!base64) return;
      try {
        await this.sendVideoFrame(userId, base64, mimeType);
      } catch (err) {
        socket.emit("live:error", { message: asErrorMessage(err) });
      }
    });

    socket.on("live:stop", async () => {
      try {
        await this.endLiveSession(userId);
      } catch (err) {
        socket.emit("live:error", { message: asErrorMessage(err) });
      }
    });
  }
}

function asErrorMessage(err) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err.message) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export default new GeminiLiveService();
