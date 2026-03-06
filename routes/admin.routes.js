import express from "express";
import {
    adminLogin,
    adminRegister,
    adminGetMe,
    adminRefreshToken,
    adminLogout,
} from "../controllers/admin.controller.js";
import { verifyAdminToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/admin/register
 * @desc    Daftarkan akun admin baru (memerlukan adminSecret jika dikonfigurasi)
 * @access  Public (dilindungi adminSecret di env)
 * @body    { name, email, password, adminSecret? }
 */
router.post("/register", adminRegister);

/**
 * @route   POST /api/admin/login
 * @desc    Login khusus admin — hanya berhasil jika akun punya custom claim admin:true
 * @access  Public
 * @body    { email, password }
 */
router.post("/login", adminLogin);

/**
 * @route   POST /api/admin/refresh-token
 * @desc    Exchange refreshToken Firebase → idToken baru
 * @access  Public
 * @body    { refreshToken }
 */
router.post("/refresh-token", adminRefreshToken);

// ─── Protected routes (require valid admin token) ────────────────────────────

/**
 * @route   GET /api/admin/me
 * @desc    Ambil profil admin yang sedang login
 * @access  Admin
 * @header  Authorization: Bearer <idToken>
 */
router.get("/me", verifyAdminToken, adminGetMe);

/**
 * @route   POST /api/admin/logout
 * @desc    Revoke semua sesi admin (semua refresh token dicabut)
 * @access  Admin
 * @header  Authorization: Bearer <idToken>
 */
router.post("/logout", verifyAdminToken, adminLogout);

export default router;
