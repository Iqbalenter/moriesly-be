import aiService from "../service/ai.service.js";
import {
  canGenerateDaily,
  canGenerateWeekly,
  saveDailyDietPlan,
  saveWeeklyDietPlan,
  getTodayDietPlan,
  verifyMealConsumption,
  verifyWeeklyMealConsumption,
  getShoppingList,
  canSwapMeal,
  updateMealInDailyPlan,
} from "../service/diet.service.js";
import { getUserProfile } from "../service/user.service.js";
import { DIET_CATEGORIES } from "../utils/diet-prompts.js";

/**
 * Generate Daily Diet Plan
 * POST /api/diet/generate-daily
 */
export async function generateDailyDietPlan(req, res, next) {
  try {
    const userId = req.user.uid;
    const { category, manualGoal, inputMode } = req.body;

    // Normalize category aliases from frontend
    let normalizedCategory = category;
    if (category === "weight_loss") normalizedCategory = "fat_loss";
    if (category === "muscle_gain") normalizedCategory = "muscle";
    // keto and maintenance work directly

    // Validate input
    if (!inputMode || !["auto", "manual"].includes(inputMode)) {
      return res.status(400).json({
        success: false,
        message: "inputMode harus 'auto' atau 'manual'",
      });
    }

    if (inputMode === "auto" && !category) {
      return res.status(400).json({
        success: false,
        message: "category wajib diisi untuk mode auto",
      });
    }

    if (inputMode === "manual" && !manualGoal) {
      return res.status(400).json({
        success: false,
        message: "manualGoal wajib diisi untuk mode manual",
      });
    }

    // Check if can generate
    const eligibility = await canGenerateDaily(userId);
    if (!eligibility.canGenerate) {
      return res.status(429).json({
        success: false,
        message: eligibility.reason,
        nextGenerateTime: eligibility.nextGenerateTime,
      });
    }

    // Get user profile
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: "User profile tidak ditemukan",
      });
    }

    // Determine goal text
    let goalText;
    if (inputMode === "auto") {
      const categoryData = DIET_CATEGORIES[normalizedCategory];
      if (!categoryData) {
        return res.status(400).json({
          success: false,
          message:
            "Category tidak valid. Options: weight_loss, muscle_gain, maintenance, keto",
        });
      }
      goalText = `${categoryData.title} (${categoryData.desc}). Strict adherence.`;
    } else {
      goalText = manualGoal;
    }

    // Generate with AI
    const dietPlan = await aiService.generateDailyDietPlan(
      userProfile,
      goalText,
    );

    // Save to Firestore
    const savedPlan = await saveDailyDietPlan(userId, dietPlan);

    res.status(201).json({
      success: true,
      message: "Diet plan berhasil di-generate!",
      data: savedPlan,
    });
  } catch (error) {
    console.error("Error in generateDailyDietPlan:", error);
    next(error);
  }
}

/**
 * Generate Weekly Diet Plan
 * POST /api/diet/generate-weekly
 */
export async function generateWeeklyDietPlan(req, res, next) {
  try {
    const userId = req.user.uid;
    const { category, manualGoal, inputMode } = req.body;

    // Normalize category aliases from frontend
    let normalizedCategory = category;
    if (category === "weight_loss") normalizedCategory = "fat_loss";
    if (category === "muscle_gain") normalizedCategory = "muscle";
    // keto and maintenance work directly

    // Validate input
    if (!inputMode || !["auto", "manual"].includes(inputMode)) {
      return res.status(400).json({
        success: false,
        message: "inputMode harus 'auto' atau 'manual'",
      });
    }

    if (inputMode === "auto" && !category) {
      return res.status(400).json({
        success: false,
        message: "category wajib diisi untuk mode auto",
      });
    }

    if (inputMode === "manual" && !manualGoal) {
      return res.status(400).json({
        success: false,
        message: "manualGoal wajib diisi untuk mode manual",
      });
    }

    // Check if can generate
    const eligibility = await canGenerateWeekly(userId);
    if (!eligibility.canGenerate) {
      return res.status(429).json({
        success: false,
        message: eligibility.reason,
        nextGenerateTime: eligibility.nextGenerateTime,
      });
    }

    // Get user profile
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: "User profile tidak ditemukan",
      });
    }

    // Determine goal text
    let goalText;
    if (inputMode === "auto") {
      const categoryData = DIET_CATEGORIES[normalizedCategory];
      if (!categoryData) {
        return res.status(400).json({
          success: false,
          message:
            "Category tidak valid. Options: weight_loss, muscle_gain, maintenance, keto",
        });
      }
      goalText = `${categoryData.title} (${categoryData.desc}). Focus on meal prep efficiency.`;
    } else {
      goalText = manualGoal;
    }

    // Calculate 7 days from today
    const today = new Date();
    const daysArray = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = date.toLocaleDateString("id-ID", { weekday: "long" });
      const dateStr = date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
      });
      daysArray.push({ dayName, dateStr, dayIndex: i });
    }

    // Generate with AI
    const weeklyPlan = await aiService.generateWeeklyDietPlan(
      userProfile,
      goalText,
      daysArray,
    );

    // Save to Firestore
    const savedPlan = await saveWeeklyDietPlan(userId, weeklyPlan);

    res.status(201).json({
      success: true,
      message: "Weekly diet plan berhasil di-generate!",
      data: savedPlan,
    });
  } catch (error) {
    console.error("Error in generateWeeklyDietPlan:", error);
    next(error);
  }
}

