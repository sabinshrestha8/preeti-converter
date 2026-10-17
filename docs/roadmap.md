# Roadmap (post-MVP, prioritized)

## Now (launch blockers)

1. Open real converted `.docx` files in Microsoft Word + LibreOffice and confirm
   rendering; record results here (see `docs/release-readiness-audit.md`).
2. Choose a license for this project (upstream notices are in
   `THIRD_PARTY_NOTICES.md`).
3. Set `NEXT_PUBLIC_SITE_URL` at build time, deploy to a Node host, verify
   canonical/sitemap/robots.

Done: Playwright browser tests (run in CI since 0.2.0).

## Next

- Text-based PDF conversion (extract + convert + download as .txt/.docx).
- PWA/offline support (everything already runs locally; add manifest + SW).
- Additional legacy encodings (Kantipur, PCS Nepali) behind the same engine interface.
- Advanced document diagnostics (pre-conversion report of risky structures).

## Later / explicitly not promised

- Scanned-PDF/image OCR, exact PDF layout reproduction, font bundling
  (licensing), accounts, cloud sync.
