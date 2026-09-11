/**
 * Direct "Request a Quote" entry point — for a customer who wants to send a
 * quotation/sample request WITHOUT first building a full design in the
 * Studio. Picking a family + filling this short form auto-creates a minimal
 * design record (same createDefaultSpec() the Studio itself uses) with any
 * uploaded artwork attached, then submits an RFQ against it exactly like
 * RfqDialog does — so it flows through the identical downstream pipeline
 * (Sample Development, Costing, Quotations) as a Studio-built design.
 */
import { useRef, useState } from 'react';
import { CheckCircle2, Download, ExternalLink, Info, Loader2, Mail, UploadCloud } from 'lucide-react';
import type { DesignSpec, Family, JacquardSpec, RfqInput, RfqResult } from '../lib/types';
import { getStorageAdapter } from '../lib/storage';
import { generateSpecPdf } from '../pdf/specSheet';
import {
  ACCEPTED_ARTWORK_MIME,
  APPLICATIONS,
  COMPANY,
  FAMILIES,
  MAX_UPLOAD_BYTES,
  TECHNICAL_REVIEW_DISCLAIMER,
} from '../lib/constants';
import { jacquardDesigner } from '../studio/designers/jacquard';
import { wovenDesigner } from '../studio/designers/woven';
import { knittedDesigner } from '../studio/designers/knitted';
import { Button, Field, Modal, Select, TextArea, TextInput } from '../components/ui/index';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormState {
  contactName: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  quantity: string;
  quantityUnit: string;
  annualRequirement: string;
  targetPrice: string;
  targetDate: string;
  application: string;
  message: string;
  oekoTex100: boolean;
}

