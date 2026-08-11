/**
 * Renders jacquard artwork across N repeat cells, and (when interactive)
 * exposes drag/resize/rotate handles on the base (first) cell's items only —
 * dragging a mirrored/reversed ghost copy would be confusing, so only the
 * source instance is editable.
 */
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { ArtworkItem, DesignSpec, JacquardSpec } from '../../lib/types';
import { useArtworkDrag } from './useArtworkDrag';

const HANDLE_STROKE_MM = 0.5;

export function ArtworkLayer({
  spec,
  lengthMm,
  heightMm,
  cells,
  interactive,
  onSpecChange,
}: {
  spec: JacquardSpec;
  lengthMm: number;
  heightMm: number;
  cells: number;
  interactive?: boolean;
  onSpecChange?(next: DesignSpec): void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const cycleLen = Math.max(1, spec.repeat.lengthMm + spec.repeat.spacingMm);

  const { selectedId, setSelectedId, beginDrag, onPointerMove, endDrag } = useArtworkDrag({
    spec,
    onSpecChange,
    svgRef,
  });

  const captureSvg = (node: SVGGElement | null) => {
    svgRef.current = node ? node.ownerSVGElement : null;
  };

  const cellIndices = Array.from({ length: cells }, (_, i) => i);

  return (
    <g
      ref={captureSvg}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? endDrag : undefined}
      onPointerCancel={interactive ? endDrag : undefined}
    >
      {cellIndices.map((i) => {
        const cellStartX = i * cycleLen;
        if (cellStartX > lengthMm) return null;
        const cellCenterX = cellStartX + spec.repeat.lengthMm / 2;
        const cellCenterY = heightMm / 2;
        const isBaseCell = i === 0;
        const mirror = spec.repeat.mirror && i % 2 === 1;
        const reverse = spec.repeat.reverse && i % 2 === 1;
        const transformParts = [
          mirror ? `translate(${cellCenterX}, 0) scale(-1,1) translate(${-cellCenterX}, 0)` : '',
          reverse ? `rotate(180, ${cellCenterX}, ${cellCenterY})` : '',
        ].filter(Boolean);

        return (
          <g key={i} transform={transformParts.length ? transformParts.join(' ') : undefined}>
            {spec.artwork.map((item) => {
              const editable = Boolean(interactive && isBaseCell);
              return (
                <ArtworkItemNode
                  key={`${item.id}-${i}`}
                  item={item}
                  cellCenterX={cellCenterX}
                  cellCenterY={cellCenterY}
                  interactive={editable}
                  selected={editable && (selectedId === item.id || hoveredId === item.id)}
                  onSelect={() => editable && setSelectedId(item.id)}
                  onHoverChange={(hovering) => editable && setHoveredId(hovering ? item.id : null)}
                  onBeginDrag={(e, mode) =>
                    editable &&
                    beginDrag(e, item, mode, {
                      x: cellCenterX + item.transform.xMm,
                      y: cellCenterY + item.transform.yMm,
                    })
                  }
                />
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

function ArtworkItemNode({
  item,
  cellCenterX,
  cellCenterY,
  interactive,
  selected,
  onSelect,
  onHoverChange,
  onBeginDrag,
}: {
  /** Optional: React list key when rendered from .map() — never read by the component. */
  key?: string;
  item: ArtworkItem;
  cellCenterX: number;
  cellCenterY: number;
  interactive: boolean;
  selected?: boolean;
  onSelect: () => void;
  onHoverChange: (hovering: boolean) => void;
  onBeginDrag: (e: ReactPointerEvent, mode: 'move' | 'resize' | 'rotate') => void;
}) {
  const cx = cellCenterX + item.transform.xMm;
  const cy = cellCenterY + item.transform.yMm;
  const w = item.transform.widthMm;
  const h = item.transform.heightMm;
  const rot = item.transform.rotationDeg;
  const mirrorScale = item.transform.mirrored ? -1 : 1;
  const handleR = Math.max(0.8, Math.min(w, h) * 0.06);

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rot}) scale(${mirrorScale}, 1)`}>
      <g
        onPointerDown={interactive ? (e) => { onSelect(); onBeginDrag(e, 'move'); } : undefined}
        onPointerEnter={interactive ? () => onHoverChange(true) : undefined}
        onPointerLeave={interactive ? () => onHoverChange(false) : undefined}
        style={{ cursor: interactive ? 'move' : 'default' }}
      >
        {item.kind === 'image' && item.dataUrl ? (
          <image
            href={item.dataUrl}
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily={item.fontFamily ?? 'Inter, sans-serif'}
            fontWeight={item.fontWeight ?? 700}
            fontSize={h * 0.82}
            fill={item.color}
          >
            {item.text}
          </text>
        )}
      </g>

      {selected && (
        <g pointerEvents={interactive ? 'auto' : 'none'}>
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="none"
            stroke="#004A99"
            strokeWidth={HANDLE_STROKE_MM}
            strokeDasharray={`${Math.max(0.8, h * 0.04)} ${Math.max(0.8, h * 0.04)}`}
          />
          <rect
            x={w / 2 - handleR}
            y={h / 2 - handleR}
            width={handleR * 2}
            height={handleR * 2}
            fill="#004A99"
            onPointerDown={(e) => onBeginDrag(e, 'resize')}
            style={{ cursor: 'nwse-resize' }}
          />
          <line
            x1={0}
            y1={-h / 2}
            x2={0}
            y2={-h / 2 - h * 0.25}
            stroke="#004A99"
            strokeWidth={HANDLE_STROKE_MM}
          />
          <circle
            cx={0}
            cy={-h / 2 - h * 0.25}
            r={handleR}
            fill="#ffffff"
            stroke="#004A99"
            strokeWidth={HANDLE_STROKE_MM}
            onPointerDown={(e) => onBeginDrag(e, 'rotate')}
            style={{ cursor: 'grab' }}
          />
        </g>
      )}
    </g>
  );
}
