const isDev = process.env.NODE_ENV === 'development'

// Content-Security-Policy (production only — dev needs eval for HMR).
// Static header instead of per-request nonces: nonces force every page to render
// dynamically, and this site is fully static. Trade-off: script-src needs
// 'unsafe-inline' for Next's inline bootstrap / flight-data scripts.
// experimental.sri was tested (2026-10-16): it hashes only external chunks, not the
// ~9 inline scripts, so without 'unsafe-inline' hydration fails — not viable.
// Vercel Analytics + Speed Insights load and report same-origin (/_vercel/...),
// so 'self' covers them.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(isDev ? [] : [{ key: 'Content-Security-Policy', value: csp }]),
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  allowedDevOrigins: ['192.168.29.116'],
  devIndicators: false,
  images: {
    qualities: [75, 80, 85, 95, 100],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
};

export default nextConfig;
