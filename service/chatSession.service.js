import { db } from "../config/firebase.config.js";

/**
 * CHAT SESSION SERVICE - SUBCOLLECTION VERSION
 *
 * Chat sessions disimpan sebagai subcollection di dalam user document:
 * users/{userId}/chatSessions/{sessionId}
 *
 * TITLE GENERATION:
 * - Title di-generate oleh FRONTEND dari AI response pertama
 * - Backend TIDAK auto-generate title lagi
 * - Frontend mengirim title secara eksplisit saat update
 */

 /**
  * Create new chat session
  * Stored in: users/{userId}/chatSessions/{sessionId}
  */
 export const createChatSession = async (userId, data = {}) => {
   try {
     const chatSessionData = {
       title: data.title || "New Chat",
       messages: data.messages || [],
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString(),
       isActive: true,
     };
 
     // PERBAIKAN: Generate ID dulu, baru save
     // Ini memastikan ID konsisten dan bisa digunakan langsung
     const sessionsRef = db
       .collection("users")
       .doc(userId)
       .collection("chatSessions");
 
     const newDocRef = sessionsRef.doc(); // Generate ID otomatis
     const sessionId = newDocRef.id;
     
     // Gunakan set() bukan add() untuk ID yang sudah ditentukan
     await newDocRef.set(chatSessionData);
 
     console.log(
       "[ChatSession Service] Created session:",
       sessionId,
       "for user:",
       userId,
     );
 
     return {
       id: sessionId,
       userId: userId,
       ...chatSessionData,
     };
   } catch (error) {
     console.error("[ChatSession Service] Error creating session:", error);
     throw error;
   }
 };

/**
 * Get all chat sessions for a user
 * From: users/{userId}/chatSessions
 */
export const getChatSessionsByUserId = async (userId, options = {}) => {
  try {
    const {
      limitCount = 50,
      includeInactive = false,
      orderByField = "updatedAt",
      orderDirection = "desc",
    } = options;

    // Get subcollection reference
    let q = db.collection("users").doc(userId).collection("chatSessions");

    // Filter by active status
    if (!includeInactive) {
      q = q.where("isActive", "==", true);
    }

    // Order by
    q = q.orderBy(orderByField, orderDirection);

    // Limit
    if (limitCount) {
      q = q.limit(limitCount);
    }

    const querySnapshot = await q.get();

    const sessions = [];
    querySnapshot.forEach((doc) => {
      sessions.push({
        id: doc.id,
        userId: userId,
        ...doc.data(),
      });
    });

    console.log(
      `[ChatSession Service] Found ${sessions.length} sessions for user ${userId}`,
    );

    return sessions;
  } catch (error) {
    console.error("[ChatSession Service] Error getting sessions:", error);
    throw error;
  }
};

/**
 * Get specific chat session by ID
 * From: users/{userId}/chatSessions/{sessionId}
 */
export const getChatSessionById = async (sessionId, userId) => {
  try {
    if (!userId) {
      console.error("[ChatSession Service] userId is required");
      return null;
    }

    const docRef = db
      .collection("users")
      .doc(userId)
      .collection("chatSessions")
      .doc(sessionId);

    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.log(
        `[ChatSession Service] Session ${sessionId} not found for user ${userId}`,
      );
      return null;
    }

    const sessionData = {
      id: docSnap.id,
      userId: userId,
      ...docSnap.data(),
    };

    console.log(
      "[ChatSession Service] Retrieved session:",
      sessionId,
      "for user:",
      userId,
    );

    return sessionData;
  } catch (error) {
    console.error("[ChatSession Service] Error getting session:", error);
    throw error;
  }
};

/**
 * Update chat session
 * Updates: users/{userId}/chatSessions/{sessionId}
 */
