/**
 * Simple line-art context silhouettes for the "application" preview mode.
 * Paths live in a local unit space authored around a ~30mm reference fabric
 * width; the caller scales the whole composition to the actual widthMm.
 */
import type { Application } from '../../../lib/types';

export interface SilhouetteConfig {
  viewW: number;
  viewH: number;
  /** Where the fabric strip's left edge sits, in the same local unit space. */
  bandX: number;
  bandY: number;
  bandLengthMm: number;
  bandRotationDeg: number;
  paths: string[];
}

const trunk: SilhouetteConfig = {
  viewW: 220,
  viewH: 260,
  bandX: 40,
  bandY: 74,
  bandLengthMm: 140,
  bandRotationDeg: 0,
  paths: [
    'M60,20 C40,20 32,45 34,75 C36,110 30,150 40,190 C46,215 90,230 110,230 C130,230 174,215 180,190 C190,150 184,110 186,75 C188,45 180,20 160,20 C150,20 140,30 110,30 C80,30 70,20 60,20 Z',
    'M70,230 L64,258 M150,230 L156,258',
  ],
};

const shoulderStrap: SilhouetteConfig = {
  viewW: 220,
  viewH: 260,
  bandX: 55,
  bandY: 34,
  bandLengthMm: 60,
  bandRotationDeg: 28,
  paths: [
    'M70,10 C40,20 30,60 34,90 L38,220 C60,232 160,232 182,220 L186,90 C190,60 180,20 150,10 C130,4 90,4 70,10 Z',
    'M60,10 C60,-6 90,-10 110,-10 C130,-10 160,-6 160,10',
  ],
};

const bag: SilhouetteConfig = {
  viewW: 220,
  viewH: 220,
  bandX: 40,
  bandY: 14,
  bandLengthMm: 130,
  bandRotationDeg: -10,
  paths: [
    'M40,90 Q40,60 70,60 L150,60 Q180,60 180,90 L180,190 Q180,210 160,210 L60,210 Q40,210 40,190 Z',
    'M70,60 C70,20 150,20 150,60',
  ],
};

const shoe: SilhouetteConfig = {
  viewW: 260,
  viewH: 140,
  bandX: 70,
  bandY: 34,
  bandLengthMm: 90,
  bandRotationDeg: -6,
  paths: [
    'M20,110 C20,90 40,80 60,78 L150,60 C180,54 210,60 230,80 C244,94 240,112 220,116 L40,120 C28,120 20,118 20,110 Z',
    'M60,78 L70,40 L110,44 L100,70',
  ],
};

const arm: SilhouetteConfig = {
  viewW: 260,
  viewH: 130,
  bandX: 90,
  bandY: 24,
  bandLengthMm: 70,
  bandRotationDeg: 0,
  paths: [
    'M10,65 C10,50 30,40 60,40 L220,40 C240,40 250,50 250,65 C250,80 240,90 220,90 L60,90 C30,90 10,80 10,65 Z',
  ],
};

const box: SilhouetteConfig = {
  viewW: 220,
  viewH: 200,
  bandX: 30,
  bandY: 62,
  bandLengthMm: 160,
  bandRotationDeg: 0,
  paths: [
    'M30,50 L110,20 L190,50 L190,160 L110,190 L30,160 Z',
    'M30,50 L110,80 L190,50 M110,80 L110,190',
  ],
};

export function getSilhouette(app: Application): SilhouetteConfig {
  switch (app) {
    case 'Waistband':
    case 'Underwear':
      return trunk;
    case 'Sportswear':
    case 'Garment':
      return shoulderStrap;
    case 'Bag':
      return bag;
    case 'Footwear':
      return shoe;
    case 'Medical':
      return arm;
    case 'Industrial':
    case 'Packaging':
    case 'Furniture':
    case 'Other':
    default:
      return box;
  }
}
