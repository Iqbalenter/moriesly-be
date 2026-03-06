import admin from "../config/firebase.config.js";
import { auth } from "../config/firebase.config.js";
import {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  userProfileExists,
  initializeUserProfile,
  saveDailyLedger,
  getDailyLedger,
  addHistoryItem,
  getHistory,
  deleteHistoryItem,
  addWeightEntry,
  getWeightHistory,
  processDailyCheckIn,
  saveGoalConfig,
  batchUpdateUserData,
  saveDietPlan,
  getActiveDietPlan,
  updateDietCompletion,
  saveTrainingPlan,
  getActiveTrainingPlan,
  updateTrainingProgress,
  saveConsultation,
  getConsultationHistory,
  saveSkinScan,
  getLatestSkinScan,
  getSkinScans,
  saveWeeklyPlan,
  getActiveWeeklyPlan,
  updateWeeklyCompletion,
  getLedgerRange,
  getHistoryByAction,
  getCurrentGoal,
  updateGoalProgress,
  getStatusData,
  generateDailyTrainingPlan,
  saveDailyTrainingPlan,
  getDailyTrainingPlan,
  hasGeneratedTodayPlan,
  updateTrainingCompletion,
  getTrainingCompletion,
} from "../service/user.service.js";
import { calculateDailySugarLimit } from "../utils/calculator.js";

/**
 * Register user baru dengan email dan password
 * Menerima email, password, dan opsional name
 */
export async function register(req, res) {
  try {
    const { email, password, name } = req.body;

    // Validasi input
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

    // Gunakan name dari request atau default dari email
    const displayName = name || email.split("@")[0];

    // Buat user di Firebase Authentication
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
    });

    // Buat profil user di Firestore dengan data minimal
    const profileData = {
      email,
      name: displayName,
    };

    const userProfile = await createUserProfile(userRecord.uid, profileData);

    // Buat custom token untuk login otomatis
    const customToken = await auth.createCustomToken(userRecord.uid);

    res.status(201).json({
      success: true,
      message: "Registrasi berhasil",
      data: {
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
        },
        profile: userProfile,
        token: customToken,
      },
    });
  } catch (error) {
    console.error("Error in register:", error);

    // Handle specific Firebase errors
    if (error.code === "auth/configuration-not-found") {
      return res.status(500).json({
        success: false,
        message: "Firebase Authentication belum dikonfigurasi",
        error:
          "Authentication belum di-enable di Firebase Console!\n\n" +
          "Cara fix:\n" +
          "1. Buka https://console.firebase.google.com\n" +
          "2. Pilih project Anda\n" +
          '3. Klik "Authentication" → "Get started"\n' +
          '4. Tab "Sign-in method"\n' +
          '5. Enable "Email/Password" (toggle ON)\n' +
          '6. Klik "Save"\n\n' +
          "Baca file ENABLE-AUTH.md untuk panduan lengkap dengan screenshot.",
      });
    }

    if (error.code === "auth/email-already-exists") {
      return res.status(400).json({
        success: false,
        message: "Email sudah terdaftar",
      });
    }

    if (error.code === "auth/invalid-email") {
      return res.status(400).json({
        success: false,
        message: "Format email tidak valid",
      });
    }

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat registrasi",
      error: error.message,
    });
  }
}

