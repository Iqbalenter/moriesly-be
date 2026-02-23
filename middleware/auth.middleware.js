import { auth } from "../config/firebase.config.js";
import { checkSubscriptionExpiry } from "../service/subscription.service.js";

/**
 * Middleware untuk verifikasi Firebase ID Token
 * Token harus dikirim di Authorization header dengan format: Bearer <token>
 */
export async function verifyFirebaseToken(req, res, next) {
  try {
    // Ambil token dari Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token tidak ditemukan. Format: Bearer <token>",
      });
    }

    // Extract token — .trim() untuk antisipasi whitespace/newline tidak terduga
    const idToken = authHeader.split("Bearer ")[1]?.trim();

    if (!idToken) {
      console.warn(
        "[auth.middleware] Token kosong setelah di-extract dari header.",
      );
      return res.status(401).json({
        success: false,
        alert: "Token tidak valid",
      });
    }

    // DEBUG: log 60 karakter pertama token agar bisa dicek formatnya
    console.log(
      "[auth.middleware] Token received (first 60 chars):",
      idToken.substring(0, 60),
    );
    console.log("[auth.middleware] Token length:", idToken.length);
    console.log(
      "[auth.middleware] Starts with 'eyJ':",
      idToken.startsWith("eyJ"),
    );

    // Verifikasi token dengan Firebase Admin
    const decodedToken = await auth.verifyIdToken(idToken);

    // Attach user info ke request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };

    // Auto-check subscription expiry
    try {
      await checkSubscriptionExpiry(decodedToken.uid);
    } catch (error) {
      // Log error but don't block request
      console.error("Error checking subscription expiry:", error);
    }

    // Lanjutkan ke handler berikutnya
    next();
  } catch (error) {
    // Log error lengkap untuk debugging
    console.error("[auth.middleware] verifyIdToken FAILED:");
    console.error("  → error.code   :", error.code);
    console.error("  → error.message:", error.message);

    if (error.code === "auth/id-token-expired") {
      return res.status(401).json({
        success: false,
        message: "Token sudah expired",
      });
    }

    if (error.code === "auth/id-token-revoked") {
      return res.status(401).json({
        success: false,
        message: "Token sudah dicabut",
      });
    }

    if (error.code === "auth/argument-error") {
      return res.status(401).json({
        success: false,
        alert: "Token tidak valid",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Gagal memverifikasi token",
      error: error.message,
    });
  }
}

/**
 * Middleware optional authentication
 * Jika token ada, verifikasi. Jika tidak ada, lanjutkan tanpa user info
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // Tidak ada token, lanjutkan tanpa user info
      return next();
    }

    const idToken = authHeader.split("Bearer ")[1];

    if (!idToken) {
      return next();
    }

    // Verifikasi token
    const decodedToken = await auth.verifyIdToken(idToken);

    // Attach user info ke request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };

    next();
  } catch (error) {
    console.error("Error in optional auth:", error);
    // Jika error, tetap lanjutkan tanpa user info
    next();
  }
}

export const authenticate = verifyFirebaseToken;
