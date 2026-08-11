import { useEffect, useState } from 'react';
import { Field, TextInput } from '../../../components/ui/index';
import { normalizeHex } from '../../../lib/color';
import { colorLabel } from '../../color/naming';

/**
 * Inline color input: native color swatch + hex text field. Local to the
 * jacquard designer — the studio-wide ColorPickerField (if any) belongs to
 * another workstream and is intentionally not reused here. Shows the
 * matched yarn/Pantone caption from the shared color-naming lookup.
 */
export function ColorField({
  label,
  value,
  onChange,
  tooltip,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  tooltip?: string;
}) {
  const [text, setText] = useState(value);

  useEffect(() => setText(value), [value]);

  const commit = () => {
    const n = normalizeHex(text);
    if (n) {
      onChange(n);
      setText(n);
    } else {
      setText(value);
    }
  };

  return (
    <Field label={label} tooltip={tooltip}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={normalizeHex(value) ?? '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 shrink-0 rounded-md border border-slate-200 bg-white p-0.5 cursor-pointer"
          aria-label={`${label} color picker`}
        />
        <TextInput
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
          className="font-mono text-xs"
          maxLength={7}
          spellCheck={false}
        />
      </div>
      <span className="mt-1 block text-[11px] text-slate-400 truncate">{colorLabel(value)}</span>
    </Field>
  );
}
