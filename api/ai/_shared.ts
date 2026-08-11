/**
 * Shared helpers for the api/ai/* serverless functions.
 *
 * These functions run server-side only (Vercel Node.js runtime). Never
 * import this module (or anything under api/**) from src/ — the Gemini API
 * key must never reach the client bundle.
 */
import type { VercelResponse } from '@vercel/node';

/** Stable machine-readable error codes returned to src/lib/ai.ts. */
export type AiErrorCode =
  | 'not_configured'
  | 'bad_request'
  | 'payload_too_large'
  | 'method_not_allowed'
  | 'upstream_error';

export function sendJson(res: VercelResponse, status: number, body: unknown): void {
  res.status(status).json(body);
}

export function sendError(res: VercelResponse, status: number, error: AiErrorCode, message?: string): void {
  sendJson(res, status, { error, ...(message ? { message } : {}) });
}

/** Reads GEMINI_API_KEY from the server environment. Never exposed to the client. */
export function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
}

/**
 * Vercel's Node runtime auto-parses JSON bodies (content-type:
 * application/json) into req.body, but guards defensively in case a body
 * arrives as a raw string.
 */
export function readJsonBody<T>(raw: unknown): T | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }
  return raw as T;
}

const DATA_URL_RE = /^data:([^;]+);base64,(.+)$/;

/** Splits a `data:<mime>;base64,<data>` URL into its parts. Returns null if malformed. */
export function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

/** Approximate decoded byte size of a base64 string. */
export function base64ByteLength(base64: string): number {
  const clean = base64.replace(/=+$/, '');
  return Math.ceil((clean.length * 3) / 4);
}

export function safeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
  // Translate noisy upstream errors into short, customer-safe messages.
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('"code":429')) {
    return 'The AI service is at its usage limit right now. Please try again in a minute — or the site owner may need to enable billing for this AI feature.';
  }
  if (raw.includes('NOT_FOUND') && raw.includes('models/')) {
    return 'The configured AI model is unavailable. The site owner has been notified.';
  }
  // Cap length so raw upstream JSON never floods the customer-facing dialog.
  return raw.length > 220 ? `${raw.slice(0, 220)}…` : raw;
}
