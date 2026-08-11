import type { ReactNode } from 'react';
import { Badge, ColorSwatch, Field, Panel, Tooltip } from '../../components/ui/index';
import { ELASTICITY_CLASSES, FAMILY_BY_CODE, TECHNICAL_REVIEW_DISCLAIMER } from '../../lib/constants';
import { formatDim } from '../../lib/units';
import type {
  DesignSpec,
  JacquardSpec,
  KnittedSpec,
  TechnicalDetails,
  ThicknessClass,
  Unit,
  WeavabilityResult,
  WovenSpec,
} from '../../lib/types';
import { GLOSSARY } from '../glossary';
import { FeasibilityBadge } from '../weavability/FeasibilityBadge';

const THICKNESS_DISPLAY: Record<ThicknessClass, string> = {
  light: 'Light',
  standard: 'Medium',
  heavy: 'Heavy',
};

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function stretchLabel(spec: DesignSpec): string {
  if (!spec.elastic) return 'Non-elastic';
  const cls = spec.elasticityClass ?? 'medium';
  if (cls === 'custom') return `Custom — ${spec.customElongationPct ?? '—'}%`;
  return ELASTICITY_CLASSES.find((c) => c.value === cls)?.label ?? capitalize(cls);
}

function styleLabel(spec: DesignSpec): string | null {
  if (spec.family !== 'W' && spec.family !== 'K') return null;
  if (!spec.elastic) return 'Non-elastic tape';
  const style = (spec as WovenSpec | KnittedSpec).style ?? 'standard';
  return capitalize(style);
}

function countTechnicalFilled(t?: TechnicalDetails): number {
  if (!t) return 0;
  return Object.values(t).filter((v) => typeof v === 'string' && v.trim() !== '').length;
}

function ColorRow({ label, hex }: { label: string; hex?: string }) {
  if (!hex) return null;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="flex items-center gap-2">
        <ColorSwatch color={hex} size="sm" />
        <span className="font-mono text-slate-700">{hex}</span>
      </span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono font-medium text-slate-800 text-right">{value}</span>
    </div>
  );
}

export function SpecSummaryPanel({
  spec,
  onSpecChange,
  weavability,
}: {
  spec: DesignSpec;
  onSpecChange: (next: DesignSpec) => void;
  weavability: WeavabilityResult;
}) {
  const familyMeta = FAMILY_BY_CODE[spec.family];
  const setUnit = (unit: Unit) => onSpecChange({ ...spec, unit });
  const style = styleLabel(spec);
  const technicalFilled = countTechnicalFilled(spec.technical);

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Specification">
        <div className="flex flex-col gap-2.5">
          <SummaryRow label="Product type" value={familyMeta?.label ?? spec.family} />
          <SummaryRow label="Application" value={spec.application} />

          <Field label="Width">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-slate-800">
                {formatDim(spec.widthMm, spec.unit)}
              </span>
              <div className="flex rounded-md border border-slate-200 overflow-hidden">
                {(['mm', 'in'] as Unit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase transition-colors ${
                      spec.unit === u ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </Field>

          <SummaryRow label="Roll length" value={`${spec.rollLengthM} m`} />
          {style && <SummaryRow label="Style" value={style} />}
          <SummaryRow label="Stretch" value={stretchLabel(spec)} />
          {spec.firmness && <SummaryRow label="Firmness" value={capitalize(spec.firmness)} />}
          <SummaryRow label="Thickness" value={THICKNESS_DISPLAY[spec.thicknessClass]} />
          <SummaryRow label="Edge style" value={spec.edgeStyle} />

          {spec.family === 'J' && (
            <>
              <SummaryRow
                label="Repeat length"
                value={formatDim((spec as JacquardSpec).repeat.lengthMm, spec.unit)}
              />
              <SummaryRow
                label="Spacing"
                value={formatDim((spec as JacquardSpec).repeat.spacingMm, spec.unit)}
              />
              <SummaryRow label="Artwork items" value={(spec as JacquardSpec).artwork.length} />
            </>
          )}

          {technicalFilled > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-400">
              <span>Advanced details provided</span>
              <span>{technicalFilled} fields</span>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Colors">
        <div className="flex flex-col gap-2">
          <ColorRow label="Base" hex={spec.baseColor} />
          {spec.family === 'J' && <ColorRow label="Motif" hex={(spec as JacquardSpec).fg} />}
          <ColorRow label="Secondary" hex={spec.secondaryColor} />
          <ColorRow label="Accent" hex={spec.accentColor} />
          <ColorRow label="Edge" hex={spec.edgeColor} />
          {spec.family === 'W' &&
            (spec as WovenSpec).stripes.map((s, i) => (
              <div key={s.id}>
                <ColorRow label={`Stripe ${i + 1}`} hex={s.color} />
              </div>
            ))}
          {(spec.additionalColors ?? []).map((c, i) => (
            <div key={i}>
              <ColorRow label={`Additional ${i + 1}`} hex={c} />
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title={
          <span className="flex items-center gap-1">
            Weavability <Tooltip text="A rule-based, non-binding read on manufacturability. Final review is always performed by our technical team." />
          </span>
        }
      >
        <div className="flex flex-col gap-3">
          <FeasibilityBadge level={weavability.level} />
          {weavability.issues.length > 0 && (
            <ul className="flex flex-col gap-2">
              {weavability.issues.map((issue, i) => (
                <li
                  key={`${issue.code}-${i}`}
                  className={`text-xs rounded-lg border px-2.5 py-2 leading-relaxed ${
                    issue.severity === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : issue.severity === 'warn'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <p className="font-medium">{issue.message}</p>
                  {issue.hint && <p className="mt-0.5 opacity-80">{issue.hint}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <Panel title="Production">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Production CAD / Loom Export</span>
          <Badge tone="slate">Future Integration</Badge>
        </div>
      </Panel>

      <p className="px-1 text-[11px] leading-relaxed text-slate-400" title={GLOSSARY.advancedTechnical}>
        {TECHNICAL_REVIEW_DISCLAIMER}
      </p>
    </div>
  );
}
