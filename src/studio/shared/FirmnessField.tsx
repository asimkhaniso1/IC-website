import { Field } from '../../components/ui/index';
import { FIRMNESS_OPTIONS } from '../../lib/constants';
import type { DesignSpec } from '../../lib/types';
import { GLOSSARY } from '../glossary';
import { chipClass } from './chipStyles';

/** Customer-facing feel selector: Soft / Medium / Firm chips writing spec.firmness. */
export function FirmnessField<S extends DesignSpec>({
  spec,
  onChange,
}: {
  spec: S;
  onChange: (next: S) => void;
}) {
  return (
    <Field label="Firmness" tooltip={GLOSSARY.firmness}>
      <div className="flex flex-wrap gap-2">
        {FIRMNESS_OPTIONS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => onChange({ ...spec, firmness: f.value })}
            className={chipClass(spec.firmness === f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </Field>
  );
}
