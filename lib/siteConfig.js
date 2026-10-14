// Custom domain: set NEXT_PUBLIC_SITE_URL (e.g. https://pranay.dev) in the host's env vars.
// On Vercel the production URL is detected automatically.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
