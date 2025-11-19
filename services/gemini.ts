import { GoogleGenAI } from "@google/genai";

// Declare process to avoid TS errors if not defined in types
declare var process: {
  env: {
    API_KEY: string;
    VITE_GEMINI_API_KEY: string;
    [key: string]: string;
  };
};

export async function callGemini(prompt: string, imageBase64?: string) {
  // Safely retrieve API key supporting both VITE_ prefix (Vercel/Vite) and standard process.env
  let apiKey: string | undefined;

  // 1. Try import.meta.env (Standard for Vite)
  if (import.meta.env) {
    if (import.meta.env.VITE_GEMINI_API_KEY) apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    else if (import.meta.env.API_KEY) apiKey = import.meta.env.API_KEY;
  }

  // 2. Fallback to process.env if not found (Node/Polyfill)
  if (!apiKey && typeof process !== 'undefined' && process.env) {
     if (process.env.VITE_GEMINI_API_KEY) apiKey = process.env.VITE_GEMINI_API_KEY;
     else if (process.env.API_KEY) apiKey = process.env.API_KEY;
  }

  if (!apiKey) {
    console.warn("Gemini API Key not found. Please configure VITE_GEMINI_API_KEY.");
    return "API Key Missing. Please configure VITE_GEMINI_API_KEY in your environment variables.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelId = 'gemini-2.5-flash';
    
    let response;
    
    if (imageBase64) {
       // Handle image input
       const base64Data = imageBase64.split(',')[1] || imageBase64;
       response = await ai.models.generateContent({
         model: modelId,
         contents: {
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                { text: prompt }
            ]
         }
       });
    } else {
       // Text only
       response = await ai.models.generateContent({
         model: modelId,
         contents: prompt,
       });
    }
    
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}