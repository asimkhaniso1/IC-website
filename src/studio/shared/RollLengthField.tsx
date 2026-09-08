import { useState } from 'react';
import { Field, NumberField, Slider } from '../../components/ui/index';
import { useCapabilities } from '../../lib/capabilities';
import { clamp } from '../../lib/units';
import type { DesignSpec } from '../../lib/types';
import { GLOSSARY } from '../glossary';
import { chipClass } from './chipStyles';

/** Slider stopper bounds — there's no capability-defined roll length range, so these are sane fixed defaults. */
const MIN_ROLL_M = 1;
const MAX_ROLL_M = 500;

/** Customer-facing roll length picker: standard preset chips + Custom number input. */
export function RollLengthField<S extends DesignSpec>({
  spec,
  onChange,
}: {
  spec: S;
  onChange: (next: S) => void;
}) {
  const rollLengths = useCapabilities()[spec.family]?.standardRollLengthsM ?? [];
  const isPreset = rollLengths.includes(spec.rollLengthM);
  const [customOpen, setCustomOpen] = useState(!isPreset);
  const showCustomInput = customOpen || !isPreset;

  return (
    <Field label="Roll length" tooltip={GLOSSARY.rollLength}>
      <div className="flex flex-wrap gap-1.5">
        {rollLengths.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setCustomOpen(false);
              onChange({ ...spec, rollLengthM: m });
            }}
            className={chipClass(!showCustomInput && spec.rollLengthM === m)}
          >
            {m} m
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

      <Slider
        min={MIN_ROLL_M}
        max={MAX_ROLL_M}
        step={1}
        value={clamp(spec.rollLengthM, MIN_ROLL_M, MAX_ROLL_M)}
        onChange={(e) => {
          setCustomOpen(false);
          onChange({ ...spec, rollLengthM: Number(e.target.value) });
        }}
      />

      {showCustomInput && (
        <div className="mt-2">
          <NumberField
            value={spec.rollLengthM}
            suffix="m"
            min={1}
            step={1}
            onValue={(v) => onChange({ ...spec, rollLengthM: Math.max(1, v) })}
          />
        </div>
      )}
    </Field>
  );
}
