# Deployment

## Runtime

Static site. `npm run build` emits fully prerendered output — no Node server
required at runtime (any static host: Vercel, Netlify, Cloudflare Pages, S3…).

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata/sitemap/robots | `https://preeti-converter.example.com` (placeholder — set before launch) |

## Commands

```sh
npm install
npm test        # 89 tests
npm run lint
npm run build   # verify: ○ /  ○ /robots.txt  ƒ /sitemap.xml
npm start       # serve production build locally (or deploy .next/output)
```

## Hosting recommendations

- Any static host with HTTPS enforced; no environment secrets needed.
- Set the real origin via `NEXT_PUBLIC_SITE_URL` and re-submit `/sitemap.xml`.

## Limitations

- No production domain has been purchased and no deployment has been performed
  from this environment; do not claim the site is live until it is.
- `next start` needs Node 18+; static export alternative (`output: "export"`)
  was not required since all routes already prerender.
