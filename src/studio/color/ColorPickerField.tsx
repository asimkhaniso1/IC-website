/**
 * Compact swatch + popover color picker used across the woven/knitted
 * designer control panels. Offers the curated yarn palette, a native color
 * input for free-form picking, a validated hex field and an RGB readout.
 */
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { ColorSwatch, TextInput } from '../../components/ui';
import { normalizeHex, hexToRgb } from '../../lib/color';
import { YARN_PALETTE } from './palette';

const FALLBACK_HEX = '#94a3b8';

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
        <div className="absolute z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-xl p-3 space-y-3">
          <div>
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Yarn shades
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {YARN_PALETTE.map((y) => (
                <div key={y.hex} className="contents">
                  <ColorSwatch
                    color={y.hex}
                    title={y.name}
                    selected={normalizeHex(current) === normalizeHex(y.hex)}
                    onClick={() => {
                      onChange(y.hex);
                      setHexText(y.hex);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <input
              type="color"
              value={normalizeHex(current) ?? '#000000'}
              onChange={(e) => {
                onChange(e.target.value);
                setHexText(e.target.value);
              }}
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

          {rgb && (
            <div className="text-[11px] font-mono text-slate-400">
              rgb({rgb.r}, {rgb.g}, {rgb.b})
            </div>
          )}
        </div>
      )}
    </div>
  );
}
