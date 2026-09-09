import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const missing = [
    !(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && 'SUPABASE_URL',
    !process.env.SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
    !process.env.QBWC_PASSWORD && 'QBWC_PASSWORD',
  ].filter(Boolean);
  const configured = missing.length === 0;

  res.status(configured ? 200 : 503).json({
    service: 'IC Factory QuickBooks Web Connector',
    configured,
    missing,
    username: process.env.QBWC_USERNAME || 'interconverters',
  });
}
