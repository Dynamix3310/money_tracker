import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // --- 1. 更聰明的 CORS 設定 ---
  // 自動抓取請求來源，如果是 localhost 或 vercel.app 結尾 (你的部署網址)，就允許通過
  // 這樣你就不用每次部署完還回來改這行程式碼
  const origin = req.headers.origin;
  if (origin && (origin.includes('localhost') || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 處理預檢請求 (瀏覽器會在正式發送前先問一次伺服器給不給過)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允許 POST 方法
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // --- 2. 安全讀取 Key ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Server Internal Error: API Key not found");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 建議改用 gemini-1.5-flash，速度快且免費額度高，適合這種即時應用
    // 如果你堅持要舊版，可以改回 "gemini-pro"
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // --- 3. 解析前端資料 ---
    // 這裡假設前端傳來的 JSON 是 { prompt: "你的問題..." }
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // --- 4. 呼叫 Google ---
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // --- 5. 回傳結果 ---
    return res.status(200).json({ result: text });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ 
      error: 'Failed to fetch response',
      details: error.message // 開發時方便除錯，正式上線可拿掉
    });
  }
}