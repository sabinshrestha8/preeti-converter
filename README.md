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

Node.js 18+ and npm.

## Commands

```sh
npm install
npm run dev     # local development
npm test        # 93 unit/integration tests (node:test, zero test deps)
npm run test:parity  # manual check vs upstream Python (needs Python + upstream files)
npm run lint
npm run build   # production build (static output)
npm start       # serve the production build
```

Set `NEXT_PUBLIC_SITE_URL` to the production origin before launch (metadata,
sitemap, robots use it; default is a marked placeholder).

## Conversion engine

A JavaScript port of the MIT-licensed
[PreetiToUnicode](https://github.com/globalpolicy/PreetiToUnicode) and
[UnicodeToPreeti](https://github.com/globalpolicy/UnicodeToPreeti) implementations,
plus three verified fixes (end-of-string reph) and two added round-trip
mappings. Verified against upstream on 58 shared fixtures
(`checked=58 mismatches=0`). Details, attribution, and limitations:
`docs/conversion-engine.md`, `docs/conversion-rules.md`.

## Privacy

Client-side only: no conversion API, no uploads, no storage, no analytics.
See `docs/privacy-security.md`.

## Known limitations

- Round trips are not always exact (documented cases in `tests/` + docs).
- A syllable split across two differently formatted Word runs converts per-run.
- English letters/digits in source-encoded text are read as Nepali keystrokes.
- Unicode → Preeti output needs the Preeti font installed to display.
- No automated browser/UI tests yet; no real-Word round-trip in this
  environment (see `docs/testing.md`).

## Docs

`docs/` covers requirements, architecture, engine, rules, document processing,
database (none, deliberately), privacy/security, testing, deployment, roadmap.
