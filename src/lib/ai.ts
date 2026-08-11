/**
 * Typed client for the AI-assisted studio features (api/ai/*). All Gemini
 * calls happen server-side — this module only talks to our own /api
 * routes over fetch; it never sees or needs an API key.
 */
import { FAMILY_BY_CODE } from './constants';
import { formatDim } from './units';
import type { DesignSpec, Feasibility, JacquardSpec, KnittedSpec, WeavabilityIssue, WovenSpec } from './types';

export type AiUnavailableReason = 'not_configured' | 'network' | 'error';

export class AiUnavailableError extends Error {
  reason: AiUnavailableReason;
  constructor(reason: AiUnavailableReason, message?: string) {
    super(message ?? `AI feature unavailable (${reason})`);
    this.name = 'AiUnavailableError';
    this.reason = reason;
  }
}

interface AiErrorBody {
  error?: string;
  message?: string;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as AiErrorBody;
    return data.message ?? fallback;
  } catch {
    return fallback;
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AiUnavailableError('network', 'Could not reach the AI service — check your connection.');
  }

  if (response.status === 404) {
    // No serverless functions available in this environment (e.g. local `vite dev`,
    // which does not serve /api routes).
    throw new AiUnavailableError('not_configured', "AI features aren't available in this environment.");
  }

  if (response.status === 503) {
    const message = await readErrorMessage(response, 'AI features are not configured on the server yet.');
    throw new AiUnavailableError('not_configured', message);
  }

  if (!response.ok) {
    const message = await readErrorMessage(response, `AI request failed (${response.status}).`);
    throw new AiUnavailableError('error', message);
  }

  return (await response.json()) as T;
}

function familyStyleLabel(spec: DesignSpec): string | undefined {
  if (spec.family === 'W') return (spec as WovenSpec).style;
  if (spec.family === 'K') return (spec as KnittedSpec).style;
  return undefined;
}

function colorList(spec: DesignSpec): string[] {
  const colors: (string | undefined)[] = [
    spec.baseColor,
    spec.secondaryColor,
    spec.accentColor,
    spec.edgeColor,
    ...(spec.additionalColors ?? []),
  ];
  if (spec.family === 'J') colors.push((spec as JacquardSpec).fg);
  return colors.filter((c): c is string => Boolean(c));
}

function artworkTextSummary(spec: DesignSpec): string | undefined {
  if (spec.family !== 'J') return undefined;
  const texts = (spec as JacquardSpec).artwork
    .filter((a) => a.kind === 'text' && a.text)
    .map((a) => a.text as string);
  return texts.length ? `text "${texts.join('", "')}"` : undefined;
}

/** Concise human-readable summary of a spec — used as extra context for the AI render prompt. */
export function describeSpecForAi(spec: DesignSpec): string {
  const familyLabel = FAMILY_BY_CODE[spec.family]?.label ?? spec.family;
  const style = familyStyleLabel(spec);
  const colors = colorList(spec);
  const artwork = artworkTextSummary(spec);

  return [
    familyLabel,
    style ? `${style} style` : null,
    `${formatDim(spec.widthMm, 'mm')} wide`,
    spec.application ? `for ${spec.application}` : null,
    colors.length ? `colors ${colors.join(', ')}` : null,
    artwork ?? null,
  ]
    .filter(Boolean)
    .join(', ');
}

/** Generates a photorealistic product photo from the flat studio preview via Gemini. */
export async function renderFabricPhoto(previewPng: string, spec: DesignSpec): Promise<{ image: string }> {
  const familyLabel = FAMILY_BY_CODE[spec.family]?.label ?? spec.family;
  return postJson<{ image: string }>('/api/ai/render', {
    previewPng,
    summary: {
      family: familyLabel,
      widthMm: spec.widthMm,
      baseColor: spec.baseColor,
      description: describeSpecForAi(spec),
    },
  });
}

/** Runs the AI manufacturability advisory review (design-level feedback only — not a production approval). */
export async function analyzeDesignAi(
  spec: DesignSpec
): Promise<{ level: Feasibility; issues: WeavabilityIssue[]; summary: string }> {
  return postJson<{ level: Feasibility; issues: WeavabilityIssue[]; summary: string }>('/api/ai/analyze', {
    spec,
  });
}
