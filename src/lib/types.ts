/**
 * FROZEN TYPE CONTRACTS — Narrow Fabric Design Studio
 *
 * All three build workstreams code against these types. Do not change shapes
 * without coordinating across the studio shell, preview renderer, and
 * persistence layers.
 *
 * Conventions:
 *  - All dimensions are stored in millimetres (mm). `unit` is a display
 *    preference only — convert at input/label boundaries via lib/units.ts.
 *  - All colors are hex strings ("#RRGGBB").
 */

import type * as React from 'react';

// ---------------------------------------------------------------------------
// Core identifiers
// ---------------------------------------------------------------------------

/** Interconverters product family codes. J = Jacquard, W = Woven, K = Knitted. */
export type Family = 'J' | 'W' | 'K';

export type Unit = 'mm' | 'in';

export type DesignStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Technical Review'
  | 'Modification Required'
  | 'Sample Development'
  | 'Sample Approved'
  | 'Quoted'
  | 'Order Confirmed'
  | 'Rejected'
  | 'Archived';

export type Application =
  | 'Waistband'
  | 'Underwear'
  | 'Sportswear'
  | 'Activewear'
  | 'Garment'
  | 'Footwear'
  | 'Bag'
  | 'Medical'
  | 'Industrial'
  | 'Packaging'
  | 'Furniture'
  | 'Other';

export type EdgeStyle = 'straight' | 'picot' | 'scallop';
export type ThicknessClass = 'light' | 'standard' | 'heavy';
/** Customer-friendly stretch selection. 'custom' pairs with customElongationPct. */
export type ElasticityClass = 'low' | 'medium' | 'high' | 'custom';
export type Firmness = 'soft' | 'medium' | 'firm';
export type WovenStyle = 'standard' | 'striped' | 'ribbed';
export type KnittedStyle = 'standard' | 'ribbed';
export type RibAppearance = 'fine' | 'medium' | 'bold';

/**
 * Optional advanced/technical details. Customers may fill these in the
 * collapsed "Advanced / Technical" section; the Interconverters technical
 * team fills them authoritatively in the production specification. All
 * fields are free-text strings in V1 — validation comes with the
 * manufacturing capability library.
 */
export interface TechnicalDetails {
  constructionType?: string;
  yarnType?: string;
  yarnCount?: string;
  warpConfig?: string;
  weftConfig?: string;
  rubberType?: string;
  rubberConfig?: string;
  elasticEnds?: string;
  picksDensity?: string;
  finishedWidthMm?: string;
  elongationPct?: string;
  recoveryPct?: string;
  weightPerMeter?: string;
  gsm?: string;
  thicknessMm?: string;
  tolerance?: string;
  machineRef?: string;
  finishing?: string;
  notes?: string;
}

/**
 * Internal production specification — owned by the technical team, stored
 * SEPARATELY from the customer's design requirement. The customer's choices
 * never automatically become an approved manufacturing specification.
 */
