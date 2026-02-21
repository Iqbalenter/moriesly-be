import express from "express";
import { getMetabolicOverviewData } from "../controllers/dashboard.controller.js";
import { verifyFirebaseToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * Dashboard Metabolic Overview
 * GET /api/dashboard/metabolic-overview?range=1h|24h|7d
 */
router.get(
  "/metabolic-overview",
  verifyFirebaseToken,
  getMetabolicOverviewData,
);

export default router;
