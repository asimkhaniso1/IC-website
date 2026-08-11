import { Field, Select } from '../../components/ui/index';
import { APPLICATIONS } from '../../lib/constants';
import type { Application, DesignSpec } from '../../lib/types';
import { GLOSSARY } from '../glossary';

export function ApplicationField<S extends DesignSpec>({
  spec,
  onChange,
}: {
  spec: S;
  onChange: (next: S) => void;
}) {
  return (
    <Field label="Application" tooltip={GLOSSARY.application}>
      <Select
        value={spec.application}
        onChange={(e) => onChange({ ...spec, application: e.target.value as Application })}
      >
        {APPLICATIONS.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </Select>
    </Field>
  );
}
