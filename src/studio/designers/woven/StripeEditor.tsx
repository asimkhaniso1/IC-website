/**
 * Visual stripe editor for the woven designer: a live cross-section bar plus
 * a list of stripe rows (color, width, offset-from-center, delete) and a few
 * one-click presets.
 */
import { Plus, Trash2 } from 'lucide-react';
import type { WovenSpec, WovenStripe } from '../../../lib/types';
import { Button, NumberField } from '../../../components/ui';
import { clamp } from '../../../lib/units';
import { ColorPickerField } from '../../color';

const MAX_STRIPES = 8;

function newStripeId(): string {
  return `stripe-${Math.random().toString(36).slice(2, 9)}`;
}

function StripePreviewBar({ spec }: { spec: WovenSpec }) {
  const w = Math.max(spec.widthMm, 1);
  const edgeW = Math.max(w * 0.04, 0.3);
  return (
    <svg
      viewBox={`0 0 ${w} 16`}
      className="w-full h-7 rounded-md overflow-hidden border border-slate-200"
      preserveAspectRatio="none"
    >
      <rect x={0} y={0} width={w} height={16} fill={spec.baseColor} />
      {spec.stripes.map((s) => {
        const x = clamp(w / 2 + s.offsetMm - s.widthMm / 2, 0, w);
        const width = clamp(s.widthMm, 0, Math.max(0, w - x));
        return <rect key={s.id} x={x} y={0} width={width} height={16} fill={s.color} />;
      })}
      <rect x={0} y={0} width={w} height={edgeW} fill={spec.edgeColor ?? spec.baseColor} opacity={0.55} />
      <rect x={0} y={16 - edgeW} width={w} height={edgeW} fill={spec.edgeColor ?? spec.baseColor} opacity={0.55} />
    </svg>
  );
}

function StripeRow({
  stripe,
  fabricWidthMm,
  onChange,
  onDelete,
  disabled,
}: {
  /** Optional: React list key when rendered from .map() — never read by the component. */
  key?: string;
  stripe: WovenStripe;
  fabricWidthMm: number;
  onChange: (next: WovenStripe) => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const half = fabricWidthMm / 2;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2">
      <ColorPickerField value={stripe.color} onChange={(hex) => onChange({ ...stripe, color: hex ?? stripe.color })} />
      <div className="flex-1 grid grid-cols-2 gap-2">
        <NumberField
          value={stripe.widthMm}
          onValue={(v) => onChange({ ...stripe, widthMm: clamp(v, 0.2, fabricWidthMm) })}
          suffix="mm"
          min={0.2}
          max={fabricWidthMm}
          step={0.1}
          disabled={disabled}
        />
        <NumberField
          value={stripe.offsetMm}
          onValue={(v) => onChange({ ...stripe, offsetMm: clamp(v, -half, half) })}
          suffix="mm"
          min={-half}
          max={half}
          step={0.1}
          disabled={disabled}
        />
      </div>
      <Button variant="ghost" size="sm" onClick={onDelete} disabled={disabled} aria-label="Delete stripe">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function StripeEditor({
  spec,
  onChange,
  disabled,
}: {
  spec: WovenSpec;
  onChange: (next: WovenSpec) => void;
  disabled?: boolean;
}) {
  const setStripes = (stripes: WovenStripe[]) => onChange({ ...spec, stripes });

  const addStripe = () => {
    if (spec.stripes.length >= MAX_STRIPES) return;
    setStripes([
      ...spec.stripes,
      { id: newStripeId(), color: '#ffffff', widthMm: Math.max(1, spec.widthMm * 0.08), offsetMm: 0 },
    ]);
  };

  const applyPreset = (preset: 'center' | 'twin' | 'edge') => {
    const w = spec.widthMm;
    if (preset === 'center') {
      setStripes([{ id: newStripeId(), color: '#ffffff', widthMm: Math.max(1, w * 0.14), offsetMm: 0 }]);
    } else if (preset === 'twin') {
      const off = w * 0.22;
      setStripes([
        { id: newStripeId(), color: '#dc2626', widthMm: Math.max(0.8, w * 0.08), offsetMm: -off },
        { id: newStripeId(), color: '#dc2626', widthMm: Math.max(0.8, w * 0.08), offsetMm: off },
      ]);
    } else {
      const off = w / 2 - Math.max(1, w * 0.08);
      setStripes([
        { id: newStripeId(), color: '#f8fafc', widthMm: Math.max(0.8, w * 0.06), offsetMm: -off },
        { id: newStripeId(), color: '#f8fafc', widthMm: Math.max(0.8, w * 0.06), offsetMm: off },
      ]);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <StripePreviewBar spec={spec} />

      <div className="flex flex-wrap gap-1.5">
        <Button variant="secondary" size="sm" onClick={() => applyPreset('center')} disabled={disabled}>
          Center stripe
        </Button>
        <Button variant="secondary" size="sm" onClick={() => applyPreset('twin')} disabled={disabled}>
          Twin racing stripes
        </Button>
        <Button variant="secondary" size="sm" onClick={() => applyPreset('edge')} disabled={disabled}>
          Edge accents
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {spec.stripes.map((s) => (
          <StripeRow
            key={s.id}
            stripe={s}
            fabricWidthMm={spec.widthMm}
            onChange={(next) => setStripes(spec.stripes.map((x) => (x.id === s.id ? next : x)))}
            onDelete={() => setStripes(spec.stripes.filter((x) => x.id !== s.id))}
            disabled={disabled}
          />
        ))}
        {spec.stripes.length === 0 && (
          <p className="text-xs text-slate-400 italic px-1">No stripes — plain base color.</p>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={addStripe}
        disabled={disabled || spec.stripes.length >= MAX_STRIPES}
        className="self-start"
      >
        <Plus className="w-4 h-4" /> Add stripe
      </Button>
    </div>
  );
}
