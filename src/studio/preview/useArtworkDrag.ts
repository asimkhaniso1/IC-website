/**
 * Pointer-driven move / resize / rotate for jacquard artwork items.
 * Screen px -> mm conversion goes through the owning <svg>'s screen CTM so
 * the drag stays accurate regardless of how the preview is scaled on page.
 */
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { ArtworkItem, DesignSpec, JacquardSpec } from '../../lib/types';

type DragMode = 'move' | 'resize' | 'rotate';

interface DragInfo {
  id: string;
  mode: DragMode;
  pointerId: number;
  startTransform: ArtworkItem['transform'];
  startMm: { x: number; y: number };
  centerMm: { x: number; y: number };
  startAngleDeg: number;
}

export function useArtworkDrag({
  spec,
  onSpecChange,
  svgRef,
}: {
  spec: DesignSpec;
  onSpecChange?: (next: DesignSpec) => void;
  svgRef: RefObject<SVGSVGElement | null>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragInfo = useRef<DragInfo | null>(null);

  const toMm = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const loc = pt.matrixTransform(ctm.inverse());
      return { x: loc.x, y: loc.y };
    },
    [svgRef]
  );

  const updateArtwork = useCallback(
    (id: string, patch: Partial<ArtworkItem['transform']>) => {
      if (spec.family !== 'J' || !onSpecChange) return;
      const j = spec as JacquardSpec;
      const artwork = j.artwork.map((a) =>
        a.id === id ? { ...a, transform: { ...a.transform, ...patch } } : a
      );
      onSpecChange({ ...j, artwork });
    },
    [spec, onSpecChange]
  );

  const beginDrag = useCallback(
    (e: ReactPointerEvent, item: ArtworkItem, mode: DragMode, centerMm: { x: number; y: number }) => {
      e.stopPropagation();
      try {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      } catch {
        /* pointer capture not supported in this environment */
      }
      setSelectedId(item.id);
      const startMm = toMm(e.clientX, e.clientY);
      const startAngleDeg = (Math.atan2(startMm.y - centerMm.y, startMm.x - centerMm.x) * 180) / Math.PI;
      dragInfo.current = {
        id: item.id,
        mode,
        pointerId: e.pointerId,
        startTransform: { ...item.transform },
        startMm,
        centerMm,
        startAngleDeg,
      };
    },
    [toMm]
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const info = dragInfo.current;
      if (!info) return;
      const cur = toMm(e.clientX, e.clientY);

      if (info.mode === 'move') {
        const dx = cur.x - info.startMm.x;
        const dy = cur.y - info.startMm.y;
        updateArtwork(info.id, {
          xMm: info.startTransform.xMm + dx,
          yMm: info.startTransform.yMm + dy,
        });
      } else if (info.mode === 'resize') {
        const dx = cur.x - info.startMm.x;
        const newW = Math.max(2, info.startTransform.widthMm + dx);
        const scale = newW / Math.max(info.startTransform.widthMm, 0.01);
        updateArtwork(info.id, {
          widthMm: newW,
          heightMm: Math.max(2, info.startTransform.heightMm * scale),
        });
      } else if (info.mode === 'rotate') {
        const angleDeg = (Math.atan2(cur.y - info.centerMm.y, cur.x - info.centerMm.x) * 180) / Math.PI;
        const delta = angleDeg - info.startAngleDeg;
        updateArtwork(info.id, { rotationDeg: Math.round(info.startTransform.rotationDeg + delta) });
      }
    },
    [toMm, updateArtwork]
  );

  const endDrag = useCallback((e: ReactPointerEvent) => {
    const info = dragInfo.current;
    if (info) {
      try {
        (e.currentTarget as Element).releasePointerCapture(info.pointerId);
      } catch {
        /* noop */
      }
    }
    dragInfo.current = null;
  }, []);

  return { selectedId, setSelectedId, beginDrag, onPointerMove, endDrag };
}
