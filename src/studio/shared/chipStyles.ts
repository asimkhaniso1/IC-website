/**
 * Shared "chip" button styling used by every customer-config field
 * (WidthField, RollLengthField, StretchField, FirmnessField, ThicknessField…)
 * so selection controls look identical across all three designers.
 */
export const CHIP_BASE =
  'px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-colors whitespace-nowrap';

export const CHIP_SELECTED = 'bg-brand-600 text-white border-brand-600 shadow-sm';

export const CHIP_UNSELECTED =
  'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300';

/** Returns the combined class string for a chip in its selected/unselected state. */
export function chipClass(selected: boolean, extra = ''): string {
  return `${CHIP_BASE} ${selected ? CHIP_SELECTED : CHIP_UNSELECTED} ${extra}`.trim();
}
