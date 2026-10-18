// Unicode -> Preeti conversion.
//
// Ported to JavaScript from UnicodeToPreeti/unicodeToPreeti.py by
// globalpolicy (MIT License). See docs/conversion-engine.md for attribution,
// license text reference, and known limitations.
//
// Pipeline:
//   1. normalizeUnicode() folds half-consonants (uppercase Preeti forms) and
//      the ra-foot variants '|' / '«' used by क्रम / ट्रक style clusters.
//   2. convertUnicodeToPreeti() walks the string with 1-3 char lookahead to
//      handle pre-posed ikar 'l', post-posed reph '{', then applies the
//      composite replacements (क्ष, ज्ञ, त्त, श्र, द्व, ...).

const UNICODE_TO_PREETI = {
  अ: "c",
  आ: "cf",
  "ा": "f",
  इ: "O",
  ई: "O{",
  "र्": "{",
  उ: "p",
  ए: "P",
  "े": "]",
  "ै": "}",
  "ो": "f]",
  "ौ": "f}",
  ओ: "cf]",
  औ: "cf}",
  "ं": "+",
  "ँ": "F",
  "ि": "l",
  "ी": "L",
  "ु": "'",
  "ू": '"',
  क: "s",
  ख: "v",
  ग: "u",
  घ: "3",
  ङ: "ª",
  च: "r",
  छ: "5",
  ज: "h",
  झ: "´",
  ञ: "`",
  ट: "6",
  ठ: "7",
  ड: "8",
  ढ: "9",
  ण: "0f",
  त: "t",
  थ: "y",
  द: "b",
  ध: "w",
  न: "g",
  प: "k",
  फ: "km",
  ब: "a",
  भ: "e",
  म: "d",
  य: "o",
  र: "/",
  रू: "?", // note: dead key for char-by-char walk (र+ू handled via composite); kept for parity
  "ृ": "[",
  ल: "n",
  व: "j",
  स: ";",
  श: "z",
  ष: "if",
  ज्ञ: "1",
  ह: "x",
  "१": "!",
  "२": "@",
  "३": "#",
  "४": "$",
  "५": "%",
  "६": "^",
  "७": "&",
  "८": "*",
  "९": "(",
  "०": ")",
  "।": ".",
  "्": "\\",
  ऊ: "pm",
  "-": " ",
  "(": "-",
  ")": "_",
};

// Composite Preeti sequences for conjuncts the single-char walk cannot emit.

const HALFABLE_LOWER = new Set("wertyuxasdghjkzvn".split(""));
const HALFABLE_UPPER = new Set("WERTYUXASDGHJK:ZVN".split(""));
const HALFABLE_UPPER_I = new Set("WERTYUXASDGHJK:ZVNIi".split(""));
const RA_FOOT_AFTER_TTH = new Set(["ट", "ठ", "ड"]);
const REPH_VOWELS_AFTER = new Set(["ा", "ो", "ौ", "े", "ै", "ी"]);

class MissingMapping extends Error {}

function lookup(ch) {
  if (ch === undefined || !Object.prototype.hasOwnProperty.call(UNICODE_TO_PREETI, ch)) {
    throw new MissingMapping(ch);
  }
  return UNICODE_TO_PREETI[ch];
}

function halfForm(preetiLower) {
  return String.fromCharCode(preetiLower.charCodeAt(0) - 32);
}

export function normalizeUnicode(text) {
  const chars = [...text]; // code-point walk so astral chars stay intact
  let normalized = "";
  let i = -1;
  while (i + 1 < chars.length) {
    i += 1;
    const ch = chars[i];
    const next = chars[i + 1];
    const next2 = chars[i + 2];
    const prev = chars[i - 1];
    try {
      // Half-consonant: क् + ष (followed by another consonant) -> uppercase half form.
      if (ch !== "र" && next === "्" && next2 !== " " && next2 !== "।" && next2 !== "," && next2 !== undefined) {
        if (next2 !== "र") {
          const mapped = lookup(ch);
          if (HALFABLE_LOWER.has(mapped)) {
            normalized += halfForm(mapped);
            i += 1; // consume the halant
            continue;
          }
          if (ch === "स") {
            normalized += ":";
            i += 1;
            continue;
          }
          if (ch === "ष") {
            normalized += "i";
            i += 1;
            continue;
          }
        }
      }
      // Ra-foot (खुट्टा चिर्ने): consonant + ् + र -> '|' (क्रम) or '«' after ट/ठ/ड (ट्रक).
      if (prev !== "र" && ch === "्" && next === "र") {
        normalized += RA_FOOT_AFTER_TTH.has(prev) ? "«" : "|";
        i += 1; // consume the ra
        continue;
      }
    } catch (e) {
      if (!(e instanceof MissingMapping)) throw e;
      // fall through and keep the character as-is (mirrors upstream KeyError path)
    }
    normalized += ch;
  }
  return normalized.replaceAll("त|", "q"); // tra (त्र)
}

