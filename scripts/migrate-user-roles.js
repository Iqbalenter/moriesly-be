/**
 * =====================================================
 * 🔄 MIGRATION SCRIPT: Add Role System to Existing Users
 * =====================================================
 *
 * Script ini akan menambahkan field role system ke user-user lama
 * yang belum memiliki field tersebut.
 *
 * Field yang akan ditambahkan:
 * - role: "free" (default)
 * - roleUpdatedAt: timestamp sekarang
 * - subscriptionExpiry: null (karena free tier tidak expire)
 * - paymentHistory: [] (array kosong)
 *
 * CARA PENGGUNAAN:
 * -----------------
 * 1. Dry-run (test tanpa update):
 *    node scripts/migrate-user-roles.js --dry-run
 *
 * 2. Execute (update database):
 *    node scripts/migrate-user-roles.js
 *
 * 3. Force update semua user (bahkan yang sudah punya role):
 *    node scripts/migrate-user-roles.js --force
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
// 🎯 CONFIGURATION
// =====================================================

const DEFAULT_ROLE = "free";
const BATCH_SIZE = 500; // Firestore batch limit

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isForce = args.includes("--force");

// =====================================================
// 📊 HELPER FUNCTIONS
// =====================================================

function printHeader() {
  console.log("\n" + "=".repeat(60));
  console.log("🔄 MIGRATION: Add Role System to Existing Users");
  console.log("=".repeat(60));
  console.log(`Mode: ${isDryRun ? "DRY-RUN (No changes)" : "EXECUTE (Will update DB)"}`);
  console.log(`Force: ${isForce ? "Yes (Update all users)" : "No (Only users without role)"}`);
  console.log(`Default Role: ${DEFAULT_ROLE}`);
  console.log("=".repeat(60) + "\n");
}

function printSummary(stats) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 MIGRATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total Users Scanned     : ${stats.totalUsers}`);
  console.log(`Users Already Have Role : ${stats.alreadyHaveRole}`);
  console.log(`Users Need Update       : ${stats.needsUpdate}`);
  console.log(`Users Updated           : ${stats.updated}`);
  console.log(`Errors                  : ${stats.errors}`);
  console.log("=".repeat(60) + "\n");
}

function needsRoleUpdate(userData) {
  // Jika force mode, update semua
  if (isForce) {
    return true;
  }

  // Cek apakah user belum punya role
  return !userData.role;
}

function getRoleDataToAdd(existingData) {
  const now = new Date().toISOString();

  return {
    role: existingData.role || DEFAULT_ROLE,
    roleUpdatedAt: existingData.roleUpdatedAt || now,
    subscriptionExpiry: existingData.subscriptionExpiry || null,
    paymentHistory: existingData.paymentHistory || [],
  };
}

// =====================================================
// 🚀 MAIN MIGRATION FUNCTION
// =====================================================

async function migrateUserRoles() {
  printHeader();

  const stats = {
    totalUsers: 0,
    alreadyHaveRole: 0,
    needsUpdate: 0,
    updated: 0,
    errors: 0,
  };

  try {
    console.log("📡 Fetching all users from database...\n");

    // Ambil semua user
    const usersSnapshot = await db.collection("users").get();
    stats.totalUsers = usersSnapshot.size;

    console.log(`✅ Found ${stats.totalUsers} users\n`);

    if (stats.totalUsers === 0) {
      console.log("⚠️  No users found in database. Exiting...\n");
      return;
    }

    // Group users yang perlu di-update
    const usersToUpdate = [];
    const usersDetails = [];

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const userId = doc.id;

      if (needsRoleUpdate(userData)) {
        stats.needsUpdate++;
        usersToUpdate.push({
          userId,
          userData,
          ref: doc.ref,
        });

        // Simpan detail untuk logging
        usersDetails.push({
          userId,
          email: userData.email || "N/A",
          name: userData.name || "N/A",
          currentRole: userData.role || "NONE",
        });
      } else {
        stats.alreadyHaveRole++;
      }
    });

    console.log(`📋 Analysis:`);
    console.log(`   - Users with role: ${stats.alreadyHaveRole}`);
    console.log(`   - Users need update: ${stats.needsUpdate}\n`);

    if (stats.needsUpdate === 0) {
      console.log("✨ All users already have role data. Nothing to do!\n");
      return;
    }

    // Tampilkan preview user yang akan di-update
    console.log("📝 Users to be updated:");
    console.log("-".repeat(80));
    console.log(
      "No.".padEnd(5) +
      "User ID".padEnd(30) +
      "Email".padEnd(30) +
      "Current Role".padEnd(15)
    );
    console.log("-".repeat(80));

    usersDetails.slice(0, 10).forEach((user, index) => {
      console.log(
        `${(index + 1).toString().padEnd(5)}${user.userId.padEnd(30)}${user.email.substring(0, 28).padEnd(30)}${user.currentRole.padEnd(15)}`
      );
    });

    if (usersDetails.length > 10) {
      console.log(`... and ${usersDetails.length - 10} more users`);
    }
    console.log("-".repeat(80) + "\n");

    if (isDryRun) {
      console.log("🔍 DRY-RUN MODE: No changes will be made to database");
      console.log("   Run without --dry-run flag to execute the migration\n");

      // Preview data yang akan ditambahkan
      const sampleUser = usersToUpdate[0];
      const sampleData = getRoleDataToAdd(sampleUser.userData);

      console.log("📦 Sample data that will be added:");
      console.log(JSON.stringify(sampleData, null, 2));
      console.log("");

      return;
    }

    // Konfirmasi sebelum execute
    console.log("⚠️  WARNING: This will update the database!");
    console.log("   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");

    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log("🚀 Starting migration...\n");

    // Update users in batches
    const batches = [];
    let currentBatch = db.batch();
    let operationCount = 0;

    for (let i = 0; i < usersToUpdate.length; i++) {
      const user = usersToUpdate[i];
      const roleData = getRoleDataToAdd(user.userData);

      currentBatch.update(user.ref, roleData);
      operationCount++;

      // Jika batch sudah penuh, simpan dan buat batch baru
      if (operationCount === BATCH_SIZE) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        operationCount = 0;
      }

      // Progress indicator
      if ((i + 1) % 50 === 0 || i === usersToUpdate.length - 1) {
        const progress = ((i + 1) / usersToUpdate.length) * 100;
        console.log(`   Progress: ${(i + 1)}/${usersToUpdate.length} (${progress.toFixed(1)}%)`);
      }
    }

    // Tambahkan batch terakhir jika ada
    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    console.log(`\n📦 Committing ${batches.length} batch(es)...\n`);

    // Commit semua batches
    for (let i = 0; i < batches.length; i++) {
      try {
        await batches[i].commit();
        stats.updated += Math.min(BATCH_SIZE, usersToUpdate.length - i * BATCH_SIZE);
        console.log(`   ✅ Batch ${i + 1}/${batches.length} committed`);
      } catch (error) {
        console.error(`   ❌ Error committing batch ${i + 1}:`, error.message);
        stats.errors++;
      }
    }

    console.log("\n✅ Migration completed!\n");

    // Verify hasil
    console.log("🔍 Verifying results...\n");

    let verifiedCount = 0;
    for (const user of usersToUpdate.slice(0, 5)) {
      const doc = await user.ref.get();
      const data = doc.data();
      if (data.role) {
        verifiedCount++;
        console.log(`   ✅ ${user.userId}: role = ${data.role}`);
      } else {
        console.log(`   ❌ ${user.userId}: role still missing!`);
      }
    }

    console.log(`\n   Verified ${verifiedCount}/5 sample users\n`);

  } catch (error) {
    console.error("\n❌ Migration failed with error:");
    console.error(error);
    stats.errors++;
  } finally {
    printSummary(stats);
  }
}

// =====================================================
// 🎬 RUN MIGRATION
// =====================================================

migrateUserRoles()
  .then(() => {
    console.log("🎉 Script finished successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script failed:", error);
    process.exit(1);
  });
