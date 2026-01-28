import { db } from "../config/firebase.config.js";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Check if user can generate daily diet plan
 * Rule: 1x per day (reset at 00:00)
 */
export async function canGenerateDaily(userId) {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("dietPlans")
      .where("date", "==", today)
      .where("type", "==", "daily")
      .limit(1)
      .get();

    if (!snapshot.empty) {
      // Already generated today
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      return {
        canGenerate: false,
        reason: "Diet plan sudah di-generate hari ini",
        nextGenerateTime: tomorrow.toISOString(),
      };
    }

    return {
      canGenerate: true,
      reason: "Siap untuk generate diet plan",
      nextGenerateTime: null,
    };
  } catch (error) {
    console.error("Error checking daily generation:", error);
    throw error;
  }
}

/**
 * Check if user can generate weekly diet plan
 * Rule: 1x per week (reset every Monday)
 */
export async function canGenerateWeekly(userId) {
  try {
    // Get current week identifier (Monday - Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

    // Get this Monday
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    thisMonday.setHours(0, 0, 0, 0);

    const weekId = thisMonday.toISOString().split("T")[0];

    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("weeklyPlans")
      .where("weekId", "==", weekId)
      .where("type", "==", "diet")
      .limit(1)
      .get();

    if (!snapshot.empty) {
      // Already generated this week
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(0, 0, 0, 0);

      return {
        canGenerate: false,
        reason: "Weekly plan sudah di-generate minggu ini",
        nextGenerateTime: nextMonday.toISOString(),
      };
    }

    return {
      canGenerate: true,
      reason: "Siap untuk generate weekly plan",
      nextGenerateTime: null,
    };
  } catch (error) {
    console.error("Error checking weekly generation:", error);
    throw error;
  }
}

/**
 * Save daily diet plan to Firestore
 */
