import { auth, db } from "../config/firebase.config.js";
import { RolePermissions, UserRole, normalizeRole } from "../utils/role.config.js";

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

const PLAN_LABELS = {
  [UserRole.FREE]: "Free",
  [UserRole.PRO]: "Pro",
  [UserRole.PRO_MAX]: "Pro Max",
};

const PUBLIC_PLAN_IDS = [UserRole.FREE, UserRole.PRO, UserRole.PRO_MAX];

function normalizePlanId(plan) {
  return normalizeRole(plan || UserRole.FREE);
}

function toIso(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function getUserStatus(data) {
  const status = String(data.status || "active").toLowerCase();
  if (["active", "suspended", "deleted"].includes(status)) return status;
  return "active";
}

function getSubscriptionStatus(data) {
  const subscription = data.subscription || {};
  const raw = String(
    data.subscriptionStatus || subscription.status || "",
  ).toLowerCase();

  if (["trial", "active", "expired", "cancelled"].includes(raw)) return raw;

  const expiry = toIso(
    data.subscriptionExpiry ||
      data.subscriptionExpiresAt ||
      subscription.currentPeriodEnd ||
      subscription.endsAt,
  );

  if (expiry && new Date(expiry).getTime() < Date.now()) return "expired";
  return normalizePlanId(data.role) === UserRole.FREE ? "expired" : "active";
}

function getUserPlan(data) {
  const status = getSubscriptionStatus(data);
  if (status === "expired" || status === "cancelled") return UserRole.FREE;
  return normalizePlanId(data.role || data.subscriptionPlan || UserRole.FREE);
}

function defaultPlanRecord(id) {
  return {
    id,
    name: PLAN_LABELS[id] || id,
    description: "",
    status: "active",
    features: {},
    limits: RolePermissions[id] || RolePermissions[UserRole.FREE],
    source: "default",
  };
}

function compactUser(doc) {
  const data = doc.data() || {};
  const profile = data.profile || {};
  const subscription = data.subscription || {};

  return {
    userId: doc.id,
    email: data.email || "",
    displayName: data.displayName || profile.name || data.name || data.email || "",
    role: data.adminRole || data.appRole || "user",
    status: getUserStatus(data),
    plan: getUserPlan(data),
    subscriptionStatus: getSubscriptionStatus(data),
    expiredAt: toIso(
      data.subscriptionExpiry ||
        data.subscriptionExpiresAt ||
        subscription.currentPeriodEnd ||
        subscription.endsAt,
    ),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

async function getPlanLimits(planId) {
  const normalizedPlan = normalizePlanId(planId);
  const snap = await db.collection("plans").doc(normalizedPlan).get();

  if (!snap.exists) {
    return RolePermissions[normalizedPlan] || RolePermissions[UserRole.FREE];
  }

  const data = snap.data() || {};
  if (String(data.status || "active") !== "active") {
    return RolePermissions[UserRole.FREE];
  }

  return {
    ...(RolePermissions[normalizedPlan] || RolePermissions[UserRole.FREE]),
    ...(data.limits || {}),
  };
}

async function attachUsageSummary(user) {
  const [limits, usageSnap] = await Promise.all([
    getPlanLimits(user.plan),
    db
      .collection("users")
      .doc(user.userId)
      .collection("daily_usage")
      .doc(new Date().toISOString().split("T")[0])
      .get(),
  ]);

  const usage = usageSnap.data() || {};
  const scanCount = Number(usage.scanCount || usage.scansToday || 0);
  const chatCount = Number(usage.chatCount || usage.chatMessagesToday || 0);
  const scanLimit = Number(limits.maxScansPerDay ?? limits.scanCount ?? 0);
  const chatLimit = Number(
    limits.maxChatMessagesPerDay ?? limits.chatCount ?? 0,
  );
  const scanPercent = scanLimit > 0 ? (scanCount / scanLimit) * 100 : 0;
  const chatPercent = chatLimit > 0 ? (chatCount / chatLimit) * 100 : 0;

  return {
    ...user,
    usageToday: { scanCount, chatCount },
    quota: { scanCount: scanLimit, chatCount: chatLimit },
    usagePercent: Math.round(Math.min(100, Math.max(scanPercent, chatPercent))),
  };
}

async function writeAuditLog({ actorId, action, targetType, targetId, before, after }) {
  await db.collection("activity_logs").add({
    actorId,
    action,
    targetType,
    targetId,
    before: before ?? null,
    after: after ?? null,
    createdAt: new Date().toISOString(),
  });
}

async function getAllPlans() {
  const plans = new Map(PUBLIC_PLAN_IDS.map((id) => [id, defaultPlanRecord(id)]));
  const snap = await db.collection("plans").get();

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    plans.set(doc.id, {
      id: doc.id,
      name: data.name || PLAN_LABELS[doc.id] || doc.id,
      description: data.description || "",
      status: data.status || "active",
      features: data.features || {},
      limits: await getPlanLimits(doc.id),
      sortOrder: data.sortOrder ?? 999,
      source: "firestore",
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
    });
  }

  return Array.from(plans.values()).sort((a, b) => {
    const ao = Number(a.sortOrder ?? 999);
    const bo = Number(b.sortOrder ?? 999);
    return ao - bo || String(a.id).localeCompare(String(b.id));
  });
}

export async function adminOverview(req, res) {
  try {
    const usersSnap = await db.collection("users").get();
    const plans = await getAllPlans();
    const usersByPlan = {};
    const usersByRole = {};
    const usersByStatus = {};
    const subscriptionsByStatus = {};

    for (const doc of usersSnap.docs) {
      const user = compactUser(doc);
      usersByPlan[user.plan] = (usersByPlan[user.plan] || 0) + 1;
      usersByRole[user.role] = (usersByRole[user.role] || 0) + 1;
      usersByStatus[user.status] = (usersByStatus[user.status] || 0) + 1;
      subscriptionsByStatus[user.subscriptionStatus] =
        (subscriptionsByStatus[user.subscriptionStatus] || 0) + 1;
    }

    return res.json({
      totalUsers: usersSnap.size,
      usersByPlan,
      usersByRole,
      usersByStatus,
      subscriptionsByStatus,
      plans: plans.length,
    });
  } catch (error) {
    console.error("[adminOverview]", error);
    return res.status(500).json({ message: "Gagal mengambil overview", error: error.message });
  }
}

export async function adminListUsers(req, res) {
  try {
    const {
      search = "",
      role = "",
      plan = "",
      status = "",
      sortBy = "createdAt",
      sortDir = "desc",
      page = "1",
      limit = "25",
    } = req.query;

    const snap = await db.collection("users").get();
    let users = snap.docs.map(compactUser);
    const term = String(search).toLowerCase().trim();

    if (term) {
      users = users.filter(
        (user) =>
          user.email.toLowerCase().includes(term) ||
          user.displayName.toLowerCase().includes(term) ||
          user.userId.toLowerCase().includes(term),
      );
    }

    if (role) users = users.filter((user) => user.role === role);
    if (plan) users = users.filter((user) => user.plan === normalizePlanId(plan));
    if (status) users = users.filter((user) => user.status === status);

    users.sort((a, b) => {
      const av = String(a[sortBy] ?? "").toLowerCase();
      const bv = String(b[sortBy] ?? "").toLowerCase();
      const result = av.localeCompare(bv);
      return sortDir === "asc" ? result : -result;
    });

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(Math.max(1, Number(limit) || 25), 100);
    const total = users.length;
    const offset = (pageNum - 1) * limitNum;
    const pageItems = users.slice(offset, offset + limitNum);

    return res.json({
      items: await Promise.all(pageItems.map(attachUsageSummary)),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("[adminListUsers]", error);
    return res.status(500).json({ message: "Gagal mengambil users", error: error.message });
  }
}

export async function adminGetUserDetail(req, res) {
  try {
    const userRef = db.collection("users").doc(req.params.userId);
    const [userSnap, historySnap] = await Promise.all([
      userRef.get(),
      userRef.collection("plan_history").orderBy("createdAt", "desc").limit(20).get(),
    ]);

    if (!userSnap.exists) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const base = compactUser(userSnap);
    const user = await attachUsageSummary(base);
    const data = userSnap.data() || {};
    const subscription = data.subscription || {};
    const limits = await getPlanLimits(user.plan);

    return res.json({
      ...user,
      currentPlan: user.plan,
      subscription: {
        plan: user.plan,
        status: user.subscriptionStatus,
        startedAt: toIso(
          data.subscriptionStartedAt || subscription.currentPeriodStart,
        ),
        expiredAt: user.expiredAt,
        source: data.subscriptionSource || subscription.source || null,
      },
      activeFeatures: limits,
      planHistory: historySnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: toIso(doc.data().createdAt),
      })),
    });
  } catch (error) {
    console.error("[adminGetUserDetail]", error);
    return res.status(500).json({ message: "Gagal mengambil detail user", error: error.message });
  }
}

export async function adminUpdateUserRole(req, res) {
  try {
    const { role } = req.body;
    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "Role tidak valid" });
    }

    const userRef = db.collection("users").doc(req.params.userId);
    const beforeSnap = await userRef.get();
    if (!beforeSnap.exists) return res.status(404).json({ message: "User tidak ditemukan" });

    await userRef.set(
      {
        appRole: role,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    const authUser = await auth.getUser(req.params.userId);
    await auth.setCustomUserClaims(req.params.userId, {
      ...(authUser.customClaims || {}),
      admin: role === "admin",
    });

    await writeAuditLog({
      actorId: req.user.uid,
      action: "user.role.update",
      targetType: "user",
      targetId: req.params.userId,
      before: { role: compactUser(beforeSnap).role },
      after: { role },
    });

    return res.json({ userId: req.params.userId, role });
  } catch (error) {
    console.error("[adminUpdateUserRole]", error);
    return res.status(500).json({ message: "Gagal update role", error: error.message });
  }
}

