import express from "express";
import {
  getActiveSessions,
  checkSession,
} from "../controllers/videocall.controller.js";
import { verifyFirebaseToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// REST endpoints for video call monitoring
router.get("/active-sessions", verifyFirebaseToken, getActiveSessions);
router.get("/check-session", verifyFirebaseToken, checkSession);

export default router;
