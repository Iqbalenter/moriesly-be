import express from "express";
import {
  addToWaitlist,
  getWaitlistEntries,
  getWaitlistEntryById,
  updateWaitlistEntry,
  deleteWaitlistEntry,
  actionWaitlistEntry,
  verifyWaitlistEmail,
} from "../controllers/waitlist.controller.js";
import { verifyAdminToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/waitlist
 * @desc    Tambah user baru ke waitlist
 * @access  Public
 */
router.post("/", addToWaitlist);

/**
 * @route   PATCH /api/waitlist/:id/verify-email
 * @desc    Verifikasi email user waitlist
 * @access  Public
 */
router.patch("/:id/verify-email", verifyWaitlistEmail);

// ─── Admin-only routes (require valid admin token) ───────────────────────────

/**
 * @route   GET /api/waitlist
 * @desc    Get semua data waitlist (dengan filter status, search, pagination)
 * @access  Admin
 * @query   status  - filter: pending | verified | approved | rejected
 * @query   search  - cari by email / ticketId / phone
 * @query   limit   - jumlah per halaman (default: 50, max: 200)
 * @query   page    - halaman ke-n (default: 1)
 */
router.get("/", verifyAdminToken, getWaitlistEntries);

/**
 * @route   GET /api/waitlist/:id
 * @desc    Get satu data waitlist berdasarkan document ID
 * @access  Admin
 */
router.get("/:id", verifyAdminToken, getWaitlistEntryById);

/**
 * @route   PUT /api/waitlist/:id
 * @desc    Update data waitlist (email, phone, countryCode, reason, deviceType, emailVerified)
 * @access  Admin
 */
router.put("/:id", verifyAdminToken, updateWaitlistEntry);

/**
 * @route   DELETE /api/waitlist/:id
 * @desc    Hapus data waitlist berdasarkan document ID
 * @access  Admin
 */
router.delete("/:id", verifyAdminToken, deleteWaitlistEntry);

/**
 * @route   PATCH /api/waitlist/:id/action
 * @desc    Approve atau Reject pendaftar waitlist
 * @access  Admin
 * @body    { action: "approved" | "rejected", note?: string }
 */
router.patch("/:id/action", verifyAdminToken, actionWaitlistEntry);

export default router;
