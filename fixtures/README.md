# Test fixtures

No binary fixtures are stored in this repository.

- Text fixtures live inline in `tests/converter.test.js` (hand-checked strings).
- DOCX fixtures are synthesized at test time with JSZip in
  `tests/document.test.js` — no private or third-party documents included.
- `tests/parity-upstream.mjs` downloads nothing itself; it consumes the two
  upstream MIT files (`p2u.py`, `u2p.py`) placed in `%TEMP%` by the operator.

Do not commit real user documents here.
