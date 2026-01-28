/**
 * =====================================================
 * 🔍 CHECK USER ROLES STATUS
 * =====================================================
 *
 * Script untuk mengecek status role dari users di database.
 * Berguna untuk verify hasil migration atau melihat distribusi role.
 *
 * CARA PENGGUNAAN:
 * -----------------
 * 1. Check semua users:
 *    node scripts/check-user-roles.js
 *
 * 2. Check specific user by email:
 *    node scripts/check-user-roles.js --email user@example.com
 *
 * 3. Check specific user by ID:
 *    node scripts/check-user-roles.js --uid USER_ID
 *
 * 4. Check users without role only:
 *    node scripts/check-user-roles.js --missing-only
 *
 * 5. Export to JSON:
 *    node scripts/check-user-roles.js --export report.json
 *
 * =====================================================
 */

import admin from "firebase-admin";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, isAbsolute } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =====================================================
// 🔧 FIREBASE INITIALIZATION
// =====================================================

const envServicePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const serviceAccountPath = envServicePath
  ? isAbsolute(envServicePath)
    ? envServicePath
    : join(__dirname, "..", envServicePath)
  : join(
      __dirname,
      "..",
      "project-cdfb53f0-89f3-4240-b91-firebase-adminsdk-fbsvc-2eb52c86fe.json",
    );

let serviceAccount;

try {
  const serviceAccountFile = readFileSync(serviceAccountPath, "utf8");
  serviceAccount = JSON.parse(serviceAccountFile);
  console.log("✅ Firebase service account loaded!");
} catch (error) {
  console.error("❌ ERROR: Cannot load Firebase service account");
  console.error("Path tried:", serviceAccountPath);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// =====================================================
// 📊 PARSE ARGUMENTS
// =====================================================

const args = process.argv.slice(2);
const flags = {
  email: null,
  uid: null,
  missingOnly: false,
  export: null,
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--email" && args[i + 1]) {
    flags.email = args[i + 1];
    i++;
  } else if (args[i] === "--uid" && args[i + 1]) {
    flags.uid = args[i + 1];
    i++;
  } else if (args[i] === "--missing-only") {
    flags.missingOnly = true;
  } else if (args[i] === "--export" && args[i + 1]) {
    flags.export = args[i + 1];
    i++;
  }
}

// =====================================================
// 🎨 HELPER FUNCTIONS
// =====================================================

function formatDate(isoString) {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  return date.toLocaleDateString("id-ID") + " " + date.toLocaleTimeString("id-ID");
}

function getRoleEmoji(role) {
  switch (role) {
    case "free":
      return "🆓";
    case "pro":
      return "⭐";
    case "custom":
      return "💎";
    default:
      return "❓";
  }
}

function printUserDetails(userData, userId) {
  console.log("\n" + "=".repeat(80));
  console.log(`👤 USER: ${userData.name || "N/A"} (${userData.email || "N/A"})`);
  console.log("=".repeat(80));
  console.log(`User ID           : ${userId}`);
  console.log(`Role              : ${getRoleEmoji(userData.role)} ${userData.role || "MISSING"}`);
  console.log(`Role Updated At   : ${formatDate(userData.roleUpdatedAt)}`);
  console.log(`Subscription Exp  : ${userData.subscriptionExpiry ? formatDate(userData.subscriptionExpiry) : "N/A"}`);
  console.log(`Payment History   : ${userData.paymentHistory?.length || 0} transactions`);

  if (userData.customPermissions) {
    console.log(`Custom Permissions: ${Object.keys(userData.customPermissions).length} custom settings`);
  }

  console.log(`Created At        : ${formatDate(userData.createdAt)}`);
  console.log("=".repeat(80));

  // Tampilkan payment history jika ada
  if (userData.paymentHistory && userData.paymentHistory.length > 0) {
    console.log("\n💳 PAYMENT HISTORY:");
    userData.paymentHistory.forEach((payment, index) => {
      console.log(`   ${index + 1}. ${formatDate(payment.date)} - ${payment.fromRole} → ${payment.toRole}`);
      console.log(`      Amount: Rp ${payment.amount?.toLocaleString("id-ID") || "N/A"} | Method: ${payment.method}`);
      console.log(`      Transaction ID: ${payment.transactionId} | Status: ${payment.status}`);
    });
  }
}

function printStatistics(stats) {
  console.log("\n" + "=".repeat(80));
  console.log("📊 ROLE DISTRIBUTION STATISTICS");
  console.log("=".repeat(80));
  console.log(`Total Users       : ${stats.total}`);
  console.log(`🆓 FREE Users     : ${stats.free} (${((stats.free / stats.total) * 100).toFixed(1)}%)`);
  console.log(`⭐ PRO Users      : ${stats.pro} (${((stats.pro / stats.total) * 100).toFixed(1)}%)`);
  console.log(`💎 CUSTOM Users   : ${stats.custom} (${((stats.custom / stats.total) * 100).toFixed(1)}%)`);
  console.log(`❌ NO ROLE        : ${stats.missing} (${((stats.missing / stats.total) * 100).toFixed(1)}%)`);
  console.log("=".repeat(80));

  if (stats.expiredSoon.length > 0) {
    console.log("\n⚠️  SUBSCRIPTIONS EXPIRING SOON (within 7 days):");
    stats.expiredSoon.forEach((user) => {
      console.log(`   - ${user.email}: ${user.role} expires on ${formatDate(user.subscriptionExpiry)}`);
    });
  }

  if (stats.recentUpgrades.length > 0) {
    console.log("\n🆙 RECENT UPGRADES (last 30 days):");
    stats.recentUpgrades.forEach((user) => {
      console.log(`   - ${user.email}: upgraded to ${user.role} on ${formatDate(user.roleUpdatedAt)}`);
    });
  }
}