export async function saveDailyDietPlan(userId, dietPlan) {
  try {
    const today = new Date().toISOString().split("T")[0];

    const planData = {
      ...dietPlan,
      date: today,
      type: "daily",
      isActive: true,
      completedMealIndices: [],
      swapCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db
      .collection("users")
      .doc(userId)
      .collection("dietPlans")
      .add(planData);

    return {
      id: docRef.id,
      ...planData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error saving daily diet plan:", error);
    throw error;
  }
}

/**
 * Save weekly diet plan to Firestore
 */
export async function saveWeeklyDietPlan(userId, weeklyPlan) {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();

    // Get this Monday
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    thisMonday.setHours(0, 0, 0, 0);

    // Get this Sunday
    const thisSunday = new Date(thisMonday);
    thisSunday.setDate(thisMonday.getDate() + 6);
    thisSunday.setHours(23, 59, 59, 999);

    const weekId = thisMonday.toISOString().split("T")[0];

    const planData = {
      ...weeklyPlan,
      weekId,
      type: "diet",
      weekStart: FieldValue.serverTimestamp(),
      weekEnd: thisSunday.toISOString(),
      isActive: true,
      completedWeeklyIndices: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db
      .collection("users")
      .doc(userId)
      .collection("weeklyPlans")
      .add(planData);

    return {
      id: docRef.id,
      ...planData,
      weekStart: thisMonday.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error saving weekly diet plan:", error);
    throw error;
  }
}

/**
 * Get today's diet plan
 */
export async function getTodayDietPlan(userId) {
  try {
    const today = new Date().toISOString().split("T")[0];

    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("dietPlans")
      .where("date", "==", today)
      .where("type", "==", "daily")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error("Error getting today's diet plan:", error);
    throw error;
  }
}

/**
 * Update meal completion (verify consumption)
 */
export async function verifyMealConsumption(
  userId,
  planId,
  mealIndex,
  evidenceUrl,
) {
  try {
    const planRef = db
      .collection("users")
      .doc(userId)
      .collection("dietPlans")
      .doc(planId);

    const planDoc = await planRef.get();

    if (!planDoc.exists) {
      throw new Error("Diet plan tidak ditemukan");
    }

    const planData = planDoc.data();
    const completedMealIndices = planData.completedMealIndices || [];

    // Check if already completed
    if (completedMealIndices.includes(mealIndex)) {
      return {
        success: false,
        message: "Meal ini sudah diverifikasi sebelumnya",
        xpGained: 0,
      };
    }

    // Add to completed
    completedMealIndices.push(mealIndex);

    await planRef.update({
      completedMealIndices,
      [`verifications.${mealIndex}`]: {
        timestamp: FieldValue.serverTimestamp(),
        evidenceUrl: evidenceUrl || null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Calculate XP reward
    const xpGained = 15; // Base XP per meal

    // Update user XP
    const userRef = db.collection("users").doc(userId);
    await userRef.update({
      xp: FieldValue.increment(xpGained),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: "Meal berhasil diverifikasi!",
      xpGained,
      completedMealIndices,
    };
  } catch (error) {
    console.error("Error verifying meal consumption:", error);
    throw error;
  }
}

/**
 * Verify weekly meal consumption
 */
export async function verifyWeeklyMealConsumption(
  userId,
  planId,
  dayIndex,
  mealIndex,
  evidenceUrl,
) {
  try {
    const planRef = db
      .collection("users")
      .doc(userId)
      .collection("weeklyPlans")
      .doc(planId);

    const planDoc = await planRef.get();

    if (!planDoc.exists) {
      throw new Error("Weekly plan tidak ditemukan");
    }

    const planData = planDoc.data();
    const completedWeeklyIndices = planData.completedWeeklyIndices || [];
    const key = `${dayIndex}-${mealIndex}`;

    // Check if already completed
    if (completedWeeklyIndices.includes(key)) {
      return {
        success: false,
        message: "Meal ini sudah diverifikasi sebelumnya",
        xpGained: 0,
      };
    }

    // Add to completed
    completedWeeklyIndices.push(key);

    await planRef.update({
      completedWeeklyIndices,
      [`verifications.${key}`]: {
        timestamp: FieldValue.serverTimestamp(),
        evidenceUrl: evidenceUrl || null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Calculate XP reward
    const xpGained = 15; // Base XP per meal

    // Update user XP
    const userRef = db.collection("users").doc(userId);
    await userRef.update({
      xp: FieldValue.increment(xpGained),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: "Weekly meal berhasil diverifikasi!",
      xpGained,
      completedWeeklyIndices,
    };
  } catch (error) {
    console.error("Error verifying weekly meal consumption:", error);
    throw error;
  }
}

/**
 * Get shopping list from active plans
 */
export async function getShoppingList(userId) {
  try {
    const items = [];

    // Get today's diet plan
    const today = new Date().toISOString().split("T")[0];
    const dailySnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("dietPlans")
      .where("date", "==", today)
      .where("type", "==", "daily")
      .limit(1)
      .get();

    if (!dailySnapshot.empty) {
      const dailyPlan = dailySnapshot.docs[0].data();
      if (dailyPlan.meals) {
        dailyPlan.meals.forEach((meal) => {
          if (meal.ingredients && Array.isArray(meal.ingredients)) {
            items.push(...meal.ingredients);
          }
        });
      }
    }

    // Get weekly plan
    const now = new Date();
    const dayOfWeek = now.getDay();
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    thisMonday.setHours(0, 0, 0, 0);
    const weekId = thisMonday.toISOString().split("T")[0];

    const weeklySnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("weeklyPlans")
      .where("weekId", "==", weekId)
      .where("type", "==", "diet")
      .limit(1)
      .get();

    if (!weeklySnapshot.empty) {
      const weeklyPlan = weeklySnapshot.docs[0].data();
      if (weeklyPlan.days) {
        weeklyPlan.days.forEach((day) => {
          if (day.meals) {
            day.meals.forEach((meal) => {
              if (meal.ingredients && Array.isArray(meal.ingredients)) {
                items.push(...meal.ingredients);
              }
            });
          }
        });
      }
    }

    // De-duplicate and sort
    const uniqueItems = Array.from(new Set(items.map((i) => i.trim()))).sort();

    return {
      items: uniqueItems,
      count: uniqueItems.length,
      source: {
        hasDaily: !dailySnapshot.empty,
        hasWeekly: !weeklySnapshot.empty,
      },
    };
  } catch (error) {
    console.error("Error getting shopping list:", error);
    throw error;
  }
}

/**
 * Check swap meal rate limit
 * Max 3 swaps per day per user
 */
export async function canSwapMeal(userId) {
  try {
    const today = new Date().toISOString().split("T")[0];

    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("dietPlans")
      .where("date", "==", today)
      .where("type", "==", "daily")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return {
        canSwap: false,
        remaining: 0,
        reason: "Tidak ada diet plan aktif hari ini",
      };
    }

    const planData = snapshot.docs[0].data();
    const swapCount = planData.swapCount || 0;
    const MAX_SWAPS_PER_DAY = 3;

    if (swapCount >= MAX_SWAPS_PER_DAY) {
      return {
        canSwap: false,
        remaining: 0,
        reason: `Sudah mencapai limit swap (${MAX_SWAPS_PER_DAY}x per hari)`,
      };
    }

    return {
      canSwap: true,
      remaining: MAX_SWAPS_PER_DAY - swapCount,
    };
  } catch (error) {
    console.error("Error checking swap limit:", error);
    throw error;
  }
}

/**
 * Update specific meal in daily diet plan (for swap)
 */
export async function updateMealInDailyPlan(userId, date, mealIndex, newMeal) {
  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("dietPlans")
      .where("date", "==", date)
      .where("type", "==", "daily")
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new Error("Diet plan tidak ditemukan");
    }

    const doc = snapshot.docs[0];
    const currentMeals = doc.data().meals || [];

    if (mealIndex < 0 || mealIndex >= currentMeals.length) {
      throw new Error("Invalid meal index");
    }

    currentMeals[mealIndex] = newMeal;

    await doc.ref.update({
      meals: currentMeals,
      swapCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Error updating meal in daily plan:", error);
    throw error;
  }
}
