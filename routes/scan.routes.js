import express from "express";
import {
  scanFood,
  scanLabel,
  scanBarcode,
  scanReceipt,
  scanVersus,
  scanSkin,
} from "../controllers/scan.controller.js";
import {
  uploadSingle,
  uploadMultiple,
  convertToBase64,
} from "../middleware/upload.middleware.js";
import { verifyFirebaseToken } from "../middleware/auth.middleware.js";
import {
  requireScanType,
  requireLimit,
} from "../middleware/permission.middleware.js";
import { getTodayScans } from "../service/subscription.service.js";

const router = express.Router();

/**
 * SCAN API ENDPOINTS
 * Digunakan di berbagai halaman untuk scanning berbagai jenis objek
 */

/**
 * @route   POST /api/scan/food
 * @desc    Scan makanan dari foto untuk mendapatkan informasi nutrisi
 * @access  Private
 * @body    { image: file/base64 }
 * @frontend Home (Scan Food), Diet (analyze meal)
 */
router.post(
  "/food",
  verifyFirebaseToken,
  requireScanType("food"),
  requireLimit("maxScansPerDay", getTodayScans),
  uploadSingle,
  convertToBase64,
  scanFood,
);

/**
 * @route   POST /api/scan/label
 * @desc    Scan nutrition label/kemasan makanan
 * @access  Private
 * @body    { image: file/base64 }
 * @frontend Diet, Log (scan food packaging)
 */
router.post(
  "/label",
  verifyFirebaseToken,
  requireScanType("label"),
  requireLimit("maxScansPerDay", getTodayScans),
  uploadSingle,
  convertToBase64,
  scanLabel,
);

/**
 * @route   POST /api/scan/barcode
 * @desc    Scan barcode produk untuk info nutrisi
 * @access  Private
 * @body    { image: file/base64 }
 * @frontend Diet, Log (quick food entry)
 */
router.post(
  "/barcode",
  verifyFirebaseToken,
  requireScanType("qr"),
  requireLimit("maxScansPerDay", getTodayScans),
  uploadSingle,
  convertToBase64,
  scanBarcode,
);

/**
 * @route   POST /api/scan/receipt
 * @desc    Scan receipt belanja untuk generate shopping insights
 * @access  Private
 * @body    { image: file/base64 }
 * @frontend Diet (shopping list verification)
 */
router.post(
  "/receipt",
  verifyFirebaseToken,
  requireScanType("receipt"),
  requireLimit("maxScansPerDay", getTodayScans),
  uploadSingle,
  convertToBase64,
  scanReceipt,
);

/**
 * @route   POST /api/scan/versus
 * @desc    Compare 2 produk makanan side-by-side
 * @access  Private
 * @body    { images: [file1, file2] }
 * @frontend Diet (product comparison)
 */
router.post(
  "/versus",
  verifyFirebaseToken,
  requireScanType("versus"),
  requireLimit("maxScansPerDay", getTodayScans),
  uploadMultiple,
  convertToBase64,
  scanVersus,
);

/**
 * @route   POST /api/scan/skin
 * @desc    Scan kulit untuk analisis kesehatan kulit
 * @access  Private
 * @body    { image: file/base64 }
 * @frontend Bio (skin health analysis)
 */
router.post(
  "/skin",
  verifyFirebaseToken,
  requireScanType("skin"),
  requireLimit("maxScansPerDay", getTodayScans),
  uploadSingle,
  convertToBase64,
  scanSkin,
);

export default router;
