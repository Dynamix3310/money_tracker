// Gmail e-statement fetching, done entirely in the browser.
// - Access token comes from Google Identity Services (one click popup, ~1h lifetime, never stored).
// - PDF password and source settings live in this device's localStorage only.

export type StatementTarget = 'bank' | 'card';

export interface StatementSource {
    id: string;
    label: string;
    query: string;            // Gmail search query, e.g. from:ebill@estats.ctbcbank.com subject:信用卡
    target: StatementTarget;
    targetId: string;         // bank account id or credit card id (default card when cards[] is used)
    cards?: { last4: string; cardId: string }[]; // one statement covering several cards, matched by last 4 digits
}

export interface FoundStatement {
    messageId: string;
    sourceId: string;
    subject: string;
    date: number;             // ms
    attachmentId: string;
    filename: string;
}

const SOURCES_KEY = 'gmail_statement_sources';
const PASSWORD_KEY = 'gmail_statement_pdf_password';
const PROCESSED_KEY = 'gmail_statement_processed';
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const API = 'https://gmail.googleapis.com/gmail/v1/users/me';

export const DEFAULT_SOURCES: Omit<StatementSource, 'targetId'>[] = [
    { id: 'ctbc-card', label: '中國信託 信用卡', query: 'from:ebill@estats.ctbcbank.com subject:信用卡電子帳單', target: 'card' },
    { id: 'ctbc-bank', label: '中國信託 銀行對帳單', query: 'from:ebill@estats.ctbcbank.com subject:銀行電子對帳單', target: 'bank' },
    { id: 'cathay-card', label: '國泰世華 信用卡', query: 'from:cathaybk.com.tw subject:信用卡 subject:電子帳單', target: 'card' },
];

const readJSON = <T,>(key: string, fallback: T): T => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const writeJSON = (key: string, v: any) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } };

export const loadSources = (): StatementSource[] => readJSON<StatementSource[]>(SOURCES_KEY, DEFAULT_SOURCES.map(s => ({ ...s, targetId: '' })));
export const saveSources = (s: StatementSource[]) => writeJSON(SOURCES_KEY, s);
export const loadPassword = (): string => { try { return localStorage.getItem(PASSWORD_KEY) || ''; } catch { return ''; } };
export const savePassword = (p: string) => { try { p ? localStorage.setItem(PASSWORD_KEY, p) : localStorage.removeItem(PASSWORD_KEY); } catch { /* ignore */ } };
export const loadProcessed = (): string[] => readJSON<string[]>(PROCESSED_KEY, []);
export const markProcessed = (messageId: string) => {
    const list = loadProcessed();
    if (!list.includes(messageId)) writeJSON(PROCESSED_KEY, [...list, messageId].slice(-200));
};

// --- Google Identity Services token ---
declare const google: any;
let cachedToken: { token: string; exp: number } | null = null;

const loadGis = () => new Promise<void>((resolve, reject) => {
    if (typeof google !== 'undefined' && google.accounts?.oauth2) return resolve();
    const existing = document.getElementById('gis-script');
    if (existing) { existing.addEventListener('load', () => resolve()); existing.addEventListener('error', () => reject(new Error('無法載入 Google 登入元件'))); return; }
    const s = document.createElement('script');
    s.id = 'gis-script';
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('無法載入 Google 登入元件'));
    document.head.appendChild(s);
});

export const getGoogleClientId = (): string | undefined => import.meta.env?.VITE_GOOGLE_CLIENT_ID;

// Must be called from a click handler, otherwise the browser blocks the popup.
export const getGmailToken = async (): Promise<string> => {
    if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
    const clientId = getGoogleClientId();
    if (!clientId) throw new Error('尚未設定 VITE_GOOGLE_CLIENT_ID');
    await loadGis();
    return new Promise((resolve, reject) => {
        const client = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: GMAIL_SCOPE,
            callback: (resp: any) => {
                if (resp.error) return reject(new Error(resp.error_description || resp.error));
                cachedToken = { token: resp.access_token, exp: Date.now() + (Number(resp.expires_in) || 3600) * 1000 };
                resolve(resp.access_token);
            },
            error_callback: (err: any) => reject(new Error(err?.message || err?.type || 'Google 授權失敗')),
        });
        client.requestAccessToken({ prompt: '' });
    });
};

const gmailGet = async (token: string, path: string) => {
    const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 401) { cachedToken = null; throw new Error('Google 授權已過期，請再按一次'); }
    if (!r.ok) throw new Error(`Gmail API 錯誤 (${r.status})`);
    return r.json();
};

const findPdfPart = (part: any): any | null => {
    if (!part) return null;
    if (part.filename && /\.pdf$/i.test(part.filename) && part.body?.attachmentId) return part;
    for (const p of part.parts || []) { const f = findPdfPart(p); if (f) return f; }
    return null;
};

export const searchStatements = async (token: string, sources: StatementSource[], days = 90): Promise<FoundStatement[]> => {
    const processed = new Set(loadProcessed());
    const found: FoundStatement[] = [];
    for (const src of sources) {
        if (!src.targetId) continue;
        const q = encodeURIComponent(`${src.query} has:attachment filename:pdf newer_than:${days}d`);
        const list = await gmailGet(token, `/messages?q=${q}&maxResults=10`);
        for (const m of list.messages || []) {
            if (processed.has(m.id)) continue;
            const msg = await gmailGet(token, `/messages/${m.id}?format=full`);
            const pdf = findPdfPart(msg.payload);
            if (!pdf) continue;
            const subject = (msg.payload.headers || []).find((h: any) => h.name.toLowerCase() === 'subject')?.value || src.label;
            found.push({ messageId: m.id, sourceId: src.id, subject, date: Number(msg.internalDate), attachmentId: pdf.body.attachmentId, filename: pdf.filename });
        }
    }
    return found.sort((a, b) => b.date - a.date);
};

export const downloadAttachment = async (token: string, messageId: string, attachmentId: string): Promise<Uint8Array> => {
    const data = await gmailGet(token, `/messages/${messageId}/attachments/${attachmentId}`);
    const b64 = data.data.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
};

// Remember last search result while the modal closes to show the import preview.
let lastFound: FoundStatement[] | null = null;
export const getLastFound = () => lastFound && lastFound.filter(f => !loadProcessed().includes(f.messageId));
export const setLastFound = (f: FoundStatement[] | null) => { lastFound = f; };

// --- PDF decrypt + text extraction (pdf.js, loaded on demand) ---
export class PdfPasswordError extends Error { }

export const extractPdfText = async (bytes: Uint8Array, password: string): Promise<string> => {
    const pdfjs = await import('pdfjs-dist');
    // @ts-ignore Vite ?url import
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    let pdf;
    try {
        pdf = await pdfjs.getDocument({ data: bytes, password }).promise;
    } catch (e: any) {
        if (e?.name === 'PasswordException') throw new PdfPasswordError('PDF 密碼錯誤');
        throw e;
    }
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // Rebuild lines by y position so table rows stay on one line.
        const rows = new Map<number, { x: number; s: string }[]>();
        for (const it of content.items as any[]) {
            if (!it.str?.trim()) continue;
            const y = Math.round(it.transform[5]);
            const key = [...rows.keys()].find(k => Math.abs(k - y) <= 2) ?? y;
            if (!rows.has(key)) rows.set(key, []);
            rows.get(key)!.push({ x: it.transform[4], s: it.str });
        }
        const lines = [...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, cells]) => cells.sort((a, b) => a.x - b.x).map(c => c.s).join(' '));
        pages.push(lines.join('\n'));
    }
    return pages.join('\n\n');
};
