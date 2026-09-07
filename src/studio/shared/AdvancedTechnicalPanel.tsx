import type { ReactNode } from 'react';
import { Badge, Field, Panel, Select, TextArea, TextInput } from '../../components/ui/index';
import { useCapabilities } from '../../lib/capabilities';
import type { DesignSpec, TechnicalDetails } from '../../lib/types';
import { GLOSSARY } from '../glossary';

type TechKey = keyof TechnicalDetails;

function setTech<S extends DesignSpec>(
  spec: S,
  onChange: (next: S) => void,
  key: TechKey,
  value: string
) {
  onChange({ ...spec, technical: { ...spec.technical, [key]: value } });
}

function countFilled(t?: TechnicalDetails): number {
  if (!t) return 0;
  return Object.values(t).filter((v) => typeof v === 'string' && v.trim() !== '').length;
}

function TechField<S extends DesignSpec>({
  spec,
  onChange,
  label,
  k,
  placeholder,
  className = '',
}: {
  spec: S;
  onChange: (next: S) => void;
  label: string;
  k: TechKey;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Field label={label} className={className}>
      <TextInput
        value={spec.technical?.[k] ?? ''}
        onChange={(e) => setTech(spec, onChange, k, e.target.value)}
        placeholder={placeholder}
        className="text-sm"
      />
    </Field>
  );
}

function ConstructionTypeField<S extends DesignSpec>({
  spec,
  onChange,
}: {
  spec: S;
  onChange: (next: S) => void;
}) {
  const library = useCapabilities()[spec.family]?.constructions ?? [];
  const current = spec.technical?.constructionType ?? '';
  const inLibrary = library.includes(current);
  const selectValue = current === '' ? '' : inLibrary ? current : 'Other';

  return (
    <Field label="Construction Type">
      <Select
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          setTech(spec, onChange, 'constructionType', v === 'Other' ? '' : v);
        }}
      >
        <option value="">—</option>
        {library.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      {selectValue === 'Other' && (
        <TextInput
          value={current}
          onChange={(e) => setTech(spec, onChange, 'constructionType', e.target.value)}
          placeholder="Describe construction type"
          className="mt-1.5 text-sm"
        />
      )}
    </Field>
  );
}

/**
 * Collapsed-by-default "Advanced / Technical" section. Optional, free-text
 * production parameters for customers who already know their requirements —
 * never required, and never authoritative (technical team confirms the
 * final manufacturing specification separately).
 */
export function AdvancedTechnicalPanel<S extends DesignSpec>({
  spec,
  onChange,
}: {
  spec: S;
  onChange: (next: S) => void;
}) {
  const filled = countFilled(spec.technical);

  const grid: ReactNode = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <ConstructionTypeField spec={spec} onChange={onChange} />
      <TechField spec={spec} onChange={onChange} label="Yarn Type" k="yarnType" />
      <TechField spec={spec} onChange={onChange} label="Yarn Count" k="yarnCount" />
      <TechField spec={spec} onChange={onChange} label="Warp Configuration" k="warpConfig" />
      <TechField spec={spec} onChange={onChange} label="Weft Configuration" k="weftConfig" />
      <TechField spec={spec} onChange={onChange} label="Elastic / Rubber Type" k="rubberType" />
      <TechField spec={spec} onChange={onChange} label="Rubber / Core Configuration" k="rubberConfig" />
      <TechField spec={spec} onChange={onChange} label="Number of Elastic Ends" k="elasticEnds" />
      <TechField spec={spec} onChange={onChange} label="Picks / Density" k="picksDensity" />
      <TechField spec={spec} onChange={onChange} label="Finished Width" k="finishedWidthMm" />
      <TechField spec={spec} onChange={onChange} label="Elongation %" k="elongationPct" />
      <TechField spec={spec} onChange={onChange} label="Recovery %" k="recoveryPct" />
      <TechField spec={spec} onChange={onChange} label="Weight per Meter" k="weightPerMeter" />
      <TechField spec={spec} onChange={onChange} label="GSM" k="gsm" />
      <TechField spec={spec} onChange={onChange} label="Thickness" k="thicknessMm" />
      <TechField spec={spec} onChange={onChange} label="Tolerance" k="tolerance" />
      <TechField spec={spec} onChange={onChange} label="Machine / Loom Reference" k="machineRef" />
      <TechField
        spec={spec}
        onChange={onChange}
        label="Finishing Requirements"
        k="finishing"
        className="sm:col-span-2"
      />
    </div>
  );

  return (
    <Panel
      title="Advanced / Technical"
      action={filled > 0 ? <Badge tone="slate">{filled} filled</Badge> : undefined}
      collapsible
      defaultOpen={false}
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs leading-relaxed text-slate-500" title={GLOSSARY.advancedTechnical}>
          Optional — for customers who know their technical requirements. Our technical team
          determines the final manufacturing construction.
        </p>
        {grid}
        <Field label="Technical Notes">
          <TextArea
            value={spec.technical?.notes ?? ''}
            onChange={(e) => setTech(spec, onChange, 'notes', e.target.value)}
            rows={3}
            placeholder="Anything else our technical team should know…"
            className="text-sm"
          />
        </Field>
      </div>
    </Panel>
  );
}
