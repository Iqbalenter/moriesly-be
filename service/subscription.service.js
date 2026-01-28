import { db } from "../config/firebase.config.js";
import admin from "../config/firebase.config.js";
import { UserRole, canUpgradeTo } from "../utils/role.config.js";

/**
 * Update user role/subscription
 */
export async function updateUserRole(
  userId,
  newRole,
  customPermissions = null,
) {
  try {
    const userRef = db.collection("users").doc(userId);
    const updateData = {
      role: newRole,
      roleUpdatedAt: new Date().toISOString(),
    };

    // Jika handler role dan ada customPermissions
    if (newRole === UserRole.HANDLER && customPermissions) {
      updateData.customPermissions = customPermissions;
    }

    await userRef.update(updateData);

    // Get updated profile
    const updatedDoc = await userRef.get();
    return updatedDoc.data();
  } catch (error) {
    console.error("Error updating user role:", error);
    throw new Error("Failed to update user role");
  }
}

/**
 * Get user subscription info
 */
export async function getSubscriptionInfo(userId) {
  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();

    return {
      role: userData.role || UserRole.INITIATE,
      roleUpdatedAt: userData.roleUpdatedAt || null,
      customPermissions: userData.customPermissions || null,
      subscriptionExpiry: userData.subscriptionExpiry || null,
      paymentHistory: userData.paymentHistory || [],
    };
  } catch (error) {
    console.error("Error getting subscription info:", error);
    throw new Error("Failed to get subscription info");
  }
}

/**
 * Check dan get usage statistics
 */
export async function getUserUsageStats(userId, date = null) {
  try {
    const targetDate = date || new Date().toISOString().split("T")[0];
    // Use ISO strings for querying since that's how it's stored
    const startOfDay = targetDate + "T00:00:00.000Z";
    const endOfDay = targetDate + "T23:59:59.999Z";

    // Get scan count hari ini
    // Note: We filter by action in memory to avoid needing a composite index
    const historyRef = db.collection("users").doc(userId).collection("history");
    const todayHistorySnapshot = await historyRef
      .where("timestamp", ">=", startOfDay)
      .where("timestamp", "<=", endOfDay)
      .get();

    const scansToday = todayHistorySnapshot.docs.filter(
      (doc) => doc.data().action === "scanned",
    ).length;

    // Get chat count hari ini (if chat collection exists)
    let chatMessagesToday = 0;
    try {
      const chatRef = db
        .collection("users")
        .doc(userId)
        .collection("chat_messages");
      // Note: We filter by role in memory to avoid needing a composite index
      const todayChatsSnapshot = await chatRef
        .where("timestamp", ">=", startOfDay)
        .where("timestamp", "<=", endOfDay)
        .get();

      chatMessagesToday = todayChatsSnapshot.docs.filter(
        (doc) => doc.data().role === "user",
      ).length;
    } catch (chatError) {
      // Chat collection might not exist yet
      console.log("Chat collection not found or error:", chatError.message);
    }

    return {
      date: targetDate,
      scansToday: scansToday,
      chatMessagesToday,
    };
  } catch (error) {
    console.error("Error getting usage stats:", error);
    throw new Error("Failed to get usage stats");
  }
}

/**
 * Get today's scan count (helper function untuk middleware)
 */
export async function getTodayScans(userId) {
  const stats = await getUserUsageStats(userId);
  return stats.scansToday;
}

/**
 * Get today's chat count (helper function untuk middleware)
 */
export async function getTodayChats(userId) {
  const stats = await getUserUsageStats(userId);
  return stats.chatMessagesToday;
}

/**
 * Simulate payment & upgrade (simplified version)
 * Di production, ini akan integrate dengan payment gateway
 */
