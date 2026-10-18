# Release readiness audit (v0.2.0 → MVP)

Date: 2026-10-17 · Branch `master` · Baseline commit `5220fd2` (clean tree).
Scope: conversion engine, DOCX pipeline, UI, tests, CI, docs, deployment.
Every command result below was executed in this environment (Windows 10,
Node 20.20.2, npm 10.8.2, Python 3.10). Nothing is claimed that was not run.

## 1. Command log

### Baseline (before any change)

| Command | Result |
|---|---|
| `npm test` | ✅ 111 tests, 111 pass |
| `npm run lint` | ✅ exit 0 |
| `npm run build` | ✅ exit 0; routes `○ /`, `○ /_not-found`, `○ /icon.svg`, `○ /privacy`, `○ /robots.txt`, `ƒ /sitemap.xml` |
| `npm run test:e2e` | ✅ 15 tests, 15 pass (Chromium) |
| `npm run test:parity` | ✅ `checked=58 mismatches=0 intentional=5` (Python + upstream files present in `%TEMP%`) |

Passing baseline tests did not mean correct output: the probes in §2 show
common words converting wrongly with every test green.

### Final (after changes)

| Command | Result |
|---|---|
| `npm test` | ✅ 168 tests, 168 pass (`converter.test.js` 132, `document.test.js` 36) |
| `npm run lint` | ✅ exit 0 |
| `npm run build` | ✅ exit 0; same route table as baseline |
| `npm run test:e2e` | ✅ 27 tests, 27 pass (Chromium) |
| `npm run test:parity` | ✅ `checked=82 mismatches=0 intentional=22` |
| `npm audit --omit=dev` | ✅ 0 vulnerabilities in runtime dependencies |
| `npm audit` | ⚠️ 5 high, all dev-only (`braces` via `micromatch` → `fast-glob` → `@next/eslint-plugin-next`); not shipped to users |
| `NEXT_PUBLIC_SITE_URL=https://staging.test.invalid npm run build` + `next start` | ✅ canonical, `og:url`, robots `Sitemap:` and sitemap `<loc>` all used the variable; rebuilt without it afterwards |

CI was **not** run (nothing pushed). The CI workflow was read, not executed.

## 2. Findings

Severity: **P0** = wrong output or unsafe before public release; **P1** =
real defect with workaround or limited reach; **P2** = polish/consistency.
Status: ✅ fixed with regression test · 📝 documented/pinned, not changed ·
⏳ open.

### Conversion correctness

| # | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| C1 | P0 | Ikar placed after one keystroke instead of the whole conjunct cluster | `lib/converter/preeti-to-unicode.js` (old L62-67): `l:ylt`→स्िथति, `JolSt`→व्यक्ित, `lIf`→कि्ष | ✅ |
| C2 | P0 | Reph branch did not flush a held ikar, so ि jumped to the next letter/space | old L52-61: `cfly{s`→आर्थकि, `sLlt{ sf`→कीर्त िका | ✅ |
| C3 | P0 | Reph moved over one keystroke only | `sfTof{`→कात्र्या, `s]{`→कर्े | ✅ |
| C4 | P0 | `f]` fold ran before `If`/`0f`/`if` | old `PRE_NORMALIZATIONS` L30: `If]`→क्ष्ो, `0f]`→ण्ो, `if]`→ष्ो | ✅ |
| C5 | P0 | U2P ra-foot + ikar misordered | `unicode-to-preeti.js` L185-204: `प्रिय`→`k|lo` (reads back प्रयि), `क्रिया`→`s|lof` | ✅ |
| C6 | P1 | U2P reph over a half-form cluster fell back to a visible halant | `मर्त्य`→`d/\To` | ✅ |
| C7 | P1 | U2P post-replacements rewrote English | `ORDERED_POST` L158-170: `Simple`→`Imple`, `Tt`→`Q` | ✅ |
| C8 | P1 | झ lost on every round trip | U2P emits `´`; `mappings.js` had no `´` | ✅ |
| C9 | P1 | U2P `-`→space; Latin digits and ASCII `? . / ; : ' "` pass through and read back as Preeti keys; ऋ ः ऐ have no Preeti mapping. In the real test document 710 of 742 runs had Latin digits, so `1.` displays as ज्ञ। in the Preeti output | `UNICODE_TO_PREETI` L84 | 📝 pinned in `converter.test.js`; README tells users to use Devanagari digits (owner chose not to change) |
| C10 | P1 | ई→`O{`→र्इ and ऊ→`pm`→उफ round trips. A real 742-paragraph test document had ई in 280 runs (सबैलाई) | `PRE_NORMALIZATIONS` | ✅ `O{`→ई, `pm`→ऊ folded (a genuine उफ is `pkm`) |
| C11 | P2 | P2U treats English letters as Preeti keystrokes (`Hello`→garbage) | inherent to the encoding | 📝 |

