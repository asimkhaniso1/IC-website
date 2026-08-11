import { Plus, Trash2 } from 'lucide-react';
import { Badge, Button } from '../../../components/ui/index';
import { CAPABILITIES } from '../../../lib/constants';
import type { JacquardSpec } from '../../../lib/types';
import { ColorField } from './ColorField';

const MAX_COLORS = CAPABILITIES.J.maxColors;

function countColors(spec: JacquardSpec): number {
  const set = new Set<string>([spec.baseColor.toLowerCase(), spec.fg.toLowerCase()]);
  if (spec.secondaryColor) set.add(spec.secondaryColor.toLowerCase());
  if (spec.edgeColor) set.add(spec.edgeColor.toLowerCase());
  for (const c of spec.additionalColors ?? []) set.add(c.toLowerCase());
  return set.size;
}

export function ColorsPanel({
  spec,
  onChange,
}: {
  spec: JacquardSpec;
  onChange: (next: JacquardSpec) => void;
}) {
  const used = countColors(spec);
  const atLimit = used >= MAX_COLORS;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Colors</h3>
        <Badge tone={atLimit ? 'amber' : 'slate'}>
          {used}/{MAX_COLORS} used
        </Badge>
      </header>
      <div className="p-4 flex flex-col gap-4">
        <ColorField label="Base color" value={spec.baseColor} onChange={(hex) => onChange({ ...spec, baseColor: hex })} />
        <ColorField label="Motif / foreground color" value={spec.fg} onChange={(hex) => onChange({ ...spec, fg: hex })} />

        {spec.secondaryColor !== undefined ? (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <ColorField
                label="Secondary color"
                value={spec.secondaryColor}
                onChange={(hex) => onChange({ ...spec, secondaryColor: hex })}
              />
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onChange({ ...spec, secondaryColor: undefined })}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={atLimit}
            onClick={() => onChange({ ...spec, secondaryColor: '#ffffff' })}
          >
            <Plus className="w-4 h-4" /> Add secondary color
          </Button>
        )}

        <div className="flex flex-col gap-2">
          {(spec.additionalColors ?? []).map((c, idx) => (
            <div key={idx} className="flex items-end gap-2">
              <div className="flex-1">
                <ColorField
                  label={`Additional color ${idx + 1}`}
                  value={c}
                  onChange={(hex) => {
                    const next = [...(spec.additionalColors ?? [])];
                    next[idx] = hex;
                    onChange({ ...spec, additionalColors: next });
                  }}
                />
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const next = (spec.additionalColors ?? []).filter((_, i) => i !== idx);
                  onChange({ ...spec, additionalColors: next.length ? next : undefined });
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <Button
            size="sm"
            variant="secondary"
            disabled={atLimit}
            onClick={() =>
              onChange({
                ...spec,
                additionalColors: [...(spec.additionalColors ?? []), '#cccccc'],
              })
            }
          >
            <Plus className="w-4 h-4" /> Add color
          </Button>
          {atLimit && (
            <p className="text-[11px] text-amber-600 font-medium">
              Color limit reached ({MAX_COLORS}) for this product type.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
