# Privacy and security

## Local processing (verified)

- Text conversion: pure functions in `lib/converter/`; input never leaves the
  calling tab.
- Document conversion: `File.arrayBuffer()` → `JSZip.loadAsync` → XML rewrite →
  `Blob` + `URL.createObjectURL` download. Object URLs are revoked whenever
  the result is replaced or cleared and when the uploader unmounts.
- No backend endpoints exist; no `fetch`/`XMLHttpRequest`/beacon carries user
  content; no analytics scripts are included. A Playwright test asserts no
  cross-origin or non-GET request occurs during a document conversion.

## Data handling

- No accounts, no cookies set by the app, no `localStorage`/`IndexedDB` use —
  input is React state and vanishes when the tab closes.
- Nothing user-typed is written to logs. Errors surfaced to the user contain
  only filenames and structural reasons, never content excerpts.

## File validation and safety

- Extension pre-check plus real validation: OLE/encrypted detection, `PK`
  magic bytes, 10 MB cap, required `word/document.xml` + `[Content_Types].xml`,
  declared uncompressed size (100 MB package / 25 MB per text part) and
  5,000-entry caps before inflating, strict XML parsing, 200 000-run cap per
  part.
- Password-protected/corrupt packages fail with an explanation; nothing executes:
  macros, OLE, and field codes (`w:instrText`) are never run or rewritten;
  tracked deletions (`w:del`) are left untouched.

## Limitations

- Client-side processing means a malicious file can at worst waste tab memory;
  the app never elevates or persists anything. A ZIP that lies about its
  uncompressed size is only caught after inflation (JSZip checks the length
  at the end), so a forged entry can still use memory up to the tab's limit.
- Privacy claims here match the implementation as of this release; re-verify
  with `grep -rn "fetch(" app components lib` before adding any network code.
