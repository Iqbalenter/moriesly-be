import { db } from "../config/firebase.config.js";

const DEFAULT_SUGAR_LIMIT_PER_DAY = 35;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseRangeToHours(range) {
  if (range === "1h") return 1;
  if (range === "7d") return 7 * 24;
  return 24;
}

function formatTimeLabel(date) {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatTimeAgo(date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

function deriveGlucoseValue(log) {
  const base = 75;
  const gi = Number(log.glycemicIndex || 0);
  const sugar = Number(log.sugarGrams || 0);
  const calories = Number(log.calories || 0);
  const value = base + gi * 0.6 + sugar * 0.35 + calories * 0.02;
  return Math.round(clamp(value, 70, 180));
}

function buildGlucoseSeries(logs) {
  const ordered = [...logs].sort((a, b) =>
    String(a.timestamp).localeCompare(String(b.timestamp)),
  );
  let previousWasSpike = false;

  return ordered.map((log) => {
    const value = deriveGlucoseValue(log);
    let status = "stable";

    if (value >= 130) {
      status = "spike";
      previousWasSpike = true;
    } else if (value <= 80) {
      status = "low";
      previousWasSpike = false;
    } else if (previousWasSpike) {
      status = "recovery";
      previousWasSpike = false;
    }

    const date = new Date(log.timestamp);
    return {
      time: Number.isNaN(date.getTime()) ? "-" : formatTimeLabel(date),
      val: value,
      status,
      event: log.name || undefined,
    };
  });
}

function computeGlucoseStability(series) {
  if (!series.length) {
    return { value: 0, trend: "0%" };
  }

  const inRange = series.filter((p) => p.val >= 80 && p.val <= 120).length;
  const stability = Math.round((inRange / series.length) * 100);

  const half = Math.max(1, Math.floor(series.length / 2));
  const firstAvg =
    series.slice(0, half).reduce((sum, p) => sum + p.val, 0) / half;
  const secondAvg =
    series.slice(half).reduce((sum, p) => sum + p.val, 0) /
    Math.max(1, series.length - half);
  const delta = Math.round((secondAvg - firstAvg) * 10) / 10;
  const trend = `${delta >= 0 ? "+" : ""}${delta}%`;

  return { value: stability, trend };
}

function computeMetabolicAge(series) {
  if (!series.length) {
    return { value: 0, trend: "0" };
  }

  const avg = series.reduce((sum, p) => sum + p.val, 0) / series.length;
  const age = Math.round(clamp(22 + (avg - 90) * 0.2, 18, 70));

  const last = series[series.length - 1]?.val ?? avg;
  const trend = Math.round((last - avg) * 10) / 10;
  return { value: age, trend: `${trend >= 0 ? "+" : ""}${trend}` };
}

function computeInflammation(totalSugar, totalCalories) {
  const score = totalSugar * 0.7 + totalCalories * 0.01;
  if (score <= 20) return { value: "Low", trend: "Optimal" };
  if (score <= 45) return { value: "Moderate", trend: "Watch" };
  return { value: "High", trend: "Alert" };
}

function computeSugarLimit(totalSugar, hours) {
  const limit = DEFAULT_SUGAR_LIMIT_PER_DAY * (hours / 24);
  const percent = limit > 0 ? Math.round((totalSugar / limit) * 100) : 0;
  return {
    value: Math.round(totalSugar),
    limit: Math.round(limit),
    trend: `${percent}% Used`,
  };
}

async function fetchDailyLedger(userId, dateKey) {
  try {
    const ledgerRef = db
      .collection("users")
      .doc(userId)
      .collection("dailyLedgers")
      .doc(dateKey);
    const doc = await ledgerRef.get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error("Error fetching daily ledger:", error);
    return null;
  }
}

async function fetchFoodLogs(userId, startIso, endIso) {
  const logsRef = db.collection("users").doc(userId).collection("foodLogs");
  const snapshot = await logsRef
    .where("timestamp", ">=", startIso)
    .where("timestamp", "<=", endIso)
    .orderBy("timestamp", "desc")
    .limit(200)
    .get();

  if (snapshot.empty) return [];

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

function buildRecentScans(logs) {
  return logs.slice(0, 5).map((log) => {
    const date = new Date(log.timestamp);
    const timeLabel = Number.isNaN(date.getTime()) ? "-" : formatTimeAgo(date);
    const score = Math.round(clamp(100 - (log.sugarGrams || 0) * 2, 5, 100));

    let risk = "Moderate";
    if (score >= 85) risk = "Optimal";
    if (score <= 40) risk = "Critical";

    const tags = [];
    if (log.sugarGrams >= 15) tags.push("High Sugar");
    if (log.glycemicIndex >= 70) tags.push("High GI");
    if (log.calories >= 500) tags.push("High Calorie");

    return {
      id: log.id,
      item: log.name || "Unknown",
      time: timeLabel,
      score,
      risk,
      tags: tags.length ? tags : ["Balanced"],
    };
  });
}

/**
 * Create metabolic overview for dashboard analytics
 * @param {string} userId
 * @param {string} range - "1h" | "24h" | "7d"
 * @returns {Promise<object>}
 */
export async function getMetabolicOverview(userId, range = "24h") {
  const hours = parseRangeToHours(range);
  const now = new Date();
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

  const logs = await fetchFoodLogs(
    userId,
    start.toISOString(),
    now.toISOString(),
  );

  const glucoseSeries = buildGlucoseSeries(logs);
  const glucoseStability = computeGlucoseStability(glucoseSeries);
  const metabolicAge = computeMetabolicAge(glucoseSeries);

  const totalSugar = logs.reduce((sum, log) => sum + (log.sugarGrams || 0), 0);
  const totalCalories = logs.reduce((sum, log) => sum + (log.calories || 0), 0);

  const inflammation = computeInflammation(totalSugar, totalCalories);

  let sugarLimit = computeSugarLimit(totalSugar, hours);
  if (range === "24h") {
    const todayKey = new Date().toISOString().split("T")[0];
    const ledger = await fetchDailyLedger(userId, todayKey);
    if (ledger?.limit) {
      sugarLimit = {
        value: Math.round(ledger.consumed || totalSugar),
        limit: Math.round(ledger.limit),
        trend: `${Math.round(
          ((ledger.consumed || totalSugar) / ledger.limit) * 100,
        )}% Used`,
      };
    }
  }

  return {
    success: true,
    data: {
      range,
      totals: {
        sugarGrams: Math.round(totalSugar),
        calories: Math.round(totalCalories),
        count: logs.length,
      },
      stats: {
        glucoseStability,
        metabolicAge,
        inflammation,
        sugarLimit,
      },
      glucoseSeries,
      recentScans: buildRecentScans(logs),
    },
  };
}
