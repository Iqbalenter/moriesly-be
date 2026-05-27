import { db } from "../config/firebase.config.js";
import admin from "../config/firebase.config.js";
import {
  sendWaitlistTicketEmail,
  sendWaitlistApprovedEmail,
  sendWaitlistRejectedEmail,
} from "../service/email.service.js";

/**
 * Helper: konversi Firestore Timestamp ke ISO string (aman)
 */
const toISO = (val) => val?.toDate?.()?.toISOString?.() ?? null;

/**
 * Helper: format satu dokumen waitlist ke object response
 */
const formatEntry = (doc) => ({
  id: doc.id,
  ...doc.data(),
  createdAt: toISO(doc.data().createdAt),
  updatedAt: toISO(doc.data().updatedAt),
  verifiedAt: toISO(doc.data().verifiedAt),
  actionAt: toISO(doc.data().actionAt),
});

/**
 * Generate ticket ID unik untuk waitlist
 * Format: XXXX-XX (alphanumeric uppercase)
 */
const generateTicketId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const part1 = Array.from(
    { length: 4 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  const part2 = Array.from(
    { length: 2 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  return `${part1}-${part2}`;
};

/**
 * Generate random 12-character password
 */
const generateRandomPassword = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/waitlist
 * @desc    Tambah user ke waitlist
 * @access  Public
 */
export async function addToWaitlist(req, res) {
  try {
    const { email, countryCode, phone, reason, deviceType } = req.body;

    if (!email || !phone || !reason || !deviceType) {
      return res.status(400).json({
        success: false,
        message: "All fields are required (email, phone, reason, deviceType)",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const validDeviceTypes = ["watch", "bracelet"];
    if (!validDeviceTypes.includes(deviceType)) {
      return res.status(400).json({
        success: false,
        message: "deviceType must be 'watch' or 'bracelet'",
      });
    }

    const existingQuery = await db
      .collection("waitlist")
      .where("email", "==", email.toLowerCase().trim())
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      return res.status(409).json({
        success: false,
        message: "This email is already on our waitlist.",
      });
    }

    const ticketId = generateTicketId();
    const resolvedCountryCode = countryCode || "+62";
    const cleanPhone = phone.toString().trim();
    const cleanEmail = email.toLowerCase().trim();

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
      actionAt: null,
      actionNote: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `✅ Waitlist entry created: ${docRef.id} | email: ${cleanEmail} | ticket: ${ticketId}`,
    );

    sendWaitlistTicketEmail({
      toEmail: cleanEmail,
      ticketId,
      reason: reason.trim(),
    }).then((emailResult) => {
      if (emailResult.success) {
        console.log(
          `📧 Ticket email sent to ${cleanEmail} | messageId: ${emailResult.messageId}`,
        );
      } else {
        console.warn(
          `⚠️  Ticket email failed for ${cleanEmail}: ${emailResult.error}`,
        );
      }
    });

    return res.status(201).json({
      success: true,
      message:
        "You have successfully registered for the waitlist! Check your email for a confirmation ticket.",
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
      message: "An error occurred on the server. Please try again.",
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// READ — ALL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/waitlist
 * @desc    Get semua data waitlist dengan filter & pagination
 * @access  Admin
 * @query   status  — filter by status (pending | verified | approved | rejected)
 * @query   limit   — jumlah data per halaman (default: 50, max: 200)
 * @query   page    — halaman ke-n (default: 1)
 * @query   search  — cari berdasarkan email atau ticketId
 */
export async function getWaitlistEntries(req, res) {
  try {
    const { status, search } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;

    let query = db.collection("waitlist").orderBy("createdAt", "desc");

    // Filter by status
    if (status) {
      const validStatuses = ["pending", "verified", "approved", "rejected"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status tidak valid. Pilih salah satu: ${validStatuses.join(", ")}`,
        });
      }
      query = query.where("status", "==", status);
    }

    const snapshot = await query.get();
    let entries = snapshot.docs.map(formatEntry);

    // Filter by search (email atau ticketId) — dilakukan di memory karena Firestore
    // tidak support LIKE query
    if (search && search.trim()) {
      const keyword = search.trim().toLowerCase();
      entries = entries.filter(
        (e) =>
          e.email?.toLowerCase().includes(keyword) ||
          e.ticketId?.toLowerCase().includes(keyword) ||
          e.fullPhone?.includes(keyword),
      );
    }

    const total = entries.length;
    const paginated = entries.slice(offset, offset + limit);

    return res.status(200).json({
      success: true,
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: offset + limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("❌ Error getting waitlist entries:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server.",
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// READ — SINGLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/waitlist/:id
 * @desc    Get satu data waitlist berdasarkan document ID
 * @access  Admin
 */
export async function getWaitlistEntryById(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Document ID wajib disertakan.",
      });
    }

    const docRef = db.collection("waitlist").doc(id);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res.status(404).json({
        success: false,
        message: "Data waitlist tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatEntry(docSnapshot),
    });
  } catch (error) {
    console.error("❌ Error getting waitlist entry by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server.",
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   PUT /api/waitlist/:id
 * @desc    Update data whitelist (field yang diizinkan: email, phone, countryCode,
 *          reason, deviceType, emailVerified)
 * @access  Admin
 */
export async function updateWaitlistEntry(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Document ID wajib disertakan.",
      });
    }

    // Field yang boleh diupdate oleh admin
    const allowedFields = [
      "email",
      "phone",
      "countryCode",
      "reason",
      "deviceType",
      "emailVerified",
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: `Tidak ada field yang valid untuk diupdate. Field yang diizinkan: ${allowedFields.join(", ")}`,
      });
    }

    // Validasi email jika diupdate
    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        return res.status(400).json({
          success: false,
          message: "Format email tidak valid.",
        });
      }
      updates.email = updates.email.toLowerCase().trim();

      // Cek duplikat email (kecuali dokumen yang sedang diupdate)
      const dupCheck = await db
        .collection("waitlist")
        .where("email", "==", updates.email)
        .limit(2)
        .get();

      const isDuplicate = dupCheck.docs.some((doc) => doc.id !== id);
      if (isDuplicate) {
        return res.status(409).json({
          success: false,
          message: "Email ini sudah terdaftar di waitlist oleh pengguna lain.",
        });
      }
    }

    // Validasi deviceType jika diupdate
    if (updates.deviceType) {
      const validDeviceTypes = ["watch", "bracelet"];
      if (!validDeviceTypes.includes(updates.deviceType)) {
        return res.status(400).json({
          success: false,
          message: "deviceType harus 'watch' atau 'bracelet'.",
        });
      }
    }

    // Rebuild fullPhone jika phone atau countryCode diubah
    const docRef = db.collection("waitlist").doc(id);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res.status(404).json({
        success: false,
        message: "Data waitlist tidak ditemukan.",
      });
    }

    const existingData = docSnapshot.data();

    if (updates.phone || updates.countryCode) {
      const newPhone = updates.phone?.toString().trim() ?? existingData.phone;
      const newCountryCode = updates.countryCode ?? existingData.countryCode;
      updates.phone = newPhone;
      updates.countryCode = newCountryCode;
      updates.fullPhone = `${newCountryCode}${newPhone}`;
    }

    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await docRef.update(updates);

    console.log(
      `✅ Waitlist entry updated: ${id} | fields: ${Object.keys(updates).join(", ")}`,
    );

    // Ambil data terbaru
    const updatedSnap = await docRef.get();

    return res.status(200).json({
      success: true,
      message: "Data waitlist berhasil diupdate.",
      data: formatEntry(updatedSnap),
    });
  } catch (error) {
    console.error("❌ Error updating waitlist entry:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server.",
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   DELETE /api/waitlist/:id
 * @desc    Hapus satu data waitlist berdasarkan document ID
 * @access  Admin
 */
export async function deleteWaitlistEntry(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Document ID wajib disertakan.",
      });
    }

    const docRef = db.collection("waitlist").doc(id);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res.status(404).json({
        success: false,
        message: "Data waitlist tidak ditemukan.",
      });
    }

    const data = docSnapshot.data();
    await docRef.delete();

    console.log(
      `🗑️  Waitlist entry deleted: ${id} | email: ${data.email} | ticket: ${data.ticketId}`,
    );

    return res.status(200).json({
      success: true,
      message: "Data waitlist berhasil dihapus.",
      data: {
        id,
        email: data.email,
        ticketId: data.ticketId,
      },
    });
  } catch (error) {
    console.error("❌ Error deleting waitlist entry:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server.",
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION — APPROVED / REJECTED
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   PATCH /api/waitlist/:id/action
 * @desc    Approve atau Reject pendaftar waitlist.
 *          Otomatis kirim email notifikasi ke user.
 * @access  Admin
 * @body    { action: "approved" | "rejected", note?: string }
 */
export async function actionWaitlistEntry(req, res) {
  try {
    const { id } = req.params;
    const { action, note } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Document ID wajib disertakan.",
      });
    }

    const validActions = ["approved", "rejected"];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `Field 'action' wajib diisi dengan nilai: ${validActions.join(" atau ")}`,
      });
    }

    const docRef = db.collection("waitlist").doc(id);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res.status(404).json({
        success: false,
        message: "Data waitlist tidak ditemukan.",
      });
    }

    const data = docSnapshot.data();

    // Cegah aksi ganda pada status yang sama
    if (data.status === action) {
      return res.status(409).json({
        success: false,
        message: `Pendaftar ini sudah berstatus '${action}' sebelumnya.`,
      });
    }

    // Update status di Firestore
    await docRef.update({
      status: action,
      actionNote: note?.trim() || null,
      actionAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `✅ Waitlist action [${action.toUpperCase()}]: ${id} | email: ${data.email} | ticket: ${data.ticketId}`,
    );

    // Kirim email notifikasi ke user — async, tidak memblokir response
    if (action === "approved") {
      let generatedPassword = null;

      try {
        generatedPassword = generateRandomPassword();

        // 1. Buat User di Firebase Auth
        const userRecord = await admin.auth().createUser({
          email: data.email,
          password: generatedPassword,
        });

        // 2. Simpan Data User di Koleksi 'users'
        await db.collection("users").doc(userRecord.uid).set({
          uid: userRecord.uid,
          email: data.email,
          role: "user",
          status: "active",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: {
            createdFrom: "whitelist-approval",
            ticketId: data.ticketId
          }
        });

        console.log(`✅ User account created in Auth and Firestore for ${data.email}`);
      } catch (authErr) {
        console.warn(`⚠️ Error creating user account:`, authErr.message);
      }

      sendWaitlistApprovedEmail({
        toEmail: data.email,
        ticketId: data.ticketId,
        password: generatedPassword,
        note: note?.trim() || null,
      }).then((result) => {
        if (result.success) {
          console.log(`📧 Approved email sent to ${data.email}`);
        } else {
          console.warn(
            `⚠️  Approved email failed for ${data.email}: ${result.error}`,
          );
        }
      });
    } else {
      sendWaitlistRejectedEmail({
        toEmail: data.email,
        ticketId: data.ticketId,
        note: note?.trim() || null,
      }).then((result) => {
        if (result.success) {
          console.log(`📧 Rejected email sent to ${data.email}`);
        } else {
          console.warn(
            `⚠️  Rejected email failed for ${data.email}: ${result.error}`,
          );
        }
      });
    }

    // Ambil data terbaru
    const updatedSnap = await docRef.get();

    return res.status(200).json({
      success: true,
      message:
        action === "approved"
          ? "Pendaftar berhasil di-approve. Email notifikasi sedang dikirim."
          : "Pendaftar berhasil di-reject. Email notifikasi sedang dikirim.",
      data: formatEntry(updatedSnap),
    });
  } catch (error) {
    console.error("❌ Error actioning waitlist entry:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server.",
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY EMAIL (existing — tidak berubah)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   PATCH /api/waitlist/:id/verify-email
 * @desc    Update emailVerified status menjadi true
 * @access  Public
 */
export async function verifyWaitlistEmail(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Document ID must be included",
      });
    }

    const docRef = db.collection("waitlist").doc(id);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res.status(404).json({
        success: false,
        message: "Waitlist data not found",
      });
    }

    const data = docSnapshot.data();

    if (data.emailVerified) {
      return res.status(200).json({
        success: true,
        message: "Email has been verified previously",
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
      message: "Email successfully verified",
      data: { id, emailVerified: true },
    });
  } catch (error) {
    console.error("❌ Error verifying waitlist email:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred on the server.",
    });
  }
}
