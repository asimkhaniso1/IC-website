/**
 * POST /api/notify — forwards website form submissions to the Interconverters
 * sales inbox. Two interchangeable transports, chosen by which env vars are
 * set (SMTP wins when both are present):
 *
 *   SMTP (recommended — your own mailbox, no new accounts):
 *     SMTP_HOST, SMTP_PORT (465 or 587), SMTP_USER, SMTP_PASS
 *     e.g. the credentials of sales@interconverters.com at your email host.
 *
 *   Resend (https://resend.com):
 *     RESEND_API_KEY (+ domain verification for good deliverability)
 *
 *   Shared:
 *     NOTIFY_TO   — recipient, default sales@interconverters.com
 *     NOTIFY_FROM — sender, default SMTP_USER (SMTP) / Resend sandbox (Resend)
 *
 * Request: { kind: 'rfq' | 'contact', data: Record<string, string> }
 * The customer's email (data.email) becomes the Reply-To so the team can
 * answer directly.
 *
 * Server-side only. This endpoint sends to a FIXED internal recipient, never
 * to an address chosen by the request, so it cannot be abused as an open
 * relay.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

const DEFAULT_TO = 'sales@interconverters.com';
const DEFAULT_FROM = 'Interconverters Website <onboarding@resend.dev>';
const MAX_FIELD_LEN = 4000;
const MAX_FIELDS = 30;

const SUBJECTS: Record<string, string> = {
  rfq: 'New sample/quotation request',
  contact: 'New website inquiry',
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function label(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const smtp = {
    host: process.env.SMTP_HOST?.trim(),
    port: Number(process.env.SMTP_PORT ?? 465),
    user: process.env.SMTP_USER?.trim(),
    pass: process.env.SMTP_PASS,
  };
  const smtpConfigured = Boolean(smtp.host && smtp.user && smtp.pass);
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!smtpConfigured && !resendKey) {
    res.status(503).json({
      error: 'not_configured',
      message: 'No email transport configured — set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS or RESEND_API_KEY.',
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
    .filter(([k, v]) => k !== '_hp' && typeof v === 'string' && (v as string).trim() !== '')
    .slice(0, MAX_FIELDS)
    .map(([k, v]) => [k, (v as string).slice(0, MAX_FIELD_LEN)] as const);

  if (entries.length === 0) {
    res.status(400).json({ error: 'bad_request', message: 'No form data.' });
    return;
  }

  const dataMap = Object.fromEntries(entries);
  const designCode = dataMap.designCode ? ` — ${dataMap.designCode}` : '';
  const subject = `${SUBJECTS[kind]}${designCode} (interconverters.com)`;
  const replyTo = typeof dataMap.email === 'string' && dataMap.email.includes('@') ? dataMap.email : undefined;

  const rows = entries
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;vertical-align:top;white-space:nowrap;">${esc(label(k))}</td>` +
        `<td style="padding:6px 0;color:#0f172a;font-size:14px;">${esc(v).replace(/\n/g, '<br/>')}</td></tr>`
    )
    .join('');

  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;">` +
    `<h2 style="color:#004A99;font-size:18px;">${esc(SUBJECTS[kind])}</h2>` +
    `<table style="border-collapse:collapse;">${rows}</table>` +
    `<p style="color:#94a3b8;font-size:11px;margin-top:24px;">Sent automatically from interconverters.com` +
    (dataMap.designCode
      ? ` · Design <b>${esc(dataMap.designCode)}</b> — view it in the technical dashboard at interconverters.com/admin`
      : '') +
    `</p></div>`;

  const to = process.env.NOTIFY_TO?.trim() || DEFAULT_TO;

  try {
    if (smtpConfigured) {
      // Preferred: the factory's own mailbox via its email host's SMTP.
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: { user: smtp.user, pass: smtp.pass },
      });
      await transporter.sendMail({
        from: process.env.NOTIFY_FROM?.trim() || smtp.user,
        to,
        subject,
        html,
        ...(replyTo ? { replyTo } : {}),
      });
      res.status(200).json({ ok: true });
      return;
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM?.trim() || DEFAULT_FROM,
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!resendRes.ok) {
      const detail = await resendRes.text();
      console.error('[api/notify] Resend error:', resendRes.status, detail.slice(0, 500));
      res.status(502).json({ error: 'upstream_error', message: 'The email service rejected the message.' });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[api/notify] send failed:', err);
    res.status(502).json({ error: 'upstream_error', message: 'Could not reach the email service.' });
  }
}
