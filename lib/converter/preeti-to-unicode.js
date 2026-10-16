// Preeti -> Unicode conversion.
//
// Ported to JavaScript from PreetiToUnicode/preetiToUnicode.py by
// globalpolicy (MIT License). See docs/conversion-engine.md for attribution,
// license text reference, and known limitations.
//
// Pipeline:
//   1. normalizePreeti() folds multi-keystroke Preeti sequences (digraphs,
//      pre-posed ikar 'l', post-posed reph '{') into a canonical order.
//   2. convertPreetiToUnicode() maps each keystroke to Unicode, passing
//      through anything unmapped (spaces, newlines, unrelated scripts).

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
  ["f]", "ो"], // aa-kar + e-kar typed together = o-kar (kept as Unicode)
  ["km", "फ"], // pa + modifier = pha
  ["0f", "ण"], // na digraph
  ["If", "क्ष"], // ksha
  ["if", "ष"], // ssa
  ["cf", "आ"], // aa vowel
  ["f}", "ौ"], // aa-kar + ai-kar typed together = au-kar (extension; after km/If/if)
];

export function normalizePreeti(text) {
  let working = text;
  for (const [from, to] of PRE_NORMALIZATIONS) {
    working = working.split(from).join(to);
  }
  let normalized = "";
  let pendingIkar = ""; // a Preeti 'l' (hraswa i) is typed BEFORE its consonant
  let i = -1;
  while (i + 1 < working.length) {
    i += 1;
    const ch = working[i];
    // Reph '{' is typed AFTER its consonant cluster in Preeti but must
    // come FIRST (र् + ...) in Unicode: move it before the cluster.
    if (working[i + 2] === "{" && (working[i + 1] === "f" || working[i + 1] === "ो")) {
      normalized += "{" + ch + working[i + 1];
      i += 2;
      continue;
    }
    if (working[i + 1] === "{" && ch !== "f") {
      normalized += "{" + ch;
      i += 1;
      continue;
    }
    if (ch === "l") {
      pendingIkar = "l";
      continue;
    }
    normalized += ch + pendingIkar;
    pendingIkar = "";
  }
  // A trailing ikar belongs to a consonant in the NEXT run (Word often splits
  // mid-syllable) or is a stray keystroke: keep it as ि rather than dropping
  // it silently. (Upstream drops it; see docs/conversion-engine.md.)
  if (pendingIkar) normalized += pendingIkar;
  return normalized;
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
  const normalized = normalizePreeti(input);
  let out = "";
  for (const ch of normalized) out += mapSingle(ch);
  return out;
}
