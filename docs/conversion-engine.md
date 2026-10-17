# Conversion engine

## Selection

The engine is a JavaScript port of two MIT-licensed Python implementations:

- Preeti → Unicode: `preetiToUnicode.py` from
  [globalpolicy/PreetiToUnicode](https://github.com/globalpolicy/PreetiToUnicode) (MIT).
- Unicode → Preeti: `unicodeToPreeti.py` from
  [globalpolicy/UnicodeToPreeti](https://github.com/globalpolicy/UnicodeToPreeti) (MIT).

Both files were fetched, read in full (58-line mapping core + rules), and their
licenses verified (MIT `LICENSE` files in each repo; MIT requires the copyright
and permission notice to be included). The full notice is in
`THIRD_PARTY_NOTICES.md`; source headers in `lib/converter/` credit the upstream.

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
- Context rules: Preeti `l` (ि) is typed before its conjunct cluster and is
  placed after the cluster's last consonant; `{` (र्) is typed after its
  syllable and moved before the whole cluster. Both are reordered after
  mapping, in Unicode, using private-use placeholders so Unicode text already
  present in the input is never reordered.
  Reverse direction mirrors this with 1–3 character lookahead plus composite
  replacements (`Si`→`I` क्ष, `` H` ``→`1` ज्ञ, `Tt`→`Q` त्त, `z|`→`>` श्र,
  `/’`→`?` रु, `/"`→`¿` रू, `b\j`→`å` द्व, …).

## Intentional deviations from upstream (all verified)

1. **End-of-string reph fixed (3 cases).** Upstream wraps lookahead in
   `try/except IndexError`, so a reph at end-of-string aborts the whole branch:
   `s{`→कर् (wrong), `O{`→इर्, `र्क`→`/\\s` (broken). The JS port compares
   against `undefined` instead of throwing, completing the branch: `s{`→र्क,
   `र्क`→`s{` (`O{` is now folded to ई, see 6). Linguistically correct and round-trips.
2. **Two mappings added.** Upstream U2P emits `¿` (रू) and `«` (ra-foot after
   ट/ठ/ड) but upstream P2U cannot read them back (silent loss). The port maps
   `¿`→रू and `«`→्र.
3. **Trailing ikar kept.** Upstream drops a trailing `l`; the port emits `ि`
   so text split across Word runs never loses the vowel sign silently.
4. **Completed parallel folds.** Upstream folds `f]`→ो and `cf`→आ but not
   their obvious siblings, and cannot read back its own `ª` (ङ): the port
   adds `f}`→ौ, `cf]`→ओ, `cf}`→औ (longest-match first so `cf]` never
   misreads as `cf`+`]`), and `ª`→ङ. Verified by round-trip tests.
5. **Cluster-aware reordering (2026-10-17).** Upstream moves ikar/reph over a
   single keystroke, so conjuncts break (`l:ylt`→स्िथति, `cfly{s`→आर्थकि,
   `sfTof{`→कात्र्या), folds `f]` before `If`/`0f`/`if` (`If]`→क्ष्ो),
   misorders ra-foot + ikar in U2P (`प्रिय`→`k|lo`), and applies its U2P
   post-replacements to English (`Simple`→`Imple`). All fixed; each case is
   listed in `tests/parity-upstream.mjs` and pinned in `tests/converter.test.js`.
   `´`→झ added (U2P emits it; upstream cannot read it back).
6. **ई and ऊ read back (2026-10-17).** Upstream U2P writes ई as `O{` and ऊ
   as `pm`, but upstream P2U reads them as इर्/उफ. The port folds `O{`→ई and
   `pm`→ऊ: reph never sits on a bare इ in Nepali, and a genuine उफ is typed
   `pkm`.

## Verification evidence

- `tests/converter.test.js`: 131 tests with hand-checked fixtures (canonical
  `g]kfn`↔`नेपाल` from multiple published READMEs, `sf7df08"`→`काठमाण्डू`,
  `/fd`→`राम`, digits, conjuncts, reph, ikar, round trips). All pass.
- `tests/parity-upstream.mjs` (`npm run test:parity`, needs Python + the two
  upstream files): 80 shared fixtures — 59 byte-identical, 18 fixed upstream
  bugs, 3 added mappings. Result on 2026-10-17:
  `checked=80 mismatches=0 intentional=21`.

## Known limitations

- ASCII letters/digits are legitimate Preeti keystrokes, so English text in the
  source encoding converts to Nepali rather than passing through.
- Latin digits pass through Unicode → Preeti unchanged (upstream behavior):
  they render as conjunct glyphs in the Preeti font. Convert digits to
  Devanagari (१२३) first when that matters. ASCII `? . / ; : ' "` also pass
  through and read back as Preeti keys (`?`→रु).
- Unicode → Preeti turns `-` into a space (upstream mapping) and leaves ऋ, ः
  and ऐ as Unicode (no Preeti mapping). Pinned by tests.
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
