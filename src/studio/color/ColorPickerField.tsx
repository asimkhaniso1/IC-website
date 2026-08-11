/**
 * Compact swatch + popover color picker used across the woven/knitted
 * designer control panels. Offers three tabbed swatch sources — the
 * Interconverters yarn shade card, a curated Pantone reference library, and
 * a free-form custom picker (native color input + hex + RGB readout).
 */
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { ColorSwatch, TextInput } from '../../components/ui';
import { normalizeHex, hexToRgb } from '../../lib/color';
import { colorLabel } from './naming';
import { PANTONE_REFERENCES } from './pantone';
import { YARN_SHADE_CARD } from './yarnShades';

const FALLBACK_HEX = '#94a3b8';

type Tab = 'yarn' | 'pantone' | 'custom';

const TABS: { id: Tab; label: string }[] = [
  { id: 'yarn', label: 'Yarn shades' },
  { id: 'pantone', label: 'Pantone' },
  { id: 'custom', label: 'Custom' },
];

export function ColorPickerField({
  label,
  value,
  onChange,
  allowClear,
}: {
  label?: string;
  value?: string;
  onChange: (hex: string | undefined) => void;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('yarn');
  const [hexText, setHexText] = useState(value ?? FALLBACK_HEX);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHexText(value ?? FALLBACK_HEX);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocPointerDown);
    return () => document.removeEventListener('mousedown', onDocPointerDown);
  }, [open]);

  const current = value ?? FALLBACK_HEX;
  const rgb = hexToRgb(current);

  const commitHex = (raw: string) => {
    setHexText(raw);
    const n = normalizeHex(raw);
    if (n) onChange(n);
  };

  const pick = (hex: string) => {
    onChange(hex);
    setHexText(hex);
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <span className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={label ? `${label} color swatch` : 'Color swatch'}
          className="w-9 h-9 shrink-0 rounded-lg border border-slate-300 shadow-sm transition-transform hover:scale-105"
          style={{ backgroundColor: value ? current : '#ffffff' }}
        >
          {!value && <span className="block w-full h-full rounded-lg border border-dashed border-slate-300" />}
        </button>
        <span className="text-xs font-mono text-slate-600 truncate">{value ? current : 'None'}</span>
        {allowClear && value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-slate-400 hover:text-slate-600 shrink-0"
            aria-label="Clear color"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-xl p-3 space-y-2.5">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                  tab === t.id ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'yarn' && (
            <div className="grid grid-cols-8 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
              {YARN_SHADE_CARD.map((y) => (
                <ColorSwatch
                  key={y.code}
                  color={y.hex}
                  title={`${y.name} (${y.code})`}
                  selected={normalizeHex(current) === normalizeHex(y.hex)}
                  onClick={() => pick(y.hex)}
                />
              ))}
            </div>
          )}

          {tab === 'pantone' && (
            <div className="grid grid-cols-8 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
              {PANTONE_REFERENCES.map((p) => (
                <ColorSwatch
                  key={p.code}
                  color={p.hex}
                  title={`PANTONE ${p.code} ${p.name}`}
                  selected={normalizeHex(current) === normalizeHex(p.hex)}
                  onClick={() => pick(p.hex)}
                />
              ))}
            </div>
          )}

          {tab === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={normalizeHex(current) ?? '#000000'}
                onChange={(e) => pick(e.target.value)}
                className="w-9 h-9 p-0 rounded border border-slate-200 bg-transparent cursor-pointer"
                aria-label="Pick custom color"
              />
              <TextInput
                value={hexText}
                onChange={(e) => commitHex(e.target.value)}
                placeholder="#000000"
                className="font-mono text-xs"
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
            <span className="text-[11px] font-medium text-slate-600 truncate">{colorLabel(current)}</span>
            {rgb && (
              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                rgb({rgb.r}, {rgb.g}, {rgb.b})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
