/**
 * ROLE CONFIGURATION
 * Mendefinisikan role user dan permission untuk setiap role
 */

export const UserRole = {
  // New role names
  FREE: "free",
  PRO: "pro",
  PRO_MAX: "pro max",

  // Backward compatibility aliases (legacy naming)
  INITIATE: "free",
  OPERATIVE: "pro",
  HANDLER: "pro max",
};

export const RoleAliases = {
  // Legacy role values
  initiate: UserRole.FREE,
  operative: UserRole.PRO,
  handler: UserRole.PRO_MAX,

  // New role values
  free: UserRole.FREE,
  pro: UserRole.PRO,
  "pro max": UserRole.PRO_MAX,
  "pro-max": UserRole.PRO_MAX,
  promax: UserRole.PRO_MAX,
  pro_max: UserRole.PRO_MAX,

  // Friendly names that might appear in external systems
  "free plan": UserRole.FREE,
  "pro plan": UserRole.PRO,
  "pro max plan": UserRole.PRO_MAX,
};

export function normalizeRole(role) {
  if (!role) return UserRole.FREE;
  const normalized = String(role).toLowerCase().trim();
  return RoleAliases[normalized] || normalized;
}

export function getSubscriptionStatus(userProfile) {
  const rawStatus =
    userProfile?.subscription?.status ?? userProfile?.subscriptionStatus;
  if (rawStatus) return String(rawStatus).toLowerCase().trim();

  const rawPlan =
    userProfile?.subscription?.plan ??
    userProfile?.subscriptionPlan ??
    userProfile?.role;
  return normalizeRole(rawPlan) === UserRole.FREE ? "none" : "active";
}

export function getSubscriptionExpiry(userProfile) {
  return (
    userProfile?.subscription?.currentPeriodEnd ??
    userProfile?.subscription?.endsAt ??
    userProfile?.subscriptionExpiry ??
    userProfile?.subscriptionExpiresAt ??
    null
  );
}

