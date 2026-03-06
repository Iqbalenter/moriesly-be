import { auth } from '../config/firebase.config.js';

/**
 * Middleware untuk verifikasi Firebase ID Token
 * Token harus dikirim di Authorization header dengan format: Bearer <token>
 */
export async function verifyFirebaseToken(req, res, next) {
  try {
    // Ambil token dari Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan. Format: Bearer <token>'
      });
    }

    // Extract token
    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      return res.status(401).json({
        success: false,
        alert: 'Token tidak valid',
      });
    }

    // Verifikasi token dengan Firebase Admin
    const decodedToken = await auth.verifyIdToken(idToken);

    // Attach user info ke request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified
    };

    // Lanjutkan ke handler berikutnya
    next();

  } catch (error) {
    console.error('Error verifying token:', error);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'Token sudah expired'
      });
    }

    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        message: 'Token sudah dicabut'
      });
    }

    if (error.code === 'auth/argument-error') {
      return res.status(401).json({
        success: false,
        alert: 'Token tidak valid',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Gagal memverifikasi token',
      error: error.message
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

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Tidak ada token, lanjutkan tanpa user info
      return next();
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      return next();
    }

    // Verifikasi token
    const decodedToken = await auth.verifyIdToken(idToken);

    // Attach user info ke request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified
    };

    next();

  } catch (error) {
    console.error('Error in optional auth:', error);
    // Jika error, tetap lanjutkan tanpa user info
    next();
  }
}

export const authenticate = verifyFirebaseToken;

/**
 * Middleware khusus admin
 * Verifikasi token DAN pastikan custom claim admin:true
 */
export async function verifyAdminToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan. Format: Bearer <token>',
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);

    if (!decodedToken.admin) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Hanya admin yang dapat mengakses endpoint ini.',
      });
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      role: 'admin',
    };

    next();
  } catch (error) {
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ success: false, message: 'Token sudah expired' });
    }
    return res.status(401).json({
      success: false,
      message: 'Gagal memverifikasi token',
      error: error.message,
    });
  }
}

