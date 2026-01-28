import { ai, MODELS, safeGenerateContent } from "../config/gemini.config.js";
import admin from "firebase-admin";
import { getUserPermissions, checkLimit } from "../utils/role.config.js";

const db = admin.firestore();

/**
 * @route   POST /api/feed/generate
 * @desc    Generate Moriesly Feed articles using Gemini 2.5 Flash
 * @access  Private
 * @body    { recentHistory?: Array, count?: number }
 */
export const generateFeed = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { recentHistory = [], count = 4 } = req.body;

        // Get user profile
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                message: "User profile not found",
            });
        }

        const userProfile = userDoc.data();

        // Check permissions
        const permissions = getUserPermissions(userProfile);
        if (!permissions.canGenerateFeed) {
            return res.status(403).json({
                success: false,
                message: "Feed generation not available for your subscription plan",
                errorCode: "FEED_NOT_AVAILABLE",
            });
        }

        // Check daily limit
        const today = new Date().toISOString().split("T")[0];
        const usageDoc = await db
            .collection("users")
            .doc(userId)
            .collection("usage")
            .doc(today)
            .get();

        const currentUsage = usageDoc.exists
            ? usageDoc.data().feedGenerations || 0
            : 0;

        const limitCheck = checkLimit(
            userProfile,
            "maxFeedGenerationsPerDay",
            currentUsage
        );

        if (!limitCheck.allowed) {
            return res.status(429).json({
                success: false,
                message: `Daily feed generation limit reached. You can generate ${permissions.maxFeedGenerationsPerDay} feeds per day.`,
                errorCode: "FEED_LIMIT_REACHED",
                limit: limitCheck.limit,
                current: currentUsage,
                remaining: 0,
            });
        }

        // Prepare context data for AI
        const historyText = recentHistory
            .slice(0, 5)
            .map(
                (h) =>
                    `${h.action?.toUpperCase() || "ACTION"}: ${h.name || "Unknown"} (${h.sugarg || 0}g sugar) at ${h.timestamp || "Unknown time"}`
            )
            .join("\n");

        // Generate feed articles using Gemini 2.5 Flash
        const prompt = `
You are the Editor-in-Chief of "The Metabolic Truth", a classified health intelligence agency.

Generate ${count} "Social Media Style" news posts based on this user's health data.

USER PROFILE:
- Name: ${userProfile.name || "Agent"}
- Age: ${userProfile.age || "Unknown"}
- Weight: ${userProfile.weight || "Unknown"}kg
- Goal: ${userProfile.goal || "Maintain health"}

RECENT ACTIVITY:
${historyText || "No recent activity. Subject dormant."}

INSTRUCTIONS:
1. Create ${count} unique articles that are:
   - Engaging and Instagram-style formatted
   - Based on the user's actual health data
   - Educational but entertaining
   - Scientifically accurate but accessible

2. Each article must have:
   - "headline": SHORT, Punchy, Scary (2-5 words). E.g. "LIVER TOXICITY RISING" or "INSULIN SPIKE DETECTED"
   - "location": Biological location (e.g. 'Pancreas Sector 7', 'Hepatic Zone 4', 'Reward Center')
   - "category": Must be one of: "Investigation", "Medical Report", or "Breaking News"
   - "caption": A catchy, short Instagram-style caption (10-20 words)
   - "fullContent": A 2-paragraph detailed investigative report (100-200 words total)
   - "likes": Random number between 100-5000
   - "impactScore": Number from 1-10 indicating health impact severity

RETURN VALID JSON ARRAY FORMAT:
[
  {
    "headline": "string",
    "location": "string",
    "category": "Investigation" | "Medical Report" | "Breaking News",
    "caption": "string",
    "fullContent": "string",
    "likes": number,
    "impactScore": number
  }
]

IMPORTANT: Return ONLY the JSON array, no additional text or markdown formatting.
`;

        const response = await safeGenerateContent(
            MODELS.FLASH,
            [{ role: "user", parts: [{ text: prompt }] }],
            { responseMimeType: "application/json" }
        );

        if (!response.text) {
            throw new Error("Empty response from Gemini API");
        }

        // Parse and validate response
        let articles;
        try {
            articles = JSON.parse(response.text);
            if (!Array.isArray(articles)) {
                throw new Error("Response is not an array");
            }
        } catch (parseError) {
            console.error("Failed to parse Gemini response:", response.text);
            throw new Error("Invalid response format from AI");
        }

        // Validate article structure
        const validatedArticles = articles.map((article, index) => ({
            id: `feed-${Date.now()}-${index}`,
            headline: article.headline || "ALERT",
            location: article.location || "System",
            category:
                article.category ||
                ["Investigation", "Medical Report", "Breaking News"][
                Math.floor(Math.random() * 3)
                ],
            caption: article.caption || "Health update.",
            fullContent:
                article.fullContent || "No additional information available.",
            timestamp: new Date().toISOString(),
            likes: article.likes || Math.floor(Math.random() * 4900) + 100,
            impactScore:
                article.impactScore || Math.floor(Math.random() * 10) + 1,
        }));

        // Update usage counter
        await db
            .collection("users")
            .doc(userId)
            .collection("usage")
            .doc(today)
            .set(
                {
                    feedGenerations: admin.firestore.FieldValue.increment(1),
                    lastFeedGeneration: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
            );

        // Return success response
        res.status(200).json({
            success: true,
            articles: validatedArticles,
            usage: {
                current: currentUsage + 1,
                limit:
                    permissions.maxFeedGenerationsPerDay === -1
                        ? "unlimited"
                        : permissions.maxFeedGenerationsPerDay,
                remaining:
                    permissions.maxFeedGenerationsPerDay === -1
                        ? "unlimited"
                        : limitCheck.remaining - 1,
            },
        });
    } catch (error) {
        console.error("[Feed Controller] Error generating feed:", error);

        // Handle specific Gemini API errors
        if (error.status === 429 || error.message?.includes("RESOURCE_EXHAUSTED")) {
            return res.status(429).json({
                success: false,
                message: "AI service temporarily unavailable. Please try again later.",
                errorCode: "AI_QUOTA_EXCEEDED",
            });
        }

        if (error.status === 503) {
            return res.status(503).json({
                success: false,
                message: "AI service temporarily unavailable.",
                errorCode: "AI_SERVICE_UNAVAILABLE",
            });
        }

        next(error);
    }
};

