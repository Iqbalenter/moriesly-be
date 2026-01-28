import express from "express";
import { verifyFirebaseToken } from "../middleware/auth.middleware.js";
import {
  requirePermission,
  requireLimit,
} from "../middleware/permission.middleware.js";
import {
  getUserData,
  saveSkinScanController,
  getLatestSkinScanController,
  getSkinScansController,
  saveConsultationController,
  getConsultationHistoryController,
} from "../controllers/user.controller.js";
import { scanSkin } from "../controllers/scan.controller.js";
import {
  uploadSingle,
  convertToBase64,
} from "../middleware/upload.middleware.js";
import { getTodayScans } from "../service/subscription.service.js";

const router = express.Router();

/**
 * BIO PAGE ENDPOINTS
 * Halaman Bio: Complete biological data, skin scans, consultation history
 */

/**
 * @route   GET /api/bio
 * @desc    Get complete biological/health data of current user
 * @access  Private
 * @frontend Bio - Display complete bio data
 */
router.get("/", verifyFirebaseToken, getUserData);

/**
 * @route   POST /api/bio/skin-scan
 * @desc    Perform skin scan using AI analysis
 * @access  Private (requires canSkinScan permission)
 * @body    { image: file/base64 }
 * @frontend Bio - Scan skin with camera
 */
router.post(
  "/skin-scan",
  verifyFirebaseToken,
  requirePermission("canSkinScan"),
  requireLimit("maxScansPerDay", getTodayScans),
  uploadSingle,
  convertToBase64,
  scanSkin,
);

/**
 * @route   POST /api/bio/skin-scan/save
 * @desc    Save skin scan result to user history
 * @access  Private (requires canSkinScan permission)
 * @body    { scanResult: object, imageUrl?: string }
 * @frontend Bio - Save scan result
 */
router.post(
  "/skin-scan/save",
  verifyFirebaseToken,
  requirePermission("canSkinScan"),
  saveSkinScanController,
);

/**
 * @route   GET /api/bio/skin-scan/latest
 * @desc    Get latest skin scan result
 * @access  Private (requires canSkinScan permission)
 * @frontend Bio - Display latest scan
 */
router.get(
  "/skin-scan/latest",
  verifyFirebaseToken,
  requirePermission("canSkinScan"),
  getLatestSkinScanController,
);

/**
 * @route   GET /api/bio/skin-scan/history
 * @desc    Get all skin scan history (query: limit)
 * @access  Private (requires canSkinScan permission)
 * @frontend Bio - Skin scan history/timeline
 */
router.get(
  "/skin-scan/history",
  verifyFirebaseToken,
  requirePermission("canSkinScan"),
  getSkinScansController,
);

/**
 * @route   POST /api/bio/consultation
 * @desc    Save consultation session data
 * @access  Private
 * @body    { type: string, notes: string, recommendations: array }
 * @frontend Bio - Log consultation session
 */
router.post("/consultation", verifyFirebaseToken, saveConsultationController);

/**
 * @route   GET /api/bio/consultation/history
 * @desc    Get consultation history (query: limit)
 * @access  Private (requires canViewConsultationHistory permission)
 * @frontend Bio - View past consultations
 */
router.get(
  "/consultation/history",
  verifyFirebaseToken,
  requirePermission("canViewConsultationHistory"),
  getConsultationHistoryController,
);

export default router;
