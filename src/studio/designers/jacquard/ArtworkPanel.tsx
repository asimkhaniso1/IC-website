import { useRef, useState } from 'react';
import { AlignCenter, FlipHorizontal2, ImagePlus, Trash2, Type as TypeIcon } from 'lucide-react';
import {
  Badge,
  Button,
  Field,
  NumberField,
  Panel,
  Select,
  Slider,
  TextInput,
} from '../../../components/ui/index';
import { ACCEPTED_ARTWORK_MIME, MAX_UPLOAD_BYTES, TEXT_FONTS } from '../../../lib/constants';
import type { ArtworkItem, JacquardSpec } from '../../../lib/types';
import { GLOSSARY } from '../../glossary';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

function loadImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      } else {
        resolve({ width: 1, height: 1 });
      }
    };
    img.onerror = () => resolve({ width: 1, height: 1 });
    img.src = dataUrl;
  });
}

/**
 * Downscale raster artwork to a manageable size and optionally knock out the
 * white background (common on JPG logos, which have no alpha channel) so the
 * motif blends into the woven fabric instead of sitting in a white box.
 * Near-white pixels become transparent with a feathered falloff.
 */
async function processRasterArtwork(
  dataUrl: string,
  removeWhiteBg: boolean,
  maxDim = 1024
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not decode the image.'));
    el.src = dataUrl;
  });
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return dataUrl;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  if (removeWhiteBg) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = imageData.data;
    // Feather between these luma-ish bounds: fully opaque below LO, fully
    // transparent above HI.
    const LO = 228;
    const HI = 248;
    for (let i = 0; i < px.length; i += 4) {
      const min = Math.min(px[i], px[i + 1], px[i + 2]);
      if (min >= HI) {
        px[i + 3] = 0;
      } else if (min > LO) {
        const t = (min - LO) / (HI - LO);
        px[i + 3] = Math.min(px[i + 3], Math.round((1 - t) * 255));
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return canvas.toDataURL('image/png');
}

export function ArtworkPanel({
  spec,
  onChange,
}: {
  spec: JacquardSpec;
  onChange: (next: JacquardSpec) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeId, setActiveId] = useState<string | null>(spec.artwork[0]?.id ?? null);
  const [lockAspect, setLockAspect] = useState<Record<string, boolean>>({});
  const [removeWhiteBg, setRemoveWhiteBg] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const active = spec.artwork.find((a) => a.id === activeId) ?? null;

  const updateItems = (items: ArtworkItem[]) => onChange({ ...spec, artwork: items });

  const updateActive = (patch: Partial<ArtworkItem>) => {
    if (!active) return;
    updateItems(spec.artwork.map((a) => (a.id === active.id ? { ...a, ...patch } : a)));
  };

  const updateActiveTransform = (patch: Partial<ArtworkItem['transform']>) => {
    if (!active) return;
    updateItems(
      spec.artwork.map((a) =>
        a.id === active.id ? { ...a, transform: { ...a.transform, ...patch } } : a
      )
    );
  };

  const handleFile = async (file: File) => {
    setError(null);
    if (!ACCEPTED_ARTWORK_MIME.includes(file.type)) {
      setError('Unsupported file type. Please upload PNG, JPG or SVG artwork.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`File is too large (max ${(MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0)} MB).`);
      return;
    }
    let dataUrl = await readFileAsDataUrl(file);
    if (file.type === 'image/png' || file.type === 'image/jpeg') {
      try {
        dataUrl = await processRasterArtwork(dataUrl, removeWhiteBg);
      } catch {
        /* fall back to the raw upload */
      }
    }
    const { width, height } = await loadImageSize(dataUrl);
    const aspect = width > 0 ? height / width : 1;
    const widthMm = spec.widthMm * 0.6;
    const heightMm = widthMm * aspect;

    const item: ArtworkItem = {
      id: crypto.randomUUID(),
      kind: 'image',
      dataUrl,
      color: spec.fg,
      transform: {
        xMm: 0,
        yMm: 0,
        rotationDeg: 0,
        widthMm,
        heightMm,
        mirrored: false,
      },
    };
    updateItems([...spec.artwork, item]);
    setActiveId(item.id);
    setLockAspect((m) => ({ ...m, [item.id]: true }));
  };

  const addText = () => {
    const item: ArtworkItem = {
      id: crypto.randomUUID(),
      kind: 'text',
      text: 'YOUR TEXT',
      fontFamily: TEXT_FONTS[0],
      fontWeight: 700,
      color: spec.fg,
      transform: {
        xMm: 0,
        yMm: 0,
        rotationDeg: 0,
        widthMm: spec.widthMm * 0.6,
        heightMm: spec.widthMm * 0.4,
        mirrored: false,
      },
    };
    updateItems([...spec.artwork, item]);
    setActiveId(item.id);
  };

  const removeItem = (id: string) => {
    updateItems(spec.artwork.filter((a) => a.id !== id));
    if (activeId === id) setActiveId(null);
  };

  return (
    <Panel title="Artwork" action={<Badge tone="slate">{spec.artwork.length} item{spec.artwork.length === 1 ? '' : 's'}</Badge>}>
      <div className="flex flex-col gap-4">
        <p className="text-xs text-slate-500 leading-relaxed">{GLOSSARY.jacquardArtwork}</p>

        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_ARTWORK_MIME.join(',')}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="w-4 h-4" /> Upload Logo/Artwork
          </Button>
          <Button size="sm" variant="secondary" className="flex-1" onClick={addText}>
            <TypeIcon className="w-4 h-4" /> Add Text
          </Button>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={removeWhiteBg}
            onChange={(e) => setRemoveWhiteBg(e.target.checked)}
            className="accent-brand-600"
          />
          Remove white background on upload (recommended for JPG logos)
        </label>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        {spec.artwork.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {spec.artwork.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    item.id === activeId
                      ? 'border-brand-600 bg-brand-50 text-brand-600'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="truncate font-medium">
                    {item.kind === 'text' ? item.text || 'Text' : 'Artwork image'}
                  </span>
                  <Trash2
                    className="w-3.5 h-3.5 shrink-0 text-slate-400 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(item.id);
                    }}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}

        {active && (
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            {active.kind === 'text' && (
              <>
                <Field label="Text">
                  <TextInput
                    value={active.text ?? ''}
                    onChange={(e) => updateActive({ text: e.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Font">
                    <Select
                      value={active.fontFamily ?? TEXT_FONTS[0]}
                      onChange={(e) => updateActive({ fontFamily: e.target.value })}
                    >
                      {TEXT_FONTS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Weight">
                    <Select
                      value={String(active.fontWeight ?? 400)}
                      onChange={(e) => updateActive({ fontWeight: Number(e.target.value) })}
                    >
                      <option value="400">Regular</option>
                      <option value="700">Bold</option>
                    </Select>
                  </Field>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Field label="Width">
                <NumberField
                  value={Number(active.transform.widthMm.toFixed(1))}
                  suffix="mm"
                  step={0.5}
                  onValue={(v) => {
                    if (active.kind === 'image' && lockAspect[active.id]) {
                      const ratio = active.transform.heightMm / active.transform.widthMm;
                      updateActiveTransform({ widthMm: v, heightMm: v * ratio });
                    } else {
                      updateActiveTransform({ widthMm: v });
                    }
                  }}
                />
              </Field>
              <Field label="Height">
                <NumberField
                  value={Number(active.transform.heightMm.toFixed(1))}
                  suffix="mm"
                  step={0.5}
                  onValue={(v) => {
                    if (active.kind === 'image' && lockAspect[active.id]) {
                      const ratio = active.transform.widthMm / active.transform.heightMm;
                      updateActiveTransform({ heightMm: v, widthMm: v * ratio });
                    } else {
                      updateActiveTransform({ heightMm: v });
                    }
                  }}
                />
              </Field>
            </div>

            {active.kind === 'image' && (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={lockAspect[active.id] ?? false}
                  onChange={(e) => setLockAspect((m) => ({ ...m, [active.id]: e.target.checked }))}
                  className="accent-brand-600"
                />
                Lock aspect ratio
              </label>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Field label="X offset">
                <NumberField
                  value={Number(active.transform.xMm.toFixed(1))}
                  suffix="mm"
                  step={0.5}
                  onValue={(v) => updateActiveTransform({ xMm: v })}
                />
              </Field>
              <Field label="Y offset">
                <NumberField
                  value={Number(active.transform.yMm.toFixed(1))}
                  suffix="mm"
                  step={0.5}
                  onValue={(v) => updateActiveTransform({ yMm: v })}
                />
              </Field>
            </div>

            <Slider
              label="Rotation"
              valueLabel={`${active.transform.rotationDeg}°`}
              min={-180}
              max={180}
              step={1}
              value={active.transform.rotationDeg}
              onChange={(e) => updateActiveTransform({ rotationDeg: Number(e.target.value) })}
            />

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => updateActiveTransform({ xMm: 0, yMm: 0 })}
              >
                <AlignCenter className="w-3.5 h-3.5" /> Center
              </Button>
              <Button
                size="sm"
                variant={active.transform.mirrored ? 'primary' : 'secondary'}
                className="flex-1"
                onClick={() => updateActiveTransform({ mirrored: !active.transform.mirrored })}
              >
                <FlipHorizontal2 className="w-3.5 h-3.5" /> Mirror
              </Button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
