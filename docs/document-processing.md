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

1. Validate bytes (non-empty, ≤ 10 MB, `PK` magic) then `JSZip.loadAsync`.
2. Require `word/document.xml` + `[Content_Types].xml`.
3. For each text part: parse, snapshot all `<w:t>` nodes, and per node:
   - skip if inside `<w:del>` (tracked deletion) or `<w:instrText>` (field code);
   - skip empty nodes;
   - convert with the same `convertText` engine as the text tool;
   - on change: replace node text (set `xml:space="preserve"` when edge
     whitespace appears) and update the ancestor run's `<w:rFonts>`:
     Preeti→Unicode swaps a declared `Preeti` font to `Nirmala UI`;
     Unicode→Preeti swaps a declared Unicode-Nepali font
     (Mangal, Nirmala UI, Kokila, …) to `Preeti`.
   - A run that fails conversion is left untouched — one bad run never breaks
     a document.
4. Serialize back into the same ZIP entry; regenerate with DEFLATE.
5. Input bytes are never mutated (`JSZip.loadAsync` copies).

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

Supported: paragraphs, headings, bold/italic/underline, font size/color,
alignment, lists/numbering, tables (incl. nested), headers/footers, footnotes,
hyperlinks, images/embedded objects (byte-identical passthrough), page breaks,
section properties, styles. Limits: 10 MB files, 200 000 text runs per package
(safety cap), editable `.docx` only — no password-protected files, no
PDF/image/scan OCR (explicitly out of scope).

## Performance (measured 2026-10-15, dev machine)

800-paragraph synthetic document (~35 pages equivalent): **≈ 0.35 s**,
800/800 runs converted, output a valid ZIP. See `tests/document.test.js`.
Real-world timing scales with run count and XML size, not page count.
