/**
 * POST /api/ai/analyze
 *
 * AI-assisted manufacturability advisory. Runs the customer's design JSON
 * (produced by the rule-based src/studio/weavability/rules.ts checker's
 * cousin — this is the AI-augmented second opinion) past a Gemini text
 * model acting as a narrow-fabric manufacturing reviewer. Advisory only:
 * the model is explicitly instructed never to claim production approval
 * and never to invent loom settings, yarn counts, or costs.
 *
 * Server-side only — process.env.GEMINI_API_KEY never reaches the client.
 *
 * Request:  { spec: DesignSpec, artworkThumb?: string (small data URL) }
 * Response: { level, issues, summary }  |  { error: AiErrorCode, message?: string }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import type { DesignSpec } from '../../src/lib/types';
import {
  base64ByteLength,
  getGeminiApiKey,
  parseDataUrl,
  readJsonBody,
  safeErrorMessage,
  sendError,
  sendJson,
} from './_shared';

export const config = { maxDuration: 30 };

/** Optional artwork thumbnail — kept intentionally small; this is a design-level review, not a print-quality check. */
const MAX_THUMB_BYTES = 500 * 1024; // ~500 KB

interface AnalyzeRequestBody {
  spec?: DesignSpec;
  artworkThumb?: string;
}

interface AiIssue {
  code?: string;
  severity?: string;
  message?: string;
  hint?: string;
}

interface AiAnalyzeResult {
  level?: string;
  issues?: AiIssue[];
  summary?: string;
}

const SYSTEM_INSTRUCTION = [
  'You are a narrow-fabric manufacturing reviewer at a woven/knitted elastic and webbing factory ' +
    '(jacquard, woven and knitted narrow elastics, non-elastic tapes).',
  'You are given a customer design specification as JSON, produced by a self-service design studio.',
  'Give advisory, design-level manufacturability feedback only: readability of artwork/text, color count, ' +
    'contrast, stripe/repeat geometry, width sanity, and general weave/knit feasibility concerns.',
  'You MUST NOT invent or state specific loom settings, machine gauges, yarn counts/deniers, picks-per-inch, ' +
    'construction details, lead times, or costs/pricing — those are determined later by the technical team, not by you.',
  'You MUST NOT claim, imply or suggest that this design is "approved for production" or manufacturing-final. ' +
    'Your output is always a non-binding advisory opinion; final manufacturability is decided by the ' +
    "factory's technical review team against a physical sample.",
  'Respond ONLY with strict JSON matching the provided schema. No markdown, no prose outside the JSON.',
].join(' ');

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    level: {
      type: Type.STRING,
      enum: ['suitable', 'review', 'modification'],
      description: 'Overall advisory feasibility read.',
    },
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING, description: 'Short kebab-case identifier, e.g. "low-contrast".' },
          severity: { type: Type.STRING, enum: ['info', 'warn', 'error'] },
          message: { type: Type.STRING, description: 'One or two plain-English sentences for the customer.' },
          hint: { type: Type.STRING, description: 'Optional short suggestion to resolve the issue.' },
        },
        required: ['code', 'severity', 'message'],
      },
    },
    summary: {
      type: Type.STRING,
      description: 'A short (1-3 sentence) plain-English advisory summary for the customer.',
    },
  },
  required: ['level', 'issues', 'summary'],
};

/** Strips large inline data (e.g. jacquard artwork data URLs) — only shape/metadata matters for this review. */
function specForPrompt(spec: DesignSpec): unknown {
  const clone = JSON.parse(JSON.stringify(spec)) as Record<string, unknown>;
  if (clone.family === 'J' && Array.isArray(clone.artwork)) {
    clone.artwork = (clone.artwork as Record<string, unknown>[]).map(({ dataUrl: _dataUrl, ...rest }) => rest);
  }
  return clone;
}

function isValidLevel(v: unknown): v is 'suitable' | 'review' | 'modification' {
  return v === 'suitable' || v === 'review' || v === 'modification';
}

function isValidSeverity(v: unknown): v is 'info' | 'warn' | 'error' {
  return v === 'info' || v === 'warn' || v === 'error';
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendError(res, 405, 'method_not_allowed', 'Use POST.');
    return;
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    sendError(res, 503, 'not_configured', 'GEMINI_API_KEY is not set on the server.');
    return;
  }

  const body = readJsonBody<AnalyzeRequestBody>(req.body);
  const spec = body?.spec;
  if (!spec || typeof spec !== 'object' || !('family' in spec)) {
    sendError(res, 400, 'bad_request', 'spec (DesignSpec) is required.');
    return;
  }

  let artworkPart: { mimeType: string; data: string } | null = null;
  if (body?.artworkThumb) {
    const parsed = parseDataUrl(body.artworkThumb);
    if (!parsed) {
      sendError(res, 400, 'bad_request', 'artworkThumb must be a base64 data URL.');
      return;
    }
    if (base64ByteLength(parsed.data) > MAX_THUMB_BYTES) {
      sendError(res, 413, 'payload_too_large', 'artworkThumb exceeds the 500 KB limit.');
      return;
    }
    artworkPart = parsed;
  }

  const promptText = [
    'Review this narrow fabric design for manufacturability and give advisory, design-level feedback only.',
    'Design JSON:',
    '```json',
    JSON.stringify(specForPrompt(spec), null, 2),
    '```',
  ].join('\n');

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: promptText },
  ];
  if (artworkPart) {
    parts.push({ inlineData: { mimeType: artworkPart.mimeType, data: artworkPart.data } });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) {
      sendError(res, 502, 'upstream_error', 'The AI did not return a result. Please try again.');
      return;
    }

    let parsed: AiAnalyzeResult;
    try {
      parsed = JSON.parse(text) as AiAnalyzeResult;
    } catch {
      sendError(res, 502, 'upstream_error', 'The AI response could not be parsed. Please try again.');
      return;
    }

    const level = isValidLevel(parsed.level) ? parsed.level : 'review';
    const issues = Array.isArray(parsed.issues)
      ? parsed.issues
          .filter((i): i is AiIssue & { code: string; severity: string; message: string } =>
            Boolean(i && i.code && i.message && isValidSeverity(i.severity))
          )
          .map((i) => ({
            code: i.code,
            severity: i.severity as 'info' | 'warn' | 'error',
            message: i.message,
            ...(i.hint ? { hint: i.hint } : {}),
          }))
      : [];
    const summary =
      typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim()
        : 'AI advisory review complete.';

    sendJson(res, 200, { level, issues, summary });
  } catch (err) {
    console.error('[api/ai/analyze] Gemini request failed:', err);
    sendError(res, 502, 'upstream_error', safeErrorMessage(err));
  }
}
