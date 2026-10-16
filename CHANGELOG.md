# Changelog

All notable changes to Preeti Converter are documented here.
Format follows Keep a Changelog (concise variant).

## [0.1.0] - 2026-10-16

### Added
- Two-way Nepali text conversion (Preeti ↔ Unicode) with live output,
  samples, copy/clear/swap, and character counts.
- Word (.docx) conversion in both directions with in-place transformation:
  paragraphs, tables, headers/footers, lists, links, and images preserved.
- Identically formatted Word runs convert jointly across run boundaries.
- Completed au-kar folds (`f}`→ौ, `cf]`→ओ, `cf}`→औ) and `ª`→ङ round-trip.
- Privacy page, custom 404 page, sitemap, robots, SEO metadata.
- CI workflow (tests, lint, production build).
- Docs: requirements, architecture, engine, rules, document processing,
  privacy/security, testing, deployment, roadmap.

### Verified
- 111 unit/integration tests passing (Node built-in runner, zero test deps).
- 58-fixture parity check against upstream MIT implementation, 0 mismatches.
- Real-document conversion validated (government कार्यविधि + long-document tests).
- Production build succeeds with fully static output.

### Known limitations
- Round trips are not always exact (documented lossy cases).
- Syllables split across differently formatted runs convert per-run.
- Latin digits pass through Unicode → Preeti unchanged.
- Variant legacy encodings need per-source tables (see roadmap).
- No automated browser/UI tests yet; no real-Word round-trip in CI.
