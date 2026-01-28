import express from "express";
import { verifyFirebaseToken } from "../middleware/auth.middleware.js";
import { generateFeed, getFeedUsage } from "../controllers/feed.controller.js";

const router = express.Router();

/**
 * MORIESLY FEED ENDPOINTS
 * Endpoints untuk generate dan manage Moriesly Feed (Intelligence News)
 */

/**
 * @route   POST /api/feed/generate
 * @desc    Generate feed articles using Gemini 2.5 Flash
 * @access  Private
 * @body    { recentHistory?: Array, count?: number }
 * @frontend IntelFeed component
 */
router.post("/generate", verifyFirebaseToken, generateFeed);

/**
 * @route   GET /api/feed/usage
 * @desc    Get current feed generation usage for today
 * @access  Private
 * @frontend IntelFeed component (untuk show remaining limit)
 */
router.get("/usage", verifyFirebaseToken, getFeedUsage);

export default router;
