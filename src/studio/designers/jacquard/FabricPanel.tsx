import { Button, Field, Panel, Select } from '../../../components/ui/index';
import { CAPABILITIES, EDGE_STYLES } from '../../../lib/constants';
import type { EdgeStyle, JacquardSpec } from '../../../lib/types';
import { GLOSSARY } from '../../glossary';
import {
  ApplicationField,
  FirmnessField,
  RollLengthField,
  StretchField,
  ThicknessField,
  WidthField,
} from '../../shared';
import { ColorField } from './ColorField';

const CAP = CAPABILITIES.J;

export function FabricPanel({
  spec,
  onChange,
}: {
  spec: JacquardSpec;
  onChange: (next: JacquardSpec) => void;
}) {
  return (
    <Panel title="Fabric">
      <div className="flex flex-col gap-4">
        <WidthField spec={spec} onChange={onChange} minMm={CAP.minWidthMm} maxMm={CAP.maxWidthMm} />
        <RollLengthField spec={spec} onChange={onChange} />

        <Field label="Elasticity">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={spec.elastic ? 'primary' : 'secondary'}
              onClick={() => onChange({ ...spec, elastic: true })}
              className="flex-1"
            >
              Elastic
            </Button>
            <Button
              size="sm"
              variant={!spec.elastic ? 'primary' : 'secondary'}
              onClick={() => onChange({ ...spec, elastic: false })}
              className="flex-1"
            >
              Non-Elastic
            </Button>
          </div>
        </Field>

        <StretchField spec={spec} onChange={onChange} />
        <FirmnessField spec={spec} onChange={onChange} />
        <ThicknessField spec={spec} onChange={onChange} />

        <Field label="Edge style" tooltip={GLOSSARY.edgeStyle}>
          <Select
            value={spec.edgeStyle}
            onChange={(e) => onChange({ ...spec, edgeStyle: e.target.value as EdgeStyle })}
          >
            {EDGE_STYLES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>

        <ColorField
          label="Edge color"
          value={spec.edgeColor ?? spec.baseColor}
          onChange={(hex) => onChange({ ...spec, edgeColor: hex })}
        />

        <ApplicationField spec={spec} onChange={onChange} />
      </div>
    </Panel>
  );
}
