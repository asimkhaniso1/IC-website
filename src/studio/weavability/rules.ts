/**
 * Rule-based manufacturability ("weavability") checks — pure, synchronous,
 * no network/AI calls. Runs client-side on every spec change (debounced by
 * the caller) to give the customer an early, non-binding read on whether
 * their design is likely to weave/knit cleanly as specified.
 *
 * Final manufacturability is always subject to Interconverters technical
 * review (see TECHNICAL_REVIEW_DISCLAIMER) — these rules are a helpful
 * heuristic, not a guarantee.
 */
import { defaultCapabilities, type FamilyCapabilities } from '../../lib/capabilities';
import { contrastRatio, normalizeHex } from '../../lib/color';
import type {
  DesignSpec,
  Feasibility,
  JacquardSpec,
  WeavabilityIssue,
  WeavabilityResult,
  WovenSpec,
} from '../../lib/types';

const MIN_CONTRAST = 2.5;

function collectColors(spec: DesignSpec): string[] {
  const colors: string[] = [spec.baseColor];
  if (spec.secondaryColor) colors.push(spec.secondaryColor);
  if (spec.accentColor) colors.push(spec.accentColor);
  if (spec.edgeColor) colors.push(spec.edgeColor);
  if (spec.additionalColors) colors.push(...spec.additionalColors);

  if (spec.family === 'J') {
    const j = spec as JacquardSpec;
    colors.push(j.fg);
    for (const item of j.artwork) {
      if (item.kind === 'text' && item.color) colors.push(item.color);
    }
  }
  if (spec.family === 'W') {
    const w = spec as WovenSpec;
    for (const stripe of w.stripes) colors.push(stripe.color);
  }

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const c of colors) {
    const n = normalizeHex(c) ?? c.toLowerCase();
    if (!seen.has(n)) {
      seen.add(n);
      unique.push(n);
    }
  }
  return unique;
}

function checkColorCount(spec: DesignSpec, cap: FamilyCapabilities, issues: WeavabilityIssue[]): void {
  const max = cap.maxColors;
  const count = collectColors(spec).length;
  if (count > max) {
    issues.push({
      code: 'too-many-colors',
      severity: 'error',
      message: `This design uses ${count} colors, above the ${max}-color limit for this product type.`,
      hint: 'Remove or merge some colors, or ask our team about custom color capability.',
    });
  } else if (count === max) {
    issues.push({
      code: 'too-many-colors',
      severity: 'warn',
      message: `This design is at the ${max}-color limit for this product type — there is no room for additional accent colors.`,
    });
  }
}

function checkWidth(spec: DesignSpec, cap: FamilyCapabilities, issues: WeavabilityIssue[]): void {
  if (spec.widthMm < cap.minWidthMm || spec.widthMm > cap.maxWidthMm) {
    issues.push({
      code: 'width-out-of-range',
      severity: 'error',
      message: `Width ${spec.widthMm.toFixed(1)} mm is outside the buildable range (${cap.minWidthMm}–${cap.maxWidthMm} mm) for this product type.`,
      hint: 'Adjust the width to stay within the manufacturable range.',
    });
  }
}

function checkContrast(fg: string, bg: string, label: string, issues: WeavabilityIssue[]): void {
  const ratio = contrastRatio(fg, bg);
  if (ratio < MIN_CONTRAST) {
    issues.push({
      code: 'low-contrast',
      severity: 'warn',
      message: `Contrast may be insufficient — the ${label} may not stand out after weaving.`,
      hint: 'Choose colors with more brightness difference for a clearer result.',
    });
  }
}

