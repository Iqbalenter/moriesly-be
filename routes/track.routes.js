import express from "express";
import { verifyFirebaseToken } from "../middleware/auth.middleware.js";
import {
  getWeightList,
  addWeight,
  getHistoryList,
  getHistoryByActionController,
  addHistory,
  deleteHistory,
} from "../controllers/user.controller.js";
import { getStatistics, getLogsByDateRange } from "../controllers/foodlog.controller.js";

const router = express.Router();

/**
 * TRACK PAGE ENDPOINTS
 * Halaman Track: Weight tracking, activity history, food logs statistics
 */

/**
 * @route   GET /api/track/weight
 * @desc    Get weight history with tracking data (query: limit)
 * @access  Private
 * @frontend Track - Weight tracking chart/timeline
 */
router.get("/weight", verifyFirebaseToken, getWeightList);

/**
 * @route   POST /api/track/weight
 * @desc    Add new weight entry
 * @access  Private
 * @frontend Track - Log new weight
 */
router.post("/weight", verifyFirebaseToken, addWeight);

/**
 * @route   GET /api/track/history
 * @desc    Get activity history (query: limit, date)
 * @access  Private
 * @frontend Track - Activity timeline/history
 */
router.get("/history", verifyFirebaseToken, getHistoryList);

/**
 * @route   GET /api/track/history/by-action
 * @desc    Get history filtered by action type (query: action, limit)
 * @access  Private
 * @frontend Track - Filter history by specific action
 */
router.get("/history/by-action", verifyFirebaseToken, getHistoryByActionController);

/**
 * @route   POST /api/track/history
 * @desc    Add new history entry
 * @access  Private
 * @frontend Track - Log manual activity
 */
router.post("/history", verifyFirebaseToken, addHistory);

/**
 * @route   DELETE /api/track/history/:historyId
 * @desc    Delete history entry
 * @access  Private
 * @frontend Track - Remove history item
 */
router.delete("/history/:historyId", verifyFirebaseToken, deleteHistory);

/**
 * @route   GET /api/track/food-statistics
 * @desc    Get food logs statistics
 * @access  Private
 * @frontend Track - Food intake statistics/charts
 */
router.get("/food-statistics", verifyFirebaseToken, getStatistics);

/**
 * @route   GET /api/track/food-logs
 * @desc    Get food logs by date range (query: startDate, endDate)
 * @access  Private
 * @frontend Track - Food logs history
 */
router.get("/food-logs", verifyFirebaseToken, getLogsByDateRange);

export default router;
