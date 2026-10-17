// Text-conversion regression tests. Run with: npm test  (node --test tests/)
//
// Expected values below are INDEPENDENT of the implementation: they are
// hand-checked against published examples (preeti npm README: g]kfn->नेपाल,
// sf7df08"->काठमाण्डू; @dpr4dhan/preeti-to-unicode README: /fd->राम, !@#->१२३)
// and against manual Unicode code-point analysis. Never generate expectations
// by calling the converter itself.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  convertPreetiToUnicode,
  convertUnicodeToPreeti,
  convertText,
  DIRECTIONS,
} from "../lib/converter/index.js";

describe("Preeti -> Unicode", () => {
  const cases = [
    ["empty", "", ""],
    ["canonical word", "g]kfn", "नेपाल"],
    ["two words", "g]kfn ;/sf/", "नेपाल सरकार"],
    ["kathmandu", 'sf7df08"', "काठमाण्डू"],
    ["ram", "/fd", "राम"],
    ["independent vowels", "c cf O p", "अ आ इ उ"],
    ["aa-kar digraph", "cf", "आ"],
    ["pha digraph", "km", "फ"],
    ["nna digraph", "0f", "ण"],
    ["ksha", "If", "क्ष"],
    ["ssa", "if", "ष"],
    ["o-kar", "f]", "ो"],
    ["au-kar digraph", "f}", "ौ"],
    ["O vowel digraph", "cf]", "ओ"],
    ["AU vowel digraph", "cf}", "औ"],
    ["tra conjunct", "q", "त्र"],
    ["tta conjunct", "Q", "त्त"],
    ["reph before cluster", "s{", "र्क"],
    ["pre-posed ikar", "lg", "नि"],
    ["devanagari digits", "!@#", "१२३"],
    ["purna biram", ".", "।"],
    ["literal period", "=", "."],
    ["anusvara", "+", "ं"],
    ["halant", "\\", "्"],
    ["spaces and newlines preserved", "g]kfn\n;/sf/", "नेपाल\nसरकार"],
    ["half-sha", "i", "ष्"],
    ["half-ka", "S", "क्"],
    ["nga", "ª", "ङ"],
    ["shra symbol", ">", "श्र"],
    ["ru symbol", "?", "रु"],
  ];
  for (const [name, input, expected] of cases) {
    it(name, () => assert.equal(convertPreetiToUnicode(input), expected));
  }

  it("ASCII letters with no Preeti meaning still map (legacy encoding uses them)", () => {
    // Documents actual behavior: Preeti reuses ASCII code points, so English
    // text pasted as "Preeti" is interpreted as keystrokes. See docs.
    assert.equal(convertPreetiToUnicode("A"), "ब्");
  });

  it("known limitation: O{ (ई) reads back as र्इ, not ई", () => {
    assert.equal(convertPreetiToUnicode("O{"), "र्इ");
  });

  it("trailing ikar is kept, not silently dropped (split-run safety)", () => {
    assert.equal(convertPreetiToUnicode("sl"), "कि");
  });

  it("throws on non-string input", () => {
    assert.throws(() => convertPreetiToUnicode(null), TypeError);
  });

  it("handles a long paragraph without freezing", () => {
    const para = "g]kfn ;/sf/ ".repeat(500);
    const out = convertPreetiToUnicode(para);
    assert.equal(out, "नेपाल सरकार ".repeat(500));
  });
});

