import { db } from "../config/firebase.config.js";

/**
 * VIDEO CALL USAGE TRACKING SERVICE
 * Track video call duration and enforce monthly limits
 */

/**
 * Track video call duration for a user
 * @param {string} userId - User ID
 * @param {number} durationMinutes - Duration in minutes
 * @returns {Promise<object>} Updated usage stats
 */
export async function trackVideoCallDuration(userId, durationMinutes) {
  try {
    const now = new Date();
    const month = now.toISOString().substring(0, 7); // YYYY-MM format

    const usageRef = db
      .collection("users")
      .doc(userId)
      .collection("videocall_usage")
      .doc(month);

    const doc = await usageRef.get();
    const currentData = doc.exists ? doc.data() : {};
    const currentMinutes = currentData.totalMinutes || 0;
    const callCount = currentData.callCount || 0;

    const newTotalMinutes = currentMinutes + durationMinutes;

    await usageRef.set(
      {
        month,
        totalMinutes: newTotalMinutes,
        callCount: callCount + 1,
        lastCallDate: now.toISOString(),
        lastCallDuration: durationMinutes,
        updatedAt: now.toISOString(),
      },
      { merge: true }
    );

    return {
      month,
      totalMinutes: newTotalMinutes,
      callCount: callCount + 1,
      lastCallDuration: durationMinutes,
    };
  } catch (error) {
    console.error("Error tracking video call duration:", error);
    throw new Error("Failed to track video call duration");
  }
}

/**
 * Get this month's video call minutes for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Total minutes used this month
 */
export async function getThisMonthVideoCallMinutes(userId) {
  try {
    const now = new Date();
    const month = now.toISOString().substring(0, 7);

    const usageRef = db
      .collection("users")
      .doc(userId)
      .collection("videocall_usage")
      .doc(month);

    const doc = await usageRef.get();

    if (!doc.exists) {
      return 0;
    }

    return doc.data().totalMinutes || 0;
  } catch (error) {
    console.error("Error getting video call minutes:", error);
    return 0; // Return 0 on error to not block user
  }
}

/**
 * Get video call usage stats for a specific month
 * @param {string} userId - User ID
 * @param {string} month - Month in YYYY-MM format (optional, defaults to current month)
 * @returns {Promise<object>} Usage stats
 */
export async function getVideoCallUsageStats(userId, month = null) {
  try {
    const targetMonth = month || new Date().toISOString().substring(0, 7);

    const usageRef = db
      .collection("users")
      .doc(userId)
      .collection("videocall_usage")
      .doc(targetMonth);

    const doc = await usageRef.get();

    if (!doc.exists) {
      return {
        month: targetMonth,
        totalMinutes: 0,
        callCount: 0,
        lastCallDate: null,
        lastCallDuration: 0,
      };
    }

    return {
      month: targetMonth,
      ...doc.data(),
    };
  } catch (error) {
    console.error("Error getting video call usage stats:", error);
    throw new Error("Failed to get video call usage stats");
  }
}

/**
 * Check if user has remaining video call minutes
 * @param {string} userId - User ID
 * @param {object} permissions - User permissions from role.config.js
 * @returns {Promise<object>} { allowed, remaining, limit, used }
 */
export async function checkVideoCallLimit(userId, permissions) {
  try {
    const maxMinutes = permissions.maxVideoCallMinutesPerMonth;

    // Unlimited
    if (maxMinutes === -1) {
      return {
        allowed: true,
        remaining: -1,
        limit: -1,
        used: 0,
      };
    }

    // Get current usage
    const usedMinutes = await getThisMonthVideoCallMinutes(userId);
    const remaining = Math.max(0, maxMinutes - usedMinutes);

    return {
      allowed: remaining > 0,
      remaining,
      limit: maxMinutes,
      used: usedMinutes,
    };
  } catch (error) {
    console.error("Error checking video call limit:", error);
    // On error, allow the call to prevent blocking users
    return {
      allowed: true,
      remaining: 0,
      limit: 0,
      used: 0,
      error: true,
    };
  }
}

/**
 * Get video call history for user (last N months)
 * @param {string} userId - User ID
 * @param {number} months - Number of months to retrieve (default: 6)
 * @returns {Promise<array>} Array of usage stats per month
 */
export async function getVideoCallHistory(userId, months = 6) {
  try {
    const history = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toISOString().substring(0, 7);

      const usageRef = db
        .collection("users")
        .doc(userId)
        .collection("videocall_usage")
        .doc(month);

      const doc = await usageRef.get();

      if (doc.exists) {
        history.push({
          month,
          ...doc.data(),
        });
      } else {
        history.push({
          month,
          totalMinutes: 0,
          callCount: 0,
        });
      }
    }

    return history;
  } catch (error) {
    console.error("Error getting video call history:", error);
    throw new Error("Failed to get video call history");
  }
}

/**
 * Reset monthly usage (untuk testing atau manual reset)
 * @param {string} userId - User ID
 * @param {string} month - Month to reset (YYYY-MM format)
 * @returns {Promise<boolean>} Success status
 */
export async function resetMonthlyUsage(userId, month) {
  try {
    const usageRef = db
      .collection("users")
      .doc(userId)
      .collection("videocall_usage")
      .doc(month);

    await usageRef.delete();

    console.log(`Reset video call usage for user ${userId}, month ${month}`);
    return true;
  } catch (error) {
    console.error("Error resetting monthly usage:", error);
    throw new Error("Failed to reset monthly usage");
  }
}

export default {
  trackVideoCallDuration,
  getThisMonthVideoCallMinutes,
  getVideoCallUsageStats,
  checkVideoCallLimit,
  getVideoCallHistory,
  resetMonthlyUsage,
};