// =====================================================
// 🔍 CHECK FUNCTIONS
// =====================================================

async function checkSpecificUser(identifier, type) {
  console.log(`\n🔍 Searching for user by ${type}: ${identifier}...\n`);

  let query;
  if (type === "email") {
    query = db.collection("users").where("email", "==", identifier).limit(1);
  } else {
    // by UID
    const doc = await db.collection("users").doc(identifier).get();
    if (doc.exists) {
      printUserDetails(doc.data(), doc.id);
      return;
    } else {
      console.log("❌ User not found!");
      return;
    }
  }

  const snapshot = await query.get();
  if (snapshot.empty) {
    console.log("❌ User not found!");
    return;
  }

  snapshot.forEach((doc) => {
    printUserDetails(doc.data(), doc.id);
  });
}

async function checkAllUsers() {
  console.log("\n🔍 Fetching all users from database...\n");

  const usersSnapshot = await db.collection("users").get();
  const total = usersSnapshot.size;

  console.log(`✅ Found ${total} users\n`);

  if (total === 0) {
    console.log("⚠️  No users found in database.\n");
    return;
  }

  const stats = {
    total: 0,
    free: 0,
    pro: 0,
    custom: 0,
    missing: 0,
    expiredSoon: [],
    recentUpgrades: [],
  };

  const usersList = [];
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  console.log("📋 USER LIST:");
  console.log("-".repeat(100));
  console.log(
    "No.".padEnd(5) +
    "Email".padEnd(35) +
    "Role".padEnd(12) +
    "Updated".padEnd(20) +
    "Expires".padEnd(20) +
    "Payments"
  );
  console.log("-".repeat(100));

  usersSnapshot.forEach((doc, index) => {
    const userData = doc.data();
    const userId = doc.id;

    stats.total++;

    const role = userData.role || "MISSING";
    if (role === "free") stats.free++;
    else if (role === "pro") stats.pro++;
    else if (role === "custom") stats.custom++;
    else stats.missing++;

    // Skip jika flag missing-only dan user sudah punya role
    if (flags.missingOnly && role !== "MISSING") {
      return;
    }

    // Check expiring soon
    if (userData.subscriptionExpiry) {
      const expiryDate = new Date(userData.subscriptionExpiry);
      if (expiryDate > now && expiryDate < sevenDaysFromNow) {
        stats.expiredSoon.push({
          email: userData.email,
          role: userData.role,
          subscriptionExpiry: userData.subscriptionExpiry,
        });
      }
    }

    // Check recent upgrades
    if (userData.roleUpdatedAt) {
      const updatedDate = new Date(userData.roleUpdatedAt);
      if (updatedDate > thirtyDaysAgo && userData.role !== "free") {
        stats.recentUpgrades.push({
          email: userData.email,
          role: userData.role,
          roleUpdatedAt: userData.roleUpdatedAt,
        });
      }
    }

    const email = (userData.email || "N/A").substring(0, 33);
    const roleDisplay = `${getRoleEmoji(role)} ${role}`;
    const updated = userData.roleUpdatedAt
      ? new Date(userData.roleUpdatedAt).toLocaleDateString("id-ID")
      : "N/A";
    const expires = userData.subscriptionExpiry
      ? new Date(userData.subscriptionExpiry).toLocaleDateString("id-ID")
      : "Never";
    const payments = userData.paymentHistory?.length || 0;

    console.log(
      `${(index + 1).toString().padEnd(5)}${email.padEnd(35)}${roleDisplay.padEnd(12)}${updated.padEnd(20)}${expires.padEnd(20)}${payments}`
    );

    usersList.push({
      userId,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      roleUpdatedAt: userData.roleUpdatedAt,
      subscriptionExpiry: userData.subscriptionExpiry,
      paymentHistory: userData.paymentHistory,
      createdAt: userData.createdAt,
    });
  });

  console.log("-".repeat(100));

  printStatistics(stats);

  // Export jika diminta
  if (flags.export) {
    const report = {
      generatedAt: new Date().toISOString(),
      statistics: stats,
      users: usersList,
    };

    writeFileSync(flags.export, JSON.stringify(report, null, 2), "utf8");
    console.log(`\n💾 Report exported to: ${flags.export}`);
  }
}

// =====================================================
// 🎬 MAIN EXECUTION
// =====================================================

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🔍 USER ROLES STATUS CHECKER");
  console.log("=".repeat(80));

  try {
    if (flags.email) {
      await checkSpecificUser(flags.email, "email");
    } else if (flags.uid) {
      await checkSpecificUser(flags.uid, "uid");
    } else {
      await checkAllUsers();
    }

    console.log("\n✅ Check completed!\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script failed:", error);
    process.exit(1);
  });