function initialForm(): FormState {
  return {
    contactName: '',
    company: '',
    email: '',
    phone: '',
    country: '',
    quantity: '',
    quantityUnit: 'meters',
    annualRequirement: '',
    targetPrice: '',
    targetDate: '',
    application: APPLICATIONS[0],
    message: '',
    oekoTex100: false,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

function defaultSpecFor(family: Family): DesignSpec {
  if (family === 'J') return jacquardDesigner.createDefaultSpec();
  if (family === 'W') return wovenDesigner.createDefaultSpec();
  return knittedDesigner.createDefaultSpec();
}

function slugFor(family: Family): string {
  return FAMILIES.find((f) => f.code === family)?.slug ?? 'jacquard';
}

export function QuickQuoteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [family, setFamily] = useState<Family>('J');
  const [kind, setKind] = useState<'sample' | 'quote'>('quote');
  const [form, setForm] = useState<FormState>(initialForm);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'failure'>('idle');
  const [result, setResult] = useState<(RfqResult & { designId?: string; designUrl?: string }) | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  function reset() {
    setFamily('J');
    setKind('quote');
    setForm(initialForm());
    setArtworkFile(null);
    setFileError(null);
    setErrors({});
    setStatus('idle');
    setResult(null);
  }

  function close() {
    reset();
    onClose();
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleFile(file: File) {
    setFileError(null);
    if (!ACCEPTED_ARTWORK_MIME.includes(file.type)) {
      setFileError('Unsupported file type. Please upload PNG, JPG, SVG or PDF artwork.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setFileError(`File is too large (max ${(MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0)} MB).`);
      return;
    }
    setArtworkFile(file);
  }

  async function handleSubmit() {
    const nextErrors: Record<string, string> = {};
    if (!form.contactName.trim()) nextErrors.contactName = 'Required';
    if (!form.email.trim()) nextErrors.email = 'Required';
    else if (!EMAIL_RE.test(form.email.trim())) nextErrors.email = 'Enter a valid email address';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus('submitting');
    try {
      const spec = defaultSpecFor(family);
      if (form.application) spec.application = form.application as DesignSpec['application'];

      if (artworkFile) {
        const dataUrl = await readFileAsDataUrl(artworkFile);
        spec.referenceArtworkDataUrl = dataUrl;
        // Jacquard has an actual place to weave the logo in — attach it as a
        // real artwork item too, positioned/sized the same way the Studio's
        // own upload does, so it's immediately visible if they open it later.
        if (spec.family === 'J') {
          const j = spec as JacquardSpec;
          const widthMm = j.widthMm * 0.6;
          j.artwork = [
            {
              id: crypto.randomUUID(),
              kind: 'image',
              dataUrl,
              color: j.fg,
              transform: { xMm: 0, yMm: 0, rotationDeg: 0, widthMm, heightMm: widthMm, mirrored: false },
            },
          ];
        }
      }

      const rec = await getStorageAdapter().saveDesign(spec);
      const designUrl = `${COMPANY.website}/studio/${slugFor(family)}/${rec.id}`;

      const input: RfqInput = {
        designId: rec.id,
        kind,
        contactName: form.contactName.trim(),
        company: form.company.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        country: form.country.trim() || undefined,
        quantity: form.quantity.trim() || undefined,
        quantityUnit: form.quantity.trim() ? form.quantityUnit : undefined,
        annualRequirement: form.annualRequirement.trim() || undefined,
        targetPrice: form.targetPrice.trim() || undefined,
        targetDate: form.targetDate || undefined,
        application: form.application || undefined,
        message: form.message.trim() || undefined,
        oekoTex100: form.oekoTex100,
      };

      const res = await getStorageAdapter().submitRfq(input);
      setResult({ ...res, designId: rec.id, designUrl });
      setStatus(res.ok ? 'success' : 'failure');

      if (res.ok) {
        // Best-effort email notification — never blocks or affects the
        // submission result (the RFQ is already stored).
        void fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'rfq',
            data: {
              designCode: rec.designCode,
              designUrl,
              requestType: kind === 'sample' ? 'Sample request' : 'Quotation request',
              contactName: input.contactName,
              company: input.company ?? '',
              email: input.email,
              phone: input.phone ?? '',
              country: input.country ?? '',
              application: input.application ?? '',
              quantity: input.quantity ? `${input.quantity} ${input.quantityUnit ?? ''}`.trim() : '',
              annualRequirement: input.annualRequirement ?? '',
              targetPrice: input.targetPrice ?? '',
              targetDate: input.targetDate ?? '',
              message: input.message ?? '',
              oekoTex100: input.oekoTex100 ? 'Yes' : 'No',
              artwork: artworkFile ? 'Attached' : 'None',
            },
          }),
        }).catch(() => undefined);
      }
    } catch (err) {
      setResult({ ok: false, reason: err instanceof Error ? err.message : 'Something went wrong.' });
      setStatus('failure');
    }
  }

  async function handleDownload() {
    if (!result?.designId || !result.reference) return;
    setPdfBusy(true);
    try {
      const spec = defaultSpecFor(family);
      const blob = await generateSpecPdf(
        {
          id: result.designId,
          designCode: result.reference,
          family,
          status: 'Draft',
          revisionNo: 1,
          spec,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ''
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.reference}-spec.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      /* best-effort — surface nothing fatal, user can retry */
    } finally {
      setPdfBusy(false);
    }
  }

  const mailtoHref = `mailto:${COMPANY.email}?subject=${encodeURIComponent('Quotation enquiry')}&body=${encodeURIComponent(
    'Hello Interconverters team,\n\nI would like to request a quotation.\n\n'
  )}`;
  const adapterMode = getStorageAdapter().mode;

  return (
    <Modal open={open} onClose={close} wide title={status === 'success' ? 'Request Submitted' : 'Request a Quotation'}>
      {status === 'success' && result && (
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <CheckCircle2 className="w-14 h-14 text-green-600" />
          <div>
            <h3 className="text-base font-bold text-slate-900">Request {result.reference} submitted</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md">
              Our technical team will review your request and contact you shortly. We've started a design record
              from your details — open it any time to refine it in the Design Studio.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <a
              href={result.designUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-white hover:bg-slate-50 text-brand-600 border border-brand-600/30 transition-all"
            >
              <ExternalLink className="w-4 h-4" /> Open in Design Studio
            </a>
            <Button variant="secondary" onClick={handleDownload} disabled={pdfBusy}>
              {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download Spec PDF
            </Button>
            <Button variant="primary" onClick={close}>
              Close
            </Button>
          </div>
        </div>
      )}

      {status === 'failure' && result && (
        <div className="flex flex-col gap-4 py-2">
          <div className="flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1">
                {adapterMode === 'local' ? 'Online submission is not available yet' : 'Could not submit online'}
              </p>
              <p>{result.reason ?? 'Please try again, or contact us directly.'}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={mailtoHref}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-white hover:bg-slate-50 text-brand-600 border border-brand-600/30 transition-all"
            >
              <Mail className="w-4 h-4" />
              Email {COMPANY.email}
            </a>
            <Button variant="ghost" onClick={() => setStatus('idle')}>
              Back to form
            </Button>
          </div>
        </div>
      )}

      {(status === 'idle' || status === 'submitting') && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-slate-500 -mt-1">
            Tell us what you need — no need to build a full design in the Studio first. You can always open the
            design we create from this and refine it later.
          </p>

          {/* Kind toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 self-start">
            {(
              [
                ['quote', 'Get Quotation'],
                ['sample', 'Request Sample'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                  kind === value ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Field label="Product Type *" htmlFor="qq-family">
            <Select id="qq-family" value={family} onChange={(e) => setFamily(e.target.value as Family)}>
              {FAMILIES.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Contact Name *" htmlFor="qq-name">
              <TextInput
                id="qq-name"
                value={form.contactName}
                onChange={(e) => set('contactName', e.target.value)}
                placeholder="Full name"
              />
              {errors.contactName && <p className="text-xs text-red-600">{errors.contactName}</p>}
            </Field>
            <Field label="Company" htmlFor="qq-company">
              <TextInput
                id="qq-company"
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                placeholder="Company name"
              />
            </Field>
            <Field label="Email *" htmlFor="qq-email">
              <TextInput
                id="qq-email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="you@company.com"
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </Field>
            <Field label="Phone / WhatsApp" htmlFor="qq-phone">
              <TextInput
                id="qq-phone"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+1 555 000 0000"
              />
            </Field>
            <Field label="Country" htmlFor="qq-country">
              <TextInput
                id="qq-country"
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                placeholder="Country"
              />
            </Field>
            <Field label="Application" htmlFor="qq-application">
              <Select id="qq-application" value={form.application} onChange={(e) => set('application', e.target.value)}>
                {APPLICATIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Quantity" htmlFor="qq-quantity">
              <div className="flex gap-2">
                <TextInput
                  id="qq-quantity"
                  value={form.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                  placeholder="e.g. 5000"
                  className="flex-1"
                />
                <Select value={form.quantityUnit} onChange={(e) => set('quantityUnit', e.target.value)} className="w-32">
                  <option value="meters">Meters</option>
                  <option value="rolls">Rolls</option>
                  <option value="pieces">Pieces</option>
                </Select>
              </div>
            </Field>
            <Field label="Annual Requirement" htmlFor="qq-annual">
              <TextInput
                id="qq-annual"
                value={form.annualRequirement}
                onChange={(e) => set('annualRequirement', e.target.value)}
                placeholder="e.g. 200,000 m / year"
              />
            </Field>
            <Field label="Target Price (optional)" htmlFor="qq-price">
              <TextInput
                id="qq-price"
                value={form.targetPrice}
                onChange={(e) => set('targetPrice', e.target.value)}
                placeholder="e.g. $0.05 / m"
              />
            </Field>
            <Field label="Target Date" htmlFor="qq-date">
              <TextInput id="qq-date" type="date" value={form.targetDate} onChange={(e) => set('targetDate', e.target.value)} />
            </Field>
          </div>

          <Field label="Artwork / Logo (optional)">
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_ARTWORK_MIME.join(',')}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = '';
              }}
            />
            <div className="flex items-center gap-3 flex-wrap">
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <UploadCloud className="w-4 h-4" /> {artworkFile ? 'Replace file' : 'Upload artwork / logo'}
              </Button>
              {artworkFile && (
                <span className="text-xs text-slate-600 flex items-center gap-2">
                  {artworkFile.name}
                  <button
                    type="button"
                    onClick={() => setArtworkFile(null)}
                    className="text-red-600 font-bold hover:underline"
                  >
                    Remove
                  </button>
                </span>
              )}
            </div>
            {fileError && <p className="text-xs font-medium text-red-600 mt-1">{fileError}</p>}
            <p className="text-[11px] text-slate-400 mt-1">PNG, JPG, SVG or PDF, up to {(MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0)} MB.</p>
          </Field>

          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 accent-brand-600"
              checked={form.oekoTex100}
              onChange={(e) => set('oekoTex100', e.target.checked)}
            />
            <span>
              Requires <b>OEKO-TEX Standard 100</b> certified quality
              <span className="block text-xs text-slate-400">Tell us upfront if this order/sample needs OEKO-TEX certified yarn and finishing.</span>
            </span>
          </label>

          <Field label="Message / Special Requirements" htmlFor="qq-message">
            <TextArea
              id="qq-message"
              rows={3}
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
              placeholder="Anything else our technical team should know…"
            />
          </Field>

          <p className="text-[11px] leading-relaxed text-slate-400 italic">{TECHNICAL_REVIEW_DISCLAIMER}</p>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close} disabled={status === 'submitting'}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={status === 'submitting'}>
              {status === 'submitting' && <Loader2 className="w-4 h-4 animate-spin" />}
              {kind === 'sample' ? 'Submit Sample Request' : 'Submit Quotation Request'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default QuickQuoteDialog;
