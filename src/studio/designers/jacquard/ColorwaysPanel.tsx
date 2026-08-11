import { Save } from 'lucide-react';
import { Button, ColorSwatch, Panel, Tooltip } from '../../../components/ui/index';
import type { Colorway, JacquardSpec } from '../../../lib/types';
import { GLOSSARY } from '../../glossary';

const SLOTS: Colorway['label'][] = ['A', 'B', 'C'];

export function ColorwaysPanel({
  spec,
  onChange,
}: {
  spec: JacquardSpec;
  onChange: (next: JacquardSpec) => void;
}) {
  const saveSlot = (label: Colorway['label']) => {
    const entry: Colorway = {
      id: crypto.randomUUID(),
      label,
      fg: spec.fg,
      bg: spec.baseColor,
      edge: spec.edgeColor,
    };
    const others = spec.colorways.filter((c) => c.label !== label);
    onChange({
      ...spec,
      colorways: [...others, entry].sort((a, b) => a.label.localeCompare(b.label)),
      activeColorway: entry.id,
    });
  };

  const applySlot = (colorway: Colorway) => {
    onChange({
      ...spec,
      fg: colorway.fg,
      baseColor: colorway.bg,
      edgeColor: colorway.edge ?? spec.edgeColor,
      activeColorway: colorway.id,
    });
  };

  return (
    <Panel
      title={
        <span className="flex items-center gap-1">
          Colorways <Tooltip text={GLOSSARY.colorway} />
        </span>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        {SLOTS.map((label) => {
          const saved = spec.colorways.find((c) => c.label === label);
          const isActive = saved && spec.activeColorway === saved.id;
          return (
            <div
              key={label}
              className={`flex flex-col items-center gap-2 rounded-lg border p-3 ${
                isActive ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white'
              }`}
            >
              <span className="text-xs font-bold text-slate-500">Slot {label}</span>
              {saved ? (
                <>
                  <button type="button" onClick={() => applySlot(saved)} className="flex gap-1">
                    <ColorSwatch color={saved.bg} size="sm" title="Base" />
                    <ColorSwatch color={saved.fg} size="sm" title="Motif" />
                  </button>
                  <Button size="sm" variant="ghost" onClick={() => saveSlot(label)}>
                    <Save className="w-3.5 h-3.5" /> Update
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => saveSlot(label)}>
                  <Save className="w-3.5 h-3.5" /> Save
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