/**
 * Login user dengan email dan password
 * Note: Untuk login di backend, kita verifikasi user exists dan buat custom token
 * Client-side harus menggunakan Firebase Client SDK untuk signInWithEmailAndPassword
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan password wajib diisi",
      });
    }

    // Get Firebase Web API Key dari environment
    const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY;

    if (!FIREBASE_WEB_API_KEY) {
      console.error("FIREBASE_WEB_API_KEY tidak ditemukan di .env");
      return res.status(500).json({
        success: false,
        message: "Konfigurasi server tidak lengkap. Hubungi administrator.",
      });
    }

    // Verifikasi email dan password menggunakan Firebase REST API
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      },
    );

    const authData = await response.json();

    if (!response.ok) {
      // Handle error dari Firebase
      let errorMessage = "Email atau password salah";

      if (authData.error?.message === "EMAIL_NOT_FOUND") {
        errorMessage = "Email tidak terdaftar";
      } else if (authData.error?.message === "INVALID_PASSWORD") {
        errorMessage = "Password salah";
      } else if (authData.error?.message === "USER_DISABLED") {
        errorMessage = "Akun telah dinonaktifkan";
      } else if (authData.error?.message === "INVALID_LOGIN_CREDENTIALS") {
        errorMessage = "Email atau password salah";
      }

      return res.status(401).json({
        success: false,
        message: errorMessage,
      });
    }

    // Ambil profile user dari Firestore
    const profile = await getUserProfile(authData.localId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profil user tidak ditemukan",
      });
    }

    // Generate custom token menggunakan Firebase Admin SDK
    // Custom token digunakan oleh client untuk signInWithCustomToken()
    const customToken = await auth.createCustomToken(authData.localId);

    // Return ID Token + Custom Token
    res.status(200).json({
      success: true,
      message: "Login berhasil",
      data: {
        user: {
          uid: authData.localId,
          email: authData.email,
          displayName: profile.name,
        },
        profile,
        token: authData.idToken, // ✅ ID Token untuk request langsung
        customToken, // ✅ Custom Token untuk signInWithCustomToken() di client
        refreshToken: authData.refreshToken,
        expiresIn: authData.expiresIn,
      },
    });
  } catch (error) {
    console.error("Error in login:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat login",
      error: error.message,
    });
  }
}

/**
 * Verify ID Token dari Firebase client
 */
export async function verifyToken(req, res) {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "ID Token wajib diisi",
      });
    }

    // Verifikasi token
    const decodedToken = await auth.verifyIdToken(idToken);

    // Ambil profile user
    const profile = await getUserProfile(decodedToken.uid);

    res.status(200).json({
      success: true,
      message: "Token valid",
      data: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        profile,
      },
    });
  } catch (error) {
    console.error("Error in verifyToken:", error);

    res.status(401).json({
      success: false,
      message: "Token tidak valid atau sudah expired",
      error: error.message,
    });
  }
}

/**
 * Refresh Access Token menggunakan Refresh Token
 */
export async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token wajib diisi",
      });
    }

    const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

    if (!FIREBASE_API_KEY) {
      throw new Error("FIREBASE_API_KEY tidak ditemukan di environment");
    }

    // Request ke Firebase untuk refresh token
    const response = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to refresh token");
    }

    // Return new tokens
    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        idToken: data.id_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      },
    });
  } catch (error) {
    console.error("Error in refreshToken:", error);

    res.status(401).json({
      success: false,
      message: "Gagal refresh token",
      error: error.message,
    });
  }
}

/**
 * Get user profile berdasarkan UID
 */
export async function getUserData(req, res) {
  try {
    const userId = req.user.uid;

    // Ambil data dari Firebase Auth
    const userRecord = await auth.getUser(userId);

    // Ambil profile dari Firestore
    const profile = await getUserProfile(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profil user tidak ditemukan",
      });
    }

    // Return ONLY the profile data, NOT nested structure
    // This prevents recursive nesting in Firestore
    res.status(200).json({
      success: true,
      message: "Data user berhasil diambil",
      data: profile, // Just the profile, no nesting
    });
  } catch (error) {
    console.error("Error in getUserData:", error);

    if (error.code === "auth/user-not-found") {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data user",
      error: error.message,
    });
  }
}

/**
 * Update user profile
 */
export async function updateUser(req, res) {
  try {
    const userId = req.user.uid;
    const updateData = req.body;

    // Cek apakah user exists
    const exists = await userProfileExists(userId);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    // Update profile di Firestore
    const updatedProfile = await updateUserProfile(userId, updateData);

    res.status(200).json({
      success: true,
      message: "Profil user berhasil diupdate",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error in updateUser:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengupdate profil user",
      error: error.message,
    });
  }
}

/**
 * Get current user data from token (middleware protected)
 */
export async function getCurrentUser(req, res) {
  try {
    // req.user sudah di-set oleh auth middleware
    const userId = req.user.uid;

    const profile = await getUserProfile(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profil user tidak ditemukan",
      });
    }

    // Return ONLY the profile data, NOT nested structure
    // This prevents recursive nesting in Firestore
    res.status(200).json({
      success: true,
      message: "Data user berhasil diambil",
      data: profile, // Just the profile, no nesting
    });
  } catch (error) {
    console.error("Error in getCurrentUser:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data user",
      error: error.message,
    });
  }
}

