import {
  updateUserRole,
  getSubscriptionInfo,
  getUserUsageStats,
  processUpgrade,
  checkSubscriptionExpiry,
  getSubscriptionStatus,
} from "../service/subscription.service.js";
import {
  getUserPermissions,
  RolePermissions,
  UserRole,
  normalizeRole,
} from "../utils/role.config.js";
import { getUserProfile } from "../service/user.service.js";

/**
 * Get subscription & permissions info
 */
export async function getSubscriptionController(req, res) {
  try {
    const userId = req.user.uid;

    // Check expiry first
    await checkSubscriptionExpiry(userId);

    const [subInfo, userProfile, usageStats] = await Promise.all([
      getSubscriptionInfo(userId),
      getUserProfile(userId),
      getUserUsageStats(userId),
    ]);

    const permissions = getUserPermissions(userProfile);

    return res.json({
      success: true,
      data: {
        subscription: subInfo,
        permissions,
        usage: usageStats,
      },
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get subscription info",
      error: error.message,
    });
  }
}

/**
 * Get subscription status with feature details
 */
export async function getSubscriptionStatusController(req, res) {
  try {
    const userId = req.user.uid;

    // Check expiry first
    await checkSubscriptionExpiry(userId);

    const status = await getSubscriptionStatus(userId);

    return res.json({
      success: true,
      message: "Subscription status retrieved",
      data: status,
    });
  } catch (error) {
    console.error("Get subscription status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get subscription status",
      error: error.message,
    });
  }
}

/**
 * Get usage statistics
 */
export async function getUsageStatsController(req, res) {
  try {
    const userId = req.user.uid;
    const { date } = req.query;

    const stats = await getUserUsageStats(userId, date);

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get usage stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get usage stats",
      error: error.message,
    });
  }
}

/**
 * Upgrade subscription
 */
export async function upgradeSubscriptionController(req, res) {
  try {
    const userId = req.user.uid;
    const { targetRole, paymentData } = req.body;
    const normalizedTargetRole = normalizeRole(targetRole);

    if (!targetRole) {
      return res.status(400).json({
        success: false,
        message: "Target role is required",
      });
    }

    // Validate target role
    if (!Object.values(UserRole).includes(normalizedTargetRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid target role",
      });
    }

    const result = await processUpgrade(userId, normalizedTargetRole, paymentData || {});

    return res.json({
      success: true,
      message: `Successfully upgraded to ${normalizedTargetRole}`,
      data: result,
    });
  } catch (error) {
    console.error("Upgrade error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * Get available plans (for upgrade UI)
 */
export async function getAvailablePlansController(req, res) {
  try {
    const userId = req.user.uid;
    const userProfile = await getUserProfile(userId);
    const currentRole = normalizeRole(userProfile?.role || UserRole.FREE);

    const plans = [
      {
        role: UserRole.FREE,
        name: "Free Plan",
        price: 0,
        currency: "IDR",
        features: [
          "5 AI Food Scans Daily",
          "Basic Sugar Logging",
          "Standard Processing Speed",
          "7-Day History Retention",
        ],
        limitations: [
          "No diet plan generation",
          "No training plan",
          "No video consultation",
          "No skin scan",
          "No receipt/label/versus scan",
          "Ads enabled",
        ],
        isCurrent: currentRole === UserRole.FREE,
        canUpgrade: false,
      },
      {
        role: UserRole.PRO,
        name: "Pro Plan",
        price: 49000,
        currency: "IDR",
        period: "month",
        features: [
          "50 scans per day",
          "Access to all scan types: food, drink, receipt, versus, label, QR, and skin",
          "100 AI chat messages per day",
          "60 minutes of video calls per month",
          "4-week diet and training plans",
          "Sugar-spike forecasting",
          "Detailed analytics",
          "Ad-free experience",
          "1-year history retention",
        ],
        limitations: [],
        isCurrent: currentRole === UserRole.PRO,
        canUpgrade: currentRole === UserRole.FREE,
        recommended: true,
      },
      {
        role: UserRole.PRO_MAX,
        name: "Pro Max Plan",
        price: null, // Contact for pricing
        currency: "IDR",
        features: [
          "100 scans per day",
          "Access to all scan types",
          "500 AI chat messages per day",
          "300 minutes of video calls per month",
          "Unlimited feed generations",
          "12-week diet and training plans",
          "Sugar-spike forecasting",
          "Advanced analytics",
          "Custom goal setting",
          "Access to beta features",
          "Priority support",
          "Unlimited history retention",
          "Data export capability",
          "Ad-free experience",
        ],
        limitations: [],
        isCurrent: currentRole === UserRole.PRO_MAX,
        canUpgrade: currentRole !== UserRole.PRO_MAX,
        contactRequired: true,
      },
    ];

    return res.json({
      success: true,
      data: {
        currentRole,
        plans,
      },
    });
  } catch (error) {
    console.error("Get plans error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get available plans",
      error: error.message,
    });
  }
}

/**
 * Check subscription expiry (can be called manually or via cron)
 */
export async function checkExpiryController(req, res) {
  try {
    const userId = req.user.uid;

    const result = await checkSubscriptionExpiry(userId);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Check expiry error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check subscription expiry",
      error: error.message,
    });
  }
}

/**
 * Admin: Update user role manually (requires admin permission)
 */
export async function adminUpdateRoleController(req, res) {
  try {
    const { userId, newRole, customPermissions } = req.body;

    if (!userId || !newRole) {
      return res.status(400).json({
        success: false,
        message: "userId and newRole are required",
      });
    }

    const result = await updateUserRole(userId, newRole, customPermissions);

    return res.json({
      success: true,
      message: `User role updated to ${newRole}`,
      data: result,
    });
  } catch (error) {
    console.error("Admin update role error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user role",
      error: error.message,
    });
  }
}
