import { getAuth } from "firebase/auth";
import { ADMIN_EMAILS, GEMINI_MODEL, GEMINI_FALLBACK_MODEL, GEMINI_PRICE_MODEL } from "./admins";

// Re-exported so existing imports keep working.
export { ADMIN_EMAILS, GEMINI_MODEL, GEMINI_FALLBACK_MODEL, GEMINI_PRICE_MODEL };

// The SDK is imported on demand: only users with their own key download it.
const loadGenAI = async () => (await import("@google/genai")).GoogleGenAI;

// How Gemini is reached:
// - A user who entered their own key in Settings calls Gemini directly from the browser with it.
// - Allowlisted users without their own key go through /api/gemini (Vercel function). The system
//   key lives only on the server and is never shipped to the browser.
type GenRequest = { model: string; contents: any; useSearch?: boolean };
type Sender = (req: GenRequest) => Promise<{ text?: string }>;

const AI_PRICE_CACHE_MS = 6 * 60 * 60 * 1000;
const AI_PRICE_FAIL_BACKOFF_MS = 60 * 60 * 1000;

const isOverloaded = (e: any) => /\b503\b|UNAVAILABLE|overloaded|high demand/i.test(e?.message || '');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const directSender = async (apiKey: string): Promise<Sender> => {
  const GoogleGenAI = await loadGenAI();
  const ai = new GoogleGenAI({ apiKey });
  return async ({ model, contents, useSearch }) => {
    const res = await ai.models.generateContent({ model, contents, ...(useSearch ? { config: { tools: [{ googleSearch: {} }] } } : {}) });
    return { text: res.text };
  };
};

const proxySender: Sender = async (req) => {
  const token = await getAuth().currentUser?.getIdToken();
  if (!token) throw new Error('401 尚未登入');
  const r = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(req),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${data.error || r.statusText}`);
  return { text: data.text };
};

// Returns how to reach Gemini for the current user, or an error message to show.
async function getSender(): Promise<Sender | string> {
  const userCustomKey = localStorage.getItem('user_gemini_key');
  if (userCustomKey) return directSender(userCustomKey);
  const email = getAuth().currentUser?.email;
  if (email && ADMIN_EMAILS.includes(email)) return proxySender;
  return "權限限制: 您的帳號未授權使用系統 API。請在「設定 > API 金鑰」中輸入您自己的 Gemini API Key，或聯繫管理員將您加入白名單。";
}

// Retry temporary overload errors once, then try the fallback model once.
// Kept short on purpose: the free tier allows only 5 requests per minute.
async function generateWithRetry(send: Sender, contents: any) {
  const plan = [
    { model: GEMINI_MODEL, wait: 0 },
    { model: GEMINI_MODEL, wait: 3000 },
    { model: GEMINI_FALLBACK_MODEL, wait: 1000 },
  ];
  let lastError: any;
  for (const step of plan) {
    if (step.wait) await sleep(step.wait);
    try {
      return await send({ model: step.model, contents });
    } catch (e) {
      lastError = e;
      if (!isOverloaded(e)) throw e;
    }
  }
  throw lastError;
}

export async function callGemini(prompt: string, imageBase64?: string) {
  const sender = await getSender();
  if (typeof sender === 'string') return sender;

  try {
    let contents: any = prompt;
    if (imageBase64) {
      const base64Data = imageBase64.split(',')[1] || imageBase64;
      const mimeType = imageBase64.match(/^data:([^;]+);base64,/)?.[1] || 'image/jpeg';
      contents = { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] };
    }
    const response = await generateWithRetry(sender, contents);
    return response.text || '';
  } catch (error: any) {
    console.error("Gemini Error:", error);
    const msg: string = error?.message || '';
    if (/API key not valid|API_KEY_INVALID/i.test(msg)) return "API Key 無效，請檢查設定。";
    if (/^401\b/.test(msg)) return "權限限制: 登入已過期或帳號不在白名單，請重新登入。";
    if (/GEMINI_API_KEY is not configured/.test(msg)) return "系統錯誤: 伺服器尚未設定 GEMINI_API_KEY。";
    if (/\b403\b|PERMISSION_DENIED|suspended/i.test(msg)) return `AI 服務被拒絕 (403)，API 專案可能已停用 (${msg.slice(0, 120)})`;
    if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) return "AI 額度已滿，請稍後再試。";
    if (isOverloaded(error)) return "AI 目前太忙碌（已自動重試仍失敗），請過幾分鐘再試。";
    if (/404|NOT_FOUND|not found|no longer available/i.test(msg)) return `AI 模型 ${GEMINI_MODEL} 無法使用 (${msg.slice(0, 200)})`;
    return `AI 請求失敗 (${msg || 'Unknown Error'})。請稍後再試。`;
  }
}

// AI price lookups run one at a time (free tier: 5 requests/minute), are cached for 6 hours,
// and a failed symbol is not retried for an hour, so the 15-minute background refresh
// can't hammer the API.
let priceQueue: Promise<unknown> = Promise.resolve();

export async function fetchPriceWithAI(symbol: string): Promise<number | null> {
  const cacheKey = `ai_price_${symbol.toUpperCase()}`;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (cached && cached.p !== null && Date.now() - cached.t < AI_PRICE_CACHE_MS) return cached.p;
    if (cached && cached.p === null && Date.now() - cached.t < AI_PRICE_FAIL_BACKOFF_MS) return null;
  } catch { /* ignore */ }
  const run = priceQueue.then(() => fetchPriceWithAIUncached(symbol));
  priceQueue = run.catch(() => null);
  const price = await run;
  try { localStorage.setItem(cacheKey, JSON.stringify({ p: price, t: Date.now() })); } catch { /* ignore */ }
  return price;
}

async function fetchPriceWithAIUncached(symbol: string): Promise<number | null> {
  const sender = await getSender();
  if (typeof sender === 'string') return null;
  try {
    const response = await sender({
      model: GEMINI_PRICE_MODEL,
      contents: `Search for the current stock price of "${symbol}". If the symbol contains numbers like 1475 or 7203, it is likely a Japanese stock code. Return ONLY the numeric value of the price (e.g. 1234.5). Do not return currency symbols or other text.`,
      useSearch: true,
    });
    const match = (response.text || '').match(/[\d,]+\.?\d*/);
    if (!match) return null;
    const num = parseFloat(match[0].replace(/,/g, ''));
    return isNaN(num) ? null : num;
  } catch (e) {
    console.error("AI Price Fetch Error", e);
    return null;
  }
}