/**
 * Initialize user profile (check or create)
 * UserId diambil dari authToken
 */
export async function initializeUser(req, res) {
  try {
    const userId = req.user.uid;
    const { email, displayName, photoURL } = req.body;

    const result = await initializeUserProfile(userId, {
      email: email || req.user.email,
      displayName,
      photoURL,
    });

    res.status(result.isNew ? 201 : 200).json({
      success: true,
      message: result.isNew
        ? "User profile created"
        : "User profile already exists",
      data: result,
    });
  } catch (error) {
    console.error("Error in initializeUser:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat initialize user",
      error: error.message,
    });
  }
}

/**
 * Save daily ledger
 */
export async function saveLedger(req, res) {
  try {
    const userId = req.user.uid;
    const { date, ...ledgerData } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date wajib diisi",
      });
    }

    const ledger = await saveDailyLedger(userId, date, ledgerData);

    res.status(200).json({
      success: true,
      message: "Ledger berhasil disimpan",
      data: ledger,
    });
  } catch (error) {
    console.error("Error in saveLedger:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menyimpan ledger",
      error: error.message,
    });
  }
}

/**
 * Get daily ledger
 */
export async function getLedger(req, res) {
  try {
    const userId = req.user.uid;
    const { date } = req.params;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date wajib diisi",
      });
    }

    const ledger = await getDailyLedger(userId, date);

    if (!ledger) {
      return res.status(404).json({
        success: false,
        message: "Ledger tidak ditemukan",
      });
    }

    res.status(200).json({
      success: true,
      message: "Ledger berhasil diambil",
      data: ledger,
    });
  } catch (error) {
    console.error("Error in getLedger:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil ledger",
      error: error.message,
    });
  }
}

/**
 * Add history item
 */
export async function addHistory(req, res) {
  try {
    const userId = req.user.uid;
    const itemData = req.body;

    const historyItem = await addHistoryItem(userId, itemData);

    res.status(201).json({
      success: true,
      message: "History item berhasil ditambahkan",
      data: historyItem,
    });
  } catch (error) {
    console.error("Error in addHistory:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menambahkan history",
      error: error.message,
    });
  }
}

/**
 * Get history with filters
 */
export async function getHistoryList(req, res) {
  try {
    const userId = req.user.uid;
    const { limit, date } = req.query;

    const history = await getHistory(
      userId,
      limit ? parseInt(limit) : 50,
      date || null,
    );

    res.status(200).json({
      success: true,
      message: "History berhasil diambil",
      data: history,
    });
  } catch (error) {
    console.error("Error in getHistoryList:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil history",
      error: error.message,
    });
  }
}

/**
 * Delete history item
 */
export async function deleteHistory(req, res) {
  try {
    const userId = req.user.uid;
    const { historyId } = req.params;

    if (!historyId) {
      return res.status(400).json({
        success: false,
        message: "historyId wajib diisi",
      });
    }

    await deleteHistoryItem(userId, historyId);

    res.status(200).json({
      success: true,
      message: "History item berhasil dihapus",
    });
  } catch (error) {
    console.error("Error in deleteHistory:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus history",
      error: error.message,
    });
  }
}

/**
 * Add weight entry
 */
export async function addWeight(req, res) {
  try {
    const userId = req.user.uid;
    const { date, weight } = req.body;

    if (!weight) {
      return res.status(400).json({
        success: false,
        message: "weight wajib diisi",
      });
    }

    const weightEntry = await addWeightEntry(userId, { date, weight });

    res.status(201).json({
      success: true,
      message: "Weight entry berhasil ditambahkan",
      data: weightEntry,
    });
  } catch (error) {
    console.error("Error in addWeight:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menambahkan weight entry",
      error: error.message,
    });
  }
}

/**
 * Get weight history
 */
export async function getWeightList(req, res) {
  try {
    const userId = req.user.uid;
    const { limit } = req.query;

    const weights = await getWeightHistory(
      userId,
      limit ? parseInt(limit) : 100,
    );

    res.status(200).json({
      success: true,
      message: "Weight history berhasil diambil",
      data: weights,
    });
  } catch (error) {
    console.error("Error in getWeightList:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil weight history",
      error: error.message,
    });
  }
}

/**
 * Daily check-in
 */
