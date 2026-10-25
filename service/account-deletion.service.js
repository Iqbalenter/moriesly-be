import { auth, db } from "../config/firebase.config.js";

const REQUESTS_COLLECTION = "account_deletion_requests";
const USERS_COLLECTION = "users";
const ACTIVITY_COLLECTION = "activity_logs";
const DEADLINE_DAYS = 7;
const VALID_STATUSES = ["pending", "processing", "completed", "rejected"];

function serviceError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function serializeRequest(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    userId: data.userId || null,
    displayName: data.displayName || null,
    email: data.email || null,
    userCreatedAt: data.userCreatedAt || null,
    requestedAt: data.requestedAt || null,
    deadlineAt: data.deadlineAt || null,
    reason: data.reason || null,
    source: data.source || "Aplikasi",
    status: data.status || "pending",
    dataScopes: Array.isArray(data.dataScopes) ? data.dataScopes : [],
    adminNote: data.adminNote || null,
    processedAt: data.processedAt || null,
    resolvedAt: data.resolvedAt || null,
    processedBy: data.processedBy || null,
  };
}

function assertStatusTransition(currentStatus, nextStatus) {
  const transitions = {
    pending: ["processing", "completed", "rejected"],
    processing: ["completed"],
    completed: [],
    rejected: [],
  };

  if (!transitions[currentStatus]?.includes(nextStatus)) {
    throw serviceError(
      `Status tidak dapat diubah dari ${currentStatus} menjadi ${nextStatus}.`,
      409,
    );
  }
}

function isMissingAuthUser(error) {
  return error?.code === "auth/user-not-found";
}

async function deleteFirebaseAuthUser(userId) {
  try {
    await auth.revokeRefreshTokens(userId);
  } catch (error) {
    if (!isMissingAuthUser(error)) {
      throw serviceError(
        `Gagal mencabut sesi pengguna: ${error.message || "unknown error"}`,
        502,
      );
    }
  }

  try {
    await auth.deleteUser(userId);
  } catch (error) {
    // Idempotent: retry tetap aman bila akun Auth sudah terhapus sebelumnya.
    if (!isMissingAuthUser(error)) {
      throw serviceError(
        `Gagal menghapus akun Firebase: ${error.message || "unknown error"}`,
        502,
      );
    }
  }
}

async function deleteUserActivityLogs(userId) {
  const activityCollection = db.collection(ACTIVITY_COLLECTION);
  const [actorLogs, targetLogs] = await Promise.all([
    activityCollection.where("actorId", "==", userId).get(),
    activityCollection.where("targetId", "==", userId).get(),
  ]);
  const refs = new Map();

  for (const doc of [...actorLogs.docs, ...targetLogs.docs]) {
    refs.set(doc.ref.path, doc.ref);
  }

  if (!refs.size) return;

  const writer = db.bulkWriter();
  for (const ref of refs.values()) writer.delete(ref);
  await writer.close();
}

async function permanentlyDeleteUserAccount(userId) {
  // Auth dihapus lebih dulu agar user tidak dapat membuat data baru saat
  // pembersihan Firestore berjalan. Semua langkah aman untuk dicoba ulang.
  await deleteFirebaseAuthUser(userId);
  await db.recursiveDelete(db.collection(USERS_COLLECTION).doc(userId));
  await deleteUserActivityLogs(userId);
}

export async function createAccountDeletionRequest(
  userId,
  { reason = "", source = "Aplikasi" } = {},
) {
  const userRef = db.collection(USERS_COLLECTION).doc(userId);
  const requestRef = db.collection(REQUESTS_COLLECTION).doc();
  const activityRef = db.collection(ACTIVITY_COLLECTION).doc();

  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) throw serviceError("User tidak ditemukan.", 404);

    const user = userDoc.data() || {};
    const currentRequestId = user.accountDeletionRequestId;

    if (currentRequestId) {
      const currentRequest = await transaction.get(
        db.collection(REQUESTS_COLLECTION).doc(currentRequestId),
      );
      const currentStatus = currentRequest.data()?.status;
      if (
        currentRequest.exists &&
        ["pending", "processing"].includes(currentStatus)
      ) {
        throw serviceError(
          "Permintaan penghapusan akun masih menunggu atau sedang diproses.",
          409,
        );
      }
    }

    const now = new Date();
    const requestedAt = now.toISOString();
    const deadlineAt = new Date(
      now.getTime() + DEADLINE_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const displayName =
      user.displayName || user.name || user.profile?.name || user.email || "";

    transaction.set(requestRef, {
      userId,
      displayName,
      email: user.email || "",
      userCreatedAt: user.createdAt || null,
      requestedAt,
      deadlineAt,
      reason: String(reason).trim() || null,
      source: String(source).trim() || "Aplikasi",
      status: "pending",
      dataScopes: [
        "Profil dan preferensi",
        "Riwayat aktivitas",
        "File pengguna",
        "Data langganan",
      ],
      adminNote: null,
      processedAt: null,
      resolvedAt: null,
      processedBy: null,
      updatedAt: requestedAt,
    });

    transaction.set(
      userRef,
      {
        accountDeletionRequestId: requestRef.id,
        accountDeletionStatus: "pending",
        accountDeletionRequestedAt: requestedAt,
        updatedAt: requestedAt,
      },
      { merge: true },
    );

    transaction.set(activityRef, {
      actorId: userId,
      action: "account_deletion.requested",
      targetType: "accountDeletionRequest",
      targetId: requestRef.id,
      before: null,
      after: { status: "pending" },
      createdAt: requestedAt,
    });
  });

  const created = await requestRef.get();
  return serializeRequest(created);
}

