/**
 * MIGRATION SCRIPT: Update Role Names
 *
 * Mengupdate semua user existing dari:
 * - "free" → "initiate"
 * - "pro" → "operative"
 * - "custom" → "handler"
 *
 * CARA PAKAI:
 * 1. Set environment variable GOOGLE_APPLICATION_CREDENTIALS
 * 2. Run: node scripts/migrate-roles.js
 * 3. Review hasil migrasi
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = join(__dirname, '../project-cdfb53f0-89f3-4240-b91-firebase-adminsdk-fbsvc-2eb52c86fe.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Role mapping
const ROLE_MAPPING = {
  'free': 'initiate',
  'pro': 'operative',
  'custom': 'handler',
};

/**
 * Main migration function
 */
async function migrateRoles() {
  console.log('🚀 Starting role migration...\n');

  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;

    console.log(`📊 Found ${totalUsers} users to process\n`);

    if (totalUsers === 0) {
      console.log('✅ No users to migrate');
      return;
    }

    // Statistics
    const stats = {
      total: totalUsers,
      migrated: 0,
      skipped: 0,
      errors: 0,
      byRole: {
        initiate: 0,
        operative: 0,
        handler: 0,
      },
    };

    // Process in batches (500 is Firestore limit)
    const batchSize = 500;
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const currentRole = userData.role;

      // Skip if already using new role names
      if (currentRole === 'initiate' || currentRole === 'operative' || currentRole === 'handler') {
        console.log(`⏭️  Skipping ${doc.id}: Already using new role name (${currentRole})`);
        stats.skipped++;
        continue;
      }

      // Skip if no role or role is undefined
      if (!currentRole) {
        console.log(`⚠️  User ${doc.id} has no role, setting to 'initiate'`);
        batch.update(doc.ref, {
          role: 'initiate',
          roleUpdatedAt: new Date().toISOString(),
          subscriptionExpiry: null,
          paymentHistory: userData.paymentHistory || [],
        });
        stats.migrated++;
        stats.byRole.initiate++;
        batchCount++;
      }
      // Map old role to new role
      else if (ROLE_MAPPING[currentRole]) {
        const newRole = ROLE_MAPPING[currentRole];
        console.log(`✅ Migrating ${doc.id}: ${currentRole} → ${newRole}`);

        batch.update(doc.ref, {
          role: newRole,
          roleUpdatedAt: new Date().toISOString(),
        });

        stats.migrated++;
        stats.byRole[newRole]++;
        batchCount++;
      }
      // Unknown role
      else {
        console.log(`❌ Unknown role for ${doc.id}: ${currentRole} - setting to 'initiate'`);
        batch.update(doc.ref, {
          role: 'initiate',
          roleUpdatedAt: new Date().toISOString(),
        });
        stats.migrated++;
        stats.byRole.initiate++;
        batchCount++;
      }

      // Commit batch when reaching limit
      if (batchCount >= batchSize) {
        console.log(`\n📦 Committing batch of ${batchCount} updates...\n`);
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      console.log(`\n📦 Committing final batch of ${batchCount} updates...\n`);
      await batch.commit();
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Users:        ${stats.total}`);
    console.log(`Migrated:           ${stats.migrated}`);
    console.log(`Skipped:            ${stats.skipped}`);
    console.log(`Errors:             ${stats.errors}`);
    console.log('\nBy Role:');
    console.log(`  - Initiate:       ${stats.byRole.initiate}`);
    console.log(`  - Operative:      ${stats.byRole.operative}`);
    console.log(`  - Handler:        ${stats.byRole.handler}`);
    console.log('='.repeat(60));
    console.log('\n✅ Migration completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Verify migration results
 */
async function verifyMigration() {
  console.log('\n🔍 Verifying migration...\n');

  try {
    const usersSnapshot = await db.collection('users').get();
    const roleCount = {
      initiate: 0,
      operative: 0,
      handler: 0,
      other: 0,
    };

    const oldRoles = [];

    usersSnapshot.forEach((doc) => {
      const role = doc.data().role;
      if (role === 'initiate') roleCount.initiate++;
      else if (role === 'operative') roleCount.operative++;
      else if (role === 'handler') roleCount.handler++;
      else {
        roleCount.other++;
        oldRoles.push({ id: doc.id, role });
      }
    });

    console.log('📊 Current Role Distribution:');
    console.log(`  - Initiate:   ${roleCount.initiate}`);
    console.log(`  - Operative:  ${roleCount.operative}`);
    console.log(`  - Handler:    ${roleCount.handler}`);
    console.log(`  - Other:      ${roleCount.other}`);

    if (oldRoles.length > 0) {
      console.log('\n⚠️  Found users with old role names:');
      oldRoles.forEach(({ id, role }) => {
        console.log(`  - ${id}: ${role}`);
      });
    } else {
      console.log('\n✅ All users are using new role names!');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

/**
 * Rollback migration (emergency)
 */
async function rollbackMigration() {
  console.log('⚠️  WARNING: Rolling back migration...\n');
  console.log('This will revert all role names back to free/pro/custom\n');

  const REVERSE_MAPPING = {
    'initiate': 'free',
    'operative': 'pro',
    'handler': 'custom',
  };

  try {
    const usersSnapshot = await db.collection('users').get();
    const batch = db.batch();
    let count = 0;

    usersSnapshot.forEach((doc) => {
      const currentRole = doc.data().role;
      if (REVERSE_MAPPING[currentRole]) {
        const oldRole = REVERSE_MAPPING[currentRole];
        batch.update(doc.ref, {
          role: oldRole,
          roleUpdatedAt: new Date().toISOString(),
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`✅ Rolled back ${count} users`);
    } else {
      console.log('⏭️  No users to rollback');
    }

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'verify') {
      await verifyMigration();
    } else if (command === 'rollback') {
      // Ask for confirmation
      console.log('⚠️  Are you sure you want to rollback? This will revert all changes.');
      console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
      await rollbackMigration();
    } else {
      // Default: run migration
      await migrateRoles();
      await verifyMigration();
    }

    console.log('\n✅ Done!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run
main();
