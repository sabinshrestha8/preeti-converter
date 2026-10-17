# Requirements

## Product goals

Free, fast, private Preeti ↔ Unicode conversion for pasted text and editable
Word documents, with no install, no account, and no paid services.

## Target users

Students, teachers, government-office workers, schools, admin staff, writers,
publishers — anyone maintaining legacy Preeti documents.

## Functional requirements (MVP)

- Two-way text conversion (Preeti → Unicode, Unicode → Preeti) with live output.
- Character counts, sample text, clear, copy with clipboard-failure fallback.
- Direction switching (swap keeps current output as new input).
- `.docx` upload (picker + drag-drop), direction choice, file info, progress
  stages, completion stats, download, reset, honest errors.
- Both DOCX directions preserve structure/formatting in place; images and
  relationships pass through byte-identical.

## Non-functional requirements

- 100% client-side processing; no backend, no conversion API.
- Responsive (side-by-side desktop, stacked mobile), keyboard accessible,
  announced status changes, reduced-motion respected.
- SEO basics: title, description, canonical, Open Graph, robots, sitemap,
  semantic headings, crawlable explainer content.

## MVP scope / explicit exclusions

In scope: text + editable `.docx` (≤ 10 MB). Out of scope: scanned-PDF OCR,
image-to-text, exact PDF layout reproduction, text-based PDF conversion
(roadmap candidates, not this release).

## Acceptance criteria

Text uses the real engine both ways with independent fixtures; DOCX converts
both ways and reopens with structure intact; privacy claims match the
implementation; lint, the unit/integration and Playwright suites (see `docs/testing.md`) and the
production build pass; limitations
are documented, not hidden.