// Post-replacements applied in upstream order (order matters: longer first where overlapping).
const ORDERED_POST = [
  ["Si", "I"],
  ["H`", "1"],
  ["b\\w", "4"],
  ["z|", ">"],
  ["/'", "?"],
  ['/"', "¿"],
  ["Tt", "Q"],
  ["b\\lj", "lå"],
  ["b\\j", "å"],
  ["0f\\", "0"],
  ["`\\", "~"],
];

export function convertUnicodeToPreeti(input) {
  if (typeof input !== "string") throw new TypeError("convertUnicodeToPreeti expects a string");
  // Latin words pass through verbatim: converting them alongside Devanagari
  // let ORDERED_POST rewrite English ("Simple" -> "Imple", "Tt" -> "Q").
  return input
    .split(/([A-Za-z]+)/)
    .map((seg, k) => (k % 2 ? seg : convertSegment(seg)))
    .join("");
}

function convertSegment(input) {
  if (input === "") return "";
  const text = [...normalizeUnicode(input)];
  const at = (idx) => (idx < text.length ? text[idx] : undefined);
  let converted = "";
  let i = -1;
  while (i + 1 < text.length) {
    i += 1;
    const ch = text[i];
    if (ch === "﻿") continue; // BOM: skip (upstream "\ufeff" check)
    try {
      // Hraswa ikar: consonant + ि -> 'l' + consonant (Preeti pre-poses it).
      if (at(i + 1) === "ि") {
        if (ch === "q") {
          converted += "l" + ch;
        } else {
          converted += "l" + lookup(ch);
        }
        i += 1;
        continue;
      }
      // Ra-foot cluster + ikar, e.g. प्रि: ikar precedes the whole cluster.
      if (at(i + 2) === "ि" && (at(i + 1) === "|" || at(i + 1) === "«")) {
        converted += "l" + lookup(ch) + at(i + 1);
        i += 2;
        continue;
      }
      // Conjunct + ikar, e.g. त्ति: half-form + consonant + ि.
      if (at(i + 2) === "ि" && HALFABLE_UPPER.has(ch)) {
        if (at(i + 1) !== "q") {
          converted += "l" + ch + lookup(at(i + 1));
          i += 2;
          continue;
        }
        converted += "l" + ch + at(i + 1);
        i += 2;
        continue;
      }
      // Reph (र् + consonant, as in वार्ता): emit cluster first, '{' last.
      // The cluster may start with half-forms (मर्त्य -> d + To{).
      if (at(i + 1) === "्" && ch === "र") {
        let j = i + 2;
        let cluster = "";
        while (HALFABLE_UPPER_I.has(at(j))) cluster += at(j++);
        cluster += lookup(at(j));
        if (REPH_VOWELS_AFTER.has(at(j + 1))) {
          converted += cluster + lookup(at(j + 1)) + "{";
          i = j + 1;
          continue;
        }
        if (at(j + 1) === "ि") {
          converted += "l" + cluster + "{";
          i = j + 1;
          continue;
        }
        converted += cluster + "{";
        i = j;
        continue;
      }
      // Clusters like ष्ट्रिय: half-form + consonant + ra-foot + ि.
      if (at(i + 3) === "ि" && (at(i + 2) === "|" || at(i + 2) === "«") && HALFABLE_UPPER_I.has(ch)) {
        converted += "l" + ch + lookup(at(i + 1)) + at(i + 2);
        i += 3;
        continue;
      }
    } catch (e) {
      if (!(e instanceof MissingMapping)) throw e;
      // fall through to single-char fallback (mirrors upstream)
    }
    try {
      converted += lookup(ch);
    } catch (e) {
      if (!(e instanceof MissingMapping)) throw e;
      converted += ch; // English, spaces, punctuation pass through
    }
  }
  for (const [from, to] of ORDERED_POST) {
    converted = converted.split(from).join(to);
  }
  return converted;
}