/**
 * Swap Meal
 * POST /api/diet/swap-meal
 */
export async function swapMeal(req, res, next) {
  try {
    const userId = req.user.uid;
    const { date, mealIndex, currentMeal, dietTarget } = req.body;

    // Validate input
    if (!date || mealIndex === undefined || !currentMeal) {
      return res.status(400).json({
        success: false,
        message: "date, mealIndex, dan currentMeal wajib diisi",
      });
    }

    // Check swap limit
    const swapEligibility = await canSwapMeal(userId);
    if (!swapEligibility.canSwap) {
      return res.status(429).json({
        success: false,
        message: swapEligibility.reason,
        remaining: swapEligibility.remaining,
      });
    }

    // Generate alternative meal with AI
    const newMeal = await aiService.swapMeal(
      currentMeal,
      dietTarget || "Healthy",
    );

    // Save new meal to database
    await updateMealInDailyPlan(userId, date, mealIndex, newMeal);

    res.status(200).json({
      success: true,
      message: "Meal berhasil di-swap!",
      data: {
        newMeal,
        swapsRemaining: swapEligibility.remaining - 1,
      },
    });
  } catch (error) {
    console.error("Error in swapMeal:", error);
    next(error);
  }
}

/**
 * Verify Meal Consumption
 * POST /api/diet/verify-consumption
 */
export async function verifyConsumption(req, res, next) {
  try {
    const userId = req.user.uid;
    const { planId, mealIndex, evidencePhotoBase64 } = req.body;

    // Validate input
    if (!planId || mealIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: "planId dan mealIndex wajib diisi",
      });
    }

    // Validate image if provided
    let evidenceUrl = null;
    if (evidencePhotoBase64) {
      const validation = await aiService.validateFoodImage(evidencePhotoBase64);

      if (!validation.isFood || validation.confidence < 60) {
        return res.status(400).json({
          success: false,
          message:
            "Foto tidak valid. Pastikan foto menampilkan makanan yang jelas.",
          validation,
        });
      }

      // TODO: Upload to Firebase Storage and get URL
      // For now, just store base64 reference
      evidenceUrl = "base64_uploaded"; // Placeholder
    }

    // Verify consumption
    const result = await verifyMealConsumption(
      userId,
      planId,
      mealIndex,
      evidenceUrl,
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        xpGained: result.xpGained,
        completedMealIndices: result.completedMealIndices,
      },
    });
  } catch (error) {
    console.error("Error in verifyConsumption:", error);
    next(error);
  }
}

/**
 * Verify Weekly Meal Consumption
 * POST /api/diet/verify-weekly-consumption
 */
export async function verifyWeeklyConsumption(req, res, next) {
  try {
    const userId = req.user.uid;
    const { planId, dayIndex, mealIndex, evidencePhotoBase64 } = req.body;

    // Validate input
    if (!planId || dayIndex === undefined || mealIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: "planId, dayIndex, dan mealIndex wajib diisi",
      });
    }

    // Validate image if provided
    let evidenceUrl = null;
    if (evidencePhotoBase64) {
      const validation = await aiService.validateFoodImage(evidencePhotoBase64);

      if (!validation.isFood || validation.confidence < 60) {
        return res.status(400).json({
          success: false,
          message:
            "Foto tidak valid. Pastikan foto menampilkan makanan yang jelas.",
          validation,
        });
      }

      evidenceUrl = "base64_uploaded"; // Placeholder
    }

    // Verify consumption
    const result = await verifyWeeklyMealConsumption(
      userId,
      planId,
      dayIndex,
      mealIndex,
      evidenceUrl,
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        xpGained: result.xpGained,
        completedWeeklyIndices: result.completedWeeklyIndices,
      },
    });
  } catch (error) {
    console.error("Error in verifyWeeklyConsumption:", error);
    next(error);
  }
}

/**
 * Check Generation Eligibility
 * GET /api/diet/can-generate?type=daily|weekly
 */
export async function checkGenerationEligibility(req, res, next) {
  try {
    const userId = req.user.uid;
    const { type } = req.query;

    if (!type || !["daily", "weekly"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type harus 'daily' atau 'weekly'",
      });
    }

    let eligibility;
    if (type === "daily") {
      eligibility = await canGenerateDaily(userId);
    } else {
      eligibility = await canGenerateWeekly(userId);
    }

    res.status(200).json({
      success: true,
      data: eligibility,
    });
  } catch (error) {
    console.error("Error in checkGenerationEligibility:", error);
    next(error);
  }
}

/**
 * Get Shopping List
 * GET /api/diet/shopping-list
 */
export async function getShoppingListController(req, res, next) {
  try {
    const userId = req.user.uid;

    const shoppingList = await getShoppingList(userId);

    res.status(200).json({
      success: true,
      data: shoppingList,
    });
  } catch (error) {
    console.error("Error in getShoppingList:", error);
    next(error);
  }
}
