import type { ReactNode } from 'react';
import type { DesignerControlsProps, EdgeStyle, RibAppearance, WovenSpec, WovenStyle } from '../../../lib/types';
import { Button, Field, Panel, Select } from '../../../components/ui';
import { CAPABILITIES, EDGE_STYLES, RIB_APPEARANCES, WOVEN_STYLES } from '../../../lib/constants';
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
import { StripeEditor } from './StripeEditor';

/**
 * Older saved designs may not have `style` set. Resolve it once for display
 * — never write the fallback back into the spec (only an explicit style
 * change from the user persists).
 */
function resolveStyle(spec: WovenSpec): WovenStyle {
  return spec.style ?? (spec.stripes.length > 0 ? 'striped' : 'standard');
}

function StandardSwatch({ base }: { base: string }) {
  return <div className="h-full w-full" style={{ background: base }} />;
}

function StripedSwatch({ base, accent }: { base: string; accent: string }) {
  return (
    <div className="flex h-full w-full">
      <div className="h-full flex-[3]" style={{ background: base }} />
      <div className="h-full flex-1" style={{ background: accent }} />
      <div className="h-full flex-[4]" style={{ background: base }} />
      <div className="h-full w-[10%]" style={{ background: accent }} />
      <div className="h-full flex-[2]" style={{ background: base }} />
    </div>
  );
}

function RibbedSwatch({ base }: { base: string }) {
  return (
    <div className="flex h-full w-full flex-col">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex-1" style={{ background: base, opacity: i % 2 === 0 ? 1 : 0.6 }} />
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
      <div>
        <div className="text-xs font-bold text-slate-700">{label}</div>
        <div className="text-[11px] leading-snug text-slate-400">{description}</div>
      </div>
    </button>
  );
}

export function WovenControls({ spec, onChange, disabled }: DesignerControlsProps<WovenSpec>) {
  const caps = CAPABILITIES.W;
  const style = resolveStyle(spec);

  const setStyle = (next: WovenStyle) => {
    if (next === style) return;
    // Stripe data is intentionally kept even when switching away from
    // 'striped' — it just stops rendering until the user switches back.
    onChange({
      ...spec,
      style: next,
      ribAppearance: next === 'ribbed' ? spec.ribAppearance ?? 'medium' : spec.ribAppearance,
    });
  };

  const toggleElastic = (elastic: boolean) => {
    if (elastic) {
      onChange({
        ...spec,
        elastic: true,
        elasticityClass: spec.elasticityClass ?? 'medium',
        rubber: spec.rubber === 'none' ? 'single' : spec.rubber,
      });
    } else {
      onChange({ ...spec, elastic: false, elasticityClass: undefined, rubber: 'none' });
    }
  };

  const accentSwatchColor = spec.stripes[0]?.color ?? spec.secondaryColor ?? '#ffffff';

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Style">
        <div className="grid grid-cols-3 gap-2">
          {WOVEN_STYLES.map((s) => (
            <StyleCard
              key={s.value}
              label={s.label}
              description={s.description}
              selected={style === s.value}
              onClick={() => setStyle(s.value)}
              disabled={disabled}
            >
              {s.value === 'standard' && <StandardSwatch base={spec.baseColor} />}
              {s.value === 'striped' && <StripedSwatch base={spec.baseColor} accent={accentSwatchColor} />}
              {s.value === 'ribbed' && <RibbedSwatch base={spec.baseColor} />}
            </StyleCard>
          ))}
        </div>
      </Panel>

      <Panel title="Fabric">
        <div className="grid grid-cols-2 gap-3">
          <WidthField spec={spec} onChange={onChange} minMm={caps.minWidthMm} maxMm={caps.maxWidthMm} />
          <RollLengthField spec={spec} onChange={onChange} />
        </div>

        <Field
          label="Construction"
          className="mt-3"
          tooltip="Non-Elastic Tape is a flat woven webbing with no rubber content — it does not stretch."
        >
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={spec.elastic ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => toggleElastic(true)}
              disabled={disabled}
            >
              Elastic
            </Button>
            <Button
              variant={!spec.elastic ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => toggleElastic(false)}
              disabled={disabled}
            >
              Non-Elastic Tape
            </Button>
          </div>
        </Field>

        {spec.elastic && (
          <div className="mt-3">
            <StretchField spec={spec} onChange={onChange} />
          </div>
        )}

        <div className="mt-3">
          <FirmnessField spec={spec} onChange={onChange} />
        </div>

        <div className="mt-3">
          <ThicknessField spec={spec} onChange={onChange} />
        </div>

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

        {spec.elastic && (
          <Field
            label="Rubber"
            className="mt-3"
            tooltip="Single or double rubber strand construction controls stretch recovery and hand-feel."
          >
            <Select
              value={spec.rubber}
              onChange={(e) => onChange({ ...spec, rubber: e.target.value as WovenSpec['rubber'] })}
              disabled={disabled}
            >
              <option value="none">None</option>
              <option value="single">Single rubber</option>
              <option value="double">Double rubber</option>
            </Select>
          </Field>
        )}
      </Panel>

      <Panel title="Colors">
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

      {style === 'striped' && (
        <Panel title="Stripes">
          <StripeEditor spec={spec} onChange={onChange} disabled={disabled} />
        </Panel>
      )}

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