export async function getCheckInStatusController(req, res) {
  try {
    const userId = req.user.uid;

    const { getCheckInStatus } = await import("../service/user.service.js");
    const status = await getCheckInStatus(userId);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Error in getCheckInStatus:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil status check-in",
      error: error.message,
    });
  }
}

export async function checkIn(req, res) {
  try {
    const userId = req.user.uid;

    const result = await processDailyCheckIn(userId);

    // Jika sudah check-in hari ini, return 200 dengan success: false
    if (!result.success) {
      return res.status(200).json(result);
    }

    // Check-in berhasil
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in checkIn:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat check-in",
      error: error.message,
    });
  }
}

/**
 * Save goal configuration
 */
export async function saveGoal(req, res) {
  try {
    const userId = req.user.uid;
    const goalData = req.body;

    const goal = await saveGoalConfig(userId, goalData);

    res.status(200).json({
      success: true,
      message: "Goal berhasil disimpan",
      data: goal,
    });
  } catch (error) {
    console.error("Error in saveGoal:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menyimpan goal",
      error: error.message,
    });
  }
}

export async function batchUpdate(req, res) {
  try {
    const userId = req.user.uid;

    const data = req.body;

    const result = await batchUpdateUserData(userId, data);

    res.status(200).json({
      success: true,

      message: "Batch update berhasil",

      data: result,
    });
  } catch (error) {
    console.error("Error in batchUpdate:", error);

    res.status(500).json({
      success: false,

      message: "Terjadi kesalahan saat batch update",

      error: error.message,
    });
  }
}

/**
 * @route   POST /api/users/onboarding/identity
 * @desc    Simpan Agent Identity (step 1 onboarding)
 * @access  Private
 */
export async function saveAgentIdentityController(req, res) {
  try {
    const userId = req.user.uid;
    const identity = req.body;

    const { saveAgentIdentity } = await import("../service/user.service.js");
    const profile = await saveAgentIdentity(userId, identity);

    res.status(200).json({
      success: true,
      message: "Agent identity tersimpan",
      data: profile,
    });
  } catch (error) {
    console.error("Error in saveAgentIdentityController:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menyimpan agent identity",
      error: error.message,
    });
  }
}

/**
 * @route   POST /api/users/onboarding/calibration
 * @desc    Simpan Calibration (step 2 onboarding)
 * @access  Private
 */
export async function saveCalibrationController(req, res) {
  try {
    const userId = req.user.uid;
    const calibration = req.body;

    const { saveCalibration } = await import("../service/user.service.js");
    const profile = await saveCalibration(userId, calibration);

    res.status(200).json({
      success: true,
      message: "Calibration tersimpan",
      data: profile,
    });
  } catch (error) {
    console.error("Error in saveCalibrationController:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menyimpan calibration",
      error: error.message,
    });
  }
}

/**
 * @route   POST /api/users/onboarding/medical-intel
 * @desc    Simpan Medical Intel (step 3 onboarding)
 * @access  Private
 */
export async function saveMedicalIntelController(req, res) {
  try {
    const userId = req.user.uid;
    const medical = req.body;

    const { saveMedicalIntel } = await import("../service/user.service.js");
    const profile = await saveMedicalIntel(userId, medical);

    res.status(200).json({
      success: true,
      message: "Medical intel tersimpan",
      data: profile,
    });
  } catch (error) {
    console.error("Error in saveMedicalIntelController:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menyimpan medical intel",
      error: error.message,
    });
  }
}

/**
 * @route   POST /api/users/onboarding/mission-profile
 * @desc    Simpan Mission Profile (step 4 onboarding) dan optional set daily limit
 * @access  Private
 */
export async function saveMissionProfileController(req, res) {
  try {
    const userId = req.user.uid;
    const mission = req.body;

    const { saveMissionProfile } = await import("../service/user.service.js");
    const profile = await saveMissionProfile(userId, mission);

    res.status(200).json({
      success: true,
      message: "Mission profile tersimpan",
      data: profile,
    });
  } catch (error) {
    console.error("Error in saveMissionProfileController:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menyimpan mission profile",
      error: error.message,
    });
  }
}

/**
 * @route   GET /api/users/onboarding/status
 * @desc    Ambil status onboarding (ringkasan 4 langkah)
 * @access  Private
 */
