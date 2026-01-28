/**
 * =====================================================
 * 🚀 MANUAL USER UPGRADE SCRIPT
 * =====================================================
 *
 * Script untuk upgrade role user secara manual.
 * Berguna untuk:
 * - Testing fitur PRO/CUSTOM
 * - Memberikan akses gratis ke user tertentu
 * - Memperbaiki role yang salah
 *
 * CARA PENGGUNAAN:
 * -----------------
 * 1. Upgrade user ke PRO (1 bulan):
 *    node scripts/upgrade-user.js --email user@example.com --role pro
 *
 * 2. Upgrade dengan durasi custom (3 bulan):
 *    node scripts/upgrade-user.js --email user@example.com --role pro --months 3
 *
 * 3. Upgrade ke CUSTOM dengan unlimited duration:
 *    node scripts/upgrade-user.js --email user@example.com --role custom --unlimited
 *
 * 4. Downgrade ke FREE:
 *    node scripts/upgrade-user.js --email user@example.com --role free
 *
 * 5. Upgrade by User ID:
 *    node scripts/upgrade-user.js --uid USER_ID --role pro
 *
 * 6. Dry-run (test tanpa update):
 *    node scripts/upgrade-user.js --email user@example.com --role pro --dry-run
 *
 * =====================================================
 */

import admin from "firebase-admin";
import { readFileSync } from "fs";
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
  role: null,
  months: 1,
  unlimited: false,
  dryRun: false,
  reason: "Manual upgrade via script",
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--email" && args[i + 1]) {
    flags.email = args[i + 1];
    i++;
  } else if (args[i] === "--uid" && args[i + 1]) {
    flags.uid = args[i + 1];
    i++;
  } else if (args[i] === "--role" && args[i + 1]) {
    flags.role = args[i + 1];
    i++;
  } else if (args[i] === "--months" && args[i + 1]) {
    flags.months = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === "--unlimited") {
    flags.unlimited = true;
  } else if (args[i] === "--dry-run") {
    flags.dryRun = true;
  } else if (args[i] === "--reason" && args[i + 1]) {
    flags.reason = args[i + 1];
    i++;
  }
}

// Validate arguments
const VALID_ROLES = ["free", "pro", "custom"];

if (!flags.email && !flags.uid) {
  console.error("\n❌ Error: Either --email or --uid is required");
  console.log("\nUsage:");
  console.log("  node scripts/upgrade-user.js --email user@example.com --role pro");
  console.log("  node scripts/upgrade-user.js --uid USER_ID --role pro --months 3");
  console.log("  node scripts/upgrade-user.js --email user@example.com --role custom --unlimited");
  process.exit(1);
}

if (!flags.role) {
  console.error("\n❌ Error: --role is required");
  console.log("\nValid roles: free, pro, custom");
  process.exit(1);
}

if (!VALID_ROLES.includes(flags.role)) {
  console.error(`\n❌ Error: Invalid role '${flags.role}'`);
  console.log(`Valid roles: ${VALID_ROLES.join(", ")}`);
  process.exit(1);
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

function calculateExpiry(role, months, unlimited) {
  if (role === "free") {
    return null; // FREE tier tidak expire
  }

  if (unlimited) {
    // Set expiry 100 tahun ke depan (praktis unlimited)
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 100);
    return expiry.toISOString();
  }

  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + months);
  return expiry.toISOString();
}

function printUserInfo(userData, userId) {
  console.log("\n" + "=".repeat(80));
  console.log("👤 CURRENT USER INFO");
  console.log("=".repeat(80));
  console.log(`User ID           : ${userId}`);
  console.log(`Email             : ${userData.email || "N/A"}`);
  console.log(`Name              : ${userData.name || "N/A"}`);
  console.log(`Current Role      : ${getRoleEmoji(userData.role)} ${userData.role || "NONE"}`);
  console.log(`Role Updated At   : ${formatDate(userData.roleUpdatedAt)}`);
  console.log(`Subscription Exp  : ${userData.subscriptionExpiry ? formatDate(userData.subscriptionExpiry) : "N/A"}`);
  console.log(`Payment History   : ${userData.paymentHistory?.length || 0} transactions`);
  console.log("=".repeat(80));
}

function printUpgradeInfo(oldRole, newRole, expiry, unlimited) {
  console.log("\n" + "=".repeat(80));
  console.log("🚀 UPGRADE DETAILS");
  console.log("=".repeat(80));
  console.log(`From              : ${getRoleEmoji(oldRole)} ${oldRole || "NONE"}`);
  console.log(`To                : ${getRoleEmoji(newRole)} ${newRole}`);
  console.log(`Duration          : ${unlimited ? "UNLIMITED ♾️" : `${flags.months} month(s)`}`);
  console.log(`Expires On        : ${expiry ? formatDate(expiry) : "Never"}`);
  console.log(`Reason            : ${flags.reason}`);
  console.log("=".repeat(80));
}