function checkJacquard(spec: JacquardSpec, cap: FamilyCapabilities, issues: WeavabilityIssue[]): void {
  checkContrast(spec.fg, spec.baseColor, 'motif', issues);

  const minText = cap.minTextHeightMm;
  for (const item of spec.artwork) {
    if (item.kind === 'text') {
      const h = item.transform.heightMm;
      if (h < minText * 0.625) {
        issues.push({
          code: 'text-too-small',
          severity: 'error',
          message: `Text "${item.text ?? ''}" is too small to weave clearly at ${h.toFixed(1)} mm tall.`,
          hint: `Increase the text height to at least ${minText} mm.`,
        });
      } else if (h < minText) {
        issues.push({
          code: 'text-too-small',
          severity: 'warn',
          message: `Text "${item.text ?? ''}" may be too small to weave clearly at this size.`,
          hint: `Consider increasing the text height to at least ${minText} mm.`,
        });
      }
      if (h > spec.widthMm * 0.85) {
        issues.push({
          code: 'text-oversized',
          severity: 'warn',
          message: `Text "${item.text ?? ''}" is very tall relative to the fabric width and may not fit cleanly.`,
        });
      }
    }

    if (item.kind === 'image') {
      if (item.transform.widthMm > spec.repeat.lengthMm) {
        issues.push({
          code: 'artwork-exceeds-repeat',
          severity: 'warn',
          message: 'Artwork is wider than the repeat length — it may overlap the next repeat.',
          hint: 'Widen the repeat length or reduce the artwork width.',
        });
      }
      if (spec.repeat.lengthMm < item.transform.widthMm + spec.repeat.spacingMm) {
        issues.push({
          code: 'repeat-dense',
          severity: 'info',
          message: 'Repeat length is tight relative to artwork size and spacing.',
        });
      }
      // Pixel-level fine-detail analysis (downsampling the artwork image and
      // scoring edge density) is a Phase-2 enhancement. For now we use a
      // simple physical-size heuristic to flag likely detail loss.
      if (item.transform.widthMm < 15) {
        issues.push({
          code: 'detail-may-be-lost',
          severity: 'info',
          message: 'Small artwork may lose fine detail during weaving.',
          hint: 'Bold, simple shapes reproduce more reliably at small sizes.',
        });
      }
    }
  }
}

function checkWoven(spec: WovenSpec, issues: WeavabilityIssue[]): void {
  let totalStripeWidth = 0;
  const halfWidth = spec.widthMm / 2;

  for (const stripe of spec.stripes) {
    totalStripeWidth += stripe.widthMm;
    checkContrast(stripe.color, spec.baseColor, 'stripe', issues);

    const stripeStart = stripe.offsetMm - stripe.widthMm / 2;
    const stripeEnd = stripe.offsetMm + stripe.widthMm / 2;
    if (stripeStart < -halfWidth || stripeEnd > halfWidth) {
      issues.push({
        code: 'stripe-out-of-bounds',
        severity: 'warn',
        message: 'A stripe extends past the fabric edge at this width/offset.',
        hint: 'Reduce the stripe width or move it closer to the centerline.',
      });
      break;
    }
  }

  for (let i = 0; i < spec.stripes.length; i++) {
    for (let j = i + 1; j < spec.stripes.length; j++) {
      const a = spec.stripes[i];
      const b = spec.stripes[j];
      const aStart = a.offsetMm - a.widthMm / 2;
      const aEnd = a.offsetMm + a.widthMm / 2;
      const bStart = b.offsetMm - b.widthMm / 2;
      const bEnd = b.offsetMm + b.widthMm / 2;
      if (aStart < bEnd && bStart < aEnd) {
        issues.push({
          code: 'stripe-out-of-bounds',
          severity: 'warn',
          message: 'Two stripes overlap — adjust their offsets or widths.',
        });
      }
    }
  }

  if (totalStripeWidth > spec.widthMm * 0.9) {
    issues.push({
      code: 'stripe-out-of-bounds',
      severity: 'warn',
      message: 'Combined stripe width exceeds 90% of the fabric width, leaving little base color visible.',
    });
  }
}

function checkElongation(spec: DesignSpec, cap: FamilyCapabilities, issues: WeavabilityIssue[]): void {
  if (!spec.elastic || spec.elasticityClass !== 'custom') return;
  if ((spec.customElongationPct ?? 0) > cap.elongation.max) {
    issues.push({
      code: 'elongation-high',
      severity: 'warn',
      message: 'Requested elongation exceeds our standard range — technical review required.',
      hint: 'Our technical team will confirm whether this target elongation is achievable with your chosen construction.',
    });
  }
}

export function checkWeavability(spec: DesignSpec, capabilities?: FamilyCapabilities): WeavabilityResult {
  const issues: WeavabilityIssue[] = [];
  // Live rules from the admin-editable capability library when supplied;
  // hardcoded defaults otherwise (offline / older call sites).
  const cap = capabilities ?? defaultCapabilities()[spec.family];

  checkColorCount(spec, cap, issues);
  checkWidth(spec, cap, issues);
  checkElongation(spec, cap, issues);

  // firmness, style and other optional customer-friendly fields are never
  // required — a spec without them remains fully valid.
  if (spec.family === 'J') checkJacquard(spec as JacquardSpec, cap, issues);
  if (spec.family === 'W') checkWoven(spec as WovenSpec, issues);

  let level: Feasibility = 'suitable';
  if (issues.some((i) => i.severity === 'error')) level = 'modification';
  else if (issues.some((i) => i.severity === 'warn')) level = 'review';

  return { level, issues };
}
