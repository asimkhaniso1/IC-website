import type {
  Application,
  DesignStatus,
  EdgeStyle,
  ElasticityClass,
  Family,
  Firmness,
  KnittedStyle,
  ThicknessClass,
  WovenStyle,
} from './types';

export const FAMILIES: {
  code: Family;
  slug: 'jacquard' | 'woven' | 'knitted';
  label: string;
  description: string;
  image: string;
}[] = [
  {
    code: 'J',
    slug: 'jacquard',
    label: 'Jacquard Elastic',
    description:
      'Weave your logo, brand name or pattern directly into the elastic. Ideal for branded waistbands and premium trims.',
    image: '/images/studio-jacquard.jpg',
  },
  {
    code: 'W',
    slug: 'woven',
    label: 'Woven Elastic / Tape',
    description:
      'Durable woven elastics and non-elastic tapes with custom stripes, edges and constructions.',
    image: '/images/studio-woven.jpg',
  },
  {
    code: 'K',
    slug: 'knitted',
    label: 'Knitted Elastic',
    description:
      'Soft, lightweight knitted elastics for underwear, medical and general garment applications.',
    image: '/images/studio-knitted.jpg',
  },
];

export const FAMILY_BY_SLUG = Object.fromEntries(
  FAMILIES.map((f) => [f.slug, f])
) as Record<string, (typeof FAMILIES)[number]>;

export const FAMILY_BY_CODE = Object.fromEntries(
  FAMILIES.map((f) => [f.code, f])
) as Record<Family, (typeof FAMILIES)[number]>;

export const DESIGN_STATUSES: DesignStatus[] = [
  'Draft',
  'Submitted',
  'Under Technical Review',
  'Modification Required',
  'Sample Development',
  'Sample Approved',
  'Quoted',
  'Order Confirmed',
  'Rejected',
  'Archived',
];

export const APPLICATIONS: Application[] = [
  'Waistband',
  'Underwear',
  'Sportswear',
  'Activewear',
  'Garment',
  'Footwear',
  'Bag',
  'Medical',
  'Industrial',
  'Packaging',
  'Furniture',
  'Other',
];

/** Standard widths from the Interconverters product range. "Custom" is offered alongside. */
export const STANDARD_WIDTHS_MM = [10, 15, 20, 25, 30, 32, 38, 40, 50];

/** Standard roll lengths (m). "Custom" is offered alongside. */
export const STANDARD_ROLL_LENGTHS_M = [25, 50, 100, 150, 200];

export const EDGE_STYLES: { value: EdgeStyle; label: string }[] = [
  { value: 'straight', label: 'Straight' },
  { value: 'picot', label: 'Picot' },
  { value: 'scallop', label: 'Scallop' },
];

export const THICKNESS_CLASSES: { value: ThicknessClass; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'standard', label: 'Standard' },
  { value: 'heavy', label: 'Heavy Duty' },
];

export const ELASTICITY_CLASSES: { value: ElasticityClass; label: string }[] = [
  { value: 'low', label: 'Low stretch (10–50%)' },
  { value: 'medium', label: 'Medium stretch (50–120%)' },
  { value: 'high', label: 'High stretch (120–200%)' },
  { value: 'custom', label: 'Custom — set target elongation' },
];

export const FIRMNESS_OPTIONS: { value: Firmness; label: string }[] = [
  { value: 'soft', label: 'Soft' },
  { value: 'medium', label: 'Medium' },
  { value: 'firm', label: 'Firm' },
];

export const WOVEN_STYLES: { value: WovenStyle; label: string; description: string }[] = [
  { value: 'standard', label: 'Standard', description: 'Solid single-color woven elastic or tape.' },
  { value: 'striped', label: 'Striped', description: 'Longitudinal stripes in your colors.' },
  { value: 'ribbed', label: 'Ribbed', description: 'Corded / ribbed surface texture.' },
];

export const KNITTED_STYLES: { value: KnittedStyle; label: string; description: string }[] = [
  { value: 'standard', label: 'Standard', description: 'Smooth knitted elastic.' },
  { value: 'ribbed', label: 'Ribbed / Patterned', description: 'Ribbed or subtly patterned knit surface.' },
];

