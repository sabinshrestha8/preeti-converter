# Testing

Unit/integration: Node built-in test runner (`node:test` +
`node:assert/strict`). Browser: `@playwright/test` (dev dependency). Commands:

- `npm test` — 168 tests: `tests/converter.test.js` (132) and
  `tests/document.test.js` (36).
- `npm run test:e2e` — 27 Playwright tests against the production build
  (`next start` on port 3100; Chromium only): both text directions with exact
  output, sample/clear/counts, copy, swap, DOCX upload → convert → download
  with the downloaded XML inspected in both directions, oversized/empty/
  missing-part/encrypted files, stale-result clearing, keyboard-only document
  flow, no cross-origin or non-GET requests during conversion, 375 px layouts,
  one `h1` on `/`, `/privacy` and the 404.
- CI (`.github/workflows/ci.yml`) runs `npm test`, lint and build in job
  `verify`, and build + `npm run test:e2e` in job `e2e`, on every push and PR.
- `npm run test:parity` — **manual, not in CI**: compares against the upstream
  Python (needs Python and the two upstream files in `%TEMP%`). Last run
  2026-10-17: `checked=82 mismatches=0 intentional=22`.
- `npm run lint`, `npm run build` — clean.

## Mapping fixtures

`tests/converter.test.js` uses hand-checked expectations from published
examples (`g]kfn`↔`नेपाल`, `sf7df08"`→`काठमाण्डू`, `/fd`→`राम`) plus
code-point analysis — never the converter's own output. Covers vowels, vowel
signs, conjuncts, reph, half-forms, digits, punctuation, mixed/multiline text,
empty input, non-string input, a long paragraph, and lossless/lossy round trips.

## DOCX fixtures

Synthetic packages built in-code with JSZip (no binaries in the repo):
paragraphs, bold runs, tables, list numbering (`w:numPr` + untouched
`numbering.xml`), headers/footers, footnotes/endnotes/comments, hyperlinks,
1px PNG image, field codes, tracked deletions, `w:cs`/theme fonts, mixed
Calibri English + Preeti, split runs (merge and barrier cases), empty body,
an 800-paragraph and a 1,600-paragraph (~40 pages of text) document,
non-ZIP/empty/oversized/OLE input, missing `document.xml`, malformed XML,
undefined entities, a declared-size zip bomb, entry/size limits. Integrity
checks: ZIP magic, required parts, parseable XML, byte-identical media/rels,
unchanged input hash, structure regexes. Not covered by fixtures: italic,
font sizes, headings, page breaks, nested tables, text boxes, SmartArt/charts.

## Known gaps (honest)

- **No real-document testing has been performed.** No real `.docx` has been
  converted and opened in Microsoft Word or LibreOffice; integrity is
  established structurally only. Layout preservation is unverified.
- Playwright runs Chromium only (no Firefox/WebKit, no real touch devices).
- Performance is measured on repetitive synthetic documents in Node; real
  30–40-page documents should be timed in a browser on low-end hardware.
- Fixtures are a sample: passing tests do not mean every input converts
  correctly.
