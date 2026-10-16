# Testing

Framework: Node built-in test runner (`node:test` + `node:assert/strict`), zero
test dependencies. Commands:

- `npm test` — converter + document suites (111 tests, all passing).
- `npm run test:e2e` — 15 Playwright browser tests against the production
  build (text flows, clipboard, swap, DOCX upload/convert/download, error
  states, keyboard, mobile layout; Chromium).
- `npm run test:parity` — manual upstream-parity harness (needs Python and the
  two MIT upstream files in `%TEMP%`; last run 58/58 accounted).
- `npm run lint`, `npm run build` — clean.

## Mapping fixtures

`tests/converter.test.js` uses hand-checked expectations from published
examples (`g]kfn`↔`नेपाल`, `sf7df08"`→`काठमाण्डू`, `/fd`→`राम`) plus
code-point analysis — never the converter's own output. Covers vowels, vowel
signs, conjuncts, reph, half-forms, digits, punctuation, mixed/multiline text,
empty input, non-string input, a long paragraph, and lossless/lossy round trips.

## DOCX fixtures

Synthetic packages built in-code with JSZip (no binaries in the repo):
one-paragraph, multi-paragraph, bold/italic, font sizes, headings, tables,
lists (numbering preserved structurally), headers/footers, hyperlinks, 1px PNG
image, page breaks, split runs, empty runs, 800-paragraph long document
(~0.35 s), malformed ZIPs, missing `document.xml`, oversized input, unknown
direction. Integrity checks: ZIP magic, required parts, parseable XML,
byte-identical media/rels, unchanged input hash, structure regexes.

## Known gaps (honest)

- Playwright covers customer journeys in Chromium only (no Firefox/WebKit
  matrix yet) and cannot open output in real Microsoft Word (no Word license
  in this environment); document integrity is established structurally.
  A real-Word round-trip remains recommended before launch claims.
- Performance measured on synthetic docs; a corpus of real 30–40-page
  government documents should be timed during pilot.
