import express from "express";
import { verifyFirebaseToken } from "../middleware/auth.middleware.js";
import {
  getCurrentUser,
  checkIn,
  getLedger,
  getHistoryList,
  getCurrentGoalController,
  getStatusDataController,
} from "../controllers/user.controller.js";
import { getTodayLogs } from "../controllers/foodlog.controller.js";
import { scanFood } from "../controllers/scan.controller.js";
import { uploadSingle, convertToBase64 } from "../middleware/upload.middleware.js";

const router = express.Router();

/**
 * HOME PAGE ENDPOINTS
 * Halaman Home berisi: Current Rank, Daily Checkin, Today Intake, Status,
 * Intel, Psych-Ops Profile, Future Projection, Scan Food, Align Target,
 * Analysis Ledger, History Log (calendar)
 */

/**
 * @route   GET /api/home/dashboard
 * @desc    Get all data for home dashboard (rank, profile, status)
 * @access  Private
 * @frontend Home - Current Rank, Intel, Psych-Ops Profile
 */
router.get("/dashboard", verifyFirebaseToken, getCurrentUser);

/**
 * @route   POST /api/home/checkin
 * @desc    Daily check-in
 * @access  Private
 * @frontend Home - Daily Checkin
 */
router.post("/checkin", verifyFirebaseToken, checkIn);

/**
 * @route   GET /api/home/today-intake
 * @desc    Get today's food intake logs
 * @access  Private
 * @frontend Home - Today Intake
 */
router.get("/today-intake", verifyFirebaseToken, getTodayLogs);

/**
 * @route   GET /api/home/status
 * @desc    Get complete status data (profile, ledger, goal, weight)
 * @access  Private
 * @frontend Home - Status widget
 */
router.get("/status", verifyFirebaseToken, getStatusDataController);

/**
 * @route   GET /api/home/future-projection
 * @desc    Get current goal and projections
 * @access  Private
 * @frontend Home - Future Projection
 */
router.get("/future-projection", verifyFirebaseToken, getCurrentGoalController);

/**
 * @route   POST /api/home/scan-food
 * @desc    Scan food using camera
 * @access  Private
 * @frontend Home - Scan Food
 */
router.post("/scan-food", verifyFirebaseToken, uploadSingle, convertToBase64, scanFood);

/**
 * @route   GET /api/home/ledger/:date
 * @desc    Get daily ledger by date (YYYY-MM-DD)
 * @access  Private
 * @frontend Home - Analysis Ledger
 */
router.get("/ledger/:date", verifyFirebaseToken, getLedger);

/**
 * @route   GET /api/home/history
 * @desc    Get history log for calendar view (query: limit, date)
 * @access  Private
 * @frontend Home - History Log Calendar
 */
router.get("/history", verifyFirebaseToken, getHistoryList);

export default router;
