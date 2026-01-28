import express from "express";
import {
  addFoodLog,
  getTodayLogs,
  getLogsByDateRange,
  removeLog,
  getStatistics,
} from "../controllers/foodlog.controller.js";
import { verifyFirebaseToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// Tambah food log
router.post("/", verifyFirebaseToken, addFoodLog);

// Ambil food log hari ini
router.get("/today", verifyFirebaseToken, getTodayLogs);

// Statistik food log
router.get("/statistics", verifyFirebaseToken, getStatistics);

// Ambil food log berdasarkan rentang tanggal
router.get("/", verifyFirebaseToken, getLogsByDateRange);

// Hapus food log tertentu
router.delete("/:logId", verifyFirebaseToken, removeLog);

export default router;
