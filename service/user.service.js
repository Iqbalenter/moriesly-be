import { db } from "../config/firebase.config.js";

/**
 * Membuat profil user baru di Firestore
 * Hanya menyimpan data minimal, user akan mengisi data lengkap saat onboarding
 * @param {string} userId - ID user dari Firebase Auth
 * @param {object} profileData - Data profil user (email, name)
 * @returns {Promise<object>} - Profile yang telah dibuat
 */
export async function createUserProfile(userId, profileData) {
  try {
    const userRef = db.collection("users").doc(userId);

    const newProfile = {
      uid: userId,
      email: profileData.email || "",
      name: profileData.name || "",
      // Gamification data (sistem)
      level: 1,
      currentXp: 0,
      nextLevelXp: 100,
      streak: 0,
      lastCheckInDate: null,
      rankTitle: "Recruit",
      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // NOTE: Field lain seperti gender, age, height, weight, dll
      // akan diisi oleh user saat onboarding
    };

    await userRef.set(newProfile);
    return newProfile;
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
}

/**
 * Mengambil profil user dari Firestore
 * @param {string} userId - ID user
 * @returns {Promise<object|null>} - Data profil user atau null jika tidak ditemukan
 */
export async function getUserProfile(userId) {
  try {
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
}

/**
 * Update profil user di Firestore
 * @param {string} userId - ID user
 * @param {object} updateData - Data yang akan diupdate
 * @returns {Promise<object>} - Data profil yang telah diupdate
 */
export async function updateUserProfile(userId, updateData) {
  try {
    const userRef = db.collection("users").doc(userId);

    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    await userRef.update(dataToUpdate);

    const updatedDoc = await userRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

/**
 * Hapus profil user dari Firestore
 * @param {string} userId - ID user
 * @returns {Promise<void>}
 */
export async function deleteUserProfile(userId) {
  try {
    const userRef = db.collection("users").doc(userId);
    await userRef.delete();
  } catch (error) {
    console.error("Error deleting user profile:", error);
    throw error;
  }
}

/**
 * Cek apakah user profile sudah ada
 * @param {string} userId - ID user
 * @returns {Promise<boolean>}
 */
export async function userProfileExists(userId) {
  try {
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();
    return doc.exists;
  } catch (error) {
    console.error("Error checking user profile:", error);
    throw error;
  }
}

/**
 * Initialize user profile jika belum ada
 * @param {string} userId - ID user
 * @param {object} userData - Data user (email, displayName, photoURL)
 * @returns {Promise<object>} - { isNew: boolean, profile: object }
 */
export async function initializeUserProfile(userId, userData) {
  try {
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    // Jika sudah ada, return profile yang ada
    if (doc.exists) {
      return {
        isNew: false,
        profile: { id: doc.id, ...doc.data() },
      };
    }

    // Buat profile baru dengan default values
    const defaultProfile = {
      uid: userId,
      email: userData.email || "",
      name: userData.displayName || userData.email?.split("@")[0] || "Agent",
      photoURL: userData.photoURL || null,
      gender: "male",
      age: 30,
      height: 175,
      weight: 75,
      level: 1,
      currentXp: 0,
      nextLevelXp: 100,
      streak: 0,
      lastCheckInDate: null,
      rankTitle: "Rookie Agent",
      medicalConditions: [],
      // Default subscription settings
      role: "initiate",
      roleUpdatedAt: new Date().toISOString(),
      subscriptionExpiry: null,
      paymentHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    await userRef.set(defaultProfile);

    return {
      isNew: true,
      profile: defaultProfile,
    };
  } catch (error) {
    console.error("Error initializing user profile:", error);
    throw error;
  }
}

/**
 * Save atau update daily ledger
 * @param {string} userId - ID user
 * @param {string} date - Format YYYY-MM-DD
 * @param {object} ledgerData - Data ledger (consumed, saved, willpower, limit, sugarDebt)
 * @returns {Promise<object>}
 */
export async function saveDailyLedger(userId, date, ledgerData) {
  try {
    const ledgerRef = db
      .collection("users")
      .doc(userId)
      .collection("dailyLedgers")
      .doc(date);

    const ledger = {
      date,
      consumed: ledgerData.consumed || 0,
      saved: ledgerData.saved || 0,
      willpower: ledgerData.willpower || 100,
      limit: ledgerData.limit || 25,
      sugarDebt: ledgerData.sugarDebt || 0,
      updatedAt: new Date().toISOString(),
    };

    await ledgerRef.set(ledger, { merge: true });

    return ledger;
  } catch (error) {
    console.error("Error saving daily ledger:", error);
    throw error;
  }
}

/**
 * Get daily ledger
 * @param {string} userId - ID user
 * @param {string} date - Format YYYY-MM-DD
 * @returns {Promise<object|null>}
 */
export async function getDailyLedger(userId, date) {
  try {
    const ledgerRef = db
      .collection("users")
      .doc(userId)
      .collection("dailyLedgers")
      .doc(date);

    const doc = await ledgerRef.get();

    if (!doc.exists) {
      return null;
    }

    return doc.data();
  } catch (error) {
    console.error("Error getting daily ledger:", error);
    throw error;
  }
}

/**
 * Add history item
 * @param {string} userId - ID user
 * @param {object} itemData - Data history item
 * @returns {Promise<object>}
 */
export async function addHistoryItem(userId, itemData) {
  try {
    const historyRef = db.collection("users").doc(userId).collection("history");

    const historyItem = {
      ...itemData,
      timestamp: itemData.timestamp || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const docRef = await historyRef.add(historyItem);

    return {
      id: docRef.id,
      ...historyItem,
    };
  } catch (error) {
    console.error("Error adding history item:", error);
    throw error;
  }
}

/**
 * Get history dengan filter dan pagination
 * @param {string} userId - ID user
 * @param {number} limit - Jumlah item yang diambil
 * @param {string} filterDate - Filter berdasarkan tanggal (YYYY-MM-DD)
 * @returns {Promise<array>}
 */
export async function getHistory(userId, limit = 50, filterDate = null) {
  try {
    let query = db
      .collection("users")
      .doc(userId)
      .collection("history")
      .orderBy("timestamp", "desc")
      .limit(limit);

    if (filterDate) {
      const startOfDay = new Date(filterDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filterDate);
      endOfDay.setHours(23, 59, 59, 999);

      query = db
        .collection("users")
        .doc(userId)
        .collection("history")
        .where("timestamp", ">=", startOfDay.toISOString())
        .where("timestamp", "<=", endOfDay.toISOString())
        .orderBy("timestamp", "desc");
    }

    const snapshot = await query.get();
    const history = [];

    snapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return history;
  } catch (error) {
    console.error("Error getting history:", error);
    throw error;
  }
}

/**
 * Delete history item
 * @param {string} userId - ID user
 * @param {string} historyId - ID history item
 * @returns {Promise<void>}
 */
export async function deleteHistoryItem(userId, historyId) {
  try {
    await db
      .collection("users")
      .doc(userId)
      .collection("history")
      .doc(historyId)
      .delete();
  } catch (error) {
    console.error("Error deleting history item:", error);
    throw error;
  }
}

/**
 * Add weight entry
 * @param {string} userId - ID user
 * @param {object} weightData - { date, weight }
 * @returns {Promise<object>}
 */
export async function addWeightEntry(userId, weightData) {
  try {
    const weightRef = db
      .collection("users")
      .doc(userId)
      .collection("weightEntries")
      .doc(weightData.date);

    const weightEntry = {
      date: weightData.date,
      weight: weightData.weight,
      createdAt: new Date().toISOString(),
    };

    await weightRef.set(weightEntry);

    return weightEntry;
  } catch (error) {
    console.error("Error adding weight entry:", error);
    throw error;
  }
}

/**
 * Get weight history
 * @param {string} userId - ID user
 * @param {number} limit - Jumlah entries yang diambil
 * @returns {Promise<array>}
 */
export async function getWeightHistory(userId, limit = 100) {
  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("weightEntries")
      .orderBy("date", "desc")
      .limit(limit)
      .get();

    const weights = [];
    snapshot.forEach((doc) => {
      weights.push(doc.data());
    });

    return weights;
  } catch (error) {
    console.error("Error getting weight history:", error);
    throw error;
  }
}

/**
 * Process daily check-in
 * @param {string} userId - ID user
 * @returns {Promise<object>}
 */
export async function processDailyCheckIn(userId) {
  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const lastCheckInDate = userData.lastCheckInDate;
    const currentStreak = userData.streak || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    // Cek apakah sudah check-in hari ini
    if (lastCheckInDate === todayStr) {
      return {
        success: false,
        message: "Anda sudah check-in hari ini. Silakan kembali besok!",
        error: "Already checked in today",
        data: {
          streak: currentStreak,
          lastCheckInDate: lastCheckInDate,
        },
      };
    }

    // Hitung streak
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    let newStreak = 1;
    if (lastCheckInDate === yesterdayStr) {
      // Streak berlanjut
      newStreak = currentStreak + 1;
    }

    // Hitung XP dan level
    const currentXp = userData.currentXp || 0;
    const currentLevel = userData.level || 1;
    const nextLevelXp = userData.nextLevelXp || 100;

    let newXp = currentXp + 50; // Check-in reward
    let newLevel = currentLevel;
    let newNextLevelXp = nextLevelXp;

    // Level up logic
    while (newXp >= newNextLevelXp && newLevel < 100) {
      newLevel += 1;
      newXp = newXp - newNextLevelXp;
      newNextLevelXp = Math.floor(newNextLevelXp * 1.15);
    }

    if (newLevel >= 100) {
      newLevel = 100;
      newXp = 0;
    }

    // Update rank title
    const newRank =
      newLevel >= 100
        ? "The Glycemic God"
        : newLevel >= 75
          ? "Bio-Hacking Legend"
          : newLevel >= 50
            ? "Master of Metabolism"
            : newLevel >= 30
              ? "Elite Detective"
              : newLevel >= 20
                ? "Metabolic Enforcer"
                : newLevel >= 10
                  ? "Sugar Hunter"
                  : newLevel >= 5
                    ? "Field Operative"
                    : "Rookie Agent";

    // Update user data
    await userRef.update({
      lastCheckInDate: todayStr,
      streak: newStreak,
      currentXp: newXp,
      level: newLevel,
      nextLevelXp: newNextLevelXp,
      rankTitle: newRank,
      lastCheckInTimestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Check-in successful",
      data: {
        streak: newStreak,
        lastCheckInDate: todayStr,
        xpGained: 50,
        level: newLevel,
        currentXp: newXp,
        nextLevelXp: newNextLevelXp,
        rankTitle: newRank,
        leveledUp: newLevel > currentLevel,
      },
    };
  } catch (error) {
    console.error("Error processing daily check-in:", error);
    throw error;
  }
}

/**
 * Save goal configuration
 * @param {string} userId - ID user
 * @param {object} goalData - Goal configuration
 * @returns {Promise<object>}
 */
export async function getCheckInStatus(userId) {
  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("User profile not found");
    }

    const userData = userDoc.data();
    const lastCheckInDate = userData.lastCheckInDate;

    // Use UTC date for consistency with processDailyCheckIn
    const today = new Date().toISOString().split("T")[0];

    const hasCheckedIn = lastCheckInDate === today;

    return {
      hasCheckedIn,
      lastCheckInDate,
      streak: userData.streak || 0,
      xp: userData.currentXp || 0,
      level: userData.level || 1,
    };
  } catch (error) {
    console.error("Error in getCheckInStatus:", error);
    throw error;
  }
}

export async function saveGoalConfig(userId, goalData) {
  try {
    const userRef = db.collection("users").doc(userId);

    await userRef.update({
      goal: goalData,
      updatedAt: new Date().toISOString(),
    });

    return goalData;
  } catch (error) {
    console.error("Error saving goal config:", error);
    throw error;
  }
}

/**
 * Batch update user data (untuk setup onboarding)
 * @param {string} userId - ID user
 * @param {object} data - { profile, ledger, goal }
 * @returns {Promise<object>}
 */

export async function batchUpdateUserData(userId, data) {
  try {
    const batch = db.batch();

    // Update profile

    if (data.profile) {
      const userRef = db.collection("users").doc(userId);

      batch.update(userRef, {
        ...data.profile,

        updatedAt: new Date().toISOString(),
      });
    }

    // Save ledger

    if (data.ledger && data.ledger.date) {
      const ledgerRef = db

        .collection("users")

        .doc(userId)

        .collection("dailyLedgers")

        .doc(data.ledger.date);

      batch.set(
        ledgerRef,

        {
          date: data.ledger.date,

          ...data.ledger.data,

          updatedAt: new Date().toISOString(),
        },

        { merge: true },
      );
    }

    // Save goal

    if (data.goal) {
      const userRef = db.collection("users").doc(userId);

      batch.update(userRef, {
        goal: data.goal,

        updatedAt: new Date().toISOString(),
      });
    }

    await batch.commit();

    return {
      success: true,

      message: "Batch update successful",
    };
  } catch (error) {
    console.error("Error batch updating user data:", error);

    throw error;
  }
}

/**
 * Save Agent Identity (step 1 onboarding)
 * Stores basic user identity fields directly in user profile.
 * @param {string} userId
 * @param {object} identity - { name, gender, age, height, weight, photoURL? }
 * @returns {Promise<object>} - Updated user profile document
 */
export async function saveAgentIdentity(userId, identity) {
  try {
    const userRef = db.collection("users").doc(userId);

    const payload = {
      name: identity.name ?? null,
      gender: identity.gender ?? null,
      age: identity.age ?? null,
      height: identity.height ?? null,
      weight: identity.weight ?? null,
      photoURL: identity.photoURL ?? null,
      updatedAt: new Date().toISOString(),
    };

    await userRef.set(payload, { merge: true });

    const doc = await userRef.get();
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error("Error saving agent identity:", error);
    throw error;
  }
}

/**
 * Save Calibration (step 2 onboarding)
 * Stores lifestyle calibration under "calibration" field.
 * @param {string} userId
 * @param {object} calibration - { archetypeId, dailySteps, workoutFreq, workoutIntensity, customActivityFactor? }
 * @returns {Promise<object>} - Updated user profile document
 */
export async function saveCalibration(userId, calibration) {
  try {
    const userRef = db.collection("users").doc(userId);

    const payload = {
      calibration: {
        archetypeId: calibration.archetypeId ?? null,
        dailySteps: calibration.dailySteps ?? null,
        workoutFreq: calibration.workoutFreq ?? null,
        workoutIntensity: calibration.workoutIntensity ?? null,
        customActivityFactor: calibration.customActivityFactor ?? null,
      },
      updatedAt: new Date().toISOString(),
    };

    await userRef.set(payload, { merge: true });

    const doc = await userRef.get();
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error("Error saving calibration:", error);
    throw error;
  }
}

/**
 * Save Medical Intel (step 3 onboarding)
 * Stores medical conditions and optional notes/risk.
 * @param {string} userId
 * @param {object} medical - { medicalConditions: string[], notes?, risk? }
 * @returns {Promise<object>} - Updated user profile document
 */
export async function saveMedicalIntel(userId, medical) {
  try {
    const userRef = db.collection("users").doc(userId);

    const payload = {
      medicalConditions: Array.isArray(medical.medicalConditions)
        ? medical.medicalConditions
        : [],
      medicalIntel: {
        notes: medical.notes ?? null,
        risk: medical.risk ?? null,
      },
      updatedAt: new Date().toISOString(),
    };

    await userRef.set(payload, { merge: true });

    const doc = await userRef.get();
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error("Error saving medical intel:", error);
    throw error;
  }
}

/**
 * Save Mission Profile (step 4 onboarding)
 * Stores mission profile and optionally sets today's ledger limit.
 * @param {string} userId
 * @param {object} mission - { goalId, customSugarLimit?, calculatedLimit?, date? }
 * @returns {Promise<object>} - Updated user profile document
 */
export async function saveMissionProfile(userId, mission) {
  try {
    const userRef = db.collection("users").doc(userId);

    const payload = {
      missionProfile: {
        goalId: mission.goalId ?? null,
        customSugarLimit: mission.customSugarLimit ?? null,
        calculatedLimit: mission.calculatedLimit ?? null,
      },
      updatedAt: new Date().toISOString(),
    };

    await userRef.set(payload, { merge: true });

    // If date + limit provided, upsert daily ledger for that date
    const effectiveLimit = mission.calculatedLimit ?? mission.customSugarLimit;
    if (mission.date && effectiveLimit != null) {
      const ledgerRef = db
        .collection("users")
        .doc(userId)
        .collection("dailyLedgers")
        .doc(mission.date);
      await ledgerRef.set(
        {
          date: mission.date,
          limit: effectiveLimit,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    }

    const doc = await userRef.get();
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error("Error saving mission profile:", error);
    throw error;
  }
}

/**
 * Get Onboarding Status (summary of the 4 steps)
 * @param {string} userId
 * @returns {Promise<object>} - { isOnboarded, identityComplete, calibrationComplete, medicalComplete, missionComplete, profile }
 */
export async function getOnboardingStatus(userId) {
  try {
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return {
        isOnboarded: false,
        identityComplete: false,
        calibrationComplete: false,
        medicalComplete: false,
        missionComplete: false,
        profile: null,
      };
    }

    const data = doc.data() || {};

    // Check if user has filled agent identity (name, gender, age, height, weight)
    const identityComplete =
      Boolean(data.name) &&
      Boolean(data.gender) &&
      data.age != null &&
      data.age > 0 &&
      data.height != null &&
      data.height > 0 &&
      data.weight != null &&
      data.weight > 0;

    // Check if user has completed calibration (activity level, workout, etc)
    const calibrationComplete =
      data.calibration != null &&
      (Boolean(data.calibration.archetypeId) ||
        data.calibration.customActivityFactor != null);

    // Check if user has filled medical conditions (can be empty array = completed)
    const medicalComplete = data.medicalConditions !== undefined; // Field exists = completed

    // Check if user has set mission profile (goal + sugar limit)
    const missionComplete =
      data.missionProfile != null &&
      (data.missionProfile.calculatedLimit != null ||
        data.missionProfile.customSugarLimit != null);

    // User is fully onboarded if all critical steps are done
    const isOnboarded =
      identityComplete && calibrationComplete && missionComplete;

    // Return ONLY status flags, NOT the full profile data
    // This prevents recursive nesting issues
    return {
      isOnboarded,
      identityComplete,
      calibrationComplete,
      medicalComplete,
      missionComplete,
    };
  } catch (error) {
    console.error("Error getting onboarding status:", error);
    throw error;
  }
}

/**
 * Save diet plan
 * @param {string} userId - ID user
 * @param {object} dietPlanData - Diet plan data
 * @returns {Promise<object>}
 */
export async function saveDietPlan(userId, dietPlanData) {
  try {
    const planRef = db.collection("users").doc(userId).collection("dietPlans");

    const plan = {
      ...dietPlanData,
      isActive:
        dietPlanData.isActive !== undefined ? dietPlanData.isActive : true,
      completedMeals: dietPlanData.completedMeals || [],
      createdAt: dietPlanData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await planRef.add(plan);

    return {
      id: docRef.id,
      ...plan,
    };
  } catch (error) {
    console.error("Error saving diet plan:", error);
    throw error;
  }
}

/**
 * Get active diet plan
 * @param {string} userId - ID user
 * @returns {Promise<object|null>}
 */
export async function getActiveDietPlan(userId) {
  try {
    const today = new Date().toISOString().split("T")[0];

    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("dietPlans")
      .where("isActive", "==", true)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Pastikan data yang diambil adalah untuk hari ini
    if (data.date !== today) {
      return null;
    }

    return {
      id: doc.id,
      ...data,
    };
  } catch (error) {
    console.error("Error getting active diet plan:", error);
    throw error;
  }
}

/**
 * Update diet plan completion
 * @param {string} userId - ID user
 * @param {string} planId - ID plan
 * @param {array} completedMeals - Array of completed meal indices
 * @returns {Promise<object>}
 */
export async function updateDietCompletion(userId, planId, completedMeals) {
  try {
    const planRef = db
      .collection("users")
      .doc(userId)
      .collection("dietPlans")
      .doc(planId);

    await planRef.update({
      completedMeals,
      updatedAt: new Date().toISOString(),
    });

    return { completedMeals };
  } catch (error) {
    console.error("Error updating diet completion:", error);
    throw error;
  }
}

/**
 * Save training plan
 * @param {string} userId - ID user
 * @param {object} trainingPlanData - Training plan data
 * @returns {Promise<object>}
 */
export async function saveTrainingPlan(userId, trainingPlanData) {
  try {
    const planRef = db
      .collection("users")
      .doc(userId)
      .collection("trainingPlans");

    const plan = {
      ...trainingPlanData,
      isActive:
        trainingPlanData.isActive !== undefined
          ? trainingPlanData.isActive
          : true,
      progress: trainingPlanData.progress || { completed: [] },
      createdAt: trainingPlanData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await planRef.add(plan);

    return {
      id: docRef.id,
      ...plan,
    };
  } catch (error) {
    console.error("Error saving training plan:", error);
    throw error;
  }
}

/**
 * Get active training plan
 * @param {string} userId - ID user
 * @returns {Promise<object|null>}
 */
export async function getActiveTrainingPlan(userId) {
  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("trainingPlans")
      .where("isActive", "==", true)
      .orderBy("createdAt", "desc")
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
    console.error("Error getting active training plan:", error);
    throw error;
  }
}

/**
 * Update training plan progress
 * @param {string} userId - ID user
 * @param {string} planId - ID plan
 * @param {object} progress - Progress object
 * @returns {Promise<object>}
 */
export async function updateTrainingProgress(userId, planId, progress) {
  try {
    const planRef = db
      .collection("users")
      .doc(userId)
      .collection("trainingPlans")
      .doc(planId);

    await planRef.update({
      progress,
      updatedAt: new Date().toISOString(),
    });

    return { progress };
  } catch (error) {
    console.error("Error updating training progress:", error);
    throw error;
  }
}

/**
 * Save consultation session
 * @param {string} userId - ID user
 * @param {object} sessionData - Consultation session data
 * @returns {Promise<object>}
 */
export async function saveConsultation(userId, sessionData) {
  try {
    const consultRef = db
      .collection("users")
      .doc(userId)
      .collection("consultations");

    const session = {
      ...sessionData,
      date: sessionData.date || new Date().toISOString(),
      transcript: sessionData.transcript || [],
      createdAt: new Date().toISOString(),
    };

    const docRef = await consultRef.add(session);

    return {
      id: docRef.id,
      ...session,
    };
  } catch (error) {
    console.error("Error saving consultation:", error);
    throw error;
  }
}

/**
 * Get consultation history
 * @param {string} userId - ID user
 * @param {number} limit - Jumlah sessions yang diambil
 * @returns {Promise<array>}
 */
export async function getConsultationHistory(userId, limit = 10) {
  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("consultations")
      .orderBy("date", "desc")
      .limit(limit)
      .get();

    const consultations = [];
    snapshot.forEach((doc) => {
      consultations.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return consultations;
  } catch (error) {
    console.error("Error getting consultation history:", error);
    throw error;
  }
}

/**
 * Save skin scan result
 * @param {string} userId - ID user
 * @param {object} scanData - Skin scan data
 * @returns {Promise<object>}
 */
export async function saveSkinScan(userId, scanData) {
  try {
    const scanRef = db.collection("users").doc(userId).collection("skinScans");

    const scan = {
      ...scanData,
      date: scanData.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const docRef = await scanRef.add(scan);

    return {
      id: docRef.id,
      ...scan,
    };
  } catch (error) {
    console.error("Error saving skin scan:", error);
    throw error;
  }
}

/**
 * Get latest skin scan
 * @param {string} userId - ID user
 * @returns {Promise<object|null>}
 */
export async function getLatestSkinScan(userId) {
  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("skinScans")
      .orderBy("date", "desc")
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
    console.error("Error getting latest skin scan:", error);
    throw error;
  }
}

/**
 * Get all skin scans
 * @param {string} userId - ID user
 * @param {number} limit - Jumlah scans yang diambil
 * @returns {Promise<array>}
 */
export async function getSkinScans(userId, limit = 10) {
  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("skinScans")
      .orderBy("date", "desc")
      .limit(limit)
      .get();

    const scans = [];
    snapshot.forEach((doc) => {
      scans.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return scans;
  } catch (error) {
    console.error("Error getting skin scans:", error);
    throw error;
  }
}

/**
 * Save weekly plan
 * @param {string} userId - ID user
 * @param {object} weeklyPlanData - Weekly plan data
 * @returns {Promise<object>}
 */
export async function saveWeeklyPlan(userId, weeklyPlanData) {
  try {
    const planRef = db
      .collection("users")
      .doc(userId)
      .collection("weeklyPlans");

    const plan = {
      ...weeklyPlanData,
      type: weeklyPlanData.type || "diet",
      isActive:
        weeklyPlanData.isActive !== undefined ? weeklyPlanData.isActive : true,
      completion: weeklyPlanData.completion || {},
      createdAt: weeklyPlanData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await planRef.add(plan);

    return {
      id: docRef.id,
      ...plan,
    };
  } catch (error) {
    console.error("Error saving weekly plan:", error);
    throw error;
  }
}

/**
 * Get active weekly plan
 * @param {string} userId - ID user
 * @param {string} type - Type of plan (diet/training)
 * @returns {Promise<object|null>}
 */
export async function getActiveWeeklyPlan(userId, type = "diet") {
  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("weeklyPlans")
      .where("type", "==", type)
      .where("isActive", "==", true)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Cek apakah plan sudah expired (lewat dari weekEnd)
    if (data.weekEnd) {
      const now = new Date();
      const weekEnd = new Date(data.weekEnd);

      if (now > weekEnd) {
        return null;
      }
    }

    return {
      id: doc.id,
      ...data,
    };
  } catch (error) {
    console.error("Error getting active weekly plan:", error);
    throw error;
  }
}

/**
 * Update weekly plan completion
 * @param {string} userId - ID user
 * @param {string} planId - ID plan
 * @param {object} completion - Completion object
 * @returns {Promise<object>}
 */
export async function updateWeeklyCompletion(userId, planId, completion) {
  try {
    const planRef = db
      .collection("users")
      .doc(userId)
      .collection("weeklyPlans")
      .doc(planId);

    await planRef.update({
      completion,
      updatedAt: new Date().toISOString(),
    });

    return { completion };
  } catch (error) {
    console.error("Error updating weekly completion:", error);
    throw error;
  }
}

/**
 * Get ledger range
 * @param {string} userId - ID user
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<array>}
 */
export async function getLedgerRange(userId, startDate, endDate) {
  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("dailyLedgers")
      .where("date", ">=", startDate)
      .where("date", "<=", endDate)
      .orderBy("date", "asc")
      .get();

    const ledgers = [];
    snapshot.forEach((doc) => {
      ledgers.push(doc.data());
    });

    return ledgers;
  } catch (error) {
    console.error("Error getting ledger range:", error);
    throw error;
  }
}

/**
 * Get history by action
 * @param {string} userId - ID user
 * @param {string} action - Action type (consumed/rejected/scanned)
 * @param {number} limit - Jumlah items
 * @returns {Promise<array>}
 */
export async function getHistoryByAction(userId, action, limit = 50) {
  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("history")
      .where("action", "==", action)
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    const history = [];
    snapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return history;
  } catch (error) {
    console.error("Error getting history by action:", error);
    throw error;
  }
}

/**
 * Get current goal
 * @param {string} userId - ID user
 * @returns {Promise<object|null>}
 */
export async function getCurrentGoal(userId) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    return userData.missionProfile.goalId || null;
  } catch (error) {
    console.error("Error getting current goal:", error);
    throw error;
  }
}

/**
 * Update goal progress
 * @param {string} userId - ID user
 * @param {number} currentWeight - Current weight
 * @returns {Promise<object>}
 */
export async function updateGoalProgress(userId, currentWeight) {
  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const goal = userData.goal || {};

    await userRef.update({
      "goal.currentWeight": currentWeight,
      weight: currentWeight,
      updatedAt: new Date().toISOString(),
    });

    return {
      ...goal,
      currentWeight,
    };
  } catch (error) {
    console.error("Error updating goal progress:", error);
    throw error;
  }
}

/**
 * Get complete status data
 * @param {string} userId - ID user
 * @param {string} date - Date for ledger (YYYY-MM-DD), default today
 * @returns {Promise<object>}
 */
export async function getStatusData(userId, date = null) {
  try {
    const targetDate = date || new Date().toISOString().split("T")[0];

    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userProfile = { id: userDoc.id, ...userDoc.data() };

    const ledger = await getDailyLedger(userId, targetDate);

    const weightHistory = await getWeightHistory(userId, 30);

    const goal = userProfile.goal || {
      eventName: "Health Mission",
      startDate: targetDate,
      targetDate: targetDate,
      startWeight: userProfile.weight || 0,
      currentWeight: userProfile.weight || 0,
      targetWeight: userProfile.weight || 0,
    };

    return {
      userProfile: {
        name: userProfile.name,
        gender: userProfile.gender,
        age: userProfile.age,
        height: userProfile.height,
        weight: userProfile.weight,
        level: userProfile.level,
        currentXp: userProfile.currentXp,
        nextLevelXp: userProfile.nextLevelXp,
        streak: userProfile.streak,
        lastCheckInDate: userProfile.lastCheckInDate,
        rankTitle: userProfile.rankTitle,
        medicalConditions: userProfile.medicalConditions || [],
      },
      ledger: ledger || {
        consumed: 0,
        saved: 0,
        willpower: 100,
        limit: 25,
        sugarDebt: 0,
      },
      goal: goal,
      weightHistory: weightHistory,
    };
  } catch (error) {
    console.error("Error getting status data:", error);
    throw error;
  }
}

export async function generateDailyTrainingPlan(
  userId,
  date,
  userProfile,
  params,
) {
  try {
    // Check if plan already exists for this date
    const existingPlan = await getDailyTrainingPlan(userId, date);

    if (existingPlan) {
      // Calculate next available time (tomorrow 00:00)
      const tomorrow = new Date(date);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const { TRAINING_RATE_LIMIT_MESSAGE } =
        await import("../utils/training-prompts.js");

      throw new Error(TRAINING_RATE_LIMIT_MESSAGE(tomorrow.toISOString()));
    }

    // Build constraints string
    let constraints = "";
    if (params.inputMode === "manual") {
      constraints = params.customParams || "No specific constraints";
    } else {
      const effectiveFocus =
        params.focusArea === "Custom"
          ? params.customFocusInput || "General Fitness"
          : params.focusArea;
      constraints = `Focus Area: ${effectiveFocus}. Intensity Level: ${params.intensity}. Available Equipment: ${params.equipment}.`;
    }

    // Generate plan using AI
    const aiService = (await import("./ai.service.js")).default;
    const plan = await aiService.generateDailyTrainingPlan(
      userProfile,
      params.mode,
      constraints,
    );

    // Save to Firestore
    const planRef = db
      .collection("users")
      .doc(userId)
      .collection("trainingPlans")
      .doc(date);

    const trainingPlan = {
      date,
      plan,
      completedIndices: [],
      completedMealIndices: [],
      generatedWith: {
        mode: params.mode,
        focusArea: params.focusArea,
        intensity: params.intensity,
        equipment: params.equipment,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await planRef.set(trainingPlan);

    return trainingPlan;
  } catch (error) {
    console.error("Error generating daily training plan:", error);
    throw error;
  }
}

export async function saveDailyTrainingPlan(userId, date, plan) {
  try {
    const planRef = db
      .collection("users")
      .doc(userId)
      .collection("trainingPlans")
      .doc(date);

    const trainingPlan = {
      date,
      plan,
      completedIndices: [],
      completedMealIndices: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await planRef.set(trainingPlan);

    return trainingPlan;
  } catch (error) {
    console.error("Error saving daily training plan:", error);
    throw error;
  }
}

export async function getDailyTrainingPlan(userId, date) {
  try {
    const planRef = db
      .collection("users")
      .doc(userId)
      .collection("trainingPlans")
      .doc(date);

    const doc = await planRef.get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error("Error getting daily training plan:", error);
    throw error;
  }
}

export async function hasGeneratedTodayPlan(userId, date) {
  try {
    const planRef = db
      .collection("users")
      .doc(userId)
      .collection("trainingPlans")
      .doc(date);

    const doc = await planRef.get();
    return doc.exists;
  } catch (error) {
    console.error("Error checking today's plan:", error);
    throw error;
  }
}

export async function updateTrainingCompletion(
  userId,
  date,
  type,
  index,
  completed,
) {
  try {
    const planRef = db
      .collection("users")
      .doc(userId)
      .collection("trainingPlans")
      .doc(date);

    const planDoc = await planRef.get();

    if (!planDoc.exists) {
      throw new Error("Training plan not found");
    }

    const data = planDoc.data();
    let completedIndices = data.completedIndices || [];
    let completedMealIndices = data.completedMealIndices || [];

    // Update specific index
    if (type === "workout") {
      if (completed) {
        if (!completedIndices.includes(index)) completedIndices.push(index);
      } else {
        completedIndices = completedIndices.filter((i) => i !== index);
      }
    } else if (type === "meal") {
      if (completed) {
        if (!completedMealIndices.includes(index))
          completedMealIndices.push(index);
      } else {
        completedMealIndices = completedMealIndices.filter((i) => i !== index);
      }
    }

    await planRef.update({
      completedIndices,
      completedMealIndices,
      updatedAt: new Date().toISOString(),
    });

    // Add XP if completed
    if (completed) {
      const xpAmount = type === "workout" ? 20 : 15;
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        let currentXp = (userData.currentXp || 0) + xpAmount;
        let level = userData.level || 1;
        let nextLevelXp = userData.nextLevelXp || 100;

        // Level Up Calculation
        if (currentXp >= nextLevelXp) {
          currentXp = currentXp - nextLevelXp;
          level += 1;
          nextLevelXp = Math.floor(nextLevelXp * 1.15);
        }

        await userRef.update({
          currentXp,
          level,
          nextLevelXp,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return {
      completedIndices,
      completedMealIndices,
    };
  } catch (error) {
    console.error("Error updating training completion:", error);
    throw error;
  }
}

export async function getTrainingCompletion(userId, date) {
  try {
    const planRef = db
      .collection("users")
      .doc(userId)
      .collection("trainingPlans")
      .doc(date);

    const doc = await planRef.get();

    if (!doc.exists) {
      return {
        completedIndices: [],
        completedMealIndices: [],
      };
    }

    const data = doc.data();
    return {
      completedIndices: data.completedIndices || [],
      completedMealIndices: data.completedMealIndices || [],
    };
  } catch (error) {
    console.error("Error getting training completion:", error);
    throw error;
  }
}
