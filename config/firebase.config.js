import admin from "firebase-admin";

import { readFileSync } from "fs";

import { fileURLToPath } from "url";

import { dirname, join, isAbsolute } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path ke file service account JSON

// Prefer path dari ENV: FIREBASE_SERVICE_ACCOUNT_PATH
// Fallback: gunakan file default di root project

// UNTUK CLOUD RUN: Bisa gunakan environment variable JSON langsung
let serviceAccount;

// Mode 1: Gunakan FIREBASE_SERVICE_ACCOUNT_JSON (untuk Cloud Run/Production)
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    console.log("✅ Firebase service account loaded from environment variable!");
    console.log("📊 Project ID:", serviceAccount.project_id);
  } catch (error) {
    console.error("❌ ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON");
    throw error;
  }
} else {
  // Mode 2: Gunakan file path (untuk local development)
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

  try {
    // Baca file service account JSON

    const serviceAccountFile = readFileSync(serviceAccountPath, "utf8");

    serviceAccount = JSON.parse(serviceAccountFile);

    console.log("✅ Firebase service account loaded successfully!");

    console.log("📊 Project ID:", serviceAccount.project_id);
  } catch (error) {
    console.error(
      "\n❌ ERROR: Cannot find or read Firebase service account JSON",
    );
    console.error("\n🧭 Resolved path tried:", serviceAccountPath);
    console.error("\n📝 To fix this:");

    console.error(
      "   1) Set environment variable FIREBASE_SERVICE_ACCOUNT_PATH to your JSON path",
    );
    console.error(
      "      - Absolute path, e.g.: C:\\secrets\\firebase-admin.json",
    );
    console.error(
      "      - Or relative to moriesly-be, e.g.: secrets/firebase-admin.json",
    );
    console.error(
      "   2) Alternatively, place the JSON at the default path shown above",
    );
    console.error("   3) Download the JSON from Firebase Console:");

    console.error(
      "      - https://console.firebase.google.com → Project settings → Service accounts",
    );

    console.error("      - Click 'Generate new private key'");

    console.error("   4) Restart the server after setting the correct path\n");

    throw error;
  }
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

  console.error(
    "   - The service account JSON path is correct (FIREBASE_SERVICE_ACCOUNT_PATH)",
  );
  console.error("   - The service account JSON is valid (not corrupted)");
  console.error("   - Firebase Authentication is enabled in Firebase Console");

  console.error("   - Cloud Firestore is enabled in Firebase Console\n");

  throw error;
}

export const auth = admin.auth();
export const db = admin.firestore();

export default admin;
