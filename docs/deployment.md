# Deployment

## Runtime

A Next.js **Node server** app: deploy with `npm run build` then `npm start`
(`next start`) on Node.js **20.9 or newer** (required by Next.js 16; CI uses
Node 20). Any host that runs a Node process works (Vercel, Render, Fly.io, a
VPS behind a reverse proxy, …).

It is **not** a static export: `next.config.mjs` has no `output: "export"`,
Cache Components is enabled, and `/sitemap.xml` is rendered on demand
(`ƒ` in the build output). Uploading `.next/` to a plain static file host will
not work. Switching to static export would be a separate, tested change.

Pages themselves are prerendered (`○ /`, `○ /privacy`, `○ /robots.txt`); the
server only delivers them. All text and document conversion still runs in the
visitor's browser — no request carries user content.

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata, Open Graph, sitemap and robots | `https://preeti-converter.example.com` (placeholder — set before launch) |

`NEXT_PUBLIC_*` values are inlined **at build time**: set the variable before
`npm run build`, not only on the running server. No secrets are needed.

## Commands

```sh
npm ci
npm test              # unit/integration tests
npm run lint
NEXT_PUBLIC_SITE_URL=https://your-domain npm run build
npm start             # serves on port 3000 (override with -- --port N)
```

Expected build routes: `○ /`, `○ /_not-found`, `○ /icon.svg`, `○ /privacy`,
`○ /robots.txt`, `ƒ /sitemap.xml`.

## After deploying

- Open `/`, `/privacy`, `/robots.txt` and `/sitemap.xml` and confirm every URL
  uses the production origin, then submit the sitemap.
- Enforce HTTPS at the host or proxy.

## Limitations

- No production domain has been chosen and no deployment has been performed
  from this environment; do not claim the site is live until it is.
