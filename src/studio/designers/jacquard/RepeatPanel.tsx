import { Field, NumberField, Panel, Slider } from '../../../components/ui/index';
import type { JacquardSpec } from '../../../lib/types';
import { GLOSSARY } from '../../glossary';

export function RepeatPanel({
  spec,
  onChange,
}: {
  spec: JacquardSpec;
  onChange: (next: JacquardSpec) => void;
}) {
  const setRepeat = (patch: Partial<JacquardSpec['repeat']>) =>
    onChange({ ...spec, repeat: { ...spec.repeat, ...patch } });

  return (
    <Panel title="Repeat">
      <div className="flex flex-col gap-4">
        <Field label="Repeat length" tooltip={GLOSSARY.repeatLength}>
          <NumberField
            value={Number(spec.repeat.lengthMm.toFixed(1))}
            suffix="mm"
            min={5}
            step={1}
            onValue={(v) => setRepeat({ lengthMm: Math.max(5, v) })}
          />
          <Slider
            min={5}
            max={500}
            step={1}
            value={spec.repeat.lengthMm}
            valueLabel={`${spec.repeat.lengthMm.toFixed(0)} mm`}
            onChange={(e) => setRepeat({ lengthMm: Number(e.target.value) })}
          />
        </Field>

        <Field label="Spacing" tooltip={GLOSSARY.spacing}>
          <NumberField
            value={Number(spec.repeat.spacingMm.toFixed(1))}
            suffix="mm"
            min={0}
            step={1}
            onValue={(v) => setRepeat({ spacingMm: Math.max(0, v) })}
          />
          <Slider
            min={0}
            max={200}
            step={1}
            value={spec.repeat.spacingMm}
            valueLabel={`${spec.repeat.spacingMm.toFixed(0)} mm`}
            onChange={(e) => setRepeat({ spacingMm: Number(e.target.value) })}
          />
        </Field>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={spec.repeat.mirror}
              onChange={(e) => setRepeat({ mirror: e.target.checked })}
              className="accent-brand-600"
            />
            Mirror repeat
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={spec.repeat.reverse}
              onChange={(e) => setRepeat({ reverse: e.target.checked })}
              className="accent-brand-600"
            />
            Reverse repeat
          </label>
        </div>
      </div>
    </Panel>
  );
}
