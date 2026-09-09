import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const configured = Boolean(
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.QBWC_PASSWORD,
  );

  res.status(configured ? 200 : 503).json({
    service: 'IC Factory QuickBooks Web Connector',
    configured,
    username: process.env.QBWC_USERNAME || 'interconverters',
  });
}
