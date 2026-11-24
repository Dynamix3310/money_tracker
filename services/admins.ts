// Emails allowed to use the app and the server-side Gemini key.
// Shared by the browser code and the Vercel function in api/gemini.ts.
export const ADMIN_EMAILS = [
  'fatibrother@gmail.com',
  'lazycancerguy11@gmail.com',
  'jennyliao26217167@gmail.com'
];

// Models the server proxy will call. Anything else is rejected.
export const GEMINI_MODEL = 'gemini-3.8-flash';
export const GEMINI_FALLBACK_MODEL = 'gemini-3.6-flash';
export const GEMINI_PRICE_MODEL = 'gemini-3.5-flash-lite';
export const ALLOWED_GEMINI_MODELS = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL, GEMINI_PRICE_MODEL];
