/**
 * POST /api/notify — emails the CUSTOMER a confirmation of their website
 * inquiry (RFQ / sample request or contact-form message) and CCs the
 * Interconverters sales inbox so the team has the same copy.
 *
 * Transport: Resend (preferred — RESEND_API_KEY, domain interconverters.com
 * verified in Resend) or SMTP (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS) as a
 * fallback when no Resend key is set.
 *
 * Env:
 *   RESEND_API_KEY — Resend transport
 *   SMTP_*         — SMTP transport (used only when RESEND_API_KEY is absent)
 *   NOTIFY_CC      — internal copy recipient, default sales@interconverters.com
 *   NOTIFY_FROM    — sender, default "Interconverters <sales@interconverters.com>"
 *
 * Request: { kind: 'rfq' | 'contact', data: Record<string, string> }
 *
 * Recipients are never chosen freely by the caller: the customer copy goes
 * to the email they typed into the form (so it only ever goes to themselves)
 * and the CC is the fixed internal inbox — no open-relay risk.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

const DEFAULT_CC = 'sales@interconverters.com';
const DEFAULT_FROM = 'Interconverters <sales@interconverters.com>';
const MAX_FIELD_LEN = 4000;
const MAX_FIELDS = 30;

const COMPANY = {
  name: 'INTERCONVERTERS (PRIVATE) LIMITED',
  address: '24, Sector 12-B, North Karachi Industrial Area, Karachi, Sindh 75850, Pakistan',
  phone: '+92-21-36958286',
  email: 'sales@interconverters.com',
  website: 'https://interconverters.com',
};

/** Fields shown to the customer, with friendly labels. */
const FIELD_LABELS: Record<string, string> = {
  designCode: 'Design ID',
  requestType: 'Request type',
  name: 'Name',
  contactName: 'Name',
  company: 'Company',
  email: 'Email',
  phone: 'Phone / WhatsApp',
  country: 'Country',
  application: 'Application',
  quantity: 'Quantity',
  annualRequirement: 'Annual requirement',
  targetPrice: 'Target price',
  targetDate: 'Target date',
  subject: 'Subject',
  message: 'Message',
};
/** Internal/duplicate keys never shown in the email body. */
const HIDDEN_KEYS = new Set(['_hp', 'firstName', 'lastName', 'designUrl']);

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isEmail(v: unknown): v is string {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const smtp = {
    host: process.env.SMTP_HOST?.trim(),
    port: Number(process.env.SMTP_PORT ?? 465),
    user: process.env.SMTP_USER?.trim(),
    pass: process.env.SMTP_PASS,
  };
  const smtpConfigured = Boolean(smtp.host && smtp.user && smtp.pass);
  if (!resendKey && !smtpConfigured) {
    res.status(503).json({
      error: 'not_configured',
      message: 'No email transport configured — set RESEND_API_KEY (or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS).',
    });
    return;
  }

  const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) as {
    kind?: string;
    data?: Record<string, unknown>;
  };
  const kind = body?.kind === 'rfq' ? 'rfq' : body?.kind === 'contact' ? 'contact' : null;
  const raw = body?.data;
  if (!kind || !raw || typeof raw !== 'object') {
    res.status(400).json({ error: 'bad_request', message: 'kind and data are required.' });
    return;
  }

  // Honeypot: bots that fill every field trip this and get a silent "ok".
  if (typeof raw._hp === 'string' && raw._hp.trim() !== '') {
    res.status(200).json({ ok: true });
    return;
  }

  const entries = Object.entries(raw)
    .filter(([k, v]) => !HIDDEN_KEYS.has(k) && typeof v === 'string' && (v as string).trim() !== '')
    .slice(0, MAX_FIELDS)
    .map(([k, v]) => [k, (v as string).trim().slice(0, MAX_FIELD_LEN)] as const);
  if (entries.length === 0) {
    res.status(400).json({ error: 'bad_request', message: 'No form data.' });
    return;
  }
  const data = Object.fromEntries(entries);

  const customerEmail = isEmail(data.email) ? data.email.trim() : null;
  const customerName = (data.contactName || data.name || '').toString().trim();
  const designCode = data.designCode ? String(data.designCode) : '';
  const designUrl = typeof raw.designUrl === 'string' ? raw.designUrl : '';

  const subject =
    kind === 'rfq'
      ? `We received your ${data.requestType ? String(data.requestType).toLowerCase() : 'request'}${designCode ? ` — ${designCode}` : ''}`
      : 'Thank you for contacting Interconverters';

  const intro =
    kind === 'rfq'
      ? 'Thank you for your request. Our technical team will review your design and contact you shortly with feedback, a sample plan or a quotation.'
      : 'Thank you for your message. A member of our team will get back to you shortly.';

  const rows = entries
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 14px 6px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.05em;vertical-align:top;white-space:nowrap;">${esc(FIELD_LABELS[k] ?? k)}</td>` +
        `<td style="padding:6px 0;color:#0f172a;font-size:14px;">${esc(v).replace(/\n/g, '<br/>')}</td></tr>`
    )
    .join('');

  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;color:#0f172a;">` +
    `<p style="font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:#004A99;font-weight:bold;margin:0 0 12px;">Interconverters · Narrow Fabric Design Studio</p>` +
    `<p style="font-size:15px;">Dear ${esc(customerName || 'Customer')},</p>` +
    `<p style="font-size:15px;line-height:1.5;">${intro}</p>` +
    `<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin:24px 0 8px;">Your submission</h3>` +
    `<table style="border-collapse:collapse;">${rows}</table>` +
    (designUrl
      ? `<p style="font-size:13px;margin-top:16px;">View your design: <a href="${esc(designUrl)}" style="color:#004A99;">${esc(designUrl)}</a></p>`
      : '') +
    `<p style="font-size:13px;color:#64748b;margin-top:24px;line-height:1.5;">Please reply to this email if you have any questions — it reaches our sales team directly.</p>` +
    `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>` +
    `<p style="font-size:12px;color:#64748b;line-height:1.6;margin:0;"><b style="color:#0f172a;">${COMPANY.name}</b><br/>${esc(COMPANY.address)}<br/>${COMPANY.phone} · <a href="mailto:${COMPANY.email}" style="color:#004A99;">${COMPANY.email}</a> · <a href="${COMPANY.website}" style="color:#004A99;">interconverters.com</a></p>` +
    `</div>`;

  const cc = process.env.NOTIFY_CC?.trim() || DEFAULT_CC;
  const from = process.env.NOTIFY_FROM?.trim() || DEFAULT_FROM;
  // Customer gets the confirmation, sales is CC'd. If the customer email is
  // unusable, the copy goes to sales only so nothing is lost.
  const to = customerEmail ?? cc;
  const ccList = customerEmail ? [cc] : [];

  try {
    if (resendKey) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], ...(ccList.length ? { cc: ccList } : {}), reply_to: cc, subject, html }),
      });
      if (!r.ok) {
        const detail = await r.text();
        console.error('[api/notify] Resend error:', r.status, detail.slice(0, 500));
        res.status(502).json({ error: 'upstream_error', message: 'The email service rejected the message.' });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    await transporter.sendMail({ from, to, cc: ccList, replyTo: cc, subject, html });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[api/notify] send failed:', err);
    res.status(502).json({ error: 'upstream_error', message: 'Could not reach the email service.' });
  }
}
