// Preeti -> Unicode conversion.
//
// Ported to JavaScript from PreetiToUnicode/preetiToUnicode.py by
// globalpolicy (MIT License). See docs/conversion-engine.md for attribution,
// license text reference, and known limitations.
//
// Pipeline:
//   1. normalizePreeti() folds multi-keystroke Preeti digraphs.
//   2. convertPreetiToUnicode() maps each keystroke to Unicode, passing
//      through anything unmapped (spaces, newlines, unrelated scripts).
//      Reph '{' and ikar 'l' are mapped to placeholders and reordered in
//      Unicode space, where whole conjunct clusters are visible (स्थि, र्त्य).

import {
  UNICODE_A_TO_Z,
  UNICODE_CAP_A_TO_Z,
  UNICODE_0_TO_9,
  SYMBOLS_DICT,
} from "./mappings.js";

// Multi-keystroke sequences that must be folded before single-char mapping.
// Order matters: longer patterns before their prefixes (cf] before cf),
// upstream-relative order otherwise preserved. Entries cf], cf}, f} are
// extensions beyond upstream: f]/f} are parallel o-kar/au-kar forms
// (upstream only folded f]), and cf]/cf} complete the pattern cf->आ
// already handles. See docs/conversion-engine.md.
const PRE_NORMALIZATIONS = [
  ["cf]", "ओ"], // a + o-kar = O vowel (extension; precedes f] and cf)
  ["cf}", "औ"], // a + au-kar = AU vowel (extension; precedes f} and cf)
  ["qm", "s|"], // half-ka + ra-foot variant -> canonical form
  ["km", "फ"], // pa + modifier = pha
  ["0f", "ण"], // na digraph
  ["If", "क्ष"], // ksha
  ["if", "ष"], // ssa
  ["cf", "आ"], // aa vowel
  // o/au-kar AFTER 0f/If/if, else If] (क्षे) would fold as I + ो.
  ["f]", "ो"], // aa-kar + e-kar typed together = o-kar (kept as Unicode)
  ["f}", "ौ"], // aa-kar + ai-kar typed together = au-kar (extension)
];

export function normalizePreeti(text) {
  let working = text;
  for (const [from, to] of PRE_NORMALIZATIONS) {
    working = working.split(from).join(to);
  }
  return working;
}

// Private-use placeholders, so only Preeti keystrokes are reordered and any
// Unicode Devanagari already in the input passes through untouched.
const IKAR = "";
const REPH = "";
const isConsonant = (c) =>
  c !== undefined && ((c >= "क" && c <= "ह") || (c >= "क़" && c <= "य़")); // क-ह, क़-य़
const isIndependentVowel = (c) => c !== undefined && c >= "ऄ" && c <= "औ"; // ऄ-औ
const MATRAS = new Set(["ा", "ि", "ी", "ु", "ू", "ृ", "े", "ै", "ो", "ौ", "ं", "ँ", IKAR]);

// Reph is typed AFTER its syllable in Preeti; in Unicode र् comes first:
// move it before the preceding conjunct cluster (or independent vowel).
function placeReph(chars) {
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] !== REPH) continue;
    let p = i - 1;
    while (p >= 0 && MATRAS.has(chars[p])) p--;
    if (isConsonant(chars[p])) {
      while (chars[p - 1] === "्" && isConsonant(chars[p - 2])) p -= 2;
    } else if (!isIndependentVowel(chars[p])) {
      p = i; // stray reph (start of text, after a space): keep in place
    }
    chars.splice(i, 1);
    chars.splice(p, 0, "र", "्");
    i++;
  }
  return chars;
}

// Ikar is typed BEFORE its whole conjunct cluster in Preeti; in Unicode ि
// follows the cluster's last consonant. With no consonant after it (stray,
// or Word split the syllable across runs) it stays where it was typed.
function placeIkar(chars) {
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i] !== IKAR) continue;
    let q = i + 1;
    if (isConsonant(chars[q])) {
      q++;
      while (chars[q] === "्" && isConsonant(chars[q + 1])) q += 2;
    }
    chars.splice(q, 0, "ि");
    chars.splice(i, 1);
  }
  return chars;
}

function mapSingle(ch) {
  const code = ch.charCodeAt(0);
  if (code >= 97 && code <= 122) return UNICODE_A_TO_Z[code - 97];
  if (code >= 65 && code <= 90) return UNICODE_CAP_A_TO_Z[code - 65];
  if (code >= 48 && code <= 57) return UNICODE_0_TO_9[code - 48];
  if (Object.prototype.hasOwnProperty.call(SYMBOLS_DICT, ch)) return SYMBOLS_DICT[ch];
  return ch; // spaces, newlines, English punctuation, unrelated scripts pass through
}

export function convertPreetiToUnicode(input) {
  if (typeof input !== "string") throw new TypeError("convertPreetiToUnicode expects a string");
  if (input === "") return "";
  // ponytail: no NFC normalization of legacy-encoded input -- it is not
  // Unicode yet, so normalizing it as Unicode would be meaningless.
  const chars = [];
  for (const ch of normalizePreeti(input)) {
    if (ch === "l") chars.push(IKAR);
    else if (ch === "{") chars.push(REPH);
    else chars.push(...mapSingle(ch));
  }
  return placeIkar(placeReph(chars)).join("");
}
