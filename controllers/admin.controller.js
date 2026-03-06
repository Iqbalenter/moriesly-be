import { auth } from "../config/firebase.config.js";

const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY;

/**
 * Helper: signin via Firebase REST API → dapat idToken langsung
 */
async function firebaseRestSignIn(email, password) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = await response.json();
  if (!response.ok) {
    const msg = data.error?.message || "UNKNOWN_ERROR";
    throw { firebaseError: msg };
  }
  return data; // { localId, email, idToken, refreshToken, expiresIn }
}

/**
 * POST /api/admin/register
 * Daftarkan akun admin baru.
 * Body: { name, email, password, adminSecret }
 *
 * adminSecret dicocokkan dengan env ADMIN_REGISTER_SECRET untuk mencegah
 * sembarang orang membuat akun admin.
 */
export async function adminRegister(req, res) {
  try {
    const { name, email, password, adminSecret } = req.body;

    if (!FIREBASE_WEB_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Konfigurasi server tidak lengkap. FIREBASE_WEB_API_KEY tidak ditemukan.",
      });
    }

    // Validasi input dasar
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan password wajib diisi",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 6 karakter",
      });
    }

    // Validasi secret key (opsional — aktifkan jika ADMIN_REGISTER_SECRET di-set di .env)
    const requiredSecret = process.env.ADMIN_REGISTER_SECRET;
    if (requiredSecret && adminSecret !== requiredSecret) {
      return res.status(403).json({
        success: false,
        message: "Admin secret tidak valid",
      });
    }

    // Buat user di Firebase Authentication
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name || email.split("@")[0],
    });

    // Set custom claim admin: true
    await auth.setCustomUserClaims(userRecord.uid, { admin: true });

    // Auto-login → ambil idToken langsung supaya FE tidak perlu login ulang
    const authData = await firebaseRestSignIn(email, password);

    return res.status(201).json({
      success: true,
      message: "Registrasi admin berhasil",
      data: {
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          role: "admin",
        },
        token: authData.idToken,
        refreshToken: authData.refreshToken,
        expiresIn: authData.expiresIn,
      },
    });
  } catch (error) {
    // Firebase REST error
    if (error.firebaseError) {
      return res.status(400).json({
        success: false,
        message: "Registrasi berhasil namun auto-login gagal, silakan login manual",
        error: error.firebaseError,
      });
    }

    console.error("[adminRegister]", error);

    if (error.code === "auth/email-already-exists") {
      return res.status(400).json({ success: false, message: "Email sudah terdaftar" });
    }
    if (error.code === "auth/invalid-email") {
      return res.status(400).json({ success: false, message: "Format email tidak valid" });
    }

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat registrasi",
      error: error.message,
    });
  }
}

/**
 * POST /api/admin/login
 * Login khusus admin — hanya berhasil jika akun memiliki custom claim admin: true.
 * Body: { email, password }
 */
export async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan password wajib diisi",
      });
    }

    if (!FIREBASE_WEB_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Konfigurasi server tidak lengkap. FIREBASE_WEB_API_KEY tidak ditemukan.",
      });
    }

    // Step 1: Verifikasi email + password via Firebase REST API
    let authData;
    try {
      authData = await firebaseRestSignIn(email, password);
    } catch (err) {
      const msgMap = {
        EMAIL_NOT_FOUND: "Email tidak terdaftar",
        INVALID_PASSWORD: "Password salah",
        USER_DISABLED: "Akun telah dinonaktifkan",
        INVALID_LOGIN_CREDENTIALS: "Email atau password salah",
        TOO_MANY_ATTEMPTS_TRY_LATER: "Terlalu banyak percobaan login. Coba lagi nanti.",
      };
      return res.status(401).json({
        success: false,
        message: msgMap[err.firebaseError] || "Email atau password salah",
      });
    }

    // Step 2: Verifikasi idToken → cek custom claim admin
    const decoded = await auth.verifyIdToken(authData.idToken);

    if (!decoded.admin) {
      // Revoke token agar tidak bisa dipakai
      await auth.revokeRefreshTokens(decoded.uid);
      return res.status(403).json({
        success: false,
        message: "Akses ditolak. Akun ini bukan admin.",
      });
    }

    // Step 3: Ambil detail user
    const userRecord = await auth.getUser(decoded.uid);

    return res.status(200).json({
      success: true,
      message: "Login admin berhasil",
      data: {
        user: {
          uid: decoded.uid,
          email: decoded.email,
          displayName: userRecord.displayName || decoded.email,
          role: "admin",
        },
        token: authData.idToken,
        refreshToken: authData.refreshToken,
        expiresIn: authData.expiresIn,
      },
    });
  } catch (error) {
    console.error("[adminLogin]", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat login",
      error: error.message,
    });
  }
}

/**
 * GET /api/admin/me
 * Ambil profil admin yang sedang login.
 * Memerlukan header Authorization: Bearer <idToken>
 * Middleware verifyAdminToken wajib dipasang di route.
 */
export async function adminGetMe(req, res) {
  try {
    const userRecord = await auth.getUser(req.user.uid);

    return res.status(200).json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || userRecord.email,
        emailVerified: userRecord.emailVerified,
        role: "admin",
        createdAt: userRecord.metadata.creationTime,
        lastSignInAt: userRecord.metadata.lastSignInTime,
      },
    });
  } catch (error) {
    console.error("[adminGetMe]", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil profil",
      error: error.message,
    });
  }
}

/**
 * POST /api/admin/refresh-token
 * Exchange refreshToken Firebase → idToken baru.
 * Body: { refreshToken }
 */
export async function adminRefreshToken(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "refreshToken wajib diisi",
      });
    }

    if (!FIREBASE_WEB_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Konfigurasi server tidak lengkap. FIREBASE_WEB_API_KEY tidak ditemukan.",
      });
    }

    const response = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "refresh_token", refresh_token: refreshToken }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      const msg = data.error?.message || "UNKNOWN_ERROR";
      const msgMap = {
        TOKEN_EXPIRED: "Refresh token sudah expired, silakan login ulang",
        USER_DISABLED: "Akun telah dinonaktifkan",
        USER_NOT_FOUND: "Akun tidak ditemukan",
        INVALID_REFRESH_TOKEN: "Refresh token tidak valid",
      };
      return res.status(401).json({
        success: false,
        message: msgMap[msg] || "Gagal memperbarui token",
      });
    }

    // Verifikasi bahwa akun masih admin
    const decoded = await auth.verifyIdToken(data.id_token);
    if (!decoded.admin) {
      await auth.revokeRefreshTokens(decoded.uid);
      return res.status(403).json({
        success: false,
        message: "Akses ditolak. Akun ini bukan admin.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Token berhasil diperbarui",
      data: {
        token: data.id_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      },
    });
  } catch (error) {
    console.error("[adminRefreshToken]", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat refresh token",
      error: error.message,
    });
  }
}

/**
 * POST /api/admin/logout
 * Revoke semua refresh token milik admin → token lama tidak bisa dipakai lagi.
 * Memerlukan header Authorization: Bearer <idToken>
 * Middleware verifyAdminToken wajib dipasang di route.
 */
export async function adminLogout(req, res) {
  try {
    await auth.revokeRefreshTokens(req.user.uid);

    return res.status(200).json({
      success: true,
      message: "Logout berhasil. Semua sesi telah dihapus.",
    });
  } catch (error) {
    console.error("[adminLogout]", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat logout",
      error: error.message,
    });
  }
}
