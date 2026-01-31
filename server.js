// IMPORTANT: Load environment variables FIRST
import "./config/env.config.js";

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";

// Import routes yang terstruktur berdasarkan halaman FE
import homeRoutes from "./routes/home.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import statusRoutes from "./routes/status.routes.js";
import trackRoutes from "./routes/track.routes.js";
import dietRoutes from "./routes/diet.routes.js";
import trainRoutes from "./routes/train.routes.js";
import bioRoutes from "./routes/bio.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import logRoutes from "./routes/log.routes.js";
import feedRoutes from "./routes/feed.routes.js";
import foodlogRoutes from "./routes/foodlog.routes.js";

// Import routes utility (scan, auth, video call)
import scanRoutes from "./routes/scan.routes.js";
import userRoutes from "./routes/user.routes.js"; // Auth endpoints (register, login, verify)
import subscriptionRoutes from "./routes/subscription.routes.js"; // Subscription & role management
// import videocallRoutes from "./routes/videocall.routes.js";

// import { setupVideoCallHandlers } from "./controllers/videocall.controller.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8080; // Cloud Run menggunakan 8080 sebagai default

// Support multiple CORS origins via FRONTEND_URLS (comma-separated) or single FRONTEND_URL fallback
const allowedOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : [
      process.env.FRONTEND_URL,
      "https://moriesly.com",
      "https://www.moriesly.com",
      "http://localhost:3000",
    ];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],

    credentials: true,
  },

  maxHttpBufferSize: 1e8, // 100MB for video frames
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Moriesly Backend is running!" });
});

// Request logging middleware (untuk debugging)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==========================================
// ROUTES BERDASARKAN HALAMAN FRONTEND
// ==========================================

/**
 * HOME PAGE - Dashboard utama
 * Endpoints: current rank, daily checkin, today intake, status,
 * intel, psych-ops profile, future projection, scan food,
 * align target, analysis ledger, history log (calendar)
 */
app.use("/api/home", homeRoutes);

/**
 * PROFILE PAGE - User profile management
 * Endpoints: view profile, edit profile, weight tracking
 */
app.use("/api/profile", profileRoutes);

/**
 * STATUS PAGE - Complete health status overview
 * Endpoints: status data, goal progress, weight history, ledger range
 */
app.use("/api/status", statusRoutes);

/**
 * TRACK PAGE - Activity & progress tracking
 * Endpoints: weight tracking, activity history, food statistics
 */
app.use("/api/track", trackRoutes);

/**
 * DIET PAGE - Meal planning & nutrition
 * Endpoints: generate diet plans, track consumption, shopping list
 */
app.use("/api/diet", dietRoutes);

/**
 * TRAIN PAGE - Workout planning & tracking
 * Endpoints: generate training plans, track workouts, daily/weekly plans
 */
app.use("/api/train", trainRoutes);

/**
 * BIO PAGE - Biological & health data
 * Endpoints: bio data, skin scans, consultation history
 */
app.use("/api/bio", bioRoutes);

/**
 * CHAT/VIDEO CALL PAGE - AI consultation & video sessions
 * Endpoints: chat messages, conversation summary
 * Video call menggunakan WebSocket
 */
app.use("/api/chat", chatRoutes);
// app.use("/api/videocall", videocallRoutes);

/**
 * LOG PAGE - Comprehensive logging
 * Endpoints: activity logs, food logs, ledger history
 */
app.use("/api/log", logRoutes);

/**
 * FEED PAGE - Moriesly Feed (Intelligence News)
 * Endpoints: generate feed articles, get usage stats
 */
app.use("/api/feed", feedRoutes);

/**
 * FOODLOG API - Food logging & tracking
 * Endpoints: add food log, get logs, statistics
 */
app.use("/api/foodlog", foodlogRoutes);

// ==========================================
// UTILITY ROUTES (digunakan di berbagai halaman)
// ==========================================

/**
 * SCAN API - Image scanning untuk berbagai keperluan
 * Digunakan di: Home (scan food), Diet (scan label/barcode),
 * Bio (skin scan), dll
 */
app.use("/api/scan", scanRoutes);

/**
 * USER AUTH API - Authentication & authorization
 * Endpoints: register, login, verify-token, initialize
 * Digunakan untuk authentication flow di semua halaman
 */
app.use("/api/users", userRoutes);

/**
 * SUBSCRIPTION API - Manage user roles & permissions
 * Endpoints: get subscription info, upgrade, usage stats, check expiry
 */
app.use("/api/subscription", subscriptionRoutes);

// Setup WebSocket handlers for video call
// setupVideoCallHandlers(io);

// ==========================================
// BACKWARD COMPATIBILITY ROUTES (tanpa /api prefix)
// ==========================================

/**
 * Routes tanpa /api prefix untuk backward compatibility
 * Ini mem-forward request ke routes dengan /api prefix
 */
app.use("/home", homeRoutes);
app.use("/profile", profileRoutes);
app.use("/status", statusRoutes);
app.use("/track", trackRoutes);
app.use("/diet", dietRoutes);
app.use("/train", trainRoutes);
app.use("/bio", bioRoutes);
app.use("/chat", chatRoutes);
app.use("/log", logRoutes);
app.use("/feed", feedRoutes);
app.use("/foodlog", foodlogRoutes);
app.use("/scan", scanRoutes);
app.use("/users", userRoutes);
app.use("/subscription", subscriptionRoutes);

// 404 handler - harus sebelum error handler
app.use((req, res, next) => {
  console.log(`⚠️  404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: `Selamat Datang Dari Moriesly`,
  });
});

// Error handling middleware (harus di paling akhir)
app.use(errorHandler);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Port : ${PORT}`);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🚀 MORIESLY BACKEND SERVER`);
  console.log(`${"=".repeat(60)}`);
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔌 WebSocket: Ready for video calls`);
  console.log(`\n📋 API ROUTES (organized by frontend pages):`);
  console.log(`   🏠 Home:         /api/home/*`);
  console.log(`   👤 Profile:      /api/profile/*`);
  console.log(`   📊 Status:       /api/status/*`);
  console.log(`   📈 Track:        /api/track/*`);
  console.log(`   🍽️  Diet:         /api/diet/*`);
  console.log(`   💪 Train:        /api/train/*`);
  console.log(`   🧬 Bio:          /api/bio/*`);
  console.log(`   💬 Chat:         /api/chat/*`);
  console.log(`   📝 Log:          /api/log/*`);
  console.log(`   📰 Feed:         /api/feed/*`);
  console.log(`\n🔧 UTILITY ROUTES:`);
  console.log(`   📸 Scan:         /api/scan/*`);
  console.log(`   🔐 Auth:         /api/users/*`);
  console.log(`   💎 Subscription: /api/subscription/*`);
  console.log(`   📹 Video Call:   /api/videocall/*`);
  console.log(`\n✅ Route Order Issues: FIXED`);
  console.log(`   - Specific routes now prioritized over parameterized routes`);
  console.log(`   - 404 handler added for better error messages`);
  console.log(`\n🔄 BACKWARD COMPATIBILITY:`);
  console.log(`   - Routes also available WITHOUT /api prefix`);
  console.log(`   - Example: /users/login OR /api/users/login (both work)`);
  console.log(`${"=".repeat(60)}\n`);

  // Log registered routes untuk debugging
  console.log(`📝 Logging enabled - Monitoring all incoming requests...`);
});
