import { Field } from '../../components/ui/index';
import { THICKNESS_CLASSES } from '../../lib/constants';
import type { DesignSpec, ThicknessClass } from '../../lib/types';
import { GLOSSARY } from '../glossary';
import { chipClass } from './chipStyles';

/** Customer-friendly display labels — stored ThicknessClass value is unchanged. */
const DISPLAY_LABEL: Record<ThicknessClass, string> = {
  light: 'Light',
  standard: 'Medium',
  heavy: 'Heavy',
};

export function ThicknessField<S extends DesignSpec>({
  spec,
  onChange,
}: {
  spec: S;
  onChange: (next: S) => void;
}) {
  return (
    <Field label="Thickness" tooltip={GLOSSARY.thicknessClass}>
      <div className="flex flex-wrap gap-2">
        {THICKNESS_CLASSES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange({ ...spec, thicknessClass: t.value })}
            className={chipClass(spec.thicknessClass === t.value)}
          >
            {DISPLAY_LABEL[t.value]}
          </button>
        ))}
      </div>
    </Field>
  );
}