export async function adminUpdateUserStatus(req, res) {
  try {
    const { status } = req.body;
    if (!["active", "suspended", "deleted"].includes(status)) {
      return res.status(400).json({ message: "Status tidak valid" });
    }

    const userRef = db.collection("users").doc(req.params.userId);
    const beforeSnap = await userRef.get();
    if (!beforeSnap.exists) return res.status(404).json({ message: "User tidak ditemukan" });

    await userRef.set(
      { status, updatedAt: new Date().toISOString() },
      { merge: true },
    );

    await writeAuditLog({
      actorId: req.user.uid,
      action: "user.status.update",
      targetType: "user",
      targetId: req.params.userId,
      before: { status: compactUser(beforeSnap).status },
      after: { status },
    });

    return res.json({ userId: req.params.userId, status });
  } catch (error) {
    console.error("[adminUpdateUserStatus]", error);
    return res.status(500).json({ message: "Gagal update status", error: error.message });
  }
}

export async function adminListPlans(req, res) {
  try {
    return res.json({ items: await getAllPlans() });
  } catch (error) {
    console.error("[adminListPlans]", error);
    return res.status(500).json({ message: "Gagal mengambil plans", error: error.message });
  }
}

export async function adminSeedDefaultPlans(req, res) {
  try {
    const batch = db.batch();
    const seeded = [];
    const now = new Date().toISOString();

    for (const id of PUBLIC_PLAN_IDS) {
      batch.set(
        db.collection("plans").doc(id),
        {
          name: PLAN_LABELS[id],
          description: "",
          status: "active",
          features: {},
          limits: RolePermissions[id],
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      );
      seeded.push(id);
    }

    await batch.commit();
    await writeAuditLog({
      actorId: req.user.uid,
      action: "plan.seed_defaults",
      targetType: "plan",
      targetId: "defaults",
      after: { seeded },
    });

    return res.json({ seeded });
  } catch (error) {
    console.error("[adminSeedDefaultPlans]", error);
    return res.status(500).json({ message: "Gagal seed plans", error: error.message });
  }
}

export async function adminUpsertPlan(req, res) {
  try {
    const planId = normalizePlanId(req.params.planId);
    const payload = {
      ...(req.body.name !== undefined && { name: req.body.name }),
      ...(req.body.description !== undefined && { description: req.body.description }),
      ...(req.body.status !== undefined && { status: req.body.status }),
      ...(req.body.features !== undefined && { features: req.body.features }),
      ...(req.body.limits !== undefined && { limits: req.body.limits }),
      ...(req.body.sortOrder !== undefined && { sortOrder: req.body.sortOrder }),
      updatedAt: new Date().toISOString(),
    };

    const planRef = db.collection("plans").doc(planId);
    const beforeSnap = await planRef.get();
    if (!beforeSnap.exists) payload.createdAt = new Date().toISOString();

    await planRef.set(payload, { merge: true });
    await writeAuditLog({
      actorId: req.user.uid,
      action: beforeSnap.exists ? "plan.update" : "plan.create",
      targetType: "plan",
      targetId: planId,
      before: beforeSnap.data() || null,
      after: payload,
    });

    const afterSnap = await planRef.get();
    return res.json({ id: afterSnap.id, ...afterSnap.data() });
  } catch (error) {
    console.error("[adminUpsertPlan]", error);
    return res.status(500).json({ message: "Gagal menyimpan plan", error: error.message });
  }
}

export async function adminListFeatures(req, res) {
  try {
    const plans = await getAllPlans();
    const features = new Set();
    const limits = new Set();

    for (const plan of plans) {
      Object.keys(plan.features || {}).forEach((key) => features.add(key));
      Object.keys(plan.limits || {}).forEach((key) => limits.add(key));
    }

    return res.json({
      features: Array.from(features).sort(),
      limits: Array.from(limits).sort(),
    });
  } catch (error) {
    console.error("[adminListFeatures]", error);
    return res.status(500).json({ message: "Gagal mengambil fitur", error: error.message });
  }
}

export async function adminUpdateSubscription(req, res) {
  try {
    const userRef = db.collection("users").doc(req.params.userId);
    const beforeSnap = await userRef.get();
    if (!beforeSnap.exists) return res.status(404).json({ message: "User tidak ditemukan" });

    const before = beforeSnap.data() || {};
    const plan = req.body.plan !== undefined ? normalizePlanId(req.body.plan) : getUserPlan(before);
    const subscriptionStatus =
      req.body.status !== undefined ? req.body.status : getSubscriptionStatus(before);
    const startedAt = req.body.startedAt || null;
    const expiresAt = req.body.expiresAt || null;
    const now = new Date().toISOString();

    const updateData = {
      role: plan,
      subscriptionStatus,
      subscriptionStartedAt: startedAt,
      subscriptionExpiry: expiresAt,
      subscriptionSource: req.body.source || "admin",
      subscriptionUpdatedAt: now,
      updatedAt: now,
      subscription: {
        ...(before.subscription || {}),
        plan,
        status: subscriptionStatus,
        currentPeriodStart: startedAt,
        currentPeriodEnd: expiresAt,
        source: req.body.source || "admin",
      },
    };

    await userRef.set(updateData, { merge: true });
    await userRef.collection("plan_history").add({
      before: {
        plan: getUserPlan(before),
        status: getSubscriptionStatus(before),
        startedAt: toIso(before.subscriptionStartedAt || before.subscription?.currentPeriodStart),
        expiresAt: toIso(before.subscriptionExpiry || before.subscription?.currentPeriodEnd),
      },
      after: {
        plan,
        status: subscriptionStatus,
        startedAt,
        expiresAt,
      },
      note: req.body.note || null,
      actorId: req.user.uid,
      createdAt: now,
    });

    await writeAuditLog({
      actorId: req.user.uid,
      action: "subscription.update",
      targetType: "user",
      targetId: req.params.userId,
      before: { plan: getUserPlan(before), status: getSubscriptionStatus(before) },
      after: { plan, status: subscriptionStatus },
    });

    req.params.userId = req.params.userId;
    return adminGetUserDetail(req, res);
  } catch (error) {
    console.error("[adminUpdateSubscription]", error);
    return res.status(500).json({ message: "Gagal update subscription", error: error.message });
  }
}

export async function adminListActivityLogs(req, res) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const snap = await db
      .collection("activity_logs")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return res.json({
      items: snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: toIso(doc.data().createdAt),
      })),
    });
  } catch (error) {
    console.error("[adminListActivityLogs]", error);
    return res.status(500).json({ message: "Gagal mengambil activity logs", error: error.message });
  }
}
