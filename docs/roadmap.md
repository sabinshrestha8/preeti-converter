# Roadmap (post-MVP, prioritized)

## Now (launch blockers)

1. Open one real converted `.docx` in Microsoft Word + LibreOffice and confirm
   rendering; record results here.
2. Add automated browser tests (Playwright smoke: type → convert → copy;
   upload → convert → download) — currently the honest gap in `docs/testing.md`.
3. Set `NEXT_PUBLIC_SITE_URL`, deploy to a static host, verify sitemap/robots.

## Next

- Text-based PDF conversion (extract + convert + download as .txt/.docx).
- PWA/offline support (everything already runs locally; add manifest + SW).
- Additional legacy encodings (Kantipur, PCS Nepali) behind the same engine interface.
- Advanced document diagnostics (pre-conversion report of risky structures).

## Later / explicitly not promised

- Scanned-PDF/image OCR, exact PDF layout reproduction, font bundling
  (licensing), accounts, cloud sync.
