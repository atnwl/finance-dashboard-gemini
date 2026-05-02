import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Executes a generative AI function with exponential backoff on rate limit errors.
 * @param {Function} fn - The function to execute
 * @param {number} maxRetries - Maximum number of retries (default 3)
 * @param {number} baseDelay - Initial delay in ms (default 2000)
 */
export async function withGeminiRetry(fn, maxRetries = 3, baseDelay = 2000) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const errorMsg = err.message || "";
      const isRateLimit = errorMsg.includes("429") || 
                          errorMsg.toLowerCase().includes("quota") || 
                          errorMsg.toLowerCase().includes("rate limit") ||
                          errorMsg.toLowerCase().includes("too many requests");
      
      if (!isRateLimit || i === maxRetries - 1) {
        throw err;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, i);
      console.warn(`Gemini rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * Helper to get a GoogleGenerativeAI instance.
 * Centralizing this allows easier model version updates.
 */
export const getGeminiModel = (apiKey, modelName = "gemini-2.5-flash") => {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
};
