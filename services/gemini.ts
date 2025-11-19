import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || ""; 

export async function callGemini(prompt: string, imageBase64?: string) {
  if (!apiKey) {
    console.warn("Gemini API Key not found in env");
    return "API Key Missing";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelId = imageBase64 ? 'gemini-2.5-flash' : 'gemini-2.5-flash';
    
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