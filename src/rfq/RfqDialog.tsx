import { useEffect, useState } from 'react';
import { CheckCircle2, Download, Info, Mail, Loader2 } from 'lucide-react';
import type { DesignSpec, JacquardSpec, RfqDialogProps, RfqInput, RfqResult } from '../lib/types';
import { getStorageAdapter } from '../lib/storage';
import { generateSpecPdf } from '../pdf/specSheet';
import { APPLICATIONS, COMPANY, FAMILY_BY_CODE, TECHNICAL_REVIEW_DISCLAIMER } from '../lib/constants';
import { Badge, Button, ColorSwatch, Field, Modal, Select, TextArea, TextInput } from '../components/ui';

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
}

function specColors(spec: DesignSpec): string[] {
  const colors = [spec.baseColor];
  if (spec.secondaryColor) colors.push(spec.secondaryColor);
  if (spec.edgeColor) colors.push(spec.edgeColor);
  if (spec.additionalColors) colors.push(...spec.additionalColors);
  if (spec.family === 'J') colors.push((spec as JacquardSpec).fg);
  return Array.from(new Set(colors));
}

function initialForm(spec: DesignSpec): FormState {
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
    application: spec.application,
    message: '',
  };
}

async function downloadSpecPdf(designId: string, designCode: string, spec: DesignSpec, weavability: RfqDialogProps['design']['weavability'], previewPng: string) {
  const blob = await generateSpecPdf(
    {
      id: designId,
      designCode,
      family: spec.family,
      status: 'Draft',
      revisionNo: 1,
      spec,
      weavability,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    previewPng
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${designCode}-spec.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const RfqDialog: React.FC<RfqDialogProps> = ({ design, previewPng, open, onClose }) => {
  const [kind, setKind] = useState<'sample' | 'quote'>('sample');
  const [form, setForm] = useState<FormState>(() => initialForm(design.spec));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'failure'>('idle');
  const [result, setResult] = useState<RfqResult | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialForm(design.spec));
      setKind('sample');
      setStatus('idle');
      setResult(null);
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, design.id]);

  const familyLabel = FAMILY_BY_CODE[design.family]?.label ?? design.family;
  const colors = specColors(design.spec);
  const adapterMode = getStorageAdapter().mode;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    const nextErrors: Record<string, string> = {};
    if (!form.contactName.trim()) nextErrors.contactName = 'Required';
    if (!form.email.trim()) nextErrors.email = 'Required';
    else if (!EMAIL_RE.test(form.email.trim())) nextErrors.email = 'Enter a valid email address';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus('submitting');
    const input: RfqInput = {
      designId: design.id,
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
    };

    try {
      const res = await getStorageAdapter().submitRfq(input);
      setResult(res);
      setStatus(res.ok ? 'success' : 'failure');
    } catch (err) {
      setResult({ ok: false, reason: err instanceof Error ? err.message : 'Something went wrong.' });
      setStatus('failure');
    }
  }

  async function handleDownload() {
    setPdfBusy(true);
    try {
      await downloadSpecPdf(design.id, design.designCode, design.spec, design.weavability, previewPng ?? '');
    } catch {
      // best-effort — surface nothing fatal, user can retry
    } finally {
      setPdfBusy(false);
    }
  }

  const mailtoHref = `mailto:${COMPANY.email}?subject=${encodeURIComponent(`Design enquiry ${design.designCode}`)}&body=${encodeURIComponent(
    `Hello Interconverters team,\n\nI would like to enquire about design ${design.designCode}.\n\n`
  )}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={status === 'success' ? 'Request Submitted' : 'Request Sample / Quotation'}
    >
      {/* Design summary strip */}
      <div className="flex items-center gap-3 p-3 mb-5 rounded-xl bg-slate-50 border border-slate-200">
        {previewPng ? (
          <img
            src={previewPng}
            alt="Design preview"
            className="w-14 h-14 object-contain rounded-lg border border-slate-200 bg-white shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg border border-slate-200 bg-white shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-slate-900">{design.designCode}</span>
            <Badge tone="brand">{familyLabel}</Badge>
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">{design.spec.name || 'Untitled design'}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {colors.slice(0, 6).map((c, i) => (
            <ColorSwatch key={`${c}-${i}`} color={c} size="sm" />
          ))}
        </div>
      </div>

      {status === 'success' && result && (
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <CheckCircle2 className="w-14 h-14 text-green-600" />
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Request {result.reference ?? design.designCode} submitted
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md">
              Our technical team will review your design and contact you shortly. The full design specification is
              attached to your design record.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleDownload} disabled={pdfBusy}>
              {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download Spec PDF
            </Button>
            <Button variant="primary" onClick={onClose}>
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
            <Button variant="secondary" onClick={handleDownload} disabled={pdfBusy}>
              {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download Spec PDF
            </Button>
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
          {/* Kind toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 self-start">
            {(
              [
                ['sample', 'Request Sample'],
                ['quote', 'Get Quotation'],
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Contact Name *" htmlFor="rfq-name">
              <TextInput
                id="rfq-name"
                value={form.contactName}
                onChange={(e) => set('contactName', e.target.value)}
                placeholder="Full name"
              />
              {errors.contactName && <p className="text-xs text-red-600">{errors.contactName}</p>}
            </Field>
            <Field label="Company" htmlFor="rfq-company">
              <TextInput
                id="rfq-company"
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                placeholder="Company name"
              />
            </Field>
            <Field label="Email *" htmlFor="rfq-email">
              <TextInput
                id="rfq-email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="you@company.com"
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </Field>
            <Field label="Phone / WhatsApp" htmlFor="rfq-phone">
              <TextInput
                id="rfq-phone"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+1 555 000 0000"
              />
            </Field>
            <Field label="Country" htmlFor="rfq-country">
              <TextInput
                id="rfq-country"
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                placeholder="Country"
              />
            </Field>
            <Field label="Application" htmlFor="rfq-application">
              <Select
                id="rfq-application"
                value={form.application}
                onChange={(e) => set('application', e.target.value)}
              >
                {APPLICATIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Quantity" htmlFor="rfq-quantity">
              <div className="flex gap-2">
                <TextInput
                  id="rfq-quantity"
                  value={form.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                  placeholder="e.g. 5000"
                  className="flex-1"
                />
                <Select
                  value={form.quantityUnit}
                  onChange={(e) => set('quantityUnit', e.target.value)}
                  className="w-32"
                >
                  <option value="meters">Meters</option>
                  <option value="rolls">Rolls</option>
                  <option value="pieces">Pieces</option>
                </Select>
              </div>
            </Field>
            <Field label="Annual Requirement" htmlFor="rfq-annual">
              <TextInput
                id="rfq-annual"
                value={form.annualRequirement}
                onChange={(e) => set('annualRequirement', e.target.value)}
                placeholder="e.g. 200,000 m / year"
              />
            </Field>
            <Field label="Target Price (optional)" htmlFor="rfq-price">
              <TextInput
                id="rfq-price"
                value={form.targetPrice}
                onChange={(e) => set('targetPrice', e.target.value)}
                placeholder="e.g. $0.05 / m"
              />
            </Field>
            <Field label="Target Date" htmlFor="rfq-date">
              <TextInput
                id="rfq-date"
                type="date"
                value={form.targetDate}
                onChange={(e) => set('targetDate', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Message / Special Requirements" htmlFor="rfq-message">
            <TextArea
              id="rfq-message"
              rows={3}
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
              placeholder="Anything else our technical team should know…"
            />
          </Field>

          <p className="text-[11px] leading-relaxed text-slate-400 italic">{TECHNICAL_REVIEW_DISCLAIMER}</p>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={status === 'submitting'}>
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
};

export default RfqDialog;
