/**
 * ROLE CONFIGURATION
 * Mendefinisikan role user dan permission untuk setiap role
 */

export const UserRole = {
  INITIATE: "initiate",
  OPERATIVE: "operative",
  HANDLER: "handler",
};

export const RolePermissions = {
  [UserRole.INITIATE]: {
    // Scan features
    maxScansPerDay: 5,
    scanTypes: ["food", "drink"], // Tidak bisa scan receipt, versus, label, qr, skin

    // Diet & Training
    canGenerateDietPlan: false,
    canGenerateTrainingPlan: false,
    maxWeeklyPlans: 0,

    // Consultation
    canVideoCall: false,
    canAIChat: true,
    maxChatMessagesPerDay: 10,

    // Bio Features
    canSkinScan: false,
    canViewConsultationHistory: false,
    canViewSugarForecast: false, // Sugar Spike Forecasting - OPERATIVE+ only

    // Feed (Moriesly Feed)
    canGenerateFeed: true,
    maxFeedGenerationsPerDay: 3, // Limited untuk user gratis

    // Data & History
    historyRetentionDays: 7, // Hanya bisa lihat 7 hari terakhir
    canExportData: false,

    // General
    canViewDetailedAnalytics: false,
    canSetCustomGoals: false,
    adsEnabled: true,
  },

  [UserRole.OPERATIVE]: {
    // Scan features
    maxScansPerDay: 50,
    scanTypes: ["food", "drink", "receipt", "versus", "label", "qr", "skin"],

    // Diet & Training
    canGenerateDietPlan: true,
    canGenerateTrainingPlan: true,
    maxWeeklyPlans: 4, // 1 bulan

    // Consultation
    canVideoCall: true,
    canAIChat: true,
    maxChatMessagesPerDay: 100,
    maxVideoCallMinutesPerMonth: 60,

    // Bio Features
    canSkinScan: true,
    canViewConsultationHistory: true,
    canViewSugarForecast: true, // Sugar Spike Forecasting enabled

    // Feed (Moriesly Feed)
    canGenerateFeed: true,
    maxFeedGenerationsPerDay: 20, // Lebih banyak untuk operative

    // Data & History
    historyRetentionDays: 365, // 1 tahun
    canExportData: true,

    // General
    canViewDetailedAnalytics: true,
    canSetCustomGoals: true,
    adsEnabled: false,
  },

  [UserRole.HANDLER]: {
    // CUSTOM role adalah fully customizable per user
    // Permissions akan disimpan di field customPermissions di profile
    // Default: sama dengan PRO tapi bisa di-override
    maxScansPerDay: 100,
    scanTypes: ["food", "drink", "receipt", "versus", "label", "qr", "skin"],
    canGenerateDietPlan: true,
    canGenerateTrainingPlan: true,
    maxWeeklyPlans: 12,
    canVideoCall: true,
    canAIChat: true,
    maxChatMessagesPerDay: 500,
    maxVideoCallMinutesPerMonth: 300,
    canSkinScan: true,
    canViewConsultationHistory: true,
    canViewSugarForecast: true, // Sugar Spike Forecasting enabled

    // Feed (Moriesly Feed)
    canGenerateFeed: true,
    maxFeedGenerationsPerDay: -1, // Unlimited untuk handler

    historyRetentionDays: -1, // Unlimited
    canExportData: true,
    canViewDetailedAnalytics: true,
    canSetCustomGoals: true,
    adsEnabled: false,

    // Custom-only features
    canAccessBetaFeatures: true,
    prioritySupport: true,
  },
};

/**
 * Get permissions untuk user berdasarkan role
 * Jika user punya customPermissions, merge dengan default role permissions
 */
export function getUserPermissions(userProfile) {
  const role = userProfile?.role || UserRole.INITIATE;
  const defaultPermissions =
    RolePermissions[role] || RolePermissions[UserRole.INITIATE];

  // Jika role HANDLER dan ada customPermissions, merge
  if (role === UserRole.HANDLER && userProfile.customPermissions) {
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

  if (limit === -1) return { allowed: true, remaining: -1 }; // Unlimited

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
  [UserRole.INITIATE]: 0,
  [UserRole.OPERATIVE]: 1,
  [UserRole.HANDLER]: 2,
};

export function canUpgradeTo(currentRole, targetRole) {
  return RoleHierarchy[targetRole] > RoleHierarchy[currentRole];
}
