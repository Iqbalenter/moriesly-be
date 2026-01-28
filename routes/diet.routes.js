import express from "express";
import { verifyFirebaseToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import {
  generateDailyDietPlan,
  generateWeeklyDietPlan,
  swapMeal,
  verifyConsumption,
  verifyWeeklyConsumption,
  checkGenerationEligibility,
  getShoppingListController,
} from "../controllers/diet.controller.js";
import {
  saveDietPlanController,
  getActiveDietPlanController,
  updateDietCompletionController,
} from "../controllers/user.controller.js";

const router = express.Router();

/**
 * DIET PAGE ENDPOINTS
 * Halaman Diet: Generate meal plans, track consumption, shopping list
 */

/**
 * @route   POST /api/diet/generate-daily
 * @desc    Generate daily diet plan dengan AI
 * @access  Private
 * @body    { category: string, manualGoal?: string, inputMode: "auto"|"manual" }
 * @frontend Diet - Generate daily plan
 */
router.post(
  "/generate-daily",
  verifyFirebaseToken,
  requirePermission("canGenerateDietPlan"),
  generateDailyDietPlan,
);

/**
 * @route   POST /api/diet/generate-weekly
 * @desc    Generate weekly diet plan dengan AI (7 hari)
 * @access  Private
 * @body    { category: string, manualGoal?: string, inputMode: "auto"|"manual" }
 * @frontend Diet - Generate weekly plan
 */
router.post(
  "/generate-weekly",
  verifyFirebaseToken,
  requirePermission("canGenerateDietPlan"),
  generateWeeklyDietPlan,
);

/**
 * @route   GET /api/diet/can-generate
 * @desc    Check if user can generate new diet plan (query: type=daily|weekly)
 * @access  Private
 * @frontend Diet - Check before showing generate button
 */
router.get("/can-generate", verifyFirebaseToken, checkGenerationEligibility);

/**
 * @route   GET /api/diet/active-plan
 * @desc    Get active diet plan (daily or weekly)
 * @access  Private
 * @frontend Diet - Display current active plan
 */
router.get("/active-plan", verifyFirebaseToken, getActiveDietPlanController);

/**
 * @route   POST /api/diet/swap-meal
 * @desc    Swap meal dengan alternatif dari AI
 * @access  Private
 * @body    { date: string, mealIndex: number, currentMeal: object, dietTarget?: string }
 * @frontend Diet - Swap meal option
 */
router.post(
  "/swap-meal",
  verifyFirebaseToken,
  requirePermission("canGenerateDietPlan"),
  swapMeal,
);

/**
 * @route   POST /api/diet/verify-consumption
 * @desc    Verify meal consumption dengan foto (daily plan)
 * @access  Private
 * @body    { planId: string, mealIndex: number, evidencePhotoBase64?: string }
 * @frontend Diet - Mark meal as consumed (daily)
 */
router.post("/verify-consumption", verifyFirebaseToken, verifyConsumption);

/**
 * @route   POST /api/diet/verify-weekly-consumption
 * @desc    Verify meal consumption dengan foto (weekly plan)
 * @access  Private
 * @body    { planId: string, dayIndex: number, mealIndex: number, evidencePhotoBase64?: string }
 * @frontend Diet - Mark meal as consumed (weekly)
 */
router.post(
  "/verify-weekly-consumption",
  verifyFirebaseToken,
  verifyWeeklyConsumption,
);

/**
 * @route   PUT /api/diet/completion/:planId
 * @desc    Update diet plan completion status
 * @access  Private
 * @body    { mealIndex: number, consumed: boolean }
 * @frontend Diet - Track meal completion
 */
router.put(
  "/completion/:planId",
  verifyFirebaseToken,
  updateDietCompletionController,
);

/**
 * @route   GET /api/diet/shopping-list
 * @desc    Get shopping list dari active diet plans
 * @access  Private
 * @frontend Diet - Shopping list view
 */
router.get(
  "/shopping-list",
  verifyFirebaseToken,
  requirePermission("canGenerateDietPlan"),
  getShoppingListController,
);

export default router;
