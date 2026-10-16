# Conversion rules (implemented behavior)

Ordering matters. Each stage feeds the next.

## Preeti → Unicode (`lib/converter/preeti-to-unicode.js`)

1. String replacements, in order: `qm`→`s|`, `cf]`→ओ, `cf}`→औ, `f]`→ो,
   `km`→फ, `0f`→ण, `If`→क्ष, `if`→ष, `cf`→आ, `f}`→ौ. (Longest match first:
   `cf]`/`cf}` precede `cf`, `f]` precedes nothing conflicting; `f}` follows
   `km`/`If`/`if` so `km}` still reads फै, not प+ौ.)
2. Left-to-right scan:
   - `X f/{` or `X ो/{` pattern → emit `{ X f/ो` (reph before o-kar cluster).
   - `X {` (X ≠ f) → emit `{ X` (reph before cluster).
   - `l` → hold; append after the next emitted character (ikar reorder).
   - Trailing held `l` is flushed, never dropped.
3. Per character: `a–z` → letter table, `A–Z` → half-form table, `0–9` →
   conjunct table, else symbol dictionary, else pass through unchanged.

## Unicode → Preeti (`lib/converter/unicode-to-preeti.js`)

1. `normalizeUnicode`: consonant + ् + consonant (≠ र, not before space/`।`/`,`)
   → uppercase half-form (`: `for स, `i` for ष); consonant + ् + र → `|`
   (`«` after ट/ठ/ड); `त|` → `q`.
2. Left-to-right scan with lookahead:
   - `X + ि` → `l + preeti(X)` (`q` stays literal: `lq`).
   - `HALF + Y + ि` → `l + HALF + preeti(Y)`.
   - `र + ् + C (+ vowel/ि)` → cluster + `{` (reph last).
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
