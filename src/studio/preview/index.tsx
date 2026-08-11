/**
 * FabricPreview — placeholder implementation.
 *
 * The preview workstream replaces the internals of this file with the full
 * SVG renderer (flat/roll/repeat/application modes, weave textures, ruler,
 * artwork drag). The component signature (PreviewProps / PreviewHandle) is
 * the frozen contract and must not change.
 */
import { useImperativeHandle } from 'react';
import type { PreviewHandle, PreviewProps } from '../../lib/types';

export default function FabricPreview({
  spec,
  previewRef,
  className = '',
}: PreviewProps) {
  useImperativeHandle(previewRef, (): PreviewHandle => {
    return {
      async toPngDataUrl(pxPerMm = 4) {
        const lengthMm = 200;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(lengthMm * pxPerMm);
        canvas.height = Math.round(spec.widthMm * pxPerMm);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = spec.baseColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/png');
      },
    };
  }, [spec]);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        viewBox={`0 0 200 ${spec.widthMm}`}
        className="w-full max-w-2xl"
        style={{ maxHeight: 320 }}
        preserveAspectRatio="xMidYMid meet"
      >
        <rect x={0} y={0} width={200} height={spec.widthMm} fill={spec.baseColor} rx={1} />
        <text
          x={100}
          y={spec.widthMm / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={Math.min(6, spec.widthMm / 3)}
          fill="#ffffff"
          opacity={0.7}
        >
          {spec.widthMm} mm
        </text>
      </svg>
    </div>
  );
}
