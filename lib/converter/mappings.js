// Preeti -> Unicode single-character tables.
//
// Ported to JavaScript from PreetiToUnicode/preetiToUnicode.py by
// globalpolicy (MIT License, Copyright (c) 2017). See docs/conversion-engine.md
// for license, attribution, and known limitations.
//
// The three arrays below map Preeti keystrokes positionally:
//   'a'-'z' -> UNICODE_A_TO_Z, 'A'-'Z' -> UNICODE_CAP_A_TO_Z, '0'-'9' -> UNICODE_0_TO_9.

export const UNICODE_A_TO_Z = [
  "ब", "द", "अ", "म", "भ", "ा", "न", "ज", "ष्", "व",
  "प", "ि", "फ", "ल", "य", "उ", "त्र", "च", "क", "त",
  "ग", "ख", "ध", "ह", "थ", "श",
];

export const UNICODE_CAP_A_TO_Z = [
  "ब्", "ध", "ऋ", "म्", "भ्", "ँ", "न्", "ज्", "क्ष्", "व्",
  "प्", "ी", "ः", "ल्", "इ", "ए", "त्त", "च्", "क्", "त्",
  "ग्", "ख्", "ध्", "ह्", "थ्", "श्",
];

export const UNICODE_0_TO_9 = [
  "ण्", "ज्ञ", "द्द", "घ", "द्ध", "छ", "ट", "ठ", "ड", "ढ",
];

export const SYMBOLS_DICT = {
  "~": "ञ्",
  "`": "ञ",
  "!": "१",
  "@": "२",
  "#": "३",
  "$": "४",
  "%": "५",
  "^": "६",
  "&": "७",
  "*": "८",
  "(": "९",
  ")": "०",
  "-": "(",
  _: ")",
  "+": "ं",
  "[": "ृ",
  "{": "र्",
  "]": "े",
  "}": "ै",
  "\\": "्",
  "|": "्र",
  ";": "स",
  ":": "स्",
  "'": "ु",
  '"': "ू",
  ",": ",",
  "<": "?",
  ".": "।",
  ">": "श्र",
  "/": "र",
  "?": "रु",
  "=": ".",
  "ˆ": "फ्",
  Î: "ङ्ख",
  å: "द्व",
  "÷": "/",
  // Extensions beyond upstream (see docs/conversion-engine.md):
  // '¿' is emitted by unicode-to-preeti for रू (र + ू); '«' is the
  // ra-foot variant used after ट/ठ/ड for sequences like ट्र;
  // 'ª' is emitted by unicode-to-preeti for ङ (upstream cannot read it back).
  "¿": "रू",
  "«": "्र",
  "ª": "ङ",
};