export async function getAccountDeletionRequestForUser(userId) {
  const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();
  if (!userDoc.exists) throw serviceError("User tidak ditemukan.", 404);

  const requestId = userDoc.data()?.accountDeletionRequestId;
  if (!requestId) return null;

  const requestDoc = await db
    .collection(REQUESTS_COLLECTION)
    .doc(requestId)
    .get();
  return requestDoc.exists ? serializeRequest(requestDoc) : null;
}

export async function listAccountDeletionRequests({ search = "", status = "" }) {
  if (status && !VALID_STATUSES.includes(status)) {
    throw serviceError("Status permintaan tidak valid.", 400);
  }

  const snapshot = await db
    .collection(REQUESTS_COLLECTION)
    .orderBy("requestedAt", "desc")
    .limit(1000)
    .get();
  const allItems = snapshot.docs.map(serializeRequest);
  const term = String(search).trim().toLowerCase();

  const items = allItems.filter((item) => {
    if (status && item.status !== status) return false;
    if (!term) return true;
    return [item.id, item.displayName, item.email, item.reason].some((value) =>
      String(value || "").toLowerCase().includes(term),
    );
  });

  const now = new Date();
  const urgentThreshold = now.getTime() + 2 * 24 * 60 * 60 * 1000;
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);

  return {
    items,
    summary: {
      pending: allItems.filter((item) => item.status === "pending").length,
      processing: allItems.filter((item) => item.status === "processing").length,
      urgent: allItems.filter((item) => {
        const deadline = item.deadlineAt
          ? new Date(item.deadlineAt).getTime()
          : 0;
        return (
          item.status === "pending" &&
          deadline > 0 &&
          deadline <= urgentThreshold
        );
      }).length,
      completedThisMonth: allItems.filter((item) => {
        const resolvedAt = item.resolvedAt
          ? new Date(item.resolvedAt).getTime()
          : 0;
        return item.status === "completed" && resolvedAt >= monthStart;
      }).length,
    },
  };
}

export async function updateAccountDeletionRequestStatus(
  requestId,
  adminId,
  { status, adminNote = null },
) {
  if (!VALID_STATUSES.includes(status) || status === "pending") {
    throw serviceError("Status permintaan tidak valid.", 400);
  }

  const requestRef = db.collection(REQUESTS_COLLECTION).doc(requestId);
  const activityRef = db.collection(ACTIVITY_COLLECTION).doc();

  if (status === "completed") {
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) {
      throw serviceError("Permintaan penghapusan tidak ditemukan.", 404);
    }

    const request = requestDoc.data() || {};
    assertStatusTransition(request.status || "pending", status);

    if (!request.userId) {
      throw serviceError(
        "Permintaan tidak memiliki userId yang dapat dihapus.",
        422,
      );
    }

    await permanentlyDeleteUserAccount(request.userId);

    await db.runTransaction(async (transaction) => {
      const latestDoc = await transaction.get(requestRef);
      if (!latestDoc.exists) {
        throw serviceError("Permintaan penghapusan tidak ditemukan.", 404);
      }

      const latest = latestDoc.data() || {};
      assertStatusTransition(latest.status || "pending", status);
      const now = new Date().toISOString();
      const normalizedAdminNote = String(adminNote || "").trim() || null;

      transaction.update(requestRef, {
        status: "completed",
        adminNote: normalizedAdminNote,
        processedBy: adminId,
        processedAt: latest.processedAt || now,
        resolvedAt: now,
        updatedAt: now,
        // Data identitas tidak perlu disimpan setelah akun berhasil dihapus.
        userId: null,
        displayName: "Deleted User",
        email: null,
        userCreatedAt: null,
        reason: null,
      });

      transaction.set(activityRef, {
        actorId: adminId,
        action: "account_deletion.completed",
        targetType: "accountDeletionRequest",
        targetId: requestId,
        before: { status: latest.status || "pending" },
        after: { status: "completed", adminNote: normalizedAdminNote },
        createdAt: now,
      });
    });

    const completed = await requestRef.get();
    return serializeRequest(completed);
  }

  await db.runTransaction(async (transaction) => {
    const requestDoc = await transaction.get(requestRef);
    if (!requestDoc.exists) {
      throw serviceError("Permintaan penghapusan tidak ditemukan.", 404);
    }

    const request = requestDoc.data() || {};
    assertStatusTransition(request.status || "pending", status);

    const userRef = request.userId
      ? db.collection(USERS_COLLECTION).doc(request.userId)
      : null;
    const userDoc = userRef ? await transaction.get(userRef) : null;
    const now = new Date().toISOString();
    const update = {
      status,
      adminNote: String(adminNote || "").trim() || null,
      processedBy: adminId,
      updatedAt: now,
      ...(status === "processing" && { processedAt: now }),
      ...(["completed", "rejected"].includes(status) && { resolvedAt: now }),
    };

    transaction.update(requestRef, update);

    if (userRef && userDoc?.exists) {
      transaction.set(
        userRef,
        {
          accountDeletionStatus: status,
          accountDeletionUpdatedAt: now,
          updatedAt: now,
        },
        { merge: true },
      );
    }

    transaction.set(activityRef, {
      actorId: adminId,
      action: "account_deletion.status_update",
      targetType: "accountDeletionRequest",
      targetId: requestId,
      before: { status: request.status || "pending" },
      after: { status, adminNote: update.adminNote },
      createdAt: now,
    });
  });

  const updated = await requestRef.get();
  return serializeRequest(updated);
}
