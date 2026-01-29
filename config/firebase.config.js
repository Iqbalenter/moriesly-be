// IMPORTANT: Load environment variables FIRST
import "../config/env.config.js";

import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, isAbsolute } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let serviceAccount;

// Mode 1: Gunakan FIREBASE_SERVICE_ACCOUNT_JSON (untuk Cloud Run/Production/VM)
// JSON string langsung dari environment variable/secret
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    console.log(
      "✅ Firebase service account loaded from environment variable!",
    );
    console.log("📊 Project ID:", serviceAccount.project_id);
  } catch (error) {
    console.error("❌ ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON");
    console.error("💡 Make sure the JSON string is valid and properly escaped");
    throw error;
  }
}
// Mode 2: Gunakan file path (untuk local development)
else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  const envServicePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const serviceAccountPath = isAbsolute(envServicePath)
    ? envServicePath
    : join(__dirname, "..", envServicePath);

  try {
    const serviceAccountFile = readFileSync(serviceAccountPath, "utf8");
    serviceAccount = JSON.parse(serviceAccountFile);
    console.log("✅ Firebase service account loaded from file!");
    console.log("📊 Project ID:", serviceAccount.project_id);
    console.log("📁 File path:", serviceAccountPath);
  } catch (error) {
    console.error(
      "\n❌ ERROR: Cannot find or read Firebase service account JSON",
    );
    console.error("\n🧭 Path tried:", serviceAccountPath);
    console.error("\n📝 To fix this:");
    console.error("   1) Make sure the file exists at the specified path");
    console.error("   2) Check file permissions (readable)");
    console.error(
      "   3) Verify the path in FIREBASE_SERVICE_ACCOUNT_PATH environment variable",
    );
    console.error(
      "   4) For absolute path: use full path (e.g., /var/secrets/firebase-admin.json)",
    );
    console.error(
      "   5) For relative path: relative to moriesly-be folder (e.g., secrets/firebase-admin.json)\n",
    );
    throw error;
  }
}
// Mode 3: Error - tidak ada konfigurasi
else {
  console.error("\n❌ ERROR: Firebase service account not configured!");
  console.error("\n📝 Please set one of these environment variables:");
  console.error(
    "   1) FIREBASE_SERVICE_ACCOUNT_JSON - Full JSON string (recommended for production/VM)",
  );
  console.error(
    '      Example: FIREBASE_SERVICE_ACCOUNT_JSON=\'{"type":"service_account",...}\'',
  );
  console.error(
    "\n   2) FIREBASE_SERVICE_ACCOUNT_PATH - File path (for development)",
  );
  console.error(
    "      Example (absolute): FIREBASE_SERVICE_ACCOUNT_PATH=/secrets/firebase-admin.json",
  );
  console.error(
    "      Example (relative): FIREBASE_SERVICE_ACCOUNT_PATH=secrets/firebase-admin.json",
  );
  console.error("\n   3) Download the JSON from Firebase Console:");
  console.error(
    "      - https://console.firebase.google.com → Project settings → Service accounts",
  );
  console.error("      - Click 'Generate new private key'\n");
  throw new Error("Missing Firebase service account configuration");
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase Admin initialized successfully!\n");
} catch (error) {
  console.error("\n❌ ERROR: Failed to initialize Firebase Admin");
  console.error("Error message:", error.message);
  console.error("\n💡 Make sure:");
  console.error("   - The service account JSON is valid (not corrupted)");
  console.error("   - Firebase Authentication is enabled in Firebase Console");
  console.error("   - Cloud Firestore is enabled in Firebase Console");
  console.error("   - The service account has proper permissions\n");
  throw error;
}

export const auth = admin.auth();
export const db = admin.firestore();

export default admin;
