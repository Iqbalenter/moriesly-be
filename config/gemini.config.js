import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in .env file');
}

export const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY 
});

export const MODELS = {
  FLASH: 'gemini-2.5-flash',
  PRO: 'gemini-2.0-pro',
};

export const safeGenerateContent = async (model, contents, config) => {
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      return result;
    } catch (e) {
      const msg = e.message || e.toString();
      const isRetryable =
        e.status === 429 ||
        e.status === 503 ||
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED');

      if (isRetryable && attempt < maxRetries) {
        const delay = 2000 * Math.pow(2, attempt);
        console.warn(`[Gemini API] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw e;
    }
  }
};
