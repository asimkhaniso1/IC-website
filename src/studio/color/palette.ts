/**
 * Realistic yarn-shade palette shown in the color picker swatch grid.
 *
 * NOTE: This is a curated approximation for on-screen preview purposes only.
 * A proper Pantone / shade-card mapping (with dE tolerances against physical
 * yarn cones) is a Phase-2 integration once the technical team supplies the
 * official shade-card reference data.
 */
export interface YarnShade {
  name: string;
  hex: string;
}

export const YARN_PALETTE: YarnShade[] = [
  { name: 'Black', hex: '#0a0a0a' },
  { name: 'Optic White', hex: '#fafafa' },
  { name: 'Navy', hex: '#0f1f3d' },
  { name: 'Royal Blue', hex: '#1d4fd8' },
  { name: 'Sky Blue', hex: '#5aa9e6' },
  { name: 'Turquoise', hex: '#1fb6ac' },
  { name: 'Bottle Green', hex: '#0f3d2e' },
  { name: 'Olive', hex: '#5c5a2e' },
  { name: 'Khaki', hex: '#a89f6c' },
  { name: 'Beige', hex: '#e3d4b6' },
  { name: 'Tan', hex: '#c9a26d' },
  { name: 'Cream', hex: '#f4ecd8' },
  { name: 'Brown', hex: '#5a3a24' },
  { name: 'Red', hex: '#c81e2c' },
  { name: 'Bordeaux', hex: '#5c1826' },
  { name: 'Pink', hex: '#e5879a' },
  { name: 'Fuchsia', hex: '#c8207f' },
  { name: 'Purple', hex: '#5b3182' },
  { name: 'Yellow', hex: '#f2c318' },
  { name: 'Gold', hex: '#c99a2e' },
  { name: 'Orange', hex: '#e0631f' },
  { name: 'Grey Melange', hex: '#9aa0a6' },
  { name: 'Charcoal', hex: '#333638' },
  { name: 'Silver', hex: '#c6cbd1' },
];
