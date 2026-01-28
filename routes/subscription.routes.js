import express from "express";
import {
  getSubscriptionController,
  getSubscriptionStatusController,
  getUsageStatsController,
  upgradeSubscriptionController,
  getAvailablePlansController,
  checkExpiryController,
  adminUpdateRoleController,
} from "../controllers/subscription.controller.js";
import { verifyFirebaseToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   GET /api/subscription
 * @desc    Get user subscription info, permissions, and usage
 * @access  Private
 */
router.get("/", verifyFirebaseToken, getSubscriptionController);

/**
 * @route   GET /api/subscription/status
 * @desc    Get subscription status with feature details
 * @access  Private
 */
router.get("/status", verifyFirebaseToken, getSubscriptionStatusController);

/**
 * @route   GET /api/subscription/usage
 * @desc    Get usage statistics
 * @access  Private
 */
router.get("/usage", verifyFirebaseToken, getUsageStatsController);

/**
 * @route   GET /api/subscription/plans
 * @desc    Get available subscription plans
 * @access  Private
 */
router.get("/plans", verifyFirebaseToken, getAvailablePlansController);

/**
 * @route   POST /api/subscription/upgrade
 * @desc    Upgrade subscription
 * @access  Private
 */
router.post("/upgrade", verifyFirebaseToken, upgradeSubscriptionController);

/**
 * @route   GET /api/subscription/check-expiry
 * @desc    Check if subscription has expired
 * @access  Private
 */
router.get("/check-expiry", verifyFirebaseToken, checkExpiryController);

/**
 * @route   POST /api/subscription/admin/update-role
 * @desc    Admin endpoint to manually update user role
 * @access  Private (Admin only - add admin middleware if available)
 */
router.post("/admin/update-role", verifyFirebaseToken, adminUpdateRoleController);

export default router;