/**
 * @route   GET /api/feed/usage
 * @desc    Get current feed generation usage for today
 * @access  Private
 */
export const getFeedUsage = async (req, res, next) => {
    try {
        const userId = req.user.uid;

        // Get user profile
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                message: "User profile not found",
            });
        }

        const userProfile = userDoc.data();
        const permissions = getUserPermissions(userProfile);

        // Get today's usage
        const today = new Date().toISOString().split("T")[0];
        const usageDoc = await db
            .collection("users")
            .doc(userId)
            .collection("usage")
            .doc(today)
            .get();

        const currentUsage = usageDoc.exists
            ? usageDoc.data().feedGenerations || 0
            : 0;

        const limitCheck = checkLimit(
            userProfile,
            "maxFeedGenerationsPerDay",
            currentUsage
        );

        res.status(200).json({
            success: true,
            usage: {
                current: currentUsage,
                limit:
                    permissions.maxFeedGenerationsPerDay === -1
                        ? "unlimited"
                        : permissions.maxFeedGenerationsPerDay,
                remaining:
                    permissions.maxFeedGenerationsPerDay === -1
                        ? "unlimited"
                        : limitCheck.remaining,
                allowed: limitCheck.allowed,
            },
            permissions: {
                canGenerateFeed: permissions.canGenerateFeed,
            },
        });
    } catch (error) {
        console.error("[Feed Controller] Error getting usage:", error);
        next(error);
    }
};