export async function processUpgrade(userId, targetRole, paymentData) {
  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const currentRole = userDoc.data().role || UserRole.INITIATE;

    // Check if upgrade is valid
    if (!canUpgradeTo(currentRole, targetRole)) {
      throw new Error(`Cannot upgrade from ${currentRole} to ${targetRole}`);
    }

    // Simulate payment processing
    // TODO: Integrate dengan payment gateway (Midtrans, Stripe, dll)

    // Update role
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1); // 1 bulan subscription

    await userRef.update({
      role: targetRole,
      roleUpdatedAt: new Date().toISOString(),
      subscriptionExpiry: expiry.toISOString(),
      paymentHistory: admin.firestore.FieldValue.arrayUnion({
        date: new Date().toISOString(),
        fromRole: currentRole,
        toRole: targetRole,
        amount: paymentData.amount,
        method: paymentData.method,
        transactionId: paymentData.transactionId || "SIMULATED_" + Date.now(),
      }),
    });

    return {
      success: true,
      newRole: targetRole,
      expiryDate: expiry.toISOString(),
    };
  } catch (error) {
    console.error("Error processing upgrade:", error);
    throw error;
  }
}

/**
 * Check subscription expiry dan auto-downgrade jika expired
 */
export async function checkSubscriptionExpiry(userId) {
  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return { expired: false };
    }

    const userData = userDoc.data();
    const role = userData.role || UserRole.INITIATE;
    const expiry = userData.subscriptionExpiry;

    // INITIATE users tidak punya expiry
    if (role === UserRole.INITIATE) {
      return { expired: false, role };
    }

    // Check if expired
    if (expiry) {
      const expiryDate = new Date(expiry);
      const now = new Date();

      if (now > expiryDate) {
        // Downgrade to INITIATE
        await userRef.update({
          role: UserRole.INITIATE,
          roleUpdatedAt: new Date().toISOString(),
          previousRole: role,
        });

        return {
          expired: true,
          previousRole: role,
          newRole: UserRole.INITIATE,
        };
      }
    }

    return { expired: false, role };
  } catch (error) {
    console.error("Error checking subscription expiry:", error);
    throw new Error("Failed to check subscription expiry");
  }
}

/**
 * Get subscription status with feature details
 */
export async function getSubscriptionStatus(userId) {
  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const role = userData.role || UserRole.INITIATE;
    const subscription = userData.subscription || {};

    // Feature details untuk setiap tier
    const featureDetails = {
      operative: {
        scans: "50 scans/day (all types)",
        chat: "100 AI chat messages/day",
        feed: "20 feed generations/day",
        diet: "Diet & training plans (4 weeks)",
        skin: "Skin scan",
        sugar: "Sugar forecast",
      },
      handler: {
        scans: "100 scans/day",
        chat: "500 AI chat messages/day",
        feed: "Unlimited feed generations",
        diet: "Diet & training plans (12 weeks)",
        beta: "All features + beta access",
        custom: "Custom permissions per user",
      },
    };

    // Tentukan status berdasarkan role
    let status = "active";
    if (role === UserRole.INITIATE) {
      status = "none";
    } else if (subscription.status) {
      status = subscription.status;
    }

    // Build response
    const response = {
      role: role,
      status: status,
      subscription: null,
    };

    // Helper function to convert Firebase Timestamp to ISO string
    const toISOString = (dateValue) => {
      if (!dateValue) return null;

      // If it's a Firestore Timestamp object
      if (dateValue && typeof dateValue.toDate === 'function') {
        return dateValue.toDate().toISOString();
      }

      // If it's already a Date object
      if (dateValue instanceof Date) {
        return dateValue.toISOString();
      }

      // If it's a string, try to parse it
      if (typeof dateValue === 'string') {
        return dateValue;
      }

      return null;
    };

    // Jika ada subscription aktif
    if (role !== UserRole.INITIATE && subscription.plan) {
      response.subscription = {
        plan: subscription.plan,
        currentPeriodStart: toISOString(subscription.currentPeriodStart),
        currentPeriodEnd: toISOString(subscription.currentPeriodEnd || userData.subscriptionExpiry),
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
        endsAt: toISOString(subscription.endsAt),
      };
    }

    // Tambahkan feature details
    if (role === UserRole.OPERATIVE || role === UserRole.HANDLER) {
      response.features = featureDetails[role];
    }

    return response;
  } catch (error) {
    console.error("Error getting subscription status:", error);
    throw new Error("Failed to get subscription status");
  }
}
