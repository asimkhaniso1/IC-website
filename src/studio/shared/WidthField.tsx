import { useState } from 'react';
import { Field, NumberField } from '../../components/ui/index';
import { STANDARD_WIDTHS_MM } from '../../lib/constants';
import { clamp, displayValue, parseToMm } from '../../lib/units';
import type { DesignSpec, Unit } from '../../lib/types';
import { GLOSSARY } from '../glossary';
import { chipClass } from './chipStyles';

/**
 * Customer-facing width picker: standard preset chips (filtered to the
 * buildable range for this product type) plus a "Custom" chip that reveals
 * a precise mm/in input. Selecting a preset sets widthMm directly.
 */
export function WidthField<S extends DesignSpec>({
  spec,
  onChange,
  minMm,
  maxMm,
}: {
  spec: S;
  onChange: (next: S) => void;
  minMm: number;
  maxMm: number;
}) {
  const presets = STANDARD_WIDTHS_MM.filter((w) => w >= minMm && w <= maxMm);
  const isPreset = presets.includes(spec.widthMm);
  const [customOpen, setCustomOpen] = useState(!isPreset);
  const showCustomInput = customOpen || !isPreset;

  const setUnit = (unit: Unit) => onChange({ ...spec, unit });

  return (
    <Field label="Width" tooltip={GLOSSARY.width}>
      <div className="flex flex-wrap gap-2">
        {presets.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => {
              setCustomOpen(false);
              onChange({ ...spec, widthMm: w });
            }}
            className={chipClass(!showCustomInput && spec.widthMm === w)}
          >
            {w} mm
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className={chipClass(showCustomInput)}
        >
          Custom
        </button>
      </div>

      {showCustomInput && (
        <div className="mt-2 flex items-center gap-2">
          <NumberField
            value={displayValue(spec.widthMm, spec.unit)}
            suffix={spec.unit}
            step={spec.unit === 'in' ? 0.05 : 1}
            onValue={(v) =>
              onChange({ ...spec, widthMm: clamp(parseToMm(v, spec.unit), minMm, maxMm) })
            }
          />
          <div className="flex rounded-lg border border-slate-200 overflow-hidden shrink-0">
            {(['mm', 'in'] as Unit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`px-2.5 py-2 text-xs font-bold uppercase transition-colors ${
                  spec.unit === u ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="text-[11px] text-slate-400">
        Buildable range {minMm}–{maxMm} mm.
      </p>
    </Field>
  );
}