C1–C7 also exist in the upstream Python; the parity harness now lists each one
as a fixed upstream bug (`FIXED_UPSTREAM_BUGS` in `tests/parity-upstream.mjs`).

**Fix design.** Ikar and reph are now reordered after mapping, in Unicode,
where `C(्C)*` clusters are visible. Private-use placeholders
(``/``) make sure only Preeti keystrokes move. Unicode Devanagari
already in the input is never reordered (tested).

**Behaviour changes, all deliberate and in the CHANGELOG:**
- A stray `l` before a space stays put (`"l "`→`"ि "`, was `" ि"`).
- A lone `{` at the start stays put.
- English words are no longer altered in Unicode → Preeti.

### DOCX pipeline

| # | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| D1 | P0 | No uncompressed-size or entry-count limit (zip bomb): a 10 MB upload could inflate to GBs on the main thread | `transform-docx.js` L272-288 only capped compressed bytes | ✅ declared-size caps (100 MB total, 25 MB/text part, 5,000 entries) checked before inflating |
| D2 | P1 | XML error check could never fire (`parsererror` is a browser convention, not xmldom's). Raw xmldom messages reached the UI. Recoverable errors (undefined entities) were silently re-serialised | old L176-180 | ✅ strict `onError`, plain message |
| D3 | P1 | Font switch set `w:ascii`/`w:hAnsi` only. Word renders Devanagari with `w:cs`, and theme attributes override explicit names | old `setFont` L75-78 | ✅ sets `w:cs`, drops theme attrs on switched runs |
| D4 | P1 | Password-protected `.docx` and `.doc` (OLE) got "not a Word file" | `validate-docx.js` L20 | ✅ specific message |
| D5 | P1 | P2U converts every run whatever its font (Calibri English becomes Devanagari) | `convertDocxXml` selects all `w:t` | 📝 kept by decision; pinned by test; README/About/docs updated |
| D6 | P2 | Runs whose Preeti font comes from a style, theme or `docDefaults` are converted, but their font is not switched (`styles.xml` untouched) | `updateFontForDirection` only reads run `rFonts` | 📝 documented |
| D7 | P2 | Forged declared sizes are only caught by JSZip after inflating | `jszip/lib/compressedObject.js:37` | ⏳ `ponytail:` note in `validate-docx.js`; upgrade path is streaming with abort |
| D8 | P2 | Parsing and conversion run on the main thread (no Worker) | `DocumentUploader.js` | ⏳ 1,600 paragraphs take ≈0.6 s in Node; browser timing on low-end hardware not measured |
| D9 | P2 | Existing hyperlink test used `w:hyperLink` (wrong case), so the hyperlink merge barrier was never exercised | `tests/document.test.js` L173 | ✅ added a correct `w:hyperlink` test (old test kept) |
| D10 | P2 | Not converted: charts, SmartArt, glossary parts, `w:sym` | `TEXT_PART_PATTERN` | 📝 documented |
| D11 | P1 | A Unicode document sent to Preeti → Unicode "converted" 710 of 742 runs: the Nepali stayed as it was, and `1.` became ज्ञ। | real test document | ✅ refused when Devanagari outnumbers ASCII, with "Did you mean Unicode → Preeti?" |

### UI, privacy, SEO

| # | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| U1 | P1 | Object URLs revoked only on Reset; leaked on new file, re-convert, tab switch (unmount) | `DocumentUploader.js` L58/L69 | ✅ `useEffect` cleanup |
| U2 | P1 | Changing direction left the previous direction's download visible | `DocumentUploader.js` L89/L97 | ✅ cleared, buttons disabled while busy |
| U3 | P2 | `/privacy` and the 404 page had no `h1`; the 404 inherited the homepage title and canonical | `app/privacy/page.js:26`, `app/not-found.js:7` | ✅ |
| U4 | P2 | Privacy page said "There is no server side to this application", which is inaccurate for a `next start` deployment | `app/privacy/page.js` | ✅ reworded: the server only delivers pages |
| U5 | — | No analytics, no third-party scripts or fonts, no `fetch`/XHR/beacon in `app/`, `components/` or `lib/` | grep + new Playwright request-capture test | ✅ verified |
| U6 | P2 | `Converter.js` L28 `catch { return "" }` | `convertText` only throws for non-string input or an unknown direction, which the UI cannot produce | 📝 no change (unreachable) |
| U7 | P2 | `<html lang="en">` on a page with Nepali content | `app/layout.js:30` | ⏳ |
| U8 | P2 | `/sitemap.xml` is dynamic (`new Date()` lastmod) | `app/sitemap.js` | 📝 harmless on a Node server |

### Docs, licensing, release hygiene

| # | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| R1 | P0 | Upstream MIT notice not included anywhere (MIT requires it) | no LICENSE/NOTICE; headers only reference it | ✅ `THIRD_PARTY_NOTICES.md` (text fetched from both upstream repos) + About-tab credit |
| R2 | P0 | Deployment docs said "static, no Node server, any static host" and "deploy `.next/output`". `next.config.mjs` has no `output: "export"`, Cache Components is on, and `/sitemap.xml` is dynamic | `docs/deployment.md`, `architecture.md`, README L39 | ✅ docs now describe a Node server (decision: keep config) |
| R3 | P1 | Node 18+ documented; Next 16.4.1 requires ≥ 20.9 | README L28, deployment.md L33 | ✅ |
| R4 | P1 | Contradictory test claims: README "No automated browser tests" next to "15 Playwright tests"; roadmap listed Playwright as a blocker; stale counts 72 / 89 / 93 | README L36/L67, roadmap L7, conversion-engine L58, deployment L18, requirements L41 | ✅ Playwright confirmed in CI job `e2e`; baseline count of 15 confirmed by running it |
| R5 | P1 | CHANGELOG 0.1.0 claims "Real-document conversion validated (government कार्यविधि …)". There is no such document or result in the repo, and testing.md / roadmap say the opposite | CHANGELOG L33 | ✅ history untouched; "Corrections" note added under [Unreleased] |
| R6 | P1 | `testing.md` and `document-processing.md` listed fixtures that do not exist (italic, font sizes, headings, page breaks, malformed ZIPs, nested tables) and called 800 short lines "~35 pages" | doc vs `tests/document.test.js` | ✅ rewritten to match tests |
| R7 | P2 | `package.json` version 0.1.0 while the CHANGELOG had released 0.2.0 | | ✅ 0.2.0 (package + lockfile) |
| R8 | P2 | CI uploaded nothing on e2e failure (traces retained locally only) | `.github/workflows/ci.yml` | ✅ upload `test-results/` on failure |
| R9 | P2 | Unused create-next-app SVGs in `public/` | not referenced | ✅ removed |
| R10 | P1 | This project has no LICENSE of its own | repo root | ⏳ owner decision |
| R11 | P2 | `NEXT_PUBLIC_SITE_URL` is inlined at build time; docs implied runtime | Next.js semantics; verified by build | ✅ documented |

## 3. Test coverage

**Before:** 111 unit tests (90 converter, 21 DOCX) and 15 Playwright tests.
- No conjunct + ikar, reph-with-following-text, क्षे/णे/षे, CRLF/tab, or mixed English test.
- DOCX Preeti → Unicode download content never inspected in e2e.
- No oversized, empty, OLE or zip-bomb e2e or unit case.
- No privacy (network) assertion.

**Added:**
- `tests/converter.test.js` (+41):
  - every C1–C8 case
  - stray ikar and reph
  - CRLF/tabs
  - existing Unicode passthrough
  - Latin digits
  - mixed English both ways
  - six sentence-level round trips
  - pinned lossy cases (hyphen, digits, ASCII punctuation, ऋ/ः/ऐ)
  - ई/ऊ read-back and round trips
- `tests/document.test.js` (+13):
  - footnotes/endnotes/comments
  - `w:cs` + theme
  - real `w:hyperlink`
  - list numbering
  - pinned Calibri behaviour
  - English preserved in Unicode → Preeti
  - empty body
  - OLE
  - malformed XML (no leak)
  - undefined entity
  - declared-size bomb (26 MB part in a few KB ZIP)
  - entry/total limits
  - 1,600-paragraph (~40-page) document
- `tests/parity-upstream.mjs`: +22 fixtures, each deviation explained.
- `e2e/` (+11, one strengthened):
  - Unicode → Preeti exact output
  - Unicode → Preeti sample + swap
  - exact sample output and counts after clear
  - Preeti → Unicode download XML and stats text
  - oversized (exact message), empty, missing part, OLE
  - stale result cleared on direction change
  - keyboard-only convert → download
  - no cross-origin / non-GET requests during conversion
  - document tab at 375 px
  - `h1` + noindex on `/privacy` and 404

**Still missing:**
- Firefox/WebKit, real touch devices.
- Drag-and-drop upload (only the file input is driven).
- Italic, headings, page breaks, nested tables, text boxes, SmartArt fixtures.
- Real third-party `.docx` files.
- Opening output in Word or LibreOffice.
- Browser-side performance timing.
- Arrow-key navigation of the tablist (`role="tab"` without arrow handling).

## 4. Security and dependencies

- Runtime deps: `next` 16.4.1, `react`/`react-dom` 19.3.0, `jszip` ^3.10.2 (MIT
  or GPL-3.0; used under MIT), `@xmldom/xmldom` ^0.9.12 — `npm audit --omit=dev`
  clean.
- Dev-only advisory chain via `eslint-config-next` (5 high, `braces` ReDoS
  class). Not shipped; revisit when `eslint-config-next` updates. Do not run
  `npm audit fix --force` (it proposes breaking changes).
- xmldom does not resolve external entities; DTD/entity tricks now fail
  closed (D2).
- Untrusted input is never executed. Macros, OLE objects and field codes are
  never run or rewritten.
- Remaining memory-exhaustion risk: D7 (forged sizes) and D8 (main thread).

## 5. Document compatibility risks

Highest first:

1. **Layout in real editors is unverified.** No converted file has been
   opened in Word or LibreOffice. Devanagari is wider than Preeti glyphs, so
   pagination will likely change even when structure is intact.
2. **Style-inherited fonts** (D6). Text converts, but may display in the
   wrong font.
3. **Mixed-language Preeti documents** (D5). English in other fonts is
   converted.
4. **Syllables split across differently formatted runs** convert per-run
   (existing, documented).
5. **Variant "Preeti" encodings** in the wild (foundry-specific code points)
   are not supported.
6. **Not converted:** charts, SmartArt, glossary parts and symbol (`w:sym`)
   characters.

## 6. Remediation plan (remaining, prioritized)

1. **Manual — before public launch:** run the checks in §7 and record the
   results in `docs/roadmap.md`.
2. **Owner decision:** choose a LICENSE for this project (R10).
3. **P2:** stream-inflate text parts with a hard byte cap (D7), and move
   conversion into a Web Worker if real-browser timing on 30–40-page
   documents is poor (D8).
4. **P2:** optionally convert only runs explicitly in Preeti when the
   document declares fonts consistently (D5). It needs real-document evidence
   first.
5. **P2:** `lang` attribute strategy (U7); tablist arrow keys; Firefox/WebKit
   Playwright projects.

## 7. Manual checks still required

These need Microsoft Word, LibreOffice or a production environment:

- [ ] Convert real Preeti `.docx` files (letters, a 30–40-page government
      document with tables, headers/footers, lists, footnotes, images and
      hyperlinks) both ways. Open the output in Word and in LibreOffice:
      the file opens without a repair prompt, the structure is intact, and
      the text is correct.
- [ ] In Word, confirm the converted Unicode runs render in Nirmala UI
      (the `w:cs` change), and Preeti output renders with Preeti installed.
- [ ] Note any page-count or layout drift. Do not promise layout fidelity.
- [ ] Confirm `´`→झ against a real Preeti-typed document.
- [ ] Time a large document in a real browser on low-end hardware.
- [ ] Production: build with the real `NEXT_PUBLIC_SITE_URL`, then check the
      canonical, `og:url`, `/robots.txt` and `/sitemap.xml`, HTTPS, and the 404.
- [ ] Watch the first CI run of this change (e2e job + artifact upload on
      failure).
