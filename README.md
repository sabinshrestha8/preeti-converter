# Preeti Converter

Free Nepali **Preeti ↔ Unicode** converter for pasted text and Word (`.docx`)
documents. Everything runs locally in the browser — no uploads, no accounts,
no paid APIs.

## Features

- Two-way text conversion with live output, samples, copy, clear, and swap.
- `.docx` upload (picker + drag-drop) in both directions with in-place
  conversion: paragraphs, tables, headers/footers, lists, links, and images
  preserved; converted file downloads with a `-unicode` / `-preeti` suffix.
- Responsive, keyboard-accessible UI with announced status changes.
- SEO basics: metadata, canonical, Open Graph, robots, sitemap, explainer content.

## Supported directions and formats

| Direction | Text | File in | File out |
|---|---|---|---|
| Preeti → Unicode | ✅ | `.docx` (≤ 10 MB) | `.docx` |
| Unicode → Preeti | ✅ | `.docx` (≤ 10 MB) | `.docx` |

Scanned PDFs, images, and password-protected files are out of scope and are
rejected with an explanation.

## Prerequisites

Node.js 20.9+ (required by Next.js 16) and npm.

## Commands

```sh
npm install
npm run dev     # local development
npm test        # 165 unit/integration tests (node:test)
npm run test:e2e  # 26 Playwright browser tests (needs build + Chromium; also run in CI)
npm run test:parity  # manual check vs upstream Python (needs Python + upstream files)
npm run lint
npm run build   # production build (Next.js server output, not a static export)
npm start       # serve the production build (Node server)
```

Set `NEXT_PUBLIC_SITE_URL` to the production origin **before `npm run build`**
(it is inlined at build time; metadata, sitemap and robots use it; default is a
marked placeholder). Deployment: `docs/deployment.md`.

## Conversion engine

A JavaScript port of the MIT-licensed
[PreetiToUnicode](https://github.com/globalpolicy/PreetiToUnicode) and
[UnicodeToPreeti](https://github.com/globalpolicy/UnicodeToPreeti) implementations,
with fixes for upstream reph/ikar reordering bugs and added round-trip
mappings. Checked against upstream on 80 shared fixtures
(`checked=80 mismatches=0 intentional=21`, every deviation listed in
`tests/parity-upstream.mjs`). Details and limitations:
`docs/conversion-engine.md`, `docs/conversion-rules.md`. License notices:
`THIRD_PARTY_NOTICES.md`.

## Privacy

Client-side only: no conversion API, no uploads, no storage, no analytics.
See `docs/privacy-security.md`.

## Known limitations

- Round trips are not always exact (hyphens, Latin digits and ASCII
  punctuation; pinned in `tests/converter.test.js`).
- Unicode → Preeti leaves Latin digits as-is, and the Preeti font draws them
  as conjuncts (`1.` shows as ज्ञ।). Use Devanagari digits (१२३) in the source.
- A syllable split across two differently formatted Word runs converts per-run.
- Preeti → Unicode reads every English letter/digit as a Preeti keystroke —
  including English text in other fonts (e.g. Calibri) inside a `.docx`.
- Unicode → Preeti output needs the Preeti font installed to display.
- Converted documents have **not** yet been opened in Microsoft Word or
  LibreOffice; integrity is verified structurally only (see `docs/testing.md`).
  Page layout preservation is not guaranteed.

## Docs

`docs/` covers requirements, architecture, engine, rules, document processing,
database (none, deliberately), privacy/security, testing, deployment, roadmap.
