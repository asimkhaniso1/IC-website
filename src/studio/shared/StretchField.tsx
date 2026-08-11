import { Field, NumberField } from '../../components/ui/index';
import { ELASTICITY_CLASSES } from '../../lib/constants';
import { clamp } from '../../lib/units';
import type { DesignSpec, ElasticityClass } from '../../lib/types';
import { GLOSSARY } from '../glossary';
import { chipClass } from './chipStyles';

const CHIP_LABEL: Record<ElasticityClass, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  custom: 'Custom',
};

/**
 * Customer-facing stretch selector. Renders nothing for non-elastic specs.
 * Low / Medium / High / Custom chips (ELASTICITY_CLASSES); Custom reveals a
 * target elongation % input.
 */
export function StretchField<S extends DesignSpec>({
  spec,
  onChange,
}: {
  spec: S;
  onChange: (next: S) => void;
}) {
  if (!spec.elastic) return null;

  const active = spec.elasticityClass ?? 'medium';

  return (
    <Field label="Stretch" tooltip={GLOSSARY.elasticityClass}>
      <div className="flex flex-wrap gap-2">
        {ELASTICITY_CLASSES.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.label}
            onClick={() => onChange({ ...spec, elasticityClass: c.value })}
            className={chipClass(active === c.value)}
          >
            {CHIP_LABEL[c.value]}
          </button>
        ))}
      </div>

      {active === 'custom' && (
        <div className="mt-2">
          <Field label="Target elongation %">
            <NumberField
              value={spec.customElongationPct ?? 100}
              suffix="%"
              min={5}
              max={300}
              step={5}
              onValue={(v) => onChange({ ...spec, customElongationPct: clamp(v, 5, 300) })}
            />
          </Field>
        </div>
      )}

      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
        The chosen class is a requirement, not a guarantee — final elongation is confirmed by our
        technical team once your design is reviewed.
      </p>
    </Field>
  );
}
