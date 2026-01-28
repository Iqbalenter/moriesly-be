import express from "express";
import { verifyFirebaseToken } from "../middleware/auth.middleware.js";
import {
  getCurrentUser,
  updateUser,
  getUserData,
  addWeight,
  getWeightList,
} from "../controllers/user.controller.js";

const router = express.Router();

/**
 * PROFILE PAGE ENDPOINTS
 * Halaman Profile: View & edit profile, weight tracking
 */

/**
 * @route   GET /api/profile
 * @desc    Get current user profile data (userId dari authToken)
 * @access  Private
 * @frontend Profile - View profile
 */
router.get("/", verifyFirebaseToken, getCurrentUser);

/**
 * @route   PUT /api/profile
 * @desc    Update user profile (userId dari authToken)
 * @access  Private
 * @frontend Profile - Edit profile
 */
router.put("/", verifyFirebaseToken, updateUser);

/**
 * @route   POST /api/profile/weight
 * @desc    Add weight entry (userId dari authToken)
 * @access  Private
 * @frontend Profile - Log weight
 */
router.post("/weight", verifyFirebaseToken, addWeight);

/**
 * @route   GET /api/profile/weight
 * @desc    Get weight history (query: limit) (userId dari authToken)
 * @access  Private
 * @frontend Profile - Weight tracking chart
 */
router.get("/weight", verifyFirebaseToken, getWeightList);

export default router;
