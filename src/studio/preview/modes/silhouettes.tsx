/**
 * Line-art context silhouettes for the "application" preview mode.
 * Paths are authored in a fixed local unit space (roughly mm-like). The band
 * placement puts the fabric strip where the real product would use it, and
 * bandMaxWidthMm caps how wide the strip may render inside the illustration
 * so wide fabrics don't swallow the drawing (the mode is illustrative — the
 * caption already says "approximate scale").
 */
import type { Application } from '../../../lib/types';

export interface SilhouetteConfig {
  viewW: number;
  viewH: number;
  /** Where the fabric strip's left edge / centerline origin sits. */
  bandX: number;
  bandY: number;
  bandLengthMm: number;
  bandRotationDeg: number;
  /** Widest the strip may appear inside this illustration. */
  bandMaxWidthMm: number;
  paths: string[];
}

/** Underwear briefs, front view — band runs along the waistband. */
const briefs: SilhouetteConfig = {
  viewW: 220,
  viewH: 230,
  bandX: 40,
  bandY: 62,
  bandLengthMm: 140,
  bandRotationDeg: 0,
  bandMaxWidthMm: 24,
  paths: [
    // briefs outline
    'M40,62 L180,62 C182,112 168,152 140,176 C126,188 116,196 110,208 C104,196 94,188 80,176 C52,152 38,112 40,62 Z',
    // leg elastic hints
    'M62,168 C78,158 92,154 102,156 M158,168 C142,158 128,154 118,156',
  ],
};

/** T-shirt front view — band forms the bottom hem. */
const tshirt: SilhouetteConfig = {
  viewW: 240,
  viewH: 235,
  bandX: 76,
  bandY: 196,
  bandLengthMm: 88,
  bandRotationDeg: 0,
  bandMaxWidthMm: 16,
  paths: [
    // body + sleeves
    'M70,42 C80,34 94,30 100,30 C106,38 134,38 140,30 C146,30 160,34 170,42 L204,72 L184,98 L164,82 L164,196 L76,196 L76,82 L56,98 L36,72 Z',
    // collar
    'M100,30 C104,44 136,44 140,30',
    // sleeve hems
    'M186,95 L167,79 M54,95 L73,79',
  ],
};

/** Tote bag — band is the vertical carrying strap down the middle. */
const bag: SilhouetteConfig = {
  viewW: 220,
  viewH: 235,
  bandX: 110,
  bandY: 66,
  bandLengthMm: 140,
  bandRotationDeg: 90,
  bandMaxWidthMm: 22,
  paths: [
    // bag body
    'M50,82 Q50,66 66,66 L154,66 Q170,66 170,82 L170,192 Q170,208 154,208 L66,208 Q50,208 50,192 Z',
    // handle
    'M78,66 C78,30 142,30 142,66',
    // stitch line
    'M50,100 L170,100',
  ],
};

/** Sneaker side view — band straps across the instep. */
const sneaker: SilhouetteConfig = {
  viewW: 260,
  viewH: 155,
  bandX: 118,
  bandY: 76,
  bandLengthMm: 52,
  bandRotationDeg: 62,
  bandMaxWidthMm: 16,
  paths: [
    // shoe upper + toe
    'M20,120 C15,106 25,95 45,91 L120,74 C150,67 186,70 210,86 C228,97 238,106 236,116 C234,124 222,128 205,129 L32,130 C24,130 22,126 20,120 Z',
    // sole line
    'M22,121 C70,127 180,126 234,114',
    // ankle collar
    'M45,91 C48,76 58,68 72,66 C86,64 98,68 104,77',
  ],
};

/** Forearm with hand — bandage wraps around the mid-forearm. */
const forearm: SilhouetteConfig = {
  viewW: 275,
  viewH: 150,
  bandX: 118,
  bandY: 44,
  bandLengthMm: 58,
  bandRotationDeg: 90,
  bandMaxWidthMm: 44,
  paths: [
    // upper-arm/elbow into forearm, top edge (tapering toward the wrist)
    'M12,50 C24,42 44,40 62,42 L150,47 C176,49 196,52 210,56',
    // bottom edge
    'M12,104 C24,112 44,114 62,112 L150,105 C176,103 196,100 210,96',
    // wrist + palm
    'M210,56 C222,55 232,58 236,64 C242,60 252,60 256,66 C260,72 258,80 252,84 C244,94 228,98 216,96 C212,96 210,96 210,96',
    // thumb
    'M236,64 C240,54 250,50 258,53',
    // finger hints
    'M256,66 L268,64 M257,73 L269,73 M254,80 L266,82',
  ],
};

/** Same arm, band around the wrist (sweatband / wristband). */
const wristband: SilhouetteConfig = {
  viewW: 275,
  viewH: 150,
  bandX: 196,
  bandY: 52,
  bandLengthMm: 46,
  bandRotationDeg: 90,
  bandMaxWidthMm: 22,
  paths: forearm.paths,
};

/** Parcel box — band is the strapping around it. */
const parcel: SilhouetteConfig = {
  viewW: 220,
  viewH: 210,
  bandX: 30,
  bandY: 112,
  bandLengthMm: 160,
  bandRotationDeg: 0,
  bandMaxWidthMm: 24,
  paths: [
    // box outline
    'M30,52 L110,22 L190,52 L190,162 L110,192 L30,162 Z',
    // inner edges
    'M30,52 L110,82 L190,52 M110,82 L110,192',
  ],
};

export function getSilhouette(app: Application): SilhouetteConfig {
  switch (app) {
    case 'Waistband':
    case 'Underwear':
      return briefs;
    case 'Sportswear':
    case 'Activewear':
    case 'Garment':
      return tshirt;
    case 'Wristband':
      return wristband;
    case 'Bag':
      return bag;
    case 'Footwear':
      return sneaker;
    case 'Medical':
      return forearm;
    case 'Industrial':
    case 'Packaging':
    case 'Furniture':
    case 'Other':
    default:
      return parcel;
  }
}
