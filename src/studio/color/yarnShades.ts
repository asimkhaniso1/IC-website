/**
 * Interconverters internal yarn shade card, seeded from the curated
 * YARN_PALETTE approximations. Shade codes (IC-001…) are placeholders
 * until the factory shade card is imported into capability_rules.
 */
export interface YarnShade {
  code: string;
  name: string;
  hex: string;
}

export const YARN_SHADE_CARD: YarnShade[] = [
  { code: 'IC-001', name: 'Black', hex: '#0a0a0a' },
  { code: 'IC-002', name: 'Optic White', hex: '#fafafa' },
  { code: 'IC-003', name: 'Navy', hex: '#0f1f3d' },
  { code: 'IC-004', name: 'Royal Blue', hex: '#1d4fd8' },
  { code: 'IC-005', name: 'Sky Blue', hex: '#5aa9e6' },
  { code: 'IC-006', name: 'Turquoise', hex: '#1fb6ac' },
  { code: 'IC-007', name: 'Bottle Green', hex: '#0f3d2e' },
  { code: 'IC-008', name: 'Olive', hex: '#5c5a2e' },
  { code: 'IC-009', name: 'Khaki', hex: '#a89f6c' },
  { code: 'IC-010', name: 'Beige', hex: '#e3d4b6' },
  { code: 'IC-011', name: 'Tan', hex: '#c9a26d' },
  { code: 'IC-012', name: 'Cream', hex: '#f4ecd8' },
  { code: 'IC-013', name: 'Brown', hex: '#5a3a24' },
  { code: 'IC-014', name: 'Red', hex: '#c81e2c' },
  { code: 'IC-015', name: 'Bordeaux', hex: '#5c1826' },
  { code: 'IC-016', name: 'Pink', hex: '#e5879a' },
  { code: 'IC-017', name: 'Fuchsia', hex: '#c8207f' },
  { code: 'IC-018', name: 'Purple', hex: '#5b3182' },
  { code: 'IC-019', name: 'Yellow', hex: '#f2c318' },
  { code: 'IC-020', name: 'Gold', hex: '#c99a2e' },
  { code: 'IC-021', name: 'Orange', hex: '#e0631f' },
  { code: 'IC-022', name: 'Grey Melange', hex: '#9aa0a6' },
  { code: 'IC-023', name: 'Charcoal', hex: '#333638' },
  { code: 'IC-024', name: 'Silver', hex: '#c6cbd1' },
];
