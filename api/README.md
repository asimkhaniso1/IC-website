# api/

Vercel serverless functions. Set `GEMINI_API_KEY` in Vercel → Project Settings → Environment Variables (Production + Preview) — never prefix it with `VITE_`, and never add it to `vite.config.ts`'s `define`.

Functions under `api/**` deploy automatically; no extra `vercel.json` config is required for them.
