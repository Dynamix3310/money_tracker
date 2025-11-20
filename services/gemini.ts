
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
// Export this list so App.tsx and api.ts can use it for access control
export const ADMIN_EMAILS = [
    'fatibrother@gmail.com', 
    'lazycancerguy11@gmail.com', 
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

export async function fetchPriceWithAI(symbol: string): Promise<number | null> {
  // Logic to get key (duplicated from callGemini to ensure robustness)
  let apiKey: string | undefined;
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const userEmail = currentUser?.email;
  const isAllowedUser = userEmail && ADMIN_EMAILS.includes(userEmail);
  const userCustomKey = localStorage.getItem('user_gemini_key');

  if (isAllowedUser) {
      if (import.meta.env) {
        if (import.meta.env.VITE_GEMINI_API_KEY) apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        else if (import.meta.env.API_KEY) apiKey = import.meta.env.API_KEY;
      }
      if (!apiKey && typeof process !== 'undefined' && process.env) {
         if (process.env.VITE_GEMINI_API_KEY) apiKey = process.env.VITE_GEMINI_API_KEY;
         else if (process.env.API_KEY) apiKey = process.env.API_KEY;
      }
  } else {
      if (userCustomKey) apiKey = userCustomKey;
  }

  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    // Using googleSearch tool
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Search for the current stock price of "${symbol}". If the symbol contains numbers like 1475 or 7203, it is likely a Japanese stock code. Return ONLY the numeric value of the price (e.g. 1234.5). Do not return currency symbols or other text.`,
        config: {
            tools: [{googleSearch: {}}]
        }
    });
    
    const text = response.text;
    if(!text) return null;
    
    // Try to extract a number
    const match = text.match(/[\d,]+\.?\d*/); 
    if(match) {
        const num = parseFloat(match[0].replace(/,/g, ''));
        return isNaN(num) ? null : num;
    }
    return null;
  } catch (e) {
    console.error("AI Price Fetch Error", e);
    return null;
  }
}
