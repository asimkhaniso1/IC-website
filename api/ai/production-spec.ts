/**
 * POST /api/ai/production-spec
 *
 * AI-assisted DRAFT of the internal production specification — gives the
 * technical team a starting point to edit, not a finished or approved spec.
 * Every field returned here lands in editable form fields in
 * ProductionSpecPanel; nothing is saved or approved automatically, and this
 * is never shown to the customer (see src/lib/types.ts ProductionSpec).
 *
 * The model is explicitly instructed to leave a field out rather than invent
 * a specific-looking number (yarn denier, picks/cm, a machine reference, a
 * cost) it has no basis for — grounded only in the design spec, the
 * factory's own capability library, and ordinary construction convention.
 *
 * Server-side only — process.env.GEMINI_API_KEY never reaches the client.
 *
 * Request:  { spec: DesignSpec, capabilities?: FamilyCapabilities, customerTechnical?: TechnicalDetails }
 * Response: { details: Partial<TechnicalDetails> }  |  { error: AiErrorCode, message?: string }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import {
  getGeminiApiKey,
  readJsonBody,
  safeErrorMessage,
  sendError,
  sendJson,
} from './_shared.js';

/** Minimal structural types — api/ stays standalone from src/ (see _shared.ts). */
type DesignSpec = { family: string } & Record<string, unknown>;
type FamilyCapabilities = Record<string, unknown>;
type TechnicalDetails = Record<string, string | undefined>;

export const config = { maxDuration: 30 };

interface RequestBody {
  spec?: DesignSpec;
  capabilities?: FamilyCapabilities;
  customerTechnical?: TechnicalDetails;
}

/** Same key set as src/lib/types.ts TechnicalDetails — kept in sync manually (api/ has no src/ imports). */
const DETAIL_KEYS = [
  'constructionType',
  'yarnType',
  'yarnCount',
  'warpConfig',
  'weftConfig',
  'rubberType',
  'rubberConfig',
  'elasticEnds',
  'picksDensity',
  'endsPerCm',
  'picksPerCm',
  'finishedWidthMm',
  'elongationPct',
  'recoveryPct',
  'weightPerMeter',
  'gsm',
  'thicknessMm',
  'tolerance',
  'machineRef',
  'finishing',
] as const;

const SYSTEM_INSTRUCTION = [
  'You are assisting a production engineer at a narrow-fabric mill (jacquard, woven and knitted elastics, ' +
    'non-elastic webbing) in drafting a STARTING POINT internal production specification from a customer\'s ' +
    'self-service design request.',
  'This draft is never shown to the customer, is never saved automatically, and is never treated as approved — ' +
    'a human engineer reviews and edits every field in a form before saving it, and separately decides whether ' +
    'to approve it.',
  'You are given the customer design specification as JSON, the factory\'s manufacturability capability library ' +
    'for this product family (allowed construction types and width/elongation ranges), and optionally technical ' +
    'details the customer already entered.',
  'Propose values only where you can ground them in the given data (the design\'s width, application, elasticity ' +
    'class or target elongation, thickness class, repeat geometry) or well-established narrow-fabric construction ' +
    'convention. For constructionType, pick the single best match from the capability library\'s construction ' +
    'list if one fits reasonably, otherwise omit it.',
  'CRITICAL: for any field you cannot ground this way, OMIT it from the JSON entirely — do not invent a ' +
    'specific-looking number (an exact yarn denier/count, picks or ends per cm, a machine/loom reference) you ' +
    'have no basis for. Leaving a field blank is always better than a fabricated precise value.',
  'Never include pricing, lead times, or cost. Never state or imply this design is approved for production.',
  'Respond ONLY with strict JSON matching the provided schema. No markdown, no commentary.',
].join(' ');

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: Object.fromEntries(DETAIL_KEYS.map((k) => [k, { type: Type.STRING }])),
};

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

  const body = readJsonBody<RequestBody>(req.body);
  const spec = body?.spec;
  if (!spec || typeof spec !== 'object' || !('family' in spec)) {
    sendError(res, 400, 'bad_request', 'spec (DesignSpec) is required.');
    return;
  }

  // Artwork data URLs are irrelevant to a production spec draft and can be large — strip them.
  const specClone = JSON.parse(JSON.stringify(spec)) as Record<string, unknown>;
  if (specClone.family === 'J' && Array.isArray(specClone.artwork)) {
    specClone.artwork = (specClone.artwork as Record<string, unknown>[]).map(({ dataUrl: _dataUrl, ...rest }) => rest);
  }

  const promptParts = [
    'Draft starting-point production specification fields for this design.',
    'Design JSON:',
    '```json',
    JSON.stringify(specClone, null, 2),
    '```',
    // The design only carries the elasticityClass label (e.g. "medium") — this
    // is the company's own definition of what that label means numerically,
    // so a target elongation % can be grounded in it rather than omitted.
    'If the design is elastic, its elasticityClass maps to this company-defined target elongation range: ' +
      'low = 10–50%, medium = 50–120%, high = 120–200%. If elasticityClass is "custom", use the design\'s own ' +
      'customElongationPct value instead. Use this to inform elongationPct — state it as the class\'s range ' +
      '(e.g. "50–120%") rather than inventing a single false-precise number.',
  ];
  if (body?.capabilities) {
    promptParts.push('Manufacturability capability library for this product family:', '```json', JSON.stringify(body.capabilities, null, 2), '```');
  }
  if (body?.customerTechnical && Object.keys(body.customerTechnical).length > 0) {
    promptParts.push(
      'Technical details the customer already entered (reference only, not authoritative):',
      '```json',
      JSON.stringify(body.customerTechnical, null, 2),
      '```'
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [{ role: 'user', parts: [{ text: promptParts.join('\n') }] }],
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

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      sendError(res, 502, 'upstream_error', 'The AI response could not be parsed. Please try again.');
      return;
    }

    const details: TechnicalDetails = {};
    for (const key of DETAIL_KEYS) {
      const v = parsed[key];
      if (typeof v === 'string' && v.trim()) details[key] = v.trim();
    }

    sendJson(res, 200, { details });
  } catch (err) {
    console.error('[api/ai/production-spec] Gemini request failed:', err);
    sendError(res, 502, 'upstream_error', safeErrorMessage(err));
  }
}
