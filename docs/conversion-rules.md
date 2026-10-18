# Conversion rules (implemented behavior)

Ordering matters. Each stage feeds the next.

## Preeti → Unicode (`lib/converter/preeti-to-unicode.js`)

1. String replacements, in order: `cf]`→ओ, `cf}`→औ, `qm`→`s|`, `km`→फ,
   `0f`→ण, `If`→क्ष, `if`→ष, `cf`→आ, `f]`→ो, `f}`→ौ. (Longest match first:
   `cf]`/`cf}` precede `cf`; `f]`/`f}` come last so `If]` reads क्षे and
   `km}` reads फै.)
2. Per character: `l` → ikar placeholder, `{` → reph placeholder; `a–z` →
   letter table, `A–Z` → half-form table, `0–9` → conjunct table, else symbol
   dictionary, else pass through unchanged.
3. Reph: each placeholder moves before the preceding syllable — back over
   vowel signs, then over the whole `C(्C)*` cluster (or an independent
   vowel) — and becomes र्. With nothing to attach to it stays put.
4. Ikar: each placeholder moves after the following `C(्C)*` cluster
   (half-forms and ra-foot included) and becomes ि. With no consonant after
   it (stray, or split across Word runs) it stays where it was typed.

## Unicode → Preeti (`lib/converter/unicode-to-preeti.js`)

0. Latin letter runs (`[A-Za-z]+`) are split off and passed through
   verbatim; only the remaining segments go through steps 1–3.
1. `normalizeUnicode`: consonant + ् + consonant (≠ र, not before space/`।`/`,`)
   → uppercase half-form (`: `for स, `i` for ष); consonant + ् + र → `|`
   (`«` after ट/ठ/ड); `त|` → `q`.
2. Left-to-right scan with lookahead:
   - `X + ि` → `l + preeti(X)` (`q` stays literal: `lq`).
   - `X + (|«) + ि` → `l + preeti(X) + foot` (प्रि → `lk|`).
   - `HALF + Y + ि` → `l + HALF + preeti(Y)`.
   - `र + ् + HALF* + C (+ vowel/ि)` → cluster + `{` (reph last; मर्त्य →
     `dTo{`).
   - `HALF + Y + (|«) + ि` → `l + HALF + preeti(Y) + foot`.
   - Else single-character dictionary lookup, else pass through.
3. Composite replacements, in order: `Si`→`I`, `` H` ``→`1`, `b\w`→`4`,
   `z|`→`>`, `/'`→`?`, `/"`→`¿`, `Tt`→`Q`, `b\lj`→`lå`, `b\j`→`å`,
   `0f\`→`0`, `` `\ ``→`~`.

## Worked examples

| In (P2U) | Out | Rule |
|---|---|---|
| `g]kfn` | नेपाल | single-char maps |
| `lg` | नि | ikar reorder |
| `s{` | र्क | reph moved before cluster |
| `km`, `If`, `cf` | फ, क्ष, आ | digraph fold |

| In (U2P) | Out | Rule |
|---|---|---|
| `नेपाल` | `g]kfn` | single-char maps |
| `कि` | `ls` | ikar pre-posed |
| `र्क` | `s{` | reph post-posed |
| `क्ष`, `ज्ञ`, `श्र`, `द्व` | `If`, `1`, `>`, `å` | half-form + composite |
