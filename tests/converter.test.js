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