export const updateChatSession = async (sessionId, userId, updates) => {
  try {
    if (!userId) {
      throw new Error("userId is required");
    }

    const docRef = db
      .collection("users")
      .doc(userId)
      .collection("chatSessions")
      .doc(sessionId);

    // PERBAIKAN: Cek dulu apakah document exist
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      console.error(`[ChatSession Service] Session ${sessionId} not found for user ${userId}`);
      throw new Error("Session not found");
    }

    // Prepare update data
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // PERBAIKAN: Gunakan set dengan merge:true untuk menghindari overwrite
    await docRef.set(updateData, { merge: true });

    console.log(
      "[ChatSession Service] Updated session:",
      sessionId,
      "for user:",
      userId,
      "with",
      Object.keys(updates).join(", ")
    );

    const session = docSnap.data();
    return {
      id: sessionId,
      userId: userId,
      ...session,
      ...updateData,
    };
  } catch (error) {
    console.error("[ChatSession Service] Error updating session:", error);
    throw error;
  }
};


/**
 * Delete chat session
 * Deletes/updates: users/{userId}/chatSessions/{sessionId}
 */
export const deleteChatSession = async (
  sessionId,
  userId,
  hardDelete = false,
) => {
  try {
    if (!userId) {
      throw new Error("userId is required");
    }

    const docRef = db
      .collection("users")
      .doc(userId)
      .collection("chatSessions")
      .doc(sessionId);

    // Verify session exists
    const session = await getChatSessionById(sessionId, userId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (hardDelete) {
      // Hard delete - completely remove from database
      await docRef.delete();
      console.log(
        "[ChatSession Service] Hard deleted session:",
        sessionId,
        "for user:",
        userId,
      );
    } else {
      // Soft delete - just mark as inactive
      await docRef.update({
        isActive: false,
        updatedAt: new Date().toISOString(),
      });
      console.log(
        "[ChatSession Service] Soft deleted session:",
        sessionId,
        "for user:",
        userId,
      );
    }

    return { success: true };
  } catch (error) {
    console.error("[ChatSession Service] Error deleting session:", error);
    throw error;
  }
};

/**
 * Save messages to chat session
 */
export const saveMessagesToSession = async (sessionId, userId, messages) => {
  try {
    return await updateChatSession(sessionId, userId, { messages });
  } catch (error) {
    console.error("[ChatSession Service] Error saving messages:", error);
    throw error;
  }
};

/**
 * Get recent chat sessions (last 10)
 */
export const getRecentChatSessions = async (userId) => {
  try {
    return await getChatSessionsByUserId(userId, {
      limitCount: 10,
      orderByField: "updatedAt",
      orderDirection: "desc",
    });
  } catch (error) {
    console.error(
      "[ChatSession Service] Error getting recent sessions:",
      error,
    );
    throw error;
  }
};

/**
 * Search chat sessions by title
 */
export const searchChatSessions = async (userId, searchTerm) => {
  try {
    const sessions = await getChatSessionsByUserId(userId, {
      limitCount: 100,
    });

    // Filter by title (Firestore doesn't support text search natively)
    const filtered = sessions.filter((session) =>
      session.title.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    console.log(
      `[ChatSession Service] Found ${filtered.length} sessions matching "${searchTerm}"`,
    );

    return filtered;
  } catch (error) {
    console.error("[ChatSession Service] Error searching sessions:", error);
    throw error;
  }
};

/**
 * Get session statistics
 */
export const getChatSessionStats = async (userId) => {
  try {
    const sessions = await getChatSessionsByUserId(userId, {
      limitCount: 1000,
      includeInactive: true,
    });

    const stats = {
      totalSessions: sessions.length,
      activeSessions: sessions.filter((s) => s.isActive).length,
      inactiveSessions: sessions.filter((s) => !s.isActive).length,
      totalMessages: sessions.reduce(
        (sum, s) => sum + (s.messages?.length || 0),
        0,
      ),
      averageMessagesPerSession:
        sessions.length > 0
          ? Math.round(
              sessions.reduce((sum, s) => sum + (s.messages?.length || 0), 0) /
                sessions.length,
            )
          : 0,
    };

    console.log("[ChatSession Service] Stats for user:", userId, stats);

    return stats;
  } catch (error) {
    console.error("[ChatSession Service] Error getting stats:", error);
    throw error;
  }
};

export default {
  createChatSession,
  getChatSessionsByUserId,
  getChatSessionById,
  updateChatSession,
  deleteChatSession,
  saveMessagesToSession,
  getRecentChatSessions,
  searchChatSessions,
  getChatSessionStats,
};
