# Conversion engine

## Selection

The engine is a JavaScript port of two MIT-licensed Python implementations:

- Preeti → Unicode: `preetiToUnicode.py` from
  [globalpolicy/PreetiToUnicode](https://github.com/globalpolicy/PreetiToUnicode) (MIT).
- Unicode → Preeti: `unicodeToPreeti.py` from
  [globalpolicy/UnicodeToPreeti](https://github.com/globalpolicy/UnicodeToPreeti) (MIT).

Both files were fetched, read in full (58-line mapping core + rules), and their
licenses verified (MIT `LICENSE` files in each repo, commercial use permitted
with attribution). Attribution is kept in the source headers of
`lib/converter/`.

## Rejected candidates

| Candidate | Reason rejected |
|---|---|
| `preeti` npm / Shuvayatra/preeti | CC-BY-NC-SA-4.0 (non-commercial) — incompatible with future commercial use |
| `preeti-to-unicode` npm (MIT) | One direction only (Preeti → Unicode); no reverse mapping |
| cimplesid/unicode-preeti-js | No clear license found |

## Mapping behavior

- `a–z / A–Z / 0–9` map positionally to Devanagari letters, half-forms, and
  conjuncts (`lib/converter/mappings.js`).
- Remaining symbols map through a dictionary (digits `!@#…` → `१२३…`,
  `.` → `।`, `\` → halant, `{` → reph, `|` → ra-foot, …).
- Multi-keystroke sequences fold first: `km`→फ, `0f`→ण, `If`→क्ष, `if`→ष,
  `cf`→आ, `f]`→ो, `qm`→`s|`.
- Context rules: Preeti `l` (ि) is typed before its consonant and reordered
  after it; `{` (र्) is typed after its cluster and moved before it.
  Reverse direction mirrors this with 1–3 character lookahead plus composite
  replacements (`Si`→`I` क्ष, `` H` ``→`1` ज्ञ, `Tt`→`Q` त्त, `z|`→`>` श्र,
  `/’`→`?` रु, `/"`→`¿` रू, `b\j`→`å` द्व, …).

## Intentional deviations from upstream (all verified)

1. **End-of-string reph fixed (3 cases).** Upstream wraps lookahead in
   `try/except IndexError`, so a reph at end-of-string aborts the whole branch:
   `s{`→कर् (wrong), `O{`→इर्, `र्क`→`/\\s` (broken). The JS port compares
   against `undefined` instead of throwing, completing the branch: `s{`→र्क,
   `र्क`→`s{`. Linguistically correct and round-trips.
2. **Two mappings added.** Upstream U2P emits `¿` (रू) and `«` (ra-foot after
   ट/ठ/ड) but upstream P2U cannot read them back (silent loss). The port maps
   `¿`→रू and `«`→्र.
3. **Trailing ikar kept.** Upstream drops a trailing `l`; the port emits `ि`
   so text split across Word runs never loses the vowel sign silently.
4. **Completed parallel folds.** Upstream folds `f]`→ो and `cf`→आ but not
   their obvious siblings, and cannot read back its own `ª` (ङ): the port
   adds `f}`→ौ, `cf]`→ओ, `cf}`→औ (longest-match first so `cf]` never
   misreads as `cf`+`]`), and `ª`→ङ. Verified by round-trip tests.

## Verification evidence

- `tests/converter.test.js`: 72 tests with hand-checked fixtures (canonical
  `g]kfn`↔`नेपाल` from multiple published READMEs, `sf7df08"`→`काठमाण्डू`,
  `/fd`→`राम`, digits, conjuncts, reph, ikar, round trips). All pass.
- `tests/parity-upstream.mjs` (`npm run test:parity`, needs Python + the two
  upstream files): 58 shared fixtures — 53 byte-identical, 3 fixed bugs, 2
  added mappings. Result on 2026-10-15: `checked=58 mismatches=0 intentional=5`.

## Known limitations

- `O{` (ई) reads back as र्इ (inherited upstream ambiguity; locked by test).
- ASCII letters/digits are legitimate Preeti keystrokes, so English text in the
  source encoding converts to Nepali rather than passing through.
- Latin digits pass through Unicode → Preeti unchanged (upstream behavior):
  they render as conjunct glyphs in the Preeti font. Convert digits to
  Devanagari (१२३) first when that matters.
- `O{` (ई) reads back as र्इ, and lone `pm` (from ऊ) reads back as उफ:
  upstream ambiguities kept deliberately (fixing them would corrupt the
  rarer genuine reph/`उफ` cases). Both are locked by tests.
- Round trips are lossless for the tested subset only; see `tests/` for the
  documented lossy cases (`I`→क्ष् one-way, `qm` one-way normalization).
- No normalization is applied to legacy-encoded input before mapping (it is not
  Unicode yet); Unicode input is walked by code point, astral characters pass
  through untouched.
- The engine implements standard Preeti. Real-world files sometimes use
  variant legacy encodings (different code points, e.g. upper-half bytes like
  §/¸/Ë/˛, or foundry-specific ASCII assignments) while still declaring the
  Preeti font. Those need a verified variant table per source — never guess
  one; see roadmap ("additional legacy encodings").
