import express from "express";
import {
  addToWaitlist,
  getWaitlistEntries,
  verifyWaitlistEmail,
} from "../controllers/waitlist.controller.js";

const router = express.Router();

/**
 * @route   POST /api/waitlist
 * @desc    Tambah user baru ke waitlist
 * @access  Public
 */
router.post("/", addToWaitlist);

/**
 * @route   GET /api/waitlist
 * @desc    Get semua data waitlist
 * @access  Public
 */
router.get("/", getWaitlistEntries);

/**
 * @route   PATCH /api/waitlist/:id/verify-email
 * @desc    Verifikasi email user waitlist
 * @access  Public
 */
router.patch("/:id/verify-email", verifyWaitlistEmail);

export default router;
