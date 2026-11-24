// Vercel serverless function: the only place the Gemini API key lives.
// The browser sends a Firebase ID token; we verify it and the email allowlist before calling Gemini.
import { GoogleGenAI } from '@google/genai';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ADMIN_EMAILS, ALLOWED_GEMINI_MODELS } from '../services/admins.js'; // .js required: package is ESM

const FIREBASE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const MAX_BODY_BYTES = 4 * 1024 * 1024;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function verifyUser(req: Request): Promise<string | null> {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!projectId || !token) return null;
  try {
    const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    const email = typeof payload.email === 'string' ? payload.email : null;
    return email && ADMIN_EMAILS.includes(email) ? email : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json(500, { error: 'GEMINI_API_KEY is not configured on the server' });

  if (!(await verifyUser(req))) return json(401, { error: 'Unauthorized' });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: 'Request too large' });

  let body: any;
  try { body = JSON.parse(raw); } catch { return json(400, { error: 'Invalid JSON' }); }

  const { model, contents, useSearch } = body || {};
  if (!ALLOWED_GEMINI_MODELS.includes(model)) return json(400, { error: `Model not allowed: ${model}` });
  if (!contents) return json(400, { error: 'Missing contents' });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents,
      ...(useSearch ? { config: { tools: [{ googleSearch: {} }] } } : {}),
    });
    return json(200, { text: response.text ?? '' });
  } catch (e: any) {
    const msg: string = e?.message || 'Gemini request failed';
    // Pass the upstream status through so the client can tell 429/503 apart.
    const status = Number(e?.status) || Number(msg.match(/\b(4\d\d|5\d\d)\b/)?.[1]) || 502;
    return json(status, { error: msg.slice(0, 500) });
  }
}