export async function getOnboardingStatusController(req, res) {
  try {
    const userId = req.user.uid;

    const { getOnboardingStatus } = await import("../service/user.service.js");
    const status = await getOnboardingStatus(userId);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Error in getOnboardingStatusController:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil status onboarding",
      error: error.message,
    });
  }
}

/**
 * Save diet plan
 */
export async function saveDietPlanController(req, res) {
  try {
    const userId = req.user.uid;
    const dietPlanData = req.body;

    const plan = await saveDietPlan(userId, dietPlanData);

    res.status(201).json({
      success: true,
      message: "Diet plan berhasil disimpan",
      data: plan,
    });
  } catch (error) {
    console.error("Error in saveDietPlan:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menyimpan diet plan",
      error: error.message,
    });
  }
}

/**
 * Get active diet plan
 */
export async function getActiveDietPlanController(req, res) {
  try {
    const userId = req.user.uid;
    const { type } = req.query;

    let plan;
    if (type === "weekly") {
      plan = await getActiveWeeklyPlan(userId, "diet");
    } else {
      plan = await getActiveDietPlan(userId);
    }

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: `Tidak ada ${type === "weekly" ? "weekly" : "diet"} plan aktif`,
      });
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error("Error in getActiveDietPlan:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil diet plan",
      error: error.message,
    });
  }
}

/**
 * Update diet completion
 */
export async function updateDietCompletionController(req, res) {
  try {
    const userId = req.user.uid;
    const { planId } = req.params;
    const { completedMeals } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "planId wajib diisi",
      });
    }

    const result = await updateDietCompletion(userId, planId, completedMeals);

    res.status(200).json({
      success: true,
      message: "Diet completion berhasil diupdate",
      data: result,
    });
  } catch (error) {
    console.error("Error in updateDietCompletion:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat update diet completion",
      error: error.message,
    });
  }
}

/**
 * Save training plan
 */
export async function saveTrainingPlanController(req, res) {
  try {
    const userId = req.user.uid;
    const trainingPlanData = req.body;

    const plan = await saveTrainingPlan(userId, trainingPlanData);

    res.status(201).json({
      success: true,
      message: "Training plan berhasil disimpan",
      data: plan,
    });
  } catch (error) {
    console.error("Error in saveTrainingPlan:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menyimpan training plan",
      error: error.message,
    });
  }
}

/**
 * Get active training plan
 */
export async function getActiveTrainingPlanController(req, res) {
  try {
    const userId = req.user.uid;

    const plan = await getActiveTrainingPlan(userId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Tidak ada training plan aktif",
      });
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error("Error in getActiveTrainingPlan:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil training plan",
      error: error.message,
    });
  }
}

/**
 * Update training progress
 */
export async function updateTrainingProgressController(req, res) {
  try {
    const userId = req.user.uid;
    const { planId } = req.params;
    const { progress } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "planId wajib diisi",
      });
    }

    const result = await updateTrainingProgress(userId, planId, progress);

    res.status(200).json({
      success: true,
      message: "Training progress berhasil diupdate",
      data: result,
    });
  } catch (error) {
    console.error("Error in updateTrainingProgress:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat update training progress",
      error: error.message,
    });
  }
}

/**
 * Save consultation session
 */
export async function saveConsultationController(req, res) {
  try {
    const userId = req.user.uid;
    const sessionData = req.body;

    const session = await saveConsultation(userId, sessionData);

    res.status(201).json({
      success: true,
      message: "Consultation session berhasil disimpan",
      data: session,
    });
  } catch (error) {
    console.error("Error in saveConsultation:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menyimpan consultation",
      error: error.message,
    });
  }
}

/**
 * Get consultation history
 */
export async function getConsultationHistoryController(req, res) {
  try {
    const userId = req.user.uid;
    const { limit } = req.query;

    const consultations = await getConsultationHistory(
      userId,
      limit ? parseInt(limit) : 10,
    );

    res.status(200).json({
      success: true,
      data: consultations,
    });
  } catch (error) {
    console.error("Error in getConsultationHistory:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil consultation history",
      error: error.message,
    });
  }
}

/**
 * Save skin scan
 */
export async function saveSkinScanController(req, res) {
  try {
    const userId = req.user.uid;
    const scanData = req.body;

    const scan = await saveSkinScan(userId, scanData);

    res.status(201).json({
      success: true,
      message: "Skin scan berhasil disimpan",
      data: scan,
    });
  } catch (error) {
    console.error("Error in saveSkinScan:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menyimpan skin scan",
      error: error.message,
    });
  }
}

