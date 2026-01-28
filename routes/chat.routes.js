import express from "express";
import {
  sendMessage,
  getTodaySummary,
  createChatSession,
  getChatSessions,
  getChatSessionById,
  deleteChatSession,
  updateChatSession,
  generateChatTitle,
} from "../controllers/chat.controller.js";
import { verifyFirebaseToken } from "../middleware/auth.middleware.js";
import {
  requirePermission,
  requireLimit,
} from "../middleware/permission.middleware.js";
import { getTodayChats } from "../service/subscription.service.js";

const router = express.Router();

/**
 * CHAT/VIDEO CALL PAGE ENDPOINTS
 * Halaman Chat: AI conversation, consultation summary
 * Video call menggunakan WebSocket (lihat videocall.routes.js)
 */

/**
 * @route   POST /api/chat/message
 * @desc    Send message to AI assistant
 * @access  Private (requires canAIChat permission + daily limit)
 * @body    { message: string, context?: string }
 * @frontend Chat - Send chat message
 */
router.post(
  "/message",
  verifyFirebaseToken,
  requirePermission("canAIChat"),
  requireLimit("maxChatMessagesPerDay", getTodayChats),
  sendMessage,
);

/**
 * @route   GET /api/chat/summary
 * @desc    Get today's conversation summary
 * @access  Private
 * @frontend Chat - Display daily chat summary/insights
 */
router.get("/summary", verifyFirebaseToken, getTodaySummary);

/**
 * @route   POST /api/chat/sessions
 * @desc    Create new chat session
 * @access  Private
 * @body    { title?: string, messages?: [] }
 * @frontend Chat - Create new chat button
 */
router.post("/sessions", verifyFirebaseToken, createChatSession);

/**
 * @route   GET /api/chat/sessions
 * @desc    Get all user's chat sessions
 * @access  Private
 * @frontend Chat - List previous chats
 */
router.get("/sessions", verifyFirebaseToken, getChatSessions);

/**
 * @route   GET /api/chat/sessions/:sessionId
 * @desc    Get specific chat session
 * @access  Private
 * @frontend Chat - Load previous chat
 */
router.get("/sessions/:sessionId", verifyFirebaseToken, getChatSessionById);

/**
 * @route   PUT /api/chat/sessions/:sessionId
 * @desc    Update chat session (save messages)
 * @access  Private
 * @body    { messages: [], title?: string }
 * @frontend Chat - Auto-save conversation
 */
router.put("/sessions/:sessionId", verifyFirebaseToken, updateChatSession);

/**
 * @route   DELETE /api/chat/sessions/:sessionId
 * @desc    Delete chat session
 * @access  Private
 * @frontend Chat - Delete chat button
 */
router.delete("/sessions/:sessionId", verifyFirebaseToken, deleteChatSession);

/**
 * @route   POST /api/chat/sessions/:sessionId/generate-title
 * @desc    Generate chat title using Dual Call Strategy
 * @access  Private (requires canAIChat permission)
 * @body    { userMessage: string, aiResponse: string }
 * @frontend Chat - Auto-generate title after first AI response
 */
router.post(
  "/sessions/:sessionId/generate-title",
  verifyFirebaseToken,
  requirePermission("canAIChat"),
  generateChatTitle,
);

export default router;
