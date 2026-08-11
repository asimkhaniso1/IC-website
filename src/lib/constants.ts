import type {
  Application,
  DesignStatus,
  EdgeStyle,
  ElasticityClass,
  Family,
  ThicknessClass,
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
    image: '/images/1.jpg',
  },
  {
    code: 'W',
    slug: 'woven',
    label: 'Woven Elastic / Tape',
    description:
      'Durable woven elastics and non-elastic tapes with custom stripes, edges and constructions.',
    image: '/images/6.jpg',
  },
  {
    code: 'K',
    slug: 'knitted',
    label: 'Knitted Elastic',
    description:
      'Soft, lightweight knitted elastics for underwear, medical and general garment applications.',
    image: '/images/Knitted-High-Elastic-Bandage.jpg',
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
  'Garment',
  'Footwear',
  'Bag',
  'Medical',
  'Industrial',
  'Packaging',
  'Furniture',
  'Other',
];

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
