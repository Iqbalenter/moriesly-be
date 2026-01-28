import {
  getUserPermissions,
  hasPermission,
  checkLimit,
  isScanTypeAllowed,
} from "../utils/role.config.js";
import { getUserProfile } from "../service/user.service.js";

/**
 * Middleware untuk check apakah user punya permission tertentu
 * Usage: router.get('/endpoint', verifyFirebaseToken, requirePermission('canGenerateDietPlan'), handler)
 */
export function requirePermission(permissionKey) {
  return async (req, res, next) => {
    try {
      const userId = req.user.uid;

      // Get user profile
      const userProfile = await getUserProfile(userId);

      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: "User profile not found",
        });
      }

      // Check permission
      if (!hasPermission(userProfile, permissionKey)) {
        const role = userProfile.role || "initiate";
        return res.status(403).json({
          success: false,
          message: `This feature requires a higher subscription tier`,
          error: {
            code: "PERMISSION_DENIED",
            requiredPermission: permissionKey,
            currentRole: role,
            upgradeRequired: true,
          },
        });
      }

      // Store permissions in request for future use
      req.userProfile = userProfile;
      req.permissions = getUserPermissions(userProfile);

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to check permissions",
        error: error.message,
      });
    }
  };
}

/**
 * Middleware untuk check limit (misal: maxScansPerDay)
 * Usage: router.post('/scan', verifyFirebaseToken, requireLimit('maxScansPerDay', getTodayScans), handler)
 */
export function requireLimit(limitKey, getCurrentUsageFn) {
  return async (req, res, next) => {
    try {
      const userId = req.user.uid;

      // Get user profile
      const userProfile = await getUserProfile(userId);

      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: "User profile not found",
        });
      }

      // Get current usage
      const currentUsage = await getCurrentUsageFn(userId);

      // Check limit
      const limitCheck = checkLimit(userProfile, limitKey, currentUsage);

      if (!limitCheck.allowed) {
        const role = userProfile.role || "initiate";
        return res.status(429).json({
          success: false,
          message: `Daily limit reached (${limitCheck.limit}/${limitCheck.limit})`,
          error: {
            code: "LIMIT_EXCEEDED",
            limitKey,
            currentUsage,
            limit: limitCheck.limit,
            remaining: 0,
            currentRole: role,
            upgradeRequired: true,
          },
        });
      }

      // Store info in request
      req.userProfile = userProfile;
      req.permissions = getUserPermissions(userProfile);
      req.usageInfo = {
        currentUsage,
        remaining: limitCheck.remaining,
        limit: limitCheck.limit,
      };

      next();
    } catch (error) {
      console.error("Limit check error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to check limits",
        error: error.message,
      });
    }
  };
}

/**
 * Middleware untuk check scan type permission
 */
export function requireScanType(scanType) {
  return async (req, res, next) => {
    try {
      const userId = req.user.uid;
      const userProfile = await getUserProfile(userId);

      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: "User profile not found",
        });
      }

      const permissions = getUserPermissions(userProfile);
      const allowedTypes = permissions.scanTypes || [];

      if (!isScanTypeAllowed(userProfile, scanType)) {
        const role = userProfile.role || "initiate";
        return res.status(403).json({
          success: false,
          message: `Scan type '${scanType}' is not available in your plan`,
          error: {
            code: "SCAN_TYPE_NOT_ALLOWED",
            requestedType: scanType,
            allowedTypes,
            currentRole: role,
            upgradeRequired: true,
          },
        });
      }

      req.userProfile = userProfile;
      req.permissions = permissions;

      next();
    } catch (error) {
      console.error("Scan type check error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to check scan type permission",
        error: error.message,
      });
    }
  };
}
