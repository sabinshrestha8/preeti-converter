# Document processing

## DOCX package structure (what we touch)

A `.docx` is a ZIP containing XML parts. The pipeline only rewrites text inside
existing XML parts; it never rebuilds the package:

- Modified: `word/document.xml`, `word/header*.xml`, `word/footer*.xml`,
  `word/footnotes.xml`, `word/endnotes.xml`, `word/comments.xml` (only files
  present in the upload).
- Never modified: `_rels/.rels`, `word/_rels/*.rels`, `word/media/*`,
  `word/styles.xml`, `word/numbering.xml`, `[Content_Types].xml`, everything else.

## Libraries

| Library | License | Role |
|---|---|---|
| `jszip` 3.10 | MIT | ZIP read/write in browser and Node |
| `@xmldom/xmldom` 0.9 | MIT | XML parse/serialize (single code path everywhere) |

No `mammoth`/`docx` rebuild step: extraction-followed-by-regeneration loses
formatting, which is exactly what this product must preserve.

## Transformation strategy

1. Validate bytes (non-empty, ≤ 10 MB, not OLE/encrypted, `PK` magic) then
   `JSZip.loadAsync`.
2. Require `word/document.xml` + `[Content_Types].xml`; reject packages whose
   declared uncompressed size exceeds 100 MB in total or 25 MB for a text
   part, or that have more than 5,000 entries (checked before inflating;
   a forged declared size is only caught by JSZip after inflating).
3. For each text part: parse, snapshot all `<w:t>` nodes, and per node:
   - skip if inside `<w:del>` (tracked deletion) or `<w:instrText>` (field code);
   - skip empty nodes;
   - convert with the same `convertText` engine as the text tool;
   - on change: replace node text (set `xml:space="preserve"` when edge
     whitespace appears) and update the ancestor run's `<w:rFonts>`:
     Preeti→Unicode swaps a declared `Preeti` font to `Nirmala UI`;
     Unicode→Preeti swaps a declared Unicode-Nepali font
     (Mangal, Nirmala UI, Kokila, …) to `Preeti`. `w:ascii`, `w:hAnsi` and
     `w:cs` are all set, and theme-font attributes on that run are removed.
   - Runs are **not** filtered by font: in Preeti→Unicode, English text in
     Calibri/Arial is converted too. Fonts are often inherited from styles,
     the theme or `docDefaults`, so a font filter could skip real Preeti text;
     this is a documented limitation pinned by a test. Runs whose Preeti font
     comes only from a style are converted but their font is not switched
     (`styles.xml` is never modified).
   - Any XML error (fatal or recoverable) rejects the document with a plain
     message; parser messages are never shown.
   - A run that fails conversion is left untouched — one bad run never breaks
     a document.
4. Preeti→Unicode only: if the text parts hold more Devanagari characters
   than ASCII characters, the document is already Unicode and is rejected
   with "Did you mean Unicode → Preeti?" (otherwise its digits and English
   would be garbled). A majority test, so a Preeti document with some
   Unicode in it still converts.
5. Serialize back into the same ZIP entry; regenerate with DEFLATE.
6. Input bytes are never mutated (`JSZip.loadAsync` copies).

## Run-boundary handling

Within one paragraph, consecutive `<w:t>` nodes whose runs share identical
formatting (same serialized `<w:rPr>`) are converted jointly: their texts are
joined, converted once, and the result lands in the first node while followers
are emptied (nodes are never removed, so structure cannot shift). This repairs
ikar/reph/digraph sequences split across runs when formatting matches.

Merging stops at anything structural: different formatting, paragraph ends,
tabs, breaks, drawings, field codes, bookmarks, comment ranges, hyperlinks,
content controls, insertions, deletions. Those fall back to deliberate
per-run conversion. A trailing `l` is preserved as `ि`, never dropped.

Verified by tests: joint `l`+`s` → `कि`; bold-vs-plain,
tab, bookmark, and cross-paragraph cases stay per-run.

## Supported / unsupported

Covered by synthetic tests: paragraphs, bold runs, list numbering, tables,
headers/footers, footnotes/endnotes/comments, hyperlinks, images
(byte-identical passthrough), field codes, tracked deletions. Expected to be
preserved because the pipeline never touches them, but not individually
tested: italic/underline, font size/color, alignment, headings, nested
tables, page breaks, section properties, styles, text boxes. Not converted:
charts, SmartArt, glossary parts. Limits: 10 MB files, 200 000 text runs per
XML part, plus the size/entry limits above; editable `.docx` only — no
password-protected or `.doc` files, no PDF/image/scan OCR (out of scope).
Exact layout preservation has not been validated in Word or LibreOffice.

## Performance (measured 2026-10-15, dev machine)

Measured in Node (`npm test`, 2026-10-17): an 800-paragraph document of short
lines converts in ≈ 0.15 s; a 1,600-paragraph document (~19,000 words,
roughly 40 pages, 3,200 runs) in ≈ 0.6 s. Both are repetitive synthetic text.
In the browser, XML parsing and conversion run on the main thread (no Web
Worker), so very large documents can briefly freeze the tab. Real-world
timing scales with run count and XML size, not page count.
