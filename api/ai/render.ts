/**
 * POST /api/ai/render
 *
 * Turns the flat CAD-style studio preview into a photorealistic product
 * photograph using Gemini's image-generation model. Server-side only —
 * process.env.GEMINI_API_KEY never reaches the client bundle.
 *
 * Request:  { previewPng: string (data URL), summary: { family, widthMm, baseColor, description } }
 * Response: { image: string (data URL) }  |  { error: AiErrorCode, message?: string }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import {
  base64ByteLength,
  getGeminiApiKey,
  parseDataUrl,
  readJsonBody,
  safeErrorMessage,
  sendError,
  sendJson,
} from './_shared.js';

export const config = { maxDuration: 60 };

/** Cap on the decoded preview image — keeps the function fast and the request cheap. */
const MAX_PREVIEW_BYTES = 2 * 1024 * 1024; // ~2 MB

interface RenderSummary {
  family?: string;
  widthMm?: number;
  baseColor?: string;
  description?: string;
}

interface RenderRequestBody {
  previewPng?: string;
  summary?: RenderSummary;
}

function buildPrompt(summary: RenderSummary | undefined): string {
  const context = [
    summary?.family ? `Product type: ${summary.family}.` : null,
    summary?.widthMm ? `Fabric width: ${summary.widthMm} mm.` : null,
    summary?.baseColor ? `Base color reference: ${summary.baseColor}.` : null,
    summary?.description ? `Design summary: ${summary.description}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return [
    'You are given a flat, CAD-style preview of a narrow fabric elastic (a woven/knitted trim tape).',
    'Transform it into a single photorealistic product photograph of that exact elastic.',
    'Keep the exact colors, artwork/logo, proportions and repeat pattern shown in the source image — do not invent, remove or recolor any motif.',
    'Render premium studio product photography: soft directional studio lighting, the tape laid with a slight natural curve and gentle drape (not perfectly flat), on a neutral light-grey seamless background, realistic fabric texture and sheen.',
    'Do not add any text, watermark, logo or label beyond the woven/knitted design already present in the source image.',
    context ? `Design context: ${context}` : '',
  ]
    .filter(Boolean)
    .join(' ');
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

  const body = readJsonBody<RenderRequestBody>(req.body);
  const previewPng = body?.previewPng;
  if (!previewPng || typeof previewPng !== 'string') {
    sendError(res, 400, 'bad_request', 'previewPng (data URL string) is required.');
    return;
  }

  const parsed = parseDataUrl(previewPng);
  if (!parsed) {
    sendError(res, 400, 'bad_request', 'previewPng must be a base64 data URL.');
    return;
  }

  if (base64ByteLength(parsed.data) > MAX_PREVIEW_BYTES) {
    sendError(res, 413, 'payload_too_large', 'Preview image exceeds the 2 MB limit.');
    return;
  }

  const prompt = buildPrompt(body?.summary);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          role: 'user',
          parts: [{ inlineData: { mimeType: parsed.mimeType, data: parsed.data } }, { text: prompt }],
        },
      ],
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      sendError(res, 502, 'upstream_error', 'The AI did not return an image. Please try again.');
      return;
    }

    const mime = imagePart.inlineData.mimeType || 'image/png';
    sendJson(res, 200, { image: `data:${mime};base64,${imagePart.inlineData.data}` });
  } catch (err) {
    console.error('[api/ai/render] Gemini request failed:', err);
    sendError(res, 502, 'upstream_error', safeErrorMessage(err));
  }
}
