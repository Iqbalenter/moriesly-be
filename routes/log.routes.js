import express from "express";
import { verifyFirebaseToken } from "../middleware/auth.middleware.js";
import {
  getHistoryList,
  getHistoryByActionController,
  addHistory,
  deleteHistory,
  getLedgerRangeController,
  getLedger,
} from "../controllers/user.controller.js";
import {
  getLogsByDateRange,
  getTodayLogs,
  getStatistics,
  addFoodLog,
  removeLog,
} from "../controllers/foodlog.controller.js";

const router = express.Router();

/**
 * LOG PAGE ENDPOINTS
 * Halaman Log: Activity history, food logs, ledger history
 */

/**
 * @route   GET /api/log/activity
 * @desc    Get activity history/logs (query: limit, date)
 * @access  Private
 * @frontend Log - Activity timeline
 */
router.get("/activity", verifyFirebaseToken, getHistoryList);

/**
 * @route   GET /api/log/activity/by-action
 * @desc    Get activity filtered by action type (query: action, limit)
 * @access  Private
 * @frontend Log - Filter logs by action type
 */
router.get("/activity/by-action", verifyFirebaseToken, getHistoryByActionController);

/**
 * @route   POST /api/log/activity
 * @desc    Add manual activity log entry
 * @access  Private
 * @body    { action: string, description: string, metadata?: object }
 * @frontend Log - Manual log entry
 */
router.post("/activity", verifyFirebaseToken, addHistory);

/**
 * @route   DELETE /api/log/activity/:historyId
 * @desc    Delete activity log entry
 * @access  Private
 * @frontend Log - Remove log entry
 */
router.delete("/activity/:historyId", verifyFirebaseToken, deleteHistory);

/**
 * @route   GET /api/log/food
 * @desc    Get food logs by date range (query: startDate, endDate)
 * @access  Private
 * @frontend Log - Food intake history
 */
router.get("/food", verifyFirebaseToken, getLogsByDateRange);

/**
 * @route   GET /api/log/food/today
 * @desc    Get today's food logs
 * @access  Private
 * @frontend Log - Today's food intake
 */
router.get("/food/today", verifyFirebaseToken, getTodayLogs);

/**
 * @route   POST /api/log/food
 * @desc    Add food log entry
 * @access  Private
 * @body    { foodName: string, calories: number, nutrients: object }
 * @frontend Log - Add food entry
 */
router.post("/food", verifyFirebaseToken, addFoodLog);

/**
 * @route   DELETE /api/log/food/:logId
 * @desc    Remove food log entry
 * @access  Private
 * @frontend Log - Delete food log
 */
router.delete("/food/:logId", verifyFirebaseToken, removeLog);

/**
 * @route   GET /api/log/food/statistics
 * @desc    Get food intake statistics
 * @access  Private
 * @frontend Log - Food statistics/charts
 */
router.get("/food/statistics", verifyFirebaseToken, getStatistics);

/**
 * @route   GET /api/log/ledger/:date
 * @desc    Get daily ledger by specific date (YYYY-MM-DD)
 * @access  Private
 * @frontend Log - Daily ledger view
 */
router.get("/ledger/:date", verifyFirebaseToken, getLedger);

/**
 * @route   GET /api/log/ledger/range
 * @desc    Get ledger for date range (query: startDate, endDate)
 * @access  Private
 * @frontend Log - Ledger history/comparison
 */
router.get("/ledger/range", verifyFirebaseToken, getLedgerRangeController);

export default router;
