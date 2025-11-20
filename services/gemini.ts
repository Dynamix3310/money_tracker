
import { GoogleGenAI } from "@google/genai";
import { getAuth } from "firebase/auth";

// Declare process to avoid TS errors if not defined in types
declare var process: {
  env: {
    API_KEY: string;
    VITE_GEMINI_API_KEY: string;
    [key: string]: string;
  };
};

// --- CONFIGURATION / 設定區域 ---
// 請在此處填入允許使用系統 API Key 的使用者 Email
// 只有在名單內的 Email 登入後，才能使用環境變數中的 VITE_GEMINI_API_KEY
// 若不在名單內，系統會要求使用者在「設定」中輸入自己的 Key
const ADMIN_EMAILS = [
    'fatibrother@gmail.com', 
    'lazycancerguy11@gmail.com', // <--- 請將您的 Email 加在這裡
    'jennyliao26217167@gmail.com'
]; 

export async function callGemini(prompt: string, imageBase64?: string) {
  // 1. Determine which Key to use
  let apiKey: string | undefined;
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const userEmail = currentUser?.email;

  // Check if current user is an admin
  const isAllowedUser = userEmail && ADMIN_EMAILS.includes(userEmail);
  const userCustomKey = localStorage.getItem('user_gemini_key');

  if (isAllowedUser) {
      // Use System Env Key for admins
      if (import.meta.env) {
        if (import.meta.env.VITE_GEMINI_API_KEY) apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        else if (import.meta.env.API_KEY) apiKey = import.meta.env.API_KEY;
      }
      if (!apiKey && typeof process !== 'undefined' && process.env) {
         if (process.env.VITE_GEMINI_API_KEY) apiKey = process.env.VITE_GEMINI_API_KEY;
         else if (process.env.API_KEY) apiKey = process.env.API_KEY;
      }
  } else {
      // Use User Custom Key for others
      if (userCustomKey) apiKey = userCustomKey;
  }

  if (!apiKey) {
    if (isAllowedUser) {
        console.warn("System Gemini API Key missing in environment.");
        return "系統錯誤: 管理員尚未設定環境變數 API Key (VITE_GEMINI_API_KEY)。";
    } else {
        // Return a specific message prompting the user to set their key
        return "權限限制: 您的帳號未授權使用系統 API。請在「設定 > API 金鑰」中輸入您自己的 Gemini API Key，或聯繫管理員將您加入白名單。";
    }
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
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes('400') || error.message?.includes('API key')) {
        return "API Key 無效或是額度已滿，請檢查設定。";
    }
    return "AI 暫時無法回應，請稍後再試。";
  }
}
