import type { ReactNode } from 'react';
import type { DesignerControlsProps, EdgeStyle, KnittedSpec, KnittedStyle, RibAppearance } from '../../../lib/types';
import { Button, Field, Panel, Select } from '../../../components/ui';
import { CAPABILITIES, EDGE_STYLES, KNITTED_STYLES, RIB_APPEARANCES } from '../../../lib/constants';
import { ColorPickerField } from '../../color';
import {
  AdvancedTechnicalPanel,
  ApplicationField,
  FirmnessField,
  RollLengthField,
  StretchField,
  ThicknessField,
  WidthField,
} from '../../shared';

/** Older saved designs may not have `style` set — display-only fallback. */
function resolveStyle(spec: KnittedSpec): KnittedStyle {
  return spec.style ?? 'standard';
}

function StandardSwatch({ base }: { base: string }) {
  return <div className="h-full w-full" style={{ background: base }} />;
}

function RibbedSwatch({ base }: { base: string }) {
  return (
    <div className="flex h-full w-full">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-full flex-1" style={{ background: base, opacity: i % 2 === 0 ? 1 : 0.6 }} />
      ))}
    </div>
  );
}

function StyleCard({
  label,
  description,
  selected,
  onClick,
  disabled,
  children,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex flex-col items-start gap-2 rounded-lg border p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        selected ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="h-8 w-full overflow-hidden rounded-md border border-slate-200">{children}</div>
      <div className="text-xs font-bold text-slate-700" title={description}>
        {label}
      </div>
    </button>
  );
}

export function KnittedControls({ spec, onChange, disabled }: DesignerControlsProps<KnittedSpec>) {
  const caps = CAPABILITIES.K;
  const style = resolveStyle(spec);

  const setStyle = (next: KnittedStyle) => {
    if (next === style) return;
    onChange({
      ...spec,
      style: next,
      ribAppearance: next === 'ribbed' ? spec.ribAppearance ?? 'medium' : spec.ribAppearance,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Style">
        <div className="grid grid-cols-2 gap-2">
          {KNITTED_STYLES.map((s) => (
            <StyleCard
              key={s.value}
              label={s.label}
              description={s.description}
              selected={style === s.value}
              onClick={() => setStyle(s.value)}
              disabled={disabled}
            >
              {s.value === 'standard' ? <StandardSwatch base={spec.baseColor} /> : <RibbedSwatch base={spec.baseColor} />}
            </StyleCard>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          {KNITTED_STYLES.find((s) => s.value === style)?.description}
        </p>
      </Panel>

      <Panel title="Fabric">
        <div className="flex flex-col gap-3">
          <WidthField spec={spec} onChange={onChange} minMm={caps.minWidthMm} maxMm={caps.maxWidthMm} />
          <RollLengthField spec={spec} onChange={onChange} />
        </div>

        <div className="mt-3">
          <StretchField spec={spec} onChange={onChange} />
        </div>

        <div className="mt-3">
          <FirmnessField spec={spec} onChange={onChange} />
        </div>

        <div className="mt-3">
          <ThicknessField spec={spec} onChange={onChange} />
        </div>

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

        <div className="mt-3">
          <ApplicationField spec={spec} onChange={onChange} />
        </div>

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
        <div className="grid grid-cols-3 gap-3">
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
          <ColorPickerField
            label="Accent color"
            value={spec.accentColor}
            onChange={(hex) => onChange({ ...spec, accentColor: hex })}
            allowClear
          />
        </div>
      </Panel>

      {style === 'ribbed' && (
        <Panel title="Rib Appearance">
          <div className="grid grid-cols-3 gap-2">
            {RIB_APPEARANCES.map((r) => (
              <Button
                key={r.value}
                variant={(spec.ribAppearance ?? 'medium') === r.value ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onChange({ ...spec, ribAppearance: r.value as RibAppearance })}
                disabled={disabled}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </Panel>
      )}

      <AdvancedTechnicalPanel spec={spec} onChange={onChange} />
    </div>
  );
}
