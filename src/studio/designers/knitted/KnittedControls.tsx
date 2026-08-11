import type {
  Application,
  DesignerControlsProps,
  EdgeStyle,
  ElasticityClass,
  KnittedSpec,
  ThicknessClass,
} from '../../../lib/types';
import { Button, Field, NumberField, Panel, Select } from '../../../components/ui';
import { APPLICATIONS, CAPABILITIES, EDGE_STYLES, ELASTICITY_CLASSES, THICKNESS_CLASSES } from '../../../lib/constants';
import { clamp, displayValue, formatDim, parseToMm } from '../../../lib/units';
import { ColorPickerField } from '../../color';

export function KnittedControls({ spec, onChange, disabled }: DesignerControlsProps<KnittedSpec>) {
  const caps = CAPABILITIES.K;

  const setWidth = (v: number) => {
    const mm = clamp(parseToMm(v, spec.unit), caps.minWidthMm, caps.maxWidthMm);
    onChange({ ...spec, widthMm: mm });
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Fabric">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Width"
            tooltip={`Manufacturing range: ${formatDim(caps.minWidthMm, 'mm')} – ${formatDim(caps.maxWidthMm, 'mm')}`}
          >
            <NumberField
              value={displayValue(spec.widthMm, spec.unit)}
              onValue={setWidth}
              suffix={spec.unit}
              min={displayValue(caps.minWidthMm, spec.unit)}
              max={displayValue(caps.maxWidthMm, spec.unit)}
              step={spec.unit === 'in' ? 0.05 : 0.5}
              disabled={disabled}
            />
          </Field>
          <Field label="Roll length">
            <NumberField
              value={spec.rollLengthM}
              onValue={(v) => onChange({ ...spec, rollLengthM: clamp(v, 1, 10000) })}
              suffix="m"
              min={1}
              disabled={disabled}
            />
          </Field>
        </div>

        <Field label="Elasticity class" className="mt-3">
          <Select
            value={spec.elasticityClass ?? 'medium'}
            onChange={(e) => onChange({ ...spec, elasticityClass: e.target.value as ElasticityClass })}
            disabled={disabled}
          >
            {ELASTICITY_CLASSES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Thickness" className="mt-3">
          <Select
            value={spec.thicknessClass}
            onChange={(e) => onChange({ ...spec, thicknessClass: e.target.value as ThicknessClass })}
            disabled={disabled}
          >
            {THICKNESS_CLASSES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Rubber / core yarn"
          className="mt-3"
          tooltip="A covered rubber core thread run through the knit for elastic recovery."
        >
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={spec.rubber ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onChange({ ...spec, rubber: true })}
              disabled={disabled}
            >
              With rubber
            </Button>
            <Button
              variant={!spec.rubber ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onChange({ ...spec, rubber: false })}
              disabled={disabled}
            >
              No rubber
            </Button>
          </div>
        </Field>

        <Field label="Application" className="mt-3">
          <Select
            value={spec.application}
            onChange={(e) => onChange({ ...spec, application: e.target.value as Application })}
            disabled={disabled}
          >
            {APPLICATIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Edge style">
            <Select
              value={spec.edgeStyle}
              onChange={(e) => onChange({ ...spec, edgeStyle: e.target.value as EdgeStyle })}
              disabled={disabled}
            >
              {EDGE_STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <ColorPickerField
            label="Edge color"
            value={spec.edgeColor}
            onChange={(hex) => onChange({ ...spec, edgeColor: hex })}
            allowClear
          />
        </div>
      </Panel>

      <Panel title="Color">
        <div className="grid grid-cols-2 gap-3">
          <ColorPickerField
            label="Base color"
            value={spec.baseColor}
            onChange={(hex) => onChange({ ...spec, baseColor: hex ?? spec.baseColor })}
          />
          <ColorPickerField
            label="Secondary color"
            value={spec.secondaryColor}
            onChange={(hex) => onChange({ ...spec, secondaryColor: hex })}
            allowClear
          />
        </div>
      </Panel>
    </div>
  );
}
