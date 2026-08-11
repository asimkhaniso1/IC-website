import { useState } from 'react';
import { Field, NumberField } from '../../components/ui/index';
import { STANDARD_ROLL_LENGTHS_M } from '../../lib/constants';
import type { DesignSpec } from '../../lib/types';
import { GLOSSARY } from '../glossary';
import { chipClass } from './chipStyles';

/** Customer-facing roll length picker: standard preset chips + Custom number input. */
export function RollLengthField<S extends DesignSpec>({
  spec,
  onChange,
}: {
  spec: S;
  onChange: (next: S) => void;
}) {
  const isPreset = STANDARD_ROLL_LENGTHS_M.includes(spec.rollLengthM);
  const [customOpen, setCustomOpen] = useState(!isPreset);
  const showCustomInput = customOpen || !isPreset;

  return (
    <Field label="Roll length" tooltip={GLOSSARY.rollLength}>
      <div className="flex flex-wrap gap-1.5">
        {STANDARD_ROLL_LENGTHS_M.map((m) => (
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
