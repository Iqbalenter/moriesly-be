import express from "express";
import {
  register,
  login,
  verifyToken,
  refreshToken,
  getUserData,
  updateUser,
  getCurrentUser,
  initializeUser,
  saveLedger,
  getLedger,
  addHistory,
  getHistoryList,
  deleteHistory,
  addWeight,
  getWeightList,
  checkIn,
  getCheckInStatusController,
  saveGoal,
  batchUpdate,
  saveDietPlanController,
  getActiveDietPlanController,
  updateDietCompletionController,
  saveTrainingPlanController,
  getActiveTrainingPlanController,
  updateTrainingProgressController,
  saveConsultationController,
  getConsultationHistoryController,
  saveSkinScanController,
  getLatestSkinScanController,
  getSkinScansController,
  saveWeeklyPlanController,
  getActiveWeeklyPlanController,
  updateWeeklyCompletionController,
  getLedgerRangeController,
  getHistoryByActionController,
  getCurrentGoalController,
  updateGoalProgressController,
  getStatusDataController,
  generateDailyTrainingPlanController,
  saveDailyTrainingPlanController,
  getDailyTrainingPlanController,
  hasGeneratedTodayPlanController,
  updateTrainingCompletionController,
  getTrainingCompletionController,
  // Onboarding controllers
  saveAgentIdentityController,
  saveCalibrationController,
  saveMedicalIntelController,
  saveMissionProfileController,
  getOnboardingStatusController,
} from "../controllers/user.controller.js";
import { verifyFirebaseToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/users/register
 * @desc    Register user baru
 * @access  Public
 */
router.post("/register", register);

/**
 * @route   POST /api/users/login
 * @desc    Login user dan dapatkan custom token
 * @access  Public
 */
router.post("/login", login);

/**
 * @route   POST /api/users/verify-token
 * @desc    Verifikasi ID Token dari Firebase client
 * @access  Public
 */
router.post("/verify-token", verifyToken);

/**
 * @route   GET /api/users/verify-token
 * @desc    Verifikasi ID Token dari Firebase client (GET version)
 * @access  Public
 */
router.get("/verify-token", verifyToken);

/**
 * @route   POST /api/users/refresh-token
 * @desc    Refresh access token menggunakan refresh token
 * @access  Public
 */
router.post("/refresh-token", refreshToken);

/**
 * @route   GET /api/users/me
 * @desc    Get data user yang sedang login
 * @access  Private (memerlukan token)
 */
router.get("/me", verifyFirebaseToken, getCurrentUser);

/**
 * @route   GET /api/users/current
 * @desc    Get data user yang sedang login (alias dari /me)
 * @access  Private (memerlukan token)
 */
router.get("/current", verifyFirebaseToken, getCurrentUser);

/**
 * @route   GET /api/users/profile
 * @desc    Get data user yang sedang login (dari token)
 * @access  Private (memerlukan token)
 */
router.get("/profile", verifyFirebaseToken, getUserData);

/**
 * @route   PUT /api/users/profile
 * @desc    Update profil user yang sedang login (dari token)
 * @access  Private (memerlukan token)
 */
router.put("/profile", verifyFirebaseToken, updateUser);

/**
 * @route   POST /api/users/initialize
 * @desc    Initialize user profile (check or create) (userId dari authToken)
 * @access  Private (memerlukan token)
 */
router.post("/initialize", verifyFirebaseToken, initializeUser);

/**
 * @route   POST /api/users/onboarding/identity
 * @desc    Simpan Agent Identity (userId dari token)
 * @access  Private
 */
router.post(
  "/onboarding/identity",
  verifyFirebaseToken,
  saveAgentIdentityController,
);

/**
 * @route   POST /api/users/onboarding/calibration
 * @desc    Simpan Calibration (userId dari token)
 * @access  Private
 */
router.post(
  "/onboarding/calibration",
  verifyFirebaseToken,
  saveCalibrationController,
);

/**
 * @route   POST /api/users/onboarding/medical-intel
 * @desc    Simpan Medical Intel (userId dari token)
 * @access  Private
 */
router.post(
  "/onboarding/medical-intel",
  verifyFirebaseToken,
  saveMedicalIntelController,
);

/**
 * @route   POST /api/users/onboarding/mission-profile
 * @desc    Simpan Mission Profile (userId dari token)
 * @access  Private
 */
router.post(
  "/onboarding/mission-profile",
  verifyFirebaseToken,
  saveMissionProfileController,
);

/**
 * @route   GET /api/users/onboarding/status
 * @desc    Get onboarding status (userId dari token)
 * @access  Private
 */
router.get(
  "/onboarding/status",
  verifyFirebaseToken,
  getOnboardingStatusController,
);

/**
 * @route   GET /api/users/ledger/range
 * @desc    Get ledger range (query: startDate, endDate) (userId dari token)
 * @access  Private
 */
router.get("/ledger/range", verifyFirebaseToken, getLedgerRangeController);

/**
 * @route   POST /api/users/ledger
 * @desc    Save daily ledger (userId dari token)
 * @access  Private
 */
router.post("/ledger", verifyFirebaseToken, saveLedger);

/**
 * @route   GET /api/users/ledger/:date
 * @desc    Get daily ledger by date (userId dari token)
 * @access  Private
 */
router.get("/ledger/:date", verifyFirebaseToken, getLedger);

/**
 * @route   GET /api/users/history/by-action
 * @desc    Get history by action (query: action, limit) (userId dari token)
 * @access  Private
 */
router.get(
  "/history/by-action",
  verifyFirebaseToken,
  getHistoryByActionController,
);

/**
 * @route   POST /api/users/history
 * @desc    Add history item (userId dari token)
 * @access  Private
 */
router.post("/history", verifyFirebaseToken, addHistory);

/**
 * @route   GET /api/users/history
 * @desc    Get history with filters (query: limit, date) (userId dari token)
 * @access  Private
 */
router.get("/history", verifyFirebaseToken, getHistoryList);

/**
 * @route   DELETE /api/users/history/:historyId
 * @desc    Delete history item (userId dari token)
 * @access  Private
 */
router.delete("/history/:historyId", verifyFirebaseToken, deleteHistory);

/**
 * @route   POST /api/users/weight
 * @desc    Add weight entry (userId dari token)
 * @access  Private
 */
router.post("/weight", verifyFirebaseToken, addWeight);

/**
 * @route   GET /api/users/weight
 * @desc    Get weight history (query: limit) (userId dari token)
 * @access  Private
 */
router.get("/weight", verifyFirebaseToken, getWeightList);

/**
 * @route   GET /api/users/checkin/status
 * @desc    Get daily check-in status (userId dari token)
 * @access  Private
 */
router.get("/checkin/status", verifyFirebaseToken, getCheckInStatusController);

/**
 * @route   POST /api/users/checkin
 * @desc    Daily check-in (userId dari token)
 * @access  Private
 */
router.post("/checkin", verifyFirebaseToken, checkIn);

/**
 * @route   GET /api/users/goal/current
 * @desc    Get current goal (userId dari token)
 * @access  Private
 */
router.get("/goal/current", verifyFirebaseToken, getCurrentGoalController);

/**
 * @route   PUT /api/users/goal/progress
 * @desc    Update goal progress (userId dari token)
 * @access  Private
 */
router.put("/goal/progress", verifyFirebaseToken, updateGoalProgressController);

/**
 * @route   POST /api/users/goal
 * @desc    Save goal configuration (userId dari token)
 * @access  Private
 */
router.post("/goal", verifyFirebaseToken, saveGoal);

/**
 * @route   POST /api/users/batch-update
 * @desc    Batch update user data (setup onboarding) (userId dari token)
 * @access  Private
 */
router.post("/batch-update", verifyFirebaseToken, batchUpdate);

/**
 * @route   GET /api/users/diet-plan/active
 * @desc    Get active diet plan (userId dari token)
 * @access  Private
 */
router.get(
  "/diet-plan/active",
  verifyFirebaseToken,
  getActiveDietPlanController,
);

/**
 * @route   POST /api/users/diet-plan
 * @desc    Save diet plan (userId dari token)
 * @access  Private
 */
router.post("/diet-plan", verifyFirebaseToken, saveDietPlanController);

/**
 * @route   PUT /api/users/diet-plan/:planId/completion
 * @desc    Update diet plan completion (userId dari token)
 * @access  Private
 */
router.put(
  "/diet-plan/:planId/completion",
  verifyFirebaseToken,
  updateDietCompletionController,
);

/**
 * @route   GET /api/users/training-plan/active
 * @desc    Get active training plan (userId dari token)
 * @access  Private
 */
router.get(
  "/training-plan/active",
  verifyFirebaseToken,
  getActiveTrainingPlanController,
);

/**
 * @route   POST /api/users/training-plan/generate
 * @desc    Generate daily training plan using AI (userId dari token)
 * @access  Private
 */
router.post(
  "/training-plan/generate",
  verifyFirebaseToken,
  generateDailyTrainingPlanController,
);

/**
 * @route   GET /api/users/training-plan/daily/:date/check
 * @desc    Check if training plan exists for date (userId dari token)
 * @access  Private
 */
router.get(
  "/training-plan/daily/:date/check",
  verifyFirebaseToken,
  hasGeneratedTodayPlanController,
);

/**
 * @route   GET /api/users/training-plan/daily/:date/completion
 * @desc    Get training completion status (userId dari token)
 * @access  Private
 */
router.get(
  "/training-plan/daily/:date/completion",
  verifyFirebaseToken,
  getTrainingCompletionController,
);

/**
 * @route   PUT /api/users/training-plan/daily/:date/completion
 * @desc    Update training completion (workouts & meals) (userId dari token)
 * @access  Private
 */
router.put(
  "/training-plan/daily/:date/completion",
  verifyFirebaseToken,
  updateTrainingCompletionController,
);

/**
 * @route   POST /api/users/training-plan/daily/:date
 * @desc    Save daily training plan for specific date (userId dari token)
 * @access  Private
 */
router.post(
  "/training-plan/daily/:date",
  verifyFirebaseToken,
  saveDailyTrainingPlanController,
);

/**
 * @route   GET /api/users/training-plan/daily/:date
 * @desc    Get daily training plan by date (userId dari token)
 * @access  Private
 */
router.get(
  "/training-plan/daily/:date",
  verifyFirebaseToken,
  getDailyTrainingPlanController,
);

/**
 * @route   POST /api/users/training-plan
 * @desc    Save training plan (userId dari token)
 * @access  Private
 */
router.post("/training-plan", verifyFirebaseToken, saveTrainingPlanController);

/**
 * @route   PUT /api/users/training-plan/:planId/progress
 * @desc    Update training plan progress (userId dari token)
 * @access  Private
 */
router.put(
  "/training-plan/:planId/progress",
  verifyFirebaseToken,
  updateTrainingProgressController,
);

/**
 * @route   GET /api/users/consultation
 * @desc    Get consultation history (query: limit) (userId dari token)
 * @access  Private
 */
router.get(
  "/consultation",
  verifyFirebaseToken,
  getConsultationHistoryController,
);

/**
 * @route   POST /api/users/consultation
 * @desc    Save consultation session (userId dari token)
 * @access  Private
 */
router.post("/consultation", verifyFirebaseToken, saveConsultationController);

/**
 * @route   GET /api/users/skin-scan/latest
 * @desc    Get latest skin scan (userId dari token)
 * @access  Private
 */
router.get(
  "/skin-scan/latest",
  verifyFirebaseToken,
  getLatestSkinScanController,
);

/**
 * @route   GET /api/users/skin-scan
 * @desc    Get all skin scans (query: limit) (userId dari token)
 * @access  Private
 */
router.get("/skin-scan", verifyFirebaseToken, getSkinScansController);

/**
 * @route   POST /api/users/skin-scan
 * @desc    Save skin scan result (userId dari token)
 * @access  Private
 */
router.post("/skin-scan", verifyFirebaseToken, saveSkinScanController);

/**
 * @route   GET /api/users/weekly-plan/active
 * @desc    Get active weekly plan (query: type=diet/training) (userId dari token)
 * @access  Private
 */
router.get(
  "/weekly-plan/active",
  verifyFirebaseToken,
  getActiveWeeklyPlanController,
);

/**
 * @route   POST /api/users/weekly-plan
 * @desc    Save weekly plan (userId dari token)
 * @access  Private
 */
router.post("/weekly-plan", verifyFirebaseToken, saveWeeklyPlanController);

/**
 * @route   PUT /api/users/weekly-plan/:planId/completion
 * @desc    Update weekly plan completion (userId dari token)
 * @access  Private
 */
router.put(
  "/weekly-plan/:planId/completion",
  verifyFirebaseToken,
  updateWeeklyCompletionController,
);

/**
 * @route   GET /api/users/status
 * @desc    Get complete status data (profile, ledger, goal, weight history) (userId dari token)
 * @access  Private
 */
router.get("/status", verifyFirebaseToken, getStatusDataController);

export default router;