// =====================================================
// 🔍 FIND USER
// =====================================================

async function findUser() {
  let userDoc;
  let userId;

  if (flags.uid) {
    console.log(`\n🔍 Searching for user by ID: ${flags.uid}...`);
    userId = flags.uid;
    userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      console.error("\n❌ User not found!");
      process.exit(1);
    }
  } else {
    console.log(`\n🔍 Searching for user by email: ${flags.email}...`);
    const query = await db.collection("users").where("email", "==", flags.email).limit(1).get();

    if (query.empty) {
      console.error("\n❌ User not found!");
      process.exit(1);
    }

    userDoc = query.docs[0];
    userId = userDoc.id;
  }

  return { userDoc, userId, userData: userDoc.data() };
}

// =====================================================
// 🚀 UPGRADE USER
// =====================================================

async function upgradeUser() {
  console.log("\n" + "=".repeat(80));
  console.log("🚀 MANUAL USER UPGRADE");
  console.log("=".repeat(80));
  console.log(`Mode: ${flags.dryRun ? "DRY-RUN (No changes)" : "EXECUTE (Will update DB)"}`);
  console.log("=".repeat(80));

  try {
    // Find user
    const { userDoc, userId, userData } = await findUser();

    console.log("\n✅ User found!");
    printUserInfo(userData, userId);

    // Prepare upgrade data
    const oldRole = userData.role || "NONE";
    const newRole = flags.role;
    const expiry = calculateExpiry(newRole, flags.months, flags.unlimited);

    printUpgradeInfo(oldRole, newRole, expiry, flags.unlimited);

    // Prepare payment history entry
    const paymentEntry = {
      date: new Date().toISOString(),
      fromRole: oldRole,
      toRole: newRole,
      amount: 0, // Manual upgrade, no payment
      method: "manual_script",
      transactionId: `MANUAL_${Date.now()}`,
      status: "success",
      reason: flags.reason,
    };

    // Prepare update data
    const updateData = {
      role: newRole,
      roleUpdatedAt: new Date().toISOString(),
      subscriptionExpiry: expiry,
      paymentHistory: admin.firestore.FieldValue.arrayUnion(paymentEntry),
    };

    // Jika downgrade ke FREE, clear customPermissions
    if (newRole === "free" && userData.customPermissions) {
      updateData.customPermissions = admin.firestore.FieldValue.delete();
    }

    // Simpan previous role untuk tracking
    if (oldRole !== "NONE" && oldRole !== newRole) {
      updateData.previousRole = oldRole;
    }

    if (flags.dryRun) {
      console.log("\n🔍 DRY-RUN MODE: Preview of changes to be made:");
      console.log("-".repeat(80));
      console.log(JSON.stringify(updateData, null, 2));
      console.log("-".repeat(80));
      console.log("\n✅ Dry-run completed. No changes were made.");
      console.log("   Run without --dry-run to execute the upgrade.\n");
      return;
    }

    // Konfirmasi
    console.log("\n⚠️  WARNING: This will update the user's role in the database!");
    console.log("   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Execute update
    console.log("🚀 Updating user...\n");
    await userDoc.ref.update(updateData);

    // Verify
    const updatedDoc = await userDoc.ref.get();
    const updatedData = updatedDoc.data();

    console.log("✅ User successfully upgraded!\n");
    console.log("📋 NEW USER INFO:");
    console.log("-".repeat(80));
    console.log(`Role              : ${getRoleEmoji(updatedData.role)} ${updatedData.role}`);
    console.log(`Role Updated At   : ${formatDate(updatedData.roleUpdatedAt)}`);
    console.log(`Subscription Exp  : ${updatedData.subscriptionExpiry ? formatDate(updatedData.subscriptionExpiry) : "N/A"}`);
    console.log(`Payment History   : ${updatedData.paymentHistory?.length || 0} transactions`);
    console.log("-".repeat(80));

    // Show latest payment entry
    if (updatedData.paymentHistory && updatedData.paymentHistory.length > 0) {
      const latest = updatedData.paymentHistory[updatedData.paymentHistory.length - 1];
      console.log("\n💳 Latest Payment Entry:");
      console.log(`   Date           : ${formatDate(latest.date)}`);
      console.log(`   From           : ${latest.fromRole}`);
      console.log(`   To             : ${latest.toRole}`);
      console.log(`   Transaction ID : ${latest.transactionId}`);
      console.log(`   Reason         : ${latest.reason}`);
    }

    console.log("\n🎉 Upgrade completed successfully!\n");

  } catch (error) {
    console.error("\n❌ Upgrade failed:");
    console.error(error.message);
    console.error(error);
    process.exit(1);
  }
}

// =====================================================
// 🎬 MAIN EXECUTION
// =====================================================

upgradeUser()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script failed:", error);
    process.exit(1);
  });
