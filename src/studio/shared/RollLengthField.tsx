import { useState } from 'react';
import { Field, NumberField, Select, Slider } from '../../components/ui/index';
import { useCapabilities } from '../../lib/capabilities';
import { clamp } from '../../lib/units';
import type { DesignSpec } from '../../lib/types';
import { GLOSSARY } from '../glossary';

/** Slider stopper bounds — there's no capability-defined roll length range, so these are sane fixed defaults. */
const MIN_ROLL_M = 1;
const MAX_ROLL_M = 500;
const CUSTOM_VALUE = '__custom__';

/** Customer-facing roll length picker: a dropdown of standard presets + Custom, plus a slider for continuous fine adjustment. */
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
      <Select
        value={showCustomInput ? CUSTOM_VALUE : String(spec.rollLengthM)}
        onChange={(e) => {
          if (e.target.value === CUSTOM_VALUE) {
            setCustomOpen(true);
            return;
          }
          setCustomOpen(false);
          onChange({ ...spec, rollLengthM: Number(e.target.value) });
        }}
      >
        {rollLengths.map((m) => (
          <option key={m} value={m}>
            {m} m
          </option>
        ))}
        <option value={CUSTOM_VALUE}>Custom</option>
      </Select>

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
