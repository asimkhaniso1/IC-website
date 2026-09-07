/**
 * POST /api/ai/production-spec
 *
 * AI-assisted DRAFT of the internal production specification — gives the
 * technical team a full starting point to correct, not a mostly-empty form
 * and not a finished or approved spec. Every field returned here lands in
 * editable form fields in ProductionSpecPanel; nothing is saved or approved
 * automatically, and this is never shown to the customer (see
 * src/lib/types.ts ProductionSpec).
 *
 * Two kinds of values come back, and the model is instructed to keep them
 * distinguishable: (1) values actually grounded in this design's own data
 * (its width, elasticity class, application, capability library) — stated
 * plainly; (2) ordinary narrow-fabric construction convention for fields the
 * design doesn't specify — stated as a typical range and suffixed
 * " (typical)" so the technical team knows at a glance it's a default to
 * verify, not something derived from this specific order. The one thing it
 * must never guess is anything genuinely specific to this factory's own
 * equipment (a named machine/loom reference) or a cost/price.
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
    'to approve it. Your job is to give them a FULL draft to correct, not a mostly-empty form — leave a field ' +
    'blank only when even a typical default would be actively misleading.',
  'You are given the customer design specification as JSON, the factory\'s manufacturability capability library ' +
    'for this product family (allowed construction types and width/elongation ranges), ordinary narrow-fabric ' +
    'construction convention for this product family (below), and optionally technical details the customer ' +
    'already entered.',
  'Fill in every field you can, in two ways: (1) where the design\'s own data grounds a value directly (its ' +
    'width, application, elasticity class, thickness class, repeat geometry, or a construction type chosen from ' +
    'the capability library) state it plainly, with no suffix; (2) where the design does not specify something, ' +
    'propose the ordinary, well-established value or range for this kind of narrow-fabric product per the ' +
    'construction convention below, and end that value with " (typical)" — e.g. "150D (typical)" or ' +
    '"16-20 picks/cm (typical)" — so the technical team can tell at a glance which values need verifying against ' +
    'this specific order.',
  'Prefer a realistic range over a single falsely precise figure when you are proposing a typical default ' +
    '(e.g. "30-50 ends/cm (typical)", not "42 ends/cm").',
  'The ONLY things you must never propose, typical or otherwise, are: a specific machine/loom reference (that ' +
    'names this factory\'s own equipment and cannot be guessed — leave machineRef blank unless the design or ' +
    'customer data actually names one) and any pricing, cost or lead time.',
  'Never state or imply this design is approved for production.',
  'Respond ONLY with strict JSON matching the provided schema. No markdown, no commentary.',
  'Ordinary narrow-fabric construction convention, by product family:',
  '- Jacquard (J) narrow elastics: warp is typically polyester or nylon multifilament (75-150 denier) forming ' +
    'ground and pattern ends; the elastic weft/core is typically covered spandex/elastane, single or double ' +
    'covered; ends density commonly 30-60 ends/cm depending on width and color count; picks density commonly ' +
    '14-22 picks/cm; GSM commonly 150 g/m² (light) to 350 g/m² (heavy) depending on thicknessClass; width ' +
    'tolerance typically ±1mm; edges are woven-in (selvedge), not cut; finishing is typically heat-set/steam-set.',
  '- Woven (W) tapes/webbing, elastic or non-elastic: warp is typically polyester, nylon or cotton depending on ' +
    'application; weft is the same fiber, or covered spandex/rubber core when elastic; picks density commonly ' +
    '10-20 picks/cm; ends density commonly 20-40 ends/cm depending on width; GSM commonly 100-400 g/m² depending ' +
    'on thicknessClass; width tolerance typically ±1mm.',
  '- Knitted (K) narrow elastics: typically warp-knit or weft-knit construction using polyester or nylon with a ' +
    'covered spandex/elastane core; generally finer gauge than woven; GSM commonly 120-280 g/m² depending on ' +
    'thicknessClass; width tolerance typically ±1mm.',
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
