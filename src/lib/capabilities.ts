/**
 * Live manufacturing capabilities.
 *
 * The admin-editable `capability_rules` table (anon-readable) is the source
 * of truth for what the factory can produce; the hardcoded constants act as
 * defaults and offline fallback. Fetched once per session and cached — a
 * failed or slow fetch never blocks the studio, it just means defaults.
 */
import { useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from './supabase';
import {
  CAPABILITIES,
  CONSTRUCTION_LIBRARY,
  STANDARD_ROLL_LENGTHS_M,
  STANDARD_WIDTHS_MM,
} from './constants';
import type { Family } from './types';

export interface FamilyCapabilities {
  minWidthMm: number;
  maxWidthMm: number;
  maxColors: number;
  standardWidthsMm: number[];
  standardRollLengthsM: number[];
  elongation: { min: number; max: number };
  /** Minimum weavable text height (mm) — jacquard weavability rule. */
  minTextHeightMm: number;
  constructions: string[];
}

export type CapabilityMap = Record<Family, FamilyCapabilities>;

function defaultsFor(family: Family): FamilyCapabilities {
  const cap = CAPABILITIES[family];
  return {
    minWidthMm: cap.minWidthMm,
    maxWidthMm: cap.maxWidthMm,
    maxColors: cap.maxColors,
    standardWidthsMm: [...STANDARD_WIDTHS_MM],
    standardRollLengthsM: [...STANDARD_ROLL_LENGTHS_M],
    elongation: { min: 10, max: 200 },
    minTextHeightMm: 4,
    constructions: [...CONSTRUCTION_LIBRARY[family]],
  };
}

export function defaultCapabilities(): CapabilityMap {
  return { J: defaultsFor('J'), W: defaultsFor('W'), K: defaultsFor('K') };
}

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
};

const numArray = (v: unknown): number[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const list = v.map(num).filter((n): n is number => n !== undefined);
  return list.length ? list : undefined;
};

function applyRule(target: FamilyCapabilities, key: string, value: unknown): void {
  switch (key) {
    case 'min_width_mm': {
      const n = num(value);
      if (n !== undefined) target.minWidthMm = n;
      break;
    }
    case 'max_width_mm': {
      const n = num(value);
      if (n !== undefined) target.maxWidthMm = n;
      break;
    }
    case 'max_colors': {
      const n = num(value);
      if (n !== undefined) target.maxColors = n;
      break;
    }
    case 'min_text_height_mm': {
      const n = num(value);
      if (n !== undefined) target.minTextHeightMm = n;
      break;
    }
    case 'standard_widths_mm': {
      const list = numArray(value);
      if (list) target.standardWidthsMm = list;
      break;
    }
    case 'standard_roll_lengths_m': {
      const list = numArray(value);
      if (list) target.standardRollLengthsM = list;
      break;
    }
    case 'elongation_range': {
      if (value && typeof value === 'object') {
        const v = value as { min?: unknown; max?: unknown };
        const min = num(v.min);
        const max = num(v.max);
        if (min !== undefined) target.elongation.min = min;
        if (max !== undefined) target.elongation.max = max;
      }
      break;
    }
    case 'constructions': {
      if (Array.isArray(value)) {
        const list = value.filter((c): c is string => typeof c === 'string' && c.length > 0);
        if (list.length) target.constructions = list;
      }
      break;
    }
    default:
      // Unknown rule keys (e.g. moq) are simply not consumed by the studio yet.
      break;
  }
}

let cache: CapabilityMap | null = null;
let inflight: Promise<CapabilityMap> | null = null;

export async function loadCapabilities(): Promise<CapabilityMap> {
  if (cache) return cache;
  if (inflight) return inflight;

  const supabase = getSupabase();
  if (!isSupabaseConfigured() || !supabase) {
    cache = defaultCapabilities();
    return cache;
  }

  inflight = (async () => {
    const caps = defaultCapabilities();
    try {
      const { data, error } = await supabase.from('capability_rules').select('family, rule_key, rule_value');
      if (!error) {
        for (const row of data ?? []) {
          const fam = row.family as Family;
          if (caps[fam]) applyRule(caps[fam], row.rule_key as string, row.rule_value);
        }
      }
    } catch {
      // Network failure → defaults; the studio must never block on this.
    }
    cache = caps;
    inflight = null;
    return caps;
  })();
  return inflight;
}

/**
 * React hook: returns the capability map, starting with defaults and
 * re-rendering once (per session) when the live rules arrive.
 */
export function useCapabilities(): CapabilityMap {
  const [caps, setCaps] = useState<CapabilityMap>(() => cache ?? defaultCapabilities());
  useEffect(() => {
    if (cache) return;
    let active = true;
    void loadCapabilities().then((c) => {
      if (active) setCaps(c);
    });
    return () => {
      active = false;
    };
  }, []);
  return caps;
}