export interface ProductionSpec {
  id: string;
  projectId: string;
  details: TechnicalDetails;
  /** 'draft' until an authorized technical user approves it. */
  status: 'draft' | 'approved';
  updatedBy?: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Design specification (discriminated union by family)
// ---------------------------------------------------------------------------

export interface BaseSpec {
  family: Family;
  /** Customer-facing project name, e.g. "Nike waistband 40mm". */
  name: string;
  widthMm: number;
  /** Display unit preference only — storage is always mm. */
  unit: Unit;
  rollLengthM: number;
  elastic: boolean;
  elasticityClass?: ElasticityClass;
  /** Target elongation % when elasticityClass === 'custom'. */
  customElongationPct?: number;
  /** Customer-friendly feel selection. */
  firmness?: Firmness;
  thicknessClass: ThicknessClass;
  /** Optional free-text construction note (admin may refine). */
  construction?: string;
  baseColor: string;
  secondaryColor?: string;
  accentColor?: string;
  additionalColors?: string[];
  edgeColor?: string;
  edgeStyle: EdgeStyle;
  application: Application;
  notes?: string;
  /** Optional customer-entered advanced details (collapsed section). */
  technical?: TechnicalDetails;
}

/** Position/size of one artwork item on the fabric strip, in mm. */
export interface ArtworkTransform {
  /** Offset along the strip (x) and across the width (y), from strip center of one repeat cell. */
  xMm: number;
  yMm: number;
  rotationDeg: number;
  widthMm: number;
  heightMm: number;
  mirrored: boolean;
}

export interface ArtworkItem {
  id: string;
  kind: 'image' | 'text';
  /** Canonical render source for images (PNG/JPG/SVG as data URL). */
  dataUrl?: string;
  /** Set after upload to Supabase Storage (admin-side canonical copy). */
  storagePath?: string;
  /** For kind === 'text'. */
  text?: string;
  fontFamily?: string;
  fontWeight?: number;
  /** Render color (foreground) for text / monochrome treatment. */
  color: string;
  transform: ArtworkTransform;
}

export interface Colorway {
  id: string;
  label: 'A' | 'B' | 'C';
  fg: string;
  bg: string;
  edge?: string;
}

export interface JacquardSpec extends BaseSpec {
  family: 'J';
  artwork: ArtworkItem[];
  /** Active foreground color (pattern/motif color). */
  fg: string;
  repeat: {
    lengthMm: number;
    spacingMm: number;
    mirror: boolean;
    reverse: boolean;
  };
  colorways: Colorway[];
  activeColorway?: string;
}

export interface WovenStripe {
  id: string;
  color: string;
  widthMm: number;
  /** Offset of stripe center from fabric centerline (negative = toward top edge). */
  offsetMm: number;
}

export interface WovenSpec extends BaseSpec {
  family: 'W';
  /** Customer-facing style. Missing (older designs) → treat as 'striped' when stripes exist, else 'standard'. */
  style?: WovenStyle;
  stripes: WovenStripe[];
  ribAppearance?: RibAppearance;
  rubber: 'single' | 'double' | 'none';
}

export interface KnittedSpec extends BaseSpec {
  family: 'K';
  /** Customer-facing style. Missing (older designs) → 'standard'. */
  style?: KnittedStyle;
  ribAppearance?: RibAppearance;
  rubber: boolean;
}

export type DesignSpec = JacquardSpec | WovenSpec | KnittedSpec;

// ---------------------------------------------------------------------------
// Preview contract (owned by studio/preview; consumed by all designers)
// ---------------------------------------------------------------------------

export type PreviewMode = 'flat' | 'roll' | 'repeat' | 'application';

export interface PreviewHandle {
  /** Rasterize current preview to a PNG data URL. Default ~4 px/mm. */
  toPngDataUrl(pxPerMm?: number): Promise<string>;
}

export interface PreviewProps {
  spec: DesignSpec;
  mode: PreviewMode;
  showGrid?: boolean;
  showRuler?: boolean;
  /** Enables in-preview artwork drag/rotate/resize (jacquard). */
  interactive?: boolean;
  /** Preview-driven edits (e.g. artwork drag) write back through this. */
  onSpecChange?(next: DesignSpec): void;
  previewRef?: React.Ref<PreviewHandle>;
  className?: string;
}

// ---------------------------------------------------------------------------
// Weavability (rule-based manufacturability check)
// ---------------------------------------------------------------------------

export type Feasibility = 'suitable' | 'review' | 'modification';

export interface WeavabilityIssue {
  code: string;
  severity: 'info' | 'warn' | 'error';
  message: string;
  hint?: string;
}

export interface WeavabilityResult {
  level: Feasibility;
  issues: WeavabilityIssue[];
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export interface DesignRecord {
  /** Storage id (uuid, or local draft id). */
  id: string;
  /** e.g. "J-DES-000001", or "LOCAL-J-0001" for unsynced local drafts. */
  designCode: string;
  family: Family;
  status: DesignStatus;
  revisionNo: number; // display as -R01 etc.
  spec: DesignSpec;
  weavability?: WeavabilityResult;
  createdAt: string;
  updatedAt: string;
}

export interface RfqInput {
  designId: string;
  kind: 'sample' | 'quote';
  contactName: string;
  company?: string;
  email: string;
  phone?: string;
  country?: string;
  quantity?: string;
  quantityUnit?: string;
  annualRequirement?: string;
  targetPrice?: string;
  targetDate?: string;
  application?: string;
  message?: string;
}

export interface RfqResult {
  ok: boolean;
  /** Design code / RFQ reference on success. */
  reference?: string;
  reason?: string;
}

export interface StorageAdapter {
  mode: 'local' | 'supabase';
  /** Creates a design (no id) or writes a new revision (existing id). */
  saveDesign(
    spec: DesignSpec,
    opts?: { id?: string; weavability?: WeavabilityResult }
  ): Promise<DesignRecord>;
  getDesign(id: string): Promise<DesignRecord | null>;
  /** Designs owned by this browser's owner token, newest first. */
  listMyDesigns(): Promise<DesignRecord[]>;
  submitRfq(input: RfqInput): Promise<RfqResult>;
  uploadArtwork(designId: string, file: File): Promise<{ storagePath?: string }>;
}

// ---------------------------------------------------------------------------
// Designer module contract — how DesignerPage mounts each family's designer
// ---------------------------------------------------------------------------
//
// Fixed export paths (import contract):
//   src/studio/designers/jacquard/index.ts → export const jacquardDesigner: DesignerModule<JacquardSpec>
//   src/studio/designers/woven/index.ts    → export const wovenDesigner: DesignerModule<WovenSpec>
//   src/studio/designers/knitted/index.ts  → export const knittedDesigner: DesignerModule<KnittedSpec>
//   src/studio/weavability/rules.ts        → export function checkWeavability(spec: DesignSpec): WeavabilityResult
//   src/pdf/specSheet.ts                   → export async function generateSpecPdf(rec: DesignRecord, previewPng: string): Promise<Blob>
//   src/rfq/RfqDialog.tsx                  → export const RfqDialog: React.FC<RfqDialogProps>

export interface DesignerControlsProps<S extends DesignSpec = DesignSpec> {
  spec: S;
  onChange(next: S): void;
  disabled?: boolean;
}

export interface DesignerModule<S extends DesignSpec = DesignSpec> {
  family: Family;
  label: string;
  description: string;
  createDefaultSpec(): S;
  Controls: React.FC<DesignerControlsProps<S>>;
}

export interface RfqDialogProps {
  design: DesignRecord;
  previewPng?: string;
  open: boolean;
  onClose(): void;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface DesignReview {
  id: string;
  projectId: string;
  author?: string;
  comment: string;
  internal: boolean;
  decision?: string;
  createdAt: string;
}

export interface RfqRecord extends RfqInput {
  id: string;
  designCode?: string;
  status: string;
  createdAt: string;
}