describe("Unicode -> Preeti", () => {
  const cases = [
    ["empty", "", ""],
    ["canonical word", "नेपाल", "g]kfn"],
    ["two words", "नेपाल सरकार", "g]kfn ;/sf/"],
    ["ram", "राम", "/fd"],
    ["independent vowels", "अ आ इ उ", "c cf O p"],
    ["aa vowel", "आ", "cf"],
    ["o-kar vowel", "ओ", "cf]"],
    ["au-kar vowel", "औ", "cf}"],
    ["o matra", "ो", "f]"],
    ["au matra", "ौ", "f}"],
    ["pha", "फ", "km"],
    ["tra", "त्र", "q"],
    ["tta", "त्त", "Q"],
    ["ksha", "क्ष", "If"],
    ["gya", "ज्ञ", "1"],
    ["shra", "श्र", ">"],
    ["kra foot", "क्र", "s|"],
    ["reph cluster", "र्क", "s{"],
    ["ikar after consonant", "कि", "ls"],
    ["ru", "रु", "?"],
    ["ruu long", "रू", "¿"],
    ["devanagari digits", "१२३", "!@#"],
    ["purna biram", "।", "."],
    ["spaces and newlines preserved", "नेपाल\nसरकार", "g]kfn\n;/sf/"],
    ["unmapped latin punctuation passes through", "नेपाल!", "g]kfn!"],
    ["BOM is skipped", "﻿नेपाल", "g]kfn"],
  ];
  for (const [name, input, expected] of cases) {
    it(name, () => assert.equal(convertUnicodeToPreeti(input), expected));
  }

  it("throws on non-string input", () => {
    assert.throws(() => convertUnicodeToPreeti(42), TypeError);
  });
});

describe("dispatcher + round trips", () => {
  it("convertText routes by direction", () => {
    assert.equal(convertText("g]kfn", DIRECTIONS.PREETI_TO_UNICODE), "नेपाल");
    assert.equal(convertText("नेपाल", DIRECTIONS.UNICODE_TO_PREETI), "g]kfn");
    assert.throws(() => convertText("x", "sideways"), /Unknown conversion direction/);
  });

  // Exact round trips that must hold (lossless subset).
  const losslessP2U = ["g]kfn", "g]kfn ;/sf/", "/fd", "s{", "lg", "å", "1", "If", "f]", "f}", "cf]", "cf}", "ª"];
  for (const preeti of losslessP2U) {
    it(`P->U->P lossless: ${JSON.stringify(preeti)}`, () => {
      assert.equal(convertUnicodeToPreeti(convertPreetiToUnicode(preeti)), preeti);
    });
  }

  const losslessU2P = ["नेपाल", "नेपाल सरकार", "राम", "कि", "रु", "द्व", "ज्ञ", "क्ष", "ओ", "औ", "ो", "ौ", "ङ"];
  for (const unicode of losslessU2P) {
    it(`U->P->U lossless: ${unicode}`, () => {
      assert.equal(convertPreetiToUnicode(convertUnicodeToPreeti(unicode)), unicode);
    });
  }

  it("documents lossy cases instead of hiding them", () => {
    // Half-ksha 'I' carries an implicit halant: P->U gives क्ष्, so a bare
    // क्ष (If) does not survive a P->U->P trip through 'I'.
    assert.equal(convertPreetiToUnicode("I"), "क्ष्");
    assert.equal(convertUnicodeToPreeti("क्ष्"), "If\\");
    // Lone 'pm' (from ऊ) reads back as उफ: kept deliberately, since folding
    // pm->ऊ would corrupt genuine उ+फ sequences.
    assert.equal(convertPreetiToUnicode("pm"), "उफ");
  });
});

// Release-readiness regressions (docs/release-readiness-audit.md). Each P2U
// case below produced a visibly broken result before the fix (shown in the
// comment); expected values are hand-checked code-point sequences.
describe("regressions: Preeti -> Unicode reordering", () => {
  const cases = [
    ["ikar before half-form conjunct", "l:ylt", "स्थिति"], // was स्िथति
    ["ikar before two-half conjunct", "JolSt", "व्यक्ति"], // was व्यक्ित
    ["ikar before folded ksha", "lIf", "क्षि"], // was कि्ष
    ["ikar before folded kra", "lqm", "क्रि"], // was कि्र
    ["ikar before ra-foot cluster", "lk|o", "प्रिय"],
    ["reph + ikar mid-word", "cfly{s", "आर्थिक"], // was आर्थकि
    ["reph + ikar before a space", "sLlt{ sf", "कीर्ति का"], // was कीर्त िका
    ["reph over a conjunct", "sfTof{", "कार्त्या"], // was कात्र्या
    ["reph over half-form cluster", "dTo{", "मर्त्य"],
    ["reph over consonant + aa-kar", "sf{", "र्का"],
    ["reph over consonant + e-kar", "s]{", "र्के"],
    ["ksha + e-kar", "If]", "क्षे"], // was क्ष्ो
    ["nna + e-kar", "0f]", "णे"], // was ण्ो
    ["ssa + e-kar", "if]", "षे"], // was ष्ो
    ["conjunct + ai-kar", "If}", "क्षै"],
    ["jha", "´", "झ"], // was passed through as ´
    ["stray ikar before a space stays put", "l ", "ि "], // was  ि
    ["stray ikar before a newline stays put", "l\n", "ि\n"],
    ["stray reph at start stays put", "{s", "र्क"],
    ["CRLF and tabs preserved", "g]kfn\r\n;/sf/\tsf", "नेपाल\r\nसरकार\tका"],
  ];
  for (const [name, input, expected] of cases) {
    it(name, () => assert.equal(convertPreetiToUnicode(input), expected));
  }

  it("Unicode Devanagari already in the input passes through unreordered", () => {
    assert.equal(convertPreetiToUnicode("किताब"), "किताब");
    assert.equal(convertPreetiToUnicode("g]kfn किताब"), "नेपाल किताब");
  });

  it("pinned: Latin digits are Preeti keys, not numbers", () => {
    // Preeti types Devanagari digits with !@#...; 0-9 are consonant keys.
    assert.equal(convertPreetiToUnicode("123"), "ज्ञद्दघ");
  });
});