export const RIB_APPEARANCES: { value: 'fine' | 'medium' | 'bold'; label: string }[] = [
  { value: 'fine', label: 'Fine ribs' },
  { value: 'medium', label: 'Medium ribs' },
  { value: 'bold', label: 'Bold ribs' },
];

/**
 * Internal construction library — production terminology for the technical
 * team. Never required from normal customers.
 */
export const CONSTRUCTION_LIBRARY: Record<Family, string[]> = {
  W: ['Plain', 'Twill', 'Ribbed / Corded', 'Striped', 'Jacquard', 'Other'],
  K: ['Crochet', 'Warp Knit', 'Raschel', 'Rib Knit', 'Patterned Knit', 'Other'],
  J: ['Jacquard', 'Other'],
};

/**
 * Studio selection cards. Slugs map onto the three designers — the
 * non-elastic webbing card opens the woven designer preset to non-elastic.
 * Family codes stay J / W / K (never "T").
 */
export const STUDIO_CARDS: {
  slug: 'jacquard' | 'woven' | 'knitted' | 'webbing';
  code: Family;
  label: string;
  description: string;
  styles: string[];
  image: string;
}[] = [
  {
    slug: 'jacquard',
    code: 'J',
    label: 'Jacquard Elastic',
    description: 'Custom logos, text and woven patterns',
    styles: ['Logo', 'Text', 'Repeating pattern'],
    image: '/images/studio-jacquard.jpg',
  },
  {
    slug: 'woven',
    code: 'W',
    label: 'Woven Elastic',
    description: 'Durable woven elastics with custom stripes and edges',
    styles: ['Standard', 'Striped', 'Ribbed'],
    image: '/images/studio-woven.jpg',
  },
  {
    slug: 'knitted',
    code: 'K',
    label: 'Knitted Elastic',
    description: 'Soft, lightweight elastics for underwear and medical use',
    styles: ['Standard', 'Ribbed / Patterned'],
    image: '/images/studio-knitted.jpg',
  },
  {
    slug: 'webbing',
    code: 'W',
    label: 'Non-Elastic Webbing / Tape',
    description: 'Rigid woven tapes and webbing for straps and industrial use',
    styles: ['Standard', 'Striped', 'Custom'],
    image: '/images/4.jpg',
  },
];

/** Manufacturing capability limits (from the Interconverters capability matrix). */
export const CAPABILITIES: Record<
  Family,
  { minWidthMm: number; maxWidthMm: number; maxColors: number; elongation: string }
> = {
  J: { minWidthMm: 10, maxWidthMm: 100, maxColors: 6, elongation: '10% – 200%' },
  W: { minWidthMm: 2, maxWidthMm: 320, maxColors: 8, elongation: '10% – 200%' },
  K: { minWidthMm: 5, maxWidthMm: 150, maxColors: 4, elongation: '10% – 200%' },
};

/** Web-safe fonts offered in the jacquard text tool. */
export const TEXT_FONTS = [
  'Inter',
  'Arial',
  'Verdana',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Impact',
];

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB
export const ACCEPTED_ARTWORK_MIME = ['image/png', 'image/jpeg', 'image/svg+xml'];

export const STRETCH_DISCLAIMER =
  'Stretch visualization is an approximation. Actual elongation, recovery and appearance depend on the approved construction and physical sample.';

export const TECHNICAL_REVIEW_DISCLAIMER =
  'Final construction and manufacturability are subject to review and approval by the Interconverters technical team.';

export const PDF_PREVIEW_DISCLAIMER =
  'Computer-generated design preview. Final appearance may vary according to yarn, construction, weaving/knitting process, finishing and approved physical sample.';

export const COMPANY = {
  name: 'INTERCONVERTERS (PRIVATE) LIMITED',
  address: '24, Sector 12-B, North Karachi Industrial Area, Karachi, Sindh 75850, Pakistan',
  email: 'sales@interconverters.com',
  phone: '+92-21-36958286',
  website: 'https://interconverters.com',
  logo: '/images/LOGO1.png',
};
