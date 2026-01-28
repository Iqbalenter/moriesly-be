import express from "express";
import { verifyFirebaseToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import {
  generateDailyTrainingPlanController,
  saveDailyTrainingPlanController,
  getDailyTrainingPlanController,
  hasGeneratedTodayPlanController,
  updateTrainingCompletionController,
  getTrainingCompletionController,
  saveTrainingPlanController,
  getActiveTrainingPlanController,
  updateTrainingProgressController,
} from "../controllers/user.controller.js";

const router = express.Router();

/**
 * TRAIN PAGE ENDPOINTS
 * Halaman Train: Generate workout plans, track training progress
 */

/**
 * @route   POST /api/train/generate-daily
 * @desc    Generate daily training plan menggunakan AI
 * @access  Private
 * @body    { category: string, focusArea?: string, difficulty?: string }
 * @frontend Train - Generate daily workout plan
 */
router.post(
  "/generate-daily",
  verifyFirebaseToken,
  requirePermission("canGenerateTrainingPlan"),
  generateDailyTrainingPlanController,
);

/**
 * @route   GET /api/train/daily/:date
 * @desc    Get daily training plan by date (YYYY-MM-DD)
 * @access  Private
 * @frontend Train - View daily workout plan
 */
router.get("/daily/:date", verifyFirebaseToken, getDailyTrainingPlanController);

/**
 * @route   POST /api/train/daily/:date
 * @desc    Save/update daily training plan for specific date
 * @access  Private
 * @body    { workouts: array, meals: array }
 * @frontend Train - Save custom workout plan
 */
router.post(
  "/daily/:date",
  verifyFirebaseToken,
  requirePermission("canGenerateTrainingPlan"),
  saveDailyTrainingPlanController,
);

/**
 * @route   GET /api/train/daily/:date/check
 * @desc    Check if training plan already exists for date
 * @access  Private
 * @frontend Train - Check before generating new plan
 */
router.get(
  "/daily/:date/check",
  verifyFirebaseToken,
  hasGeneratedTodayPlanController,
);

/**
 * @route   PUT /api/train/daily/:date/completion
 * @desc    Update training completion (workouts & meals)
 * @access  Private
 * @body    { type: "workout"|"meal", index: number, completed: boolean }
 * @frontend Train - Mark workout/meal as completed
 */
router.put(
  "/daily/:date/completion",
  verifyFirebaseToken,
  updateTrainingCompletionController,
);

/**
 * @route   GET /api/train/daily/:date/completion
 * @desc    Get training completion status for specific date
 * @access  Private
 * @frontend Train - Display completion progress
 */
router.get(
  "/daily/:date/completion",
  verifyFirebaseToken,
  getTrainingCompletionController,
);

/**
 * @route   POST /api/train/weekly-plan
 * @desc    Save custom weekly training plan (7 hari)
 * @access  Private
 * @body    { startDate: string, endDate: string, workouts: array }
 * @frontend Train - Save weekly workout plan
 */
router.post(
  "/weekly-plan",
  verifyFirebaseToken,
  requirePermission("canGenerateTrainingPlan"),
  saveTrainingPlanController,
);

/**
 * @route   GET /api/train/weekly-plan/active
 * @desc    Get active weekly training plan
 * @access  Private
 * @frontend Train - View current weekly plan
 */
router.get(
  "/weekly-plan/active",
  verifyFirebaseToken,
  getActiveTrainingPlanController,
);

/**
 * @route   PUT /api/train/weekly-plan/:planId/progress
 * @desc    Update weekly training plan progress
 * @access  Private
 * @body    { dayIndex: number, workoutIndex: number, completed: boolean }
 * @frontend Train - Track weekly progress
 */
router.put(
  "/weekly-plan/:planId/progress",
  verifyFirebaseToken,
  updateTrainingProgressController,
);

export default router;