describe("regressions: Unicode -> Preeti", () => {
  const cases = [
    ["ra-foot + ikar", "प्रिय", "lk|o"], // was k|lo (reads back प्रयि)
    ["ra-foot + ikar + aa-kar", "क्रिया", "ls|of"], // was s|lof
    ["half-ssa + tta + ra-foot + ikar", "राष्ट्रिय", "/fli6«o"],
    ["reph over half-form cluster", "मर्त्य", "dTo{"], // was d/\To (visible halant)
    ["reph + aa-kar", "र्का", "sf{"],
    ["ikar on two-half conjunct", "व्यक्ति", "JolSt"],
    ["jha", "झ", "´"],
    ["English word is not rewritten", "Simple", "Simple"], // was Imple
    ["English 'Tt' is not folded to tta", "Tt", "Tt"], // was Q
    ["mixed Nepali and English", "नेपाल Nepal सरकार", "g]kfn Nepal ;/sf/"],
    ["CRLF and tabs preserved", "नेपाल\r\nसरकार\tका", "g]kfn\r\n;/sf/\tsf"],
  ];
  for (const [name, input, expected] of cases) {
    it(name, () => assert.equal(convertUnicodeToPreeti(input), expected));
  }

  it("pinned lossy/unsupported mappings (documented, not fixed)", () => {
    // Hyphen becomes a space (upstream mapping; Preeti '-' is '(').
    assert.equal(convertUnicodeToPreeti("नेपाल-भारत"), "g]kfn ef/t");
    // Latin digits and ASCII punctuation pass through, so they read back as
    // Preeti keystrokes (123 -> ज्ञद्दघ, ? -> रु).
    assert.equal(convertUnicodeToPreeti("१२३ 123?"), "!@# 123?");
    // ऋ, ः and ऐ have no Preeti mapping and are left as Unicode.
    assert.equal(convertUnicodeToPreeti("ऋषि दुःख ऐन"), "ऋlif b'ःv ऐg");
  });
});

describe("regressions: sentence round trips", () => {
  const sentences = [
    "नेपाल सरकारको आर्थिक स्थिति राष्ट्रिय प्राथमिकता हो।",
    "कार्यक्रम पूर्व धर्म वर्षा",
    "व्यक्तिगत विवरण\r\nप्रिय मित्र\tक्रिया",
    "क्षेत्रीय कार्यालय, काठमाडौं",
    "शिक्षा मन्त्रालय द्वितीय उद्धार सम्झौता झापा",
    "संविधान २०७२ श्रीमान् कृषि",
  ];
  for (const s of sentences) {
    it(`U->P->U: ${JSON.stringify(s)}`, () => {
      assert.equal(convertPreetiToUnicode(convertUnicodeToPreeti(s)), s);
    });
  }

  it("pinned lossy round trips: ई and ऊ", () => {
    assert.equal(convertPreetiToUnicode(convertUnicodeToPreeti("ईश्वर")), "र्इश्वर");
    assert.equal(convertPreetiToUnicode(convertUnicodeToPreeti("ऊर्जा")), "उफर्जा");
  });
});
