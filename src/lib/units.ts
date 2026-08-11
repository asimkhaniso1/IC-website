import type { Unit } from './types';

export const MM_PER_INCH = 25.4;

export const mmToIn = (mm: number) => mm / MM_PER_INCH;
export const inToMm = (inches: number) => inches * MM_PER_INCH;

/** Format a mm value in the user's display unit. */
export function formatDim(mm: number, unit: Unit, digits?: number): string {
  if (unit === 'in') {
    const v = mmToIn(mm);
    return `${v.toFixed(digits ?? 2)}"`;
  }
  const d = digits ?? (Number.isInteger(mm) ? 0 : 1);
  return `${mm.toFixed(d)} mm`;
}

/** Parse a user-entered value (in display unit) back to mm. */
export function parseToMm(value: number, unit: Unit): number {
  return unit === 'in' ? inToMm(value) : value;
}

/** Value of a mm quantity expressed in the display unit (for input fields). */
export function displayValue(mm: number, unit: Unit): number {
  return unit === 'in' ? Number(mmToIn(mm).toFixed(3)) : mm;
}

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
