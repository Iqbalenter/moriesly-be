import { ai, safeGenerateContent, MODELS } from "../config/gemini.config.js";
import {
  FOOD_SCAN_PROMPT,
  LABEL_SCAN_PROMPT,
  BARCODE_SCAN_PROMPT,
  RECEIPT_SCAN_PROMPT,
  VERSUS_SCAN_PROMPT,
  SKIN_SCAN_PROMPT,
} from "../utils/prompts.js";

class AIService {
  async scanFood(base64Image) {
    try {
      const response = await safeGenerateContent(
        MODELS.FLASH,
        [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "image/jpeg", data: base64Image } },
              { text: FOOD_SCAN_PROMPT },
            ],
          },
        ],
        { responseMimeType: "application/json" },
      );

      if (!response.text) {
        throw new Error("Empty response from AI");
      }

      const data = JSON.parse(
        response.text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim(),
      );

      return data;
    } catch (error) {
      console.error("Error in scanFood:", error);
      throw error;
    }
  }

  async scanLabel(base64Image) {
    try {
      const response = await safeGenerateContent(
        MODELS.FLASH,
        [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "image/jpeg", data: base64Image } },
              { text: LABEL_SCAN_PROMPT },
            ],
          },
        ],
        { responseMimeType: "application/json" },
      );

      const data = JSON.parse(
        response.text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim(),
      );

      return data;
    } catch (error) {
      console.error("Error in scanLabel:", error);
      throw error;
    }
  }

  async scanBarcode(base64Image) {
    try {
      const response = await safeGenerateContent(
        MODELS.FLASH,
        [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "image/jpeg", data: base64Image } },
              { text: BARCODE_SCAN_PROMPT },
            ],
          },
        ],
        { responseMimeType: "application/json" },
      );

      const data = JSON.parse(
        response.text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim(),
      );

      return data;
    } catch (error) {
      console.error("Error in scanBarcode:", error);
      throw error;
    }
  }

  async scanReceipt(base64Image) {
    try {
      const response = await safeGenerateContent(
        MODELS.FLASH,
        [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "image/jpeg", data: base64Image } },
              { text: RECEIPT_SCAN_PROMPT },
            ],
          },
        ],
        { responseMimeType: "application/json" },
      );

      const data = JSON.parse(
        response.text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim(),
      );

      return data;
    } catch (error) {
      console.error("Error in scanReceipt:", error);
      throw error;
    }
  }

  async scanVersus(base64ImageA, base64ImageB) {
    try {
      const response = await safeGenerateContent(
        MODELS.FLASH,
        [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "image/jpeg", data: base64ImageA } },
              { text: "Item A (First Image)" },
              { inlineData: { mimeType: "image/jpeg", data: base64ImageB } },
              { text: "Item B (Second Image)" },
              { text: VERSUS_SCAN_PROMPT },
            ],
          },
        ],
        { responseMimeType: "application/json" },
      );

      const data = JSON.parse(
        response.text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim(),
      );

      return data;
    } catch (error) {
      console.error("Error in scanVersus:", error);
      throw error;
    }
  }

  async scanSkin(base64Image) {
    try {
      const response = await safeGenerateContent(
        MODELS.FLASH,
        [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "image/jpeg", data: base64Image } },
              { text: SKIN_SCAN_PROMPT },
            ],
          },
        ],
        { responseMimeType: "application/json" },
      );

      const data = JSON.parse(
        response.text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim(),
      );

      return data;
    } catch (error) {
      console.error("Error in scanSkin:", error);
      throw error;
    }
  }

  async chatWithUser(
    userId,
    userProfile,
    message,
    conversationHistory = [],
    imageBase64 = null,
  ) {
    try {
      const { calculateDailySugarLimit } =
        await import("../utils/calculator.js");
      const { GET_SYSTEM_INSTRUCTION } = await import("../utils/prompts.js");

      // Calculate daily sugar limit
      const dailyLimit = calculateDailySugarLimit(userProfile);

      // Get system instruction with profile
      const systemInstruction = GET_SYSTEM_INSTRUCTION(dailyLimit, userProfile);

      console.log("[AI Service] Chat request:", {
        userId,
        messageLength: message.length,
        historyLength: conversationHistory.length,
        hasImage: !!imageBase64,
      });

      // Build conversation contents
      // Convert conversationHistory to proper Gemini format
      const formattedHistory = conversationHistory.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      }));

      // Build current message parts
      const currentMessageParts = [];

      // If image is provided, add it first
      if (imageBase64) {
        currentMessageParts.push({
          inlineData: { mimeType: "image/jpeg", data: imageBase64 },
        });
        currentMessageParts.push({
          text: `[USER SENT AN IMAGE]\n${message}\n\nAnalyze this image. If it's food or drink, identify what it is and estimate the sugar content in grams. Be friendly and helpful.`,
        });
      } else {
        currentMessageParts.push({ text: message });
      }

      // Build contents array - always start with system instruction for consistency
      const contents = [
        {
          role: "user",
          parts: [{ text: systemInstruction }],
        },
        {
          role: "model",
          parts: [
            {
              text: "Understood! I'm Moriesly AI, ready to help you with your health journey! ✨",
            },
          ],
        },
        ...formattedHistory,
        {
          role: "user",
          parts: currentMessageParts,
        },
      ];

      console.log("[AI Service] Sending to Gemini:", {
        contentsLength: contents.length,
        historyLength: formattedHistory.length,
      });

      // Call Gemini API
      const response = await safeGenerateContent(MODELS.FLASH, contents, {});

      console.log("[AI Service] Received response from Gemini");

      if (!response.text) {
        throw new Error("Empty response from AI");
      }

      return {
        text: response.text,
        dailyLimit: dailyLimit,
        profile: {
          name: userProfile.name,
          gender: userProfile.gender,
          age: userProfile.age,
        },
      };
    } catch (error) {
      console.error("Error in chatWithUser:", error);
      throw error;
    }
  }

  async scanFoodWithProfile(base64Image, userProfile) {
    try {
      const { calculateDailySugarLimit } =
        await import("../utils/calculator.js");

      // Get basic scan result
      const scanResult = await this.scanFood(base64Image);

      // Calculate daily limit
      const dailyLimit = calculateDailySugarLimit(userProfile);

      // Add comparison
      const sugarPercentage = ((scanResult.sugar / dailyLimit) * 100).toFixed(
        1,
      );

      return {
        ...scanResult,
        dailyLimit: dailyLimit,
        sugarPercentage: sugarPercentage,
        warning:
          scanResult.sugar > dailyLimit * 0.5
            ? `⚠️ This contains ${sugarPercentage}% of your daily sugar limit!`
            : null,
      };
    } catch (error) {
      console.error("Error in scanFoodWithProfile:", error);
      throw error;
    }
  }

  async generateDailyDietPlan(userProfile, goalText) {
    try {
      const { GENERATE_DAILY_DIET_PROMPT } =
        await import("../utils/diet-prompts.js");

      const prompt = GENERATE_DAILY_DIET_PROMPT(userProfile, goalText);

      const response = await safeGenerateContent(
        MODELS.FLASH,
        [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        { responseMimeType: "application/json" },
      );

      if (!response.text) {
        throw new Error("Empty response from AI");
      }

      const data = JSON.parse(
        response.text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim(),
      );

      return data;
    } catch (error) {
      console.error("Error generating daily diet plan:", error);
      throw error;
    }
  }

  async generateWeeklyDietPlan(userProfile, goalText, daysArray) {
    try {
      const { GENERATE_WEEKLY_DIET_PROMPT } =
        await import("../utils/diet-prompts.js");

      const prompt = GENERATE_WEEKLY_DIET_PROMPT(
        userProfile,
        goalText,
        daysArray,
      );

      const response = await safeGenerateContent(
        MODELS.FLASH,
        [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        { responseMimeType: "application/json" },
      );

      if (!response.text) {
        throw new Error("Empty response from AI");
      }

      const data = JSON.parse(
        response.text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim(),
      );

      return data;
    } catch (error) {
      console.error("Error generating weekly diet plan:", error);
      throw error;
    }
  }

  async swapMeal(currentMeal, dietTarget) {
    try {
      const { SWAP_MEAL_PROMPT } = await import("../utils/diet-prompts.js");

      const prompt = SWAP_MEAL_PROMPT(currentMeal, dietTarget);

      const response = await safeGenerateContent(
        MODELS.FLASH,
        [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        { responseMimeType: "application/json" },
      );

      if (!response.text) {
        throw new Error("Empty response from AI");
      }

      const data = JSON.parse(
        response.text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim(),
      );

      return data;
    } catch (error) {
      console.error("Error swapping meal:", error);
      throw error;
    }
  }

  async validateFoodImage(base64Image) {
    try {
      const { VALIDATE_FOOD_IMAGE_PROMPT } =
        await import("../utils/diet-prompts.js");

      const response = await safeGenerateContent(
        MODELS.FLASH,
        [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "image/jpeg", data: base64Image } },
              { text: VALIDATE_FOOD_IMAGE_PROMPT },
            ],
          },
        ],
        { responseMimeType: "application/json" },
      );

      if (!response.text) {
        throw new Error("Empty response from AI");
      }

      const data = JSON.parse(
        response.text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim(),
      );

      return data;
    } catch (error) {
      console.error("Error validating food image:", error);
      throw error;
    }
  }

  async generateDailyTrainingPlan(userProfile, mode, constraints) {
    try {
      const { GENERATE_DAILY_TRAINING_PROMPT } =
        await import("../utils/training-prompts.js");

      const prompt = GENERATE_DAILY_TRAINING_PROMPT(
        userProfile,
        mode,
        constraints,
      );

      const response = await safeGenerateContent(
        MODELS.FLASH,
        [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        { responseMimeType: "application/json" },
      );

      if (!response.text) {
        throw new Error("Empty response from AI");
      }

      const data = JSON.parse(
        response.text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim(),
      );

      // Validate response structure
      if (!data.codename || !data.schedule || !Array.isArray(data.schedule)) {
        throw new Error("Invalid training plan structure from AI");
      }

      // Ensure totalCaloriesBurn is calculated
      if (!data.totalCaloriesBurn) {
        data.totalCaloriesBurn = data.schedule.reduce(
          (sum, item) => sum + Math.abs(item.sugarImpact || 0),
          0,
        );
      }

      return data;
    } catch (error) {
      console.error("Error generating daily training plan:", error);
      throw error;
    }
  }

  /**
   * Generate chat title from first user message and AI response
   * Uses dedicated prompt for title generation (Dual Call Strategy)
   * @param {string} userMessage - First user message
   * @param {string} aiResponse - First AI response
   * @returns {Promise<string>} - Generated title (4-6 words)
   */
  async generateChatTitle(userMessage, aiResponse) {
    try {
      const TITLE_GENERATION_PROMPT = `Anda adalah asisten yang bertugas merangkum percakapan menjadi judul pendek yang menarik.

TUGAS ANDA:
- Buat judul yang ringkas (maksimal 4-6 kata)
- Judul harus relevan dengan topik percakapan
- Judul harus menarik dan deskriptif
- JANGAN gunakan tanda kutip
- HANYA keluarkan teks judulnya saja, tanpa tambahan apapun

PERCAKAPAN:
User: "${userMessage}"
AI: "${aiResponse}"

Berikan judul yang tepat untuk percakapan di atas:`;

      console.log("[AI Service] Generating chat title...");

      const response = await safeGenerateContent(
        MODELS.FLASH,
        [
          {
            role: "user",
            parts: [{ text: TITLE_GENERATION_PROMPT }],
          },
        ],
        {},
      );

      if (!response.text) {
        throw new Error("Empty response from AI");
      }

      // Clean up the title
      let title = response.text
        .trim()
        .replace(/^["']|["']$/g, "") // Remove quotes
        .replace(/^Judul:\s*/i, "") // Remove "Judul:" prefix if present
        .replace(/^Title:\s*/i, "") // Remove "Title:" prefix if present
        .trim();

      // Limit to 60 characters max
      if (title.length > 60) {
        title = title.substring(0, 57) + "...";
      }

      console.log("[AI Service] Generated title:", title);

      return title || "New Chat";
    } catch (error) {
      console.error("Error generating chat title:", error);
      // Return fallback title on error
      return "New Chat";
    }
  }
}

export default new AIService();
