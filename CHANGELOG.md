# Changelog

All notable changes to Preeti Converter are documented here.
Format follows Keep a Changelog (concise variant).

## [Unreleased]
### Fixed
- Preeti → Unicode: ikar (`l`) now attaches after the whole conjunct cluster
  (`l:ylt`→स्थिति, was स्िथति; `JolSt`→व्यक्ति; `lk|o`→प्रिय) and after
  reph clusters (`cfly{s`→आर्थिक, was आर्थकि). A stray ikar stays where it
  was typed instead of jumping onto the next space/newline.
- Preeti → Unicode: reph (`{`) moves before the whole cluster
  (`sfTof{`→कार्त्या, `s]{`→र्के).
- Preeti → Unicode: `If]`/`0f]`/`if]` now give क्षे/णे/षे (the `f]` fold ran
  first and produced क्ष्ो).
- Preeti → Unicode: `´` reads back as झ (Unicode → Preeti already emitted it).
- Preeti → Unicode: `O{` reads back as ई (was र्इ, e.g. सबैलाई) and `pm` as
  ऊ (was उफ), so ई/ऊ now round-trip.
- Unicode → Preeti: ra-foot + ikar (`प्रिय`→`lk|o`, was `k|lo`) and reph over
  half-form clusters (`मर्त्य`→`dTo{`, was `d/\To`).
- Unicode → Preeti: English words pass through unchanged (`Simple` was
  rewritten to `Imple`, `Tt` to `Q`).
- DOCX: declared uncompressed size and entry count are checked before
  inflating (zip-bomb guard: 100 MB package, 25 MB per text part, 5,000
  entries).
- DOCX: damaged XML (including leniently-parsed errors such as undefined
  entities) is rejected with a plain message; raw parser messages are no
  longer shown.
- DOCX: password-protected and legacy `.doc` (OLE) files get a specific message.
- DOCX: a document that is already mostly Unicode Devanagari is refused in
  Preeti → Unicode with "Did you mean Unicode → Preeti?" (it used to "convert"
  its digits, e.g. `1.` → ज्ञ।).
- DOCX: switched runs also set the complex-script font `w:cs` (used by Word
  for Devanagari) and drop overriding theme-font attributes.
- Uploader: download object URLs are released on new file, re-convert,
  direction change and unmount; changing direction clears a stale result.
- `/privacy` and the 404 page have one `h1`; the 404 no longer inherits the
  homepage title/canonical.

### Added
- `THIRD_PARTY_NOTICES.md` with the upstream MIT license text; About tab credit.
- Regression tests (unit 111 → 168, Playwright 15 → 27), parity fixtures
  58 → 82. `docs/release-readiness-audit.md`.

### Changed
- Docs corrected: the app deploys as a Next.js Node server (not static
  output), needs Node 20.9+, and Playwright runs in CI.
- Removed unused create-next-app SVGs from `public/`.

### Corrections to earlier entries
- 0.1.0 "Real-document conversion validated (government कार्यविधि …)": no
  real document or result is recorded in the repository; treat as unverified.
- 0.1.0 "fully static output": the build is server output (see above).
- 0.2.0 repeats the au-kar line from 0.1.0; the change shipped once.

## [0.2.0] - 2026-10-16
### Added
- Playwright end-to-end suite (15 tests: text flows, clipboard, swap,
  DOCX upload/convert/download, error states, keyboard, mobile layout).
- Single top-level heading for SEO/accessibility.
- Completed au-kar folds (`f}`→ौ, `cf]`→ओ, `cf}`→औ) and `ª`→ङ round-trip.
- GitHub Actions job running the browser tests.

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
