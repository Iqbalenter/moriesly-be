import videoCallService from "../service/videocall.service.js";
import geminiLiveService from "../service/gemini-live.service.js";
import { auth } from "../config/firebase.config.js";
import { getUserProfile } from "../service/user.service.js";
import { getUserPermissions } from "../utils/role.config.js";
import { checkVideoCallLimit } from "../service/videocall-usage.service.js";

/**
 * Setup WebSocket event handlers for video call
 * @param {object} io - Socket.io instance
 */
export function setupVideoCallHandlers(io) {
  // Middleware untuk authenticate socket connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      // Verify Firebase token
      const decodedToken = await auth.verifyIdToken(token);

      // Attach user info to socket
      socket.userId = decodedToken.uid;
      socket.userEmail = decodedToken.email;

      console.log(`✅ Socket authenticated for user: ${decodedToken.uid}`);
      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication failed"));
    }
  });

  // Handle new connection
  io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log(`🔌 User connected: ${userId}`);

    // Join user to their own room

    socket.join(userId);
    // Bind Gemini Live socket handlers
    geminiLiveService.bindSocketHandlers(userId, socket);

    // Event: Start video call
    socket.on("video-call:start", async (data) => {
      try {
        console.log(`📞 Starting video call for user ${userId}`);

        // ✅ CHECK PERMISSION FIRST
        const userProfile = await getUserProfile(userId);
        const permissions = getUserPermissions(userProfile);

        if (!permissions.canVideoCall) {
          socket.emit("video-call:error", {
            success: false,
            error: "Video call requires Pro Plan or Pro Max Plan subscription",
            code: "PERMISSION_DENIED",
            currentRole: userProfile.role,
            upgradeRequired: true,
          });
          return;
        }

        // ✅ CHECK MONTHLY LIMIT
        const limitCheck = await checkVideoCallLimit(userId, permissions);
        if (!limitCheck.allowed) {
          socket.emit("video-call:error", {
            success: false,
            error: `Monthly video call limit reached (${limitCheck.used}/${limitCheck.limit} minutes used)`,
            code: "LIMIT_EXCEEDED",
            currentUsage: limitCheck.used,
            limit: limitCheck.limit,
            remaining: 0,
            currentRole: userProfile.role,
            upgradeRequired: true,
          });
          return;
        }

        // ✅ START SESSION
        const result = await videoCallService.startSession(userId, io, socket);

        socket.emit("video-call:started", {
          success: true,
          data: {
            ...result,
            usage: {
              used: limitCheck.used,
              limit: limitCheck.limit,
              remaining: limitCheck.remaining,
            },
          },
        });
      } catch (error) {
        console.error("Error starting video call:", error);
        socket.emit("video-call:error", {
          success: false,
          error: error.message,
        });
      }
    });

    // Event: Send text message
    socket.on("video-call:text-message", async (data) => {
      try {
        const { message } = data;

        if (!message) {
          socket.emit("video-call:error", {
            success: false,
            error: "Message is required",
          });
          return;
        }

        console.log(`💬 Text message from ${userId}: ${message}`);

        const result = await videoCallService.processTextMessage(
          userId,
          message,
        );

        socket.emit("video-call:ai-response", {
          success: true,
          data: result,
        });
      } catch (error) {
        console.error("Error processing text message:", error);
        socket.emit("video-call:error", {
          success: false,
          error: error.message,
        });
      }
    });

    // Event: Send video frame for analysis
    socket.on("video-call:video-frame", async (data) => {
      try {
        const { frame, prompt } = data;

        if (!frame) {
          socket.emit("video-call:error", {
            success: false,
            error: "Video frame is required",
          });
          return;
        }

        console.log(`🎥 Video frame received from ${userId}`);

        // Remove data URL prefix if exists
        const base64Frame = frame.replace(/^data:image\/\w+;base64,/, "");

        const result = await videoCallService.processVideoFrame(
          userId,
          base64Frame,
          prompt,
        );

        socket.emit("video-call:frame-analysis", {
          success: true,
          data: result,
        });
      } catch (error) {
        console.error("Error processing video frame:", error);
        socket.emit("video-call:error", {
          success: false,
          error: error.message,
        });
      }
    });

    // Event: Send audio chunk
    socket.on("video-call:audio-chunk", async (data) => {
      try {
        const { audioData } = data;

        if (!audioData) {
          socket.emit("video-call:error", {
            success: false,
            error: "Audio data is required",
          });
          return;
        }

        console.log(`🎤 Audio chunk received from ${userId}`);

        const result = await videoCallService.processAudioChunk(
          userId,
          audioData,
        );

        socket.emit("video-call:audio-processed", {
          success: true,
          data: result,
        });
      } catch (error) {
        console.error("Error processing audio chunk:", error);
        socket.emit("video-call:error", {
          success: false,
          error: error.message,
        });
      }
    });

    // Event: End video call
    socket.on("video-call:end", async () => {
      try {
        console.log(`📞 Ending video call for user ${userId}`);

        const result = await videoCallService.endSession(userId);

        socket.emit("video-call:ended", {
          success: true,
          data: result,
        });
      } catch (error) {
        console.error("Error ending video call:", error);
        socket.emit("video-call:error", {
          success: false,
          error: error.message,
        });
      }
    });

    // Event: Get session info
    socket.on("video-call:get-session", () => {
      try {
        const session = videoCallService.getSession(userId);

        socket.emit("video-call:session-info", {
          success: true,
          data: session,
        });
      } catch (error) {
        console.error("Error getting session info:", error);
        socket.emit("video-call:error", {
          success: false,
          error: error.message,
        });
      }
    });

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`🔌 User disconnected: ${userId}`);

      try {
        // Auto-end video call session on disconnect

        await videoCallService.endSession(userId);

        await geminiLiveService.endLiveSession(userId);
      } catch (error) {
        console.error("Error on disconnect cleanup:", error);
      }
    });
  });

  console.log("✅ Video call WebSocket handlers setup complete");
}

/**
 * REST endpoint to get active sessions (for monitoring)
 */
export const getActiveSessions = async (req, res, next) => {
  try {
    const sessions = videoCallService.getActiveSessions();

    res.json({
      success: true,
      data: {
        count: sessions.length,
        sessions: sessions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * REST endpoint to check if user has active session
 */
export const checkSession = async (req, res, next) => {
  try {
    const userId = req.user.uid;

    const session = videoCallService.getSession(userId);

    res.json({
      success: true,
      data: session || { isActive: false },
    });
  } catch (error) {
    next(error);
  }
};
