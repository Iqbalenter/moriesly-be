import { db } from "../config/firebase.config.js";

/**
 * Simpan food log entry ke Firestore
 * @param {string} userId - User ID
 * @param {object} logData - Data log makanan/minuman
 * @returns {Promise<object>} - Log entry yang tersimpan
 */
export async function createFoodLog(userId, logData) {
  try {
    const logsRef = db.collection("users").doc(userId).collection("foodLogs");

    const newLog = {
      name: logData.name,
      sugarGrams: logData.sugarGrams || 0,
      glycemicIndex: logData.glycemicIndex || 0,
      verdict: logData.verdict || "",
      type: logData.type || "food",
      calories: logData.calories || 0,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split("T")[0], // YYYY-MM-DD format
      createdAt: new Date().toISOString(),
    };

    const docRef = await logsRef.add(newLog);

    return {
      id: docRef.id,
      ...newLog,
    };
  } catch (error) {
    console.error("Error creating food log:", error);
    throw error;
  }
}

/**
 * Ambil food logs user untuk hari ini
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of food logs
 */
export async function getTodayFoodLogs(userId) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const logsRef = db.collection("users").doc(userId).collection("foodLogs");

    const snapshot = await logsRef
      .where("date", "==", today)
      .orderBy("timestamp", "desc")
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting today food logs:", error);
    throw error;
  }
}

/**
 * Ambil food logs user dalam range tanggal
 * @param {string} userId - User ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} - Array of food logs
 */
export async function getFoodLogsByDateRange(userId, startDate, endDate) {
  try {
    const logsRef = db.collection("users").doc(userId).collection("foodLogs");

    const snapshot = await logsRef
      .where("date", ">=", startDate)
      .where("date", "<=", endDate)
      .orderBy("date", "desc")
      .orderBy("timestamp", "desc")
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting food logs by date range:", error);
    throw error;
  }
}

/**
 * Hitung total sugar hari ini
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Total sugar dalam gram
 */
export async function getTodaySugarTotal(userId) {
  try {
    const logs = await getTodayFoodLogs(userId);

    const totalSugar = logs.reduce((sum, log) => {
      return sum + (log.sugarGrams || 0);
    }, 0);

    return totalSugar;
  } catch (error) {
    console.error("Error calculating today sugar total:", error);
    throw error;
  }
}

/**
 * Delete food log
 * @param {string} userId - User ID
 * @param {string} logId - Log ID
 * @returns {Promise<void>}
 */
export async function deleteFoodLog(userId, logId) {
  try {
    const logRef = db
      .collection("users")
      .doc(userId)
      .collection("foodLogs")
      .doc(logId);
    await logRef.delete();
  } catch (error) {
    console.error("Error deleting food log:", error);
    throw error;
  }
}

/**
 * Get statistics untuk dashboard
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Statistics object
 */
export async function getFoodLogStatistics(userId) {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split("T")[0];

    const logs = await getFoodLogsByDateRange(userId, startDate, today);

    // Group by date
    const dailyStats = {};
    logs.forEach((log) => {
      if (!dailyStats[log.date]) {
        dailyStats[log.date] = {
          totalSugar: 0,
          itemCount: 0,
          items: [],
        };
      }
      dailyStats[log.date].totalSugar += log.sugarGrams || 0;
      dailyStats[log.date].itemCount += 1;
      dailyStats[log.date].items.push(log);
    });

    return {
      last7Days: dailyStats,
      todayTotal: dailyStats[today]?.totalSugar || 0,
      todayCount: dailyStats[today]?.itemCount || 0,
    };
  } catch (error) {
    console.error("Error getting food log statistics:", error);
    throw error;
  }
}

export async function getFoodLogsByTimeRange(userId, hours = 24) {
  try {
    const logsRef = db.collection("users").doc(userId).collection("foodLogs");
    const now = new Date();
    const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

    const snapshot = await logsRef
      .where("timestamp", ">=", start.toISOString())
      .orderBy("timestamp", "desc")
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting food logs by time range:", error);
    throw error;
  }
}
