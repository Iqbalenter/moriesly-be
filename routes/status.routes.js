import express from "express";
import { verifyFirebaseToken } from "../middleware/auth.middleware.js";
import {
  getStatusDataController,
  getCurrentGoalController,
  updateGoalProgressController,
  getWeightList,
  getLedgerRangeController,
} from "../controllers/user.controller.js";

const router = express.Router();

/**
 * STATUS PAGE ENDPOINTS
 * Halaman Status: Overview lengkap status kesehatan, goal progress, weight tracking
 */

/**
 * @route   GET /api/status
 * @desc    Get complete status data (profile, ledger, goal, weight history)
 * @access  Private
 * @frontend Status - Main status overview
 */
router.get("/", verifyFirebaseToken, getStatusDataController);

/**
 * @route   GET /api/status/goal
 * @desc    Get current goal and progress
 * @access  Private
 * @frontend Status - Goal progress section
 */
router.get("/goal", verifyFirebaseToken, getCurrentGoalController);

/**
 * @route   PUT /api/status/goal/progress
 * @desc    Update goal progress
 * @access  Private
 * @frontend Status - Update goal progress manually
 */
router.put("/goal/progress", verifyFirebaseToken, updateGoalProgressController);

/**
 * @route   GET /api/status/weight-history
 * @desc    Get weight history (query: limit)
 * @access  Private
 * @frontend Status - Weight chart/graph
 */
router.get("/weight-history", verifyFirebaseToken, getWeightList);

/**
 * @route   GET /api/status/ledger-range
 * @desc    Get ledger data for date range (query: startDate, endDate)
 * @access  Private
 * @frontend Status - Historical data comparison
 */
router.get("/ledger-range", verifyFirebaseToken, getLedgerRangeController);

export default router;