/**
 * Get latest skin scan
 */
export async function getLatestSkinScanController(req, res) {
  try {
    const userId = req.user.uid;

    const scan = await getLatestSkinScan(userId);

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: "Tidak ada skin scan tersedia",
      });
    }

    res.status(200).json({
      success: true,
      data: scan,
    });
  } catch (error) {
    console.error("Error in getLatestSkinScan:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil skin scan",
      error: error.message,
    });
  }
}

/**
 * Get all skin scans
 */
export async function getSkinScansController(req, res) {
  try {
    const userId = req.user.uid;
    const { limit } = req.query;

    const scans = await getSkinScans(userId, limit ? parseInt(limit) : 10);

    res.status(200).json({
      success: true,
      data: scans,
    });
  } catch (error) {
    console.error("Error in getSkinScans:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil skin scans",
      error: error.message,
    });
  }
}

/**
 * Save weekly plan
 */
export async function saveWeeklyPlanController(req, res) {
  try {
    const userId = req.user.uid;
    const weeklyPlanData = req.body;

    const plan = await saveWeeklyPlan(userId, weeklyPlanData);

    res.status(201).json({
      success: true,
      message: "Weekly plan berhasil disimpan",
      data: plan,
    });
  } catch (error) {
    console.error("Error in saveWeeklyPlan:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menyimpan weekly plan",
      error: error.message,
    });
  }
}

/**
 * Get active weekly plan
 */
export async function getActiveWeeklyPlanController(req, res) {
  try {
    const userId = req.user.uid;
    const { type } = req.query;

    const plan = await getActiveWeeklyPlan(userId, type || "diet");

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Tidak ada weekly plan aktif",
      });
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error("Error in getActiveWeeklyPlan:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil weekly plan",
      error: error.message,
    });
  }
}

/**
 * Update weekly completion
 */
export async function updateWeeklyCompletionController(req, res) {
  try {
    const userId = req.user.uid;
    const { planId } = req.params;
    const { completion } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "planId wajib diisi",
      });
    }

    const result = await updateWeeklyCompletion(userId, planId, completion);

    res.status(200).json({
      success: true,
      message: "Weekly completion berhasil diupdate",
      data: result,
    });
  } catch (error) {
    console.error("Error in updateWeeklyCompletion:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat update weekly completion",
      error: error.message,
    });
  }
}

/**
 * Get ledger range
 */
export async function getLedgerRangeController(req, res) {
  try {
    const userId = req.user.uid;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date dan end date wajib diisi",
      });
    }

    const ledgers = await getLedgerRange(userId, startDate, endDate);

    res.status(200).json({
      success: true,
      data: ledgers,
    });
  } catch (error) {
    console.error("Error in getLedgerRange:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil ledger range",
      error: error.message,
    });
  }
}

/**
 * Get history by action
 */
export async function getHistoryByActionController(req, res) {
  try {
    const userId = req.user.uid;
    const { action, limit } = req.query;

    if (!action) {
      return res.status(400).json({
        success: false,
        message: "Action wajib diisi (consumed/rejected/scanned)",
      });
    }

    const history = await getHistoryByAction(
      userId,
      action,
      limit ? parseInt(limit) : 50,
    );

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error in getHistoryByAction:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil history",
      error: error.message,
    });
  }
}

/**
 * Get current goal
 */
export async function getCurrentGoalController(req, res) {
  try {
    const userId = req.user.uid;

    const goal = await getCurrentGoal(userId);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: "Tidak ada goal yang ditemukan",
      });
    }

    res.status(200).json({
      success: true,
      data: goal,
    });
  } catch (error) {
    console.error("Error in getCurrentGoal:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil goal",
      error: error.message,
    });
  }
}

/**
 * Update goal progress
 */
export async function updateGoalProgressController(req, res) {
  try {
    const userId = req.user.uid;
    const { currentWeight } = req.body;

    if (!currentWeight) {
      return res.status(400).json({
        success: false,
        message: "Current weight wajib diisi",
      });
    }

    const goal = await updateGoalProgress(userId, currentWeight);

    res.status(200).json({
      success: true,
      message: "Goal progress berhasil diupdate",
      data: goal,
    });
  } catch (error) {
    console.error("Error in updateGoalProgress:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat update goal progress",
      error: error.message,
    });
  }
}

