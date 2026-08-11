/**
 * Shared fabric-strip renderer used by every preview mode: a rounded rect in
 * the base color, longitudinal stripes (woven), an optional secondary-color
 * band, jacquard artwork, a weave-texture overlay, a soft sheen, and edge
 * treatment (straight / picot / scallop). All geometry is in millimetres.
 */
import type { DesignSpec, JacquardSpec, KnittedSpec, WovenSpec } from '../../lib/types';
import { isLight } from '../../lib/color';
import { TextureDefs, SheenGradient, WovenRibTexture, KnittedRibTexture } from './textures';
import { edgePath } from './edges';
import { ArtworkLayer } from './ArtworkLayer';

/**
 * Older saved specs may not have `style` set. Normalize once per render —
 * never write this back to storage. Mirrors the same rule used in the
 * woven/knitted Controls panels.
 */
function resolveWovenStyle(spec: WovenSpec): NonNullable<WovenSpec['style']> {
  return spec.style ?? (spec.stripes.length > 0 ? 'striped' : 'standard');
}

function resolveKnittedStyle(spec: KnittedSpec): NonNullable<KnittedSpec['style']> {
  return spec.style ?? 'standard';
}

export interface FabricStripProps {
  spec: DesignSpec;
  x: number;
  y: number;
  lengthMm: number;
  idPrefix: string;
  interactive?: boolean;
  onSpecChange?(next: DesignSpec): void;
  /** Jacquard only: how many repeat cells to render across lengthMm. */
  repeatCells?: number;
}

export function FabricStrip({
  spec,
  x,
  y,
  lengthMm,
  idPrefix,
  interactive,
  onSpecChange,
  repeatCells,
}: FabricStripProps) {
  const heightMm = Math.max(spec.widthMm, 0.5);
  const textureId = `${idPrefix}-tex`;
  const sheenId = `${idPrefix}-sheen`;
  const clipId = `${idPrefix}-clip`;
  const wovenRibId = `${idPrefix}-wrib`;
  const knitRibId = `${idPrefix}-krib`;
  const rx = Math.min(1.2, heightMm * 0.06);

  const wovenStyle = spec.family === 'W' ? resolveWovenStyle(spec as WovenSpec) : undefined;
  const knittedStyle = spec.family === 'K' ? resolveKnittedStyle(spec as KnittedSpec) : undefined;
  const ribAppearance =
    spec.family === 'W' ? (spec as WovenSpec).ribAppearance ?? 'medium' : (spec as KnittedSpec).ribAppearance ?? 'medium';

  const accentHeight = spec.accentColor ? Math.min(heightMm * 0.08, 2) : 0;
  const accentInset = Math.max(0.3, heightMm * 0.03);

  const topEdge = edgePath(spec.edgeStyle, lengthMm, 'top', heightMm);
  const bottomEdge = edgePath(spec.edgeStyle, lengthMm, 'bottom', heightMm);
  const edgeColor = spec.edgeColor ?? spec.baseColor;
  const edgeStroke = isLight(edgeColor) && isLight(spec.baseColor) ? '#94a3b8' : edgeColor;
  const edgeWidth = Math.max(0.3, heightMm * 0.02);

  const cycleLenMm =
    spec.family === 'J'
      ? Math.max(1, (spec as JacquardSpec).repeat.lengthMm + (spec as JacquardSpec).repeat.spacingMm)
      : 0;
  const defaultCells = spec.family === 'J' ? Math.max(1, Math.ceil(lengthMm / cycleLenMm) + 1) : 0;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <defs>
        <TextureDefs id={textureId} family={spec.family} baseColor={spec.baseColor} />
        <SheenGradient id={sheenId} />
        {spec.family === 'W' && wovenStyle === 'ribbed' && (
          <WovenRibTexture id={wovenRibId} baseColor={spec.baseColor} ribAppearance={ribAppearance} />
        )}
        {spec.family === 'K' && knittedStyle === 'ribbed' && (
          <KnittedRibTexture id={knitRibId} baseColor={spec.baseColor} heightMm={heightMm} ribAppearance={ribAppearance} />
        )}
        <clipPath id={clipId}>
          <rect x={0} y={0} width={lengthMm} height={heightMm} rx={rx} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect x={0} y={0} width={lengthMm} height={heightMm} fill={spec.baseColor} />

        {spec.family === 'W' &&
          wovenStyle === 'striped' &&
          (spec as WovenSpec).stripes.map((s) => (
            <rect
              key={s.id}
              x={0}
              y={heightMm / 2 + s.offsetMm - s.widthMm / 2}
              width={lengthMm}
              height={Math.max(0, s.widthMm)}
              fill={s.color}
            />
          ))}

        {spec.family === 'W' && wovenStyle === 'ribbed' && (
          <rect x={0} y={0} width={lengthMm} height={heightMm} fill={`url(#${wovenRibId})`} />
        )}

        {spec.secondaryColor && (
          <rect
            x={0}
            y={heightMm * 0.36}
            width={lengthMm}
            height={heightMm * 0.28}
            fill={spec.secondaryColor}
            opacity={0.85}
          />
        )}

        {spec.accentColor && (
          <>
            <rect x={0} y={accentInset} width={lengthMm} height={accentHeight} fill={spec.accentColor} />
            <rect
              x={0}
              y={heightMm - accentInset - accentHeight}
              width={lengthMm}
              height={accentHeight}
              fill={spec.accentColor}
            />
          </>
        )}

        {spec.family === 'J' && (
          <ArtworkLayer
            spec={spec as JacquardSpec}
            lengthMm={lengthMm}
            heightMm={heightMm}
            cells={repeatCells ?? defaultCells}
            interactive={interactive}
            onSpecChange={onSpecChange}
          />
        )}

        <rect x={0} y={0} width={lengthMm} height={heightMm} fill={`url(#${textureId})`} />

        {spec.family === 'K' && knittedStyle === 'ribbed' && (
          <rect x={0} y={0} width={lengthMm} height={heightMm} fill={`url(#${knitRibId})`} opacity={0.9} />
        )}

        <rect x={0} y={0} width={lengthMm} height={heightMm} fill={`url(#${sheenId})`} />
      </g>

      {topEdge ? (
        <path d={topEdge} fill="none" stroke={edgeStroke} strokeWidth={edgeWidth} />
      ) : (
        <line x1={0} y1={heightMm * 0.03} x2={lengthMm} y2={heightMm * 0.03} stroke={edgeStroke} strokeWidth={edgeWidth * 0.8} />
      )}
      {bottomEdge ? (
        <path d={bottomEdge} fill="none" stroke={edgeStroke} strokeWidth={edgeWidth} />
      ) : (
        <line x1={0} y1={heightMm * 0.97} x2={lengthMm} y2={heightMm * 0.97} stroke={edgeStroke} strokeWidth={edgeWidth * 0.8} />
      )}
    </g>
  );
}