function toEpochMilliseconds(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

/**
 * Resolve the effective app plan from the canonical nested subscription.
 * Legacy root fields are read only as a migration fallback.
 */
export function getUserSubscriptionRole(userProfile, now = Date.now()) {
  const role = normalizeRole(
    userProfile?.subscription?.plan ??
      userProfile?.subscriptionPlan ??
      userProfile?.role ??
      UserRole.FREE,
  );

  if (role === UserRole.FREE) return UserRole.FREE;

  const status = getSubscriptionStatus(userProfile);
  if (!["active", "trial", "trialing"].includes(status)) {
    return UserRole.FREE;
  }

  const expiry = toEpochMilliseconds(getSubscriptionExpiry(userProfile));
  if (expiry !== null && expiry < now) return UserRole.FREE;

  return role;
}

export const RolePermissions = {
  [UserRole.FREE]: {
    // Scan features
    maxScansPerDay: 5,
    scanTypes: ["food"],

    // Diet & Training
    canGenerateDietPlan: false,
    canGenerateTrainingPlan: false,
    maxWeeklyPlans: 0,

    // Consultation
    canVideoCall: false,
    canAIChat: false,
    maxChatMessagesPerDay: 0,

    // Bio Features
    canSkinScan: false,
    canViewConsultationHistory: false,
    canViewSugarForecast: false, // Basic sugar logging only (no forecasting)

    // Feed (Moriesly Feed)
    canGenerateFeed: true,
    maxFeedGenerationsPerDay: 3,

    // Data & History
    historyRetentionDays: 7,
    canExportData: false,

    // General
    canViewDetailedAnalytics: false,
    canSetCustomGoals: false,
    adsEnabled: true,
  },

  [UserRole.PRO]: {
    // Scan features
    maxScansPerDay: 50,
    scanTypes: ["food", "drink", "receipt", "versus", "label", "qr", "skin"],

    // Diet & Training
    canGenerateDietPlan: true,
    canGenerateTrainingPlan: true,
    maxWeeklyPlans: 4, // 4-week diet & training plans

    // Consultation
    canVideoCall: true,
    canAIChat: true,
    maxChatMessagesPerDay: 100,
    maxVideoCallMinutesPerMonth: 60,

    // Bio Features
    canSkinScan: true,
    canViewConsultationHistory: true,
    canViewSugarForecast: true, // Sugar-spike forecasting enabled

    // Feed (Moriesly Feed)
    canGenerateFeed: true,
    maxFeedGenerationsPerDay: 20,

    // Data & History
    historyRetentionDays: 365, // 1-year history retention
    canExportData: false,

    // General
    canViewDetailedAnalytics: true,
    canSetCustomGoals: false,
    adsEnabled: false,
  },

  [UserRole.PRO_MAX]: {
    // Scan features
    maxScansPerDay: 100,
    scanTypes: ["food", "drink", "receipt", "versus", "label", "qr", "skin"],

    // Diet & Training
    canGenerateDietPlan: true,
    canGenerateTrainingPlan: true,
    maxWeeklyPlans: 12, // 12-week diet & training plans

    // Consultation
    canVideoCall: true,
    canAIChat: true,
    maxChatMessagesPerDay: 500,
    maxVideoCallMinutesPerMonth: 300,

    // Bio Features
    canSkinScan: true,
    canViewConsultationHistory: true,
    canViewSugarForecast: true,

    // Feed (Moriesly Feed)
    canGenerateFeed: true,
    maxFeedGenerationsPerDay: -1, // Unlimited feed generations

    // Data & History
    historyRetentionDays: -1, // Unlimited history retention
    canExportData: true,

    // General
    canViewDetailedAnalytics: true,
    canSetCustomGoals: true,
    adsEnabled: false,

    // Pro Max only
    canAccessBetaFeatures: true,
    prioritySupport: true,
  },
};

/**
 * Get permissions untuk user berdasarkan role
 * Jika user punya customPermissions, merge dengan default role permissions
 */
export function getUserPermissions(userProfile) {
  const normalizedRole = getUserSubscriptionRole(userProfile);
  const defaultPermissions =
    RolePermissions[normalizedRole] || RolePermissions[UserRole.FREE];

  // Jika role PRO_MAX dan ada customPermissions, merge
  if (normalizedRole === UserRole.PRO_MAX && userProfile?.customPermissions) {
    return {
      ...defaultPermissions,
      ...userProfile.customPermissions,
    };
  }

  return defaultPermissions;
}

/**
 * Check apakah user punya permission tertentu
 */
export function hasPermission(userProfile, permissionKey) {
  const permissions = getUserPermissions(userProfile);
  return permissions[permissionKey] === true;
}

/**
 * Check apakah user sudah mencapai limit (misal: maxScansPerDay)
 */
export function checkLimit(userProfile, limitKey, currentUsage) {
  const permissions = getUserPermissions(userProfile);
  const limit = permissions[limitKey];

  if (limit === -1) return { allowed: true, remaining: -1, limit: -1 }; // Unlimited

  const remaining = limit - currentUsage;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit,
  };
}

/**
 * Check apakah scan type diperbolehkan
 */
export function isScanTypeAllowed(userProfile, scanType) {
  const permissions = getUserPermissions(userProfile);
  const allowedTypes = permissions.scanTypes || [];
  return allowedTypes.includes(scanType);
}

/**
 * Role hierarchy untuk upgrade path
 */
export const RoleHierarchy = {
  [UserRole.FREE]: 0,
  [UserRole.PRO]: 1,
  [UserRole.PRO_MAX]: 2,
};

export function canUpgradeTo(currentRole, targetRole) {
  const current = normalizeRole(currentRole);
  const target = normalizeRole(targetRole);

  const currentRank = RoleHierarchy[current] ?? -1;
  const targetRank = RoleHierarchy[target] ?? -1;

  return targetRank > currentRank;
}
