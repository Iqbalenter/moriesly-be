// IMPORTANT: Load environment variables FIRST
import "./env.config.js";

import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let serviceAccount;

// Path langsung ke file firebase-admin.json di folder secrets/
const serviceAccountPath = join(
  __dirname,
  "..",
  "firebase-admin.json",
);

try {
  // Baca file service account JSON
  const serviceAccountFile = readFileSync(serviceAccountPath, "utf8");
  serviceAccount = JSON.parse(serviceAccountFile);

  console.log("✅ Firebase service account loaded successfully!");
  console.log("📊 Project ID:", serviceAccount.project_id);
  console.log("📁 File path:", serviceAccountPath);
} catch (error) {
  console.error(
    "\n❌ ERROR: Cannot find or read Firebase service account JSON",
  );
  console.error("\n🧭 Expected file location:", serviceAccountPath);
  console.error("\n📝 To fix this:");
  console.error(
    "   1) Make sure the file exists at: moriesly-be/secrets/firebase-admin.json",
  );
  console.error("   2) Check file permissions (readable)");
  console.error("   3) Download the JSON from Firebase Console:");
  console.error(
    "      - https://console.firebase.google.com → Project settings → Service accounts",
  );
  console.error("      - Click 'Generate new private key'");
  console.error("   4) Save it as: secrets/firebase-admin.json\n");
  throw error;
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
