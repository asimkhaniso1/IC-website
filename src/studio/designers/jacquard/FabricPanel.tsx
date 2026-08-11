import {
  Button,
  Field,
  NumberField,
  Panel,
  Select,
} from '../../../components/ui/index';
import {
  APPLICATIONS,
  CAPABILITIES,
  EDGE_STYLES,
  ELASTICITY_CLASSES,
  THICKNESS_CLASSES,
} from '../../../lib/constants';
import { clamp, displayValue, parseToMm } from '../../../lib/units';
import type { Application, EdgeStyle, ElasticityClass, JacquardSpec, ThicknessClass, Unit } from '../../../lib/types';
import { GLOSSARY } from '../../glossary';
import { ColorField } from './ColorField';

const CAP = CAPABILITIES.J;

export function FabricPanel({
  spec,
  onChange,
}: {
  spec: JacquardSpec;
  onChange: (next: JacquardSpec) => void;
}) {
  const setUnit = (unit: Unit) => onChange({ ...spec, unit });

  return (
    <Panel title="Fabric">
      <div className="flex flex-col gap-4">
        <Field label="Width" tooltip={GLOSSARY.width}>
          <div className="flex items-center gap-2">
            <NumberField
              value={displayValue(spec.widthMm, spec.unit)}
              suffix={spec.unit}
              step={spec.unit === 'in' ? 0.05 : 1}
              onValue={(v) =>
                onChange({
                  ...spec,
                  widthMm: clamp(parseToMm(v, spec.unit), CAP.minWidthMm, CAP.maxWidthMm),
                })
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
          <p className="text-[11px] text-slate-400">
            Buildable range {CAP.minWidthMm}–{CAP.maxWidthMm} mm.
          </p>
        </Field>

        <Field label="Roll length" tooltip={GLOSSARY.rollLength}>
          <NumberField
            value={spec.rollLengthM}
            suffix="m"
            min={1}
            step={1}
            onValue={(v) => onChange({ ...spec, rollLengthM: Math.max(1, v) })}
          />
        </Field>

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

        {spec.elastic && (
          <Field label="Elasticity class" tooltip={GLOSSARY.elasticityClass}>
            <Select
              value={spec.elasticityClass ?? 'medium'}
              onChange={(e) =>
                onChange({ ...spec, elasticityClass: e.target.value as ElasticityClass })
              }
            >
              {ELASTICITY_CLASSES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Thickness" tooltip={GLOSSARY.thicknessClass}>
          <Select
            value={spec.thicknessClass}
            onChange={(e) => onChange({ ...spec, thicknessClass: e.target.value as ThicknessClass })}
          >
            {THICKNESS_CLASSES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>

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
      </div>
    </Panel>
  );
}
