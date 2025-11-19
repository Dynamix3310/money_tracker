import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  let key = undefined;
  
  // 1. Try import.meta.env for Vite
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      key = import.meta.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.REACT_APP_GEMINI_API_KEY;
    }
  } catch (e) {}

  // 2. Try process.env
  if (!key) {
    try {
      if (typeof process !== 'undefined' && process.env) {
        key = process.env.API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      }
    } catch (e) {}
  }
  
  return key || "";
};

const apiKey = getApiKey();

export async function callGemini(prompt: string, imageBase64?: string) {
  if (!apiKey) {
    console.warn("Gemini API Key not found in env");
    return "API Key Missing. Please configure VITE_GEMINI_API_KEY in Vercel environment variables.";
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