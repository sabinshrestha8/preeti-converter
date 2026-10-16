# Privacy and security

## Local processing (verified)

- Text conversion: pure functions in `lib/converter/`; input never leaves the
  calling tab.
- Document conversion: `File.arrayBuffer()` → `JSZip.loadAsync` → XML rewrite →
  `Blob` + `URL.createObjectURL` download. Object URLs are revoked on reset.
- No backend endpoints exist; no `fetch`/`XMLHttpRequest`/beacon carries user
  content; no analytics scripts are included.

## Data handling

- No accounts, no cookies set by the app, no `localStorage`/`IndexedDB` use —
  input is React state and vanishes when the tab closes.
- Nothing user-typed is written to logs. Errors surfaced to the user contain
  only filenames and structural reasons, never content excerpts.

## File validation and safety

- Extension pre-check plus real validation: `PK` magic bytes, 10 MB cap,
  required `word/document.xml` + `[Content_Types].xml`, XML parse checks,
  200 000-run safety cap.
- Password-protected/corrupt packages fail with an explanation; nothing executes:
  macros, OLE, and field codes (`w:instrText`) are never run or rewritten;
  tracked deletions (`w:del`) are left untouched.

## Limitations

- Client-side processing means a malicious file can at worst waste tab memory
  within the caps above; the app never elevates or persists anything.
- Privacy claims here match the implementation as of this release; re-verify
  with `grep -rn "fetch(" app components lib` before adding any network code.