/**
 * Get complete status data
 */
export async function getStatusDataController(req, res) {
  try {
    const userId = req.user.uid;
    const { date } = req.query;

    const statusData = await getStatusData(userId, date);

    res.status(200).json({
      success: true,
      data: statusData,
    });
  } catch (error) {
    console.error("Error in getStatusData:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil status data",
      error: error.message,
    });
  }
}

export async function generateDailyTrainingPlanController(req, res) {
  try {
    const userId = req.user.uid;
    const {
      mode,
      focusArea,
      intensity,
      equipment,
      inputMode,
      customParams,
      customFocusInput,
    } = req.body;

    // Validate required parameters
    if (!mode || !focusArea || !intensity || !equipment) {
      return res.status(400).json({
        success: false,
        message:
          "Parameter mode, focusArea, intensity, dan equipment wajib diisi",
      });
    }

    // Get user profile
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: "User profile tidak ditemukan",
      });
    }

    // Get today's date
    const today = new Date().toISOString().split("T")[0];

    // Generate plan
    const trainingPlan = await generateDailyTrainingPlan(
      userId,
      today,
      userProfile,
      {
        mode,
        focusArea,
        intensity,
        equipment,
        inputMode: inputMode || "auto",
        customParams,
        customFocusInput,
      },
    );

    res.status(201).json({
      success: true,
      message: "Training plan berhasil di-generate",
      data: trainingPlan,
    });
  } catch (error) {
    console.error("Error in generateDailyTrainingPlan:", error);

    // Check if it's a rate limit error
    if (error.message.includes("Mission Control Offline")) {
      return res.status(429).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat generate training plan",
      error: error.message,
    });
  }
}

export async function saveDailyTrainingPlanController(req, res) {
  try {
    const userId = req.user.uid;
    const { date } = req.params;
    const plan = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date wajib diisi",
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Format date harus YYYY-MM-DD",
      });
    }

    const result = await saveDailyTrainingPlan(userId, date, plan);

    res.status(201).json({
      success: true,
      message: "Daily training plan berhasil disimpan",
      data: result,
    });
  } catch (error) {
    console.error("Error in saveDailyTrainingPlan:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menyimpan daily training plan",
      error: error.message,
    });
  }
}

export async function getDailyTrainingPlanController(req, res) {
  try {
    const userId = req.user.uid;
    const { date } = req.params;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date wajib diisi",
      });
    }

    const plan = await getDailyTrainingPlan(userId, date);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Training plan tidak ditemukan untuk tanggal tersebut",
      });
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error("Error in getDailyTrainingPlan:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil daily training plan",
      error: error.message,
    });
  }
}

export async function hasGeneratedTodayPlanController(req, res) {
  try {
    const userId = req.user.uid;
    const { date } = req.params;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date wajib diisi",
      });
    }

    const hasGenerated = await hasGeneratedTodayPlan(userId, date);

    res.status(200).json({
      success: true,
      data: {
        hasGenerated,
        date,
      },
    });
  } catch (error) {
    console.error("Error in hasGeneratedTodayPlan:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengecek training plan",
      error: error.message,
    });
  }
}

export async function updateTrainingCompletionController(req, res) {
  try {
    const userId = req.user.uid;
    const { date } = req.params;
    const { type, index, completed } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date wajib diisi",
      });
    }

    if (!type || index === undefined || completed === undefined) {
      return res.status(400).json({
        success: false,
        message: "type, index, dan completed wajib diisi",
      });
    }

    const result = await updateTrainingCompletion(
      userId,
      date,
      type,
      index,
      completed,
    );

    res.status(200).json({
      success: true,
      message: "Training completion berhasil diupdate",
      data: result,
    });
  } catch (error) {
    console.error("Error in updateTrainingCompletion:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat update training completion",
      error: error.message,
    });
  }
}

export async function getTrainingCompletionController(req, res) {
  try {
    const userId = req.user.uid;
    const { date } = req.params;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date wajib diisi",
      });
    }

    const completion = await getTrainingCompletion(userId, date);

    res.status(200).json({
      success: true,
      data: completion,
    });
  } catch (error) {
    console.error("Error in getTrainingCompletion:", error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil training completion",
      error: error.message,
    });
  }
}
