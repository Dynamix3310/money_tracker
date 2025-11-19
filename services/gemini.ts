
import { GoogleGenAI } from "@google/genai";

// Declare process to avoid TS errors if not defined in types
declare var process: {
  env: {
    API_KEY: string;
  };
};

export async function callGemini(prompt: string, imageBase64?: string) {
  // The API key must be obtained exclusively from the environment variable process.env.API_KEY
  // We use a safe check to avoid crashing if 'process' is undefined in the browser
  const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : undefined;

  if (!apiKey) {
    console.warn("Gemini API Key not found in process.env.API_KEY");
    return "API Key Missing. Please configure process.env.API_KEY.";
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
