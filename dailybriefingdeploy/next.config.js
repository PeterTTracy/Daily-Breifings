/** @type {import('next').NextConfig} */

// Baseline security headers applied to every route. These are low-risk hardening
// (no resource restrictions that could break Next/Tailwind). A full restrictive
// Content-Security-Policy (script-src/style-src) is a recommended follow-up but
// needs nonce wiring for Next's inline hydration scripts, so it's deferred.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Clickjacking protection (reinforces X-Frame-Options) without restricting
  // scripts/styles, so it can't break the app shell.
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
];

const nextConfig = {
  reactStrictMode: true,
  // pdf-parse pulls in pdfjs-dist, which loads its worker from its own package
  // dir at runtime. Bundling it breaks that resolution ("fake worker failed"),
  // so keep it external and required from node_modules instead.
  serverExternalPackages: ['pdf-parse'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
