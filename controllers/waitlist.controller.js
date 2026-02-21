import { db } from "../config/firebase.config.js";
import admin from "../config/firebase.config.js";

/**
 * Generate ticket ID unik untuk waitlist
 * Format: XXXX-XX (alphanumeric uppercase)
 */
const generateTicketId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const part1 = Array.from(
    { length: 4 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  const part2 = Array.from(
    { length: 2 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return `${part1}-${part2}`;
};

/**
 * @route   POST /api/waitlist
 * @desc    Tambah user ke waitlist
 * @access  Public
 */
export async function addToWaitlist(req, res) {
  try {
    const { email, countryCode, phone, reason, deviceType } = req.body;

    // Validasi field wajib
    if (!email || !phone || !reason || !deviceType) {
      return res.status(400).json({
        success: false,
        message: "Semua field wajib diisi (email, phone, reason, deviceType)",
      });
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Format email tidak valid",
      });
    }

    // Validasi deviceType
    const validDeviceTypes = ["watch", "bracelet"];
    if (!validDeviceTypes.includes(deviceType)) {
      return res.status(400).json({
        success: false,
        message: "deviceType harus berupa 'watch' atau 'bracelet'",
      });
    }

    // Cek apakah email sudah terdaftar di waitlist
    const existingQuery = await db
      .collection("waitlist")
      .where("email", "==", email.toLowerCase().trim())
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      return res.status(409).json({
        success: false,
        message: "Email ini sudah terdaftar di waitlist kami",
      });
    }

    // Generate ticket ID unik
    const ticketId = generateTicketId();
    const resolvedCountryCode = countryCode || "+62";
    const cleanPhone = phone.toString().trim();
    const cleanEmail = email.toLowerCase().trim();

    // Simpan data ke Firestore collection "waitlist" dengan document ID acak
    const docRef = await db.collection("waitlist").add({
      email: cleanEmail,
      countryCode: resolvedCountryCode,
      phone: cleanPhone,
      fullPhone: `${resolvedCountryCode}${cleanPhone}`,
      reason: reason.trim(),
      deviceType,
      ticketId,
      emailVerified: false,
      verifiedAt: null,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Waitlist entry created: ${docRef.id} | email: ${cleanEmail} | ticket: ${ticketId}`);

    return res.status(201).json({
      success: true,
      message: "Berhasil mendaftar waitlist! Kami akan menghubungi Anda segera.",
      data: {
        id: docRef.id,
        ticketId,
        email: cleanEmail,
      },
    });
  } catch (error) {
    console.error("❌ Error adding to waitlist:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server. Silakan coba lagi.",
    });
  }
}

/**
 * @route   GET /api/waitlist
 * @desc    Get semua data waitlist (admin only - bisa ditambahkan auth middleware)
 * @access  Public (untuk sekarang)
 */
export async function getWaitlistEntries(req, res) {
  try {
    const { limit = 50, status } = req.query;

    let query = db.collection("waitlist").orderBy("createdAt", "desc");

    if (status) {
      query = query.where("status", "==", status);
    }

    query = query.limit(parseInt(limit));

    const snapshot = await query.get();

    const entries = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
      verifiedAt: doc.data().verifiedAt?.toDate?.()?.toISOString() || null,
    }));

    return res.status(200).json({
      success: true,
      data: entries,
      total: entries.length,
    });
  } catch (error) {
    console.error("❌ Error getting waitlist entries:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server.",
    });
  }
}

/**
 * @route   PATCH /api/waitlist/:id/verify-email
 * @desc    Update emailVerified status menjadi true
 * @access  Public (bisa dikombinasikan dengan token verifikasi)
 */
export async function verifyWaitlistEmail(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Document ID wajib disertakan",
      });
    }

    const docRef = db.collection("waitlist").doc(id);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res.status(404).json({
        success: false,
        message: "Data waitlist tidak ditemukan",
      });
    }

    const data = docSnapshot.data();

    if (data.emailVerified) {
      return res.status(200).json({
        success: true,
        message: "Email sudah terverifikasi sebelumnya",
        data: { id, emailVerified: true },
      });
    }

    await docRef.update({
      emailVerified: true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "verified",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Email verified for waitlist entry: ${id}`);

    return res.status(200).json({
      success: true,
      message: "Email berhasil diverifikasi",
      data: { id, emailVerified: true },
    });
  } catch (error) {
    console.error("❌ Error verifying waitlist email:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server.",
    });
  }
}
