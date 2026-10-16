// Parity harness: runs upstream Python functions vs this JS port on shared fixtures.
// Manual verification only (needs Python + the two upstream MIT files saved as
// %TEMP%\p2u.py and %TEMP%\u2p.py). Run with: npm run test:parity
// Last result (2026-10-15): checked=58 mismatches=0 intentional=5
// (3 upstream end-of-string reph bugs fixed, 2 round-trip mappings added).
// The upstream files end with argparse CLI code that executes on import, so we
// extract only the function definitions (everything before "argparser=").
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertPreetiToUnicode, convertUnicodeToPreeti } from "../lib/converter/index.js";

function loadUpstream(pyFile, entry) {
  const src = fs.readFileSync(pyFile, "utf8");
  const funcs = src.slice(0, src.indexOf("argparser="));
  const driver = entry === "p2u" ? "print(convert(INPUT_PATH_PLACEHOLDER))" : "print(convert(INPUT_PATH_PLACEHOLDER))";
  return funcs;
}

// Fixtures covering both directions (Preeti inputs + Unicode inputs).
const PREETI_INPUTS = ["g]kfn", "g]kfn ;/sf/", 'sf7df08"', "/fd", "cf", "km", "0f", "If", "if", "f]", "q", "Q", "s{", "lg", "!@#", ".", "=", "+", "\\", "i", "S", ">", "?", "O{", "å", "1", "qm", "lgkfn", "k|m", "em", "6«", "¿"];
const UNI_INPUTS = ["नेपाल", "नेपाल सरकार", "राम", "अ आ इ उ", "आ", "फ", "त्र", "त्त", "क्ष", "ज्ञ", "श्र", "क्र", "र्क", "कि", "रु", "रू", "१२३", "।", "कि", "द्व", "ट्रक", "क्रम", "वार्ता", "ई", "क्ष्", "Hello 123"];

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "parity-"));
const p2uSrc = fs.readFileSync(process.env.TEMP + "\\p2u.py", "utf8");
const u2pSrc = fs.readFileSync(process.env.TEMP + "\\u2p.py", "utf8");

function runPython(funcSrc, inputText) {
  const inFile = path.join(dir, "in.txt");
  fs.writeFileSync(inFile, inputText, "utf8");
  // Upstream p2u.py opens the input with open(...,"r") (platform default
  // encoding); force UTF-8 so Windows cp1252 does not corrupt fixtures.
  const patched = funcSrc.slice(0, funcSrc.indexOf("argparser=")).replace('open(inputfile,"r")', 'open(inputfile,"r",encoding="utf-8")');
  const prog = patched + `\nprint(convert(${JSON.stringify(inFile)}), end="")`;
  const progFile = path.join(dir, "prog.py");
  fs.writeFileSync(progFile, prog, "utf8");
  return execFileSync("python", [progFile], { encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
}

let mismatches = 0;
let checked = 0;
let intentional = 0;
// Intentional deviations: upstream ends the whole reph branch via IndexError
// when '{' (P2U) or the reph cluster (U2P) sits at end-of-string, producing
// wrong output (कर् for s{, /\s for र्क). The JS port lets the bounds check
// fail softly (undefined !== sentinel) and completes the branch, which is the
// linguistically correct result and round-trips. Documented in
// docs/conversion-engine.md.
const EXPECTED_DEVIATIONS = new Map([
  ["P2U:s{", "र्क"],
  ["P2U:O{", "र्इ"],
  ["U2P:र्क", "s{"],
]);
// Deliberate extensions: upstream P2U has no mapping for '¿' (रू, emitted by
// upstream U2P itself) or '«' (ra-foot after ट/ठ/ड, emitted by upstream U2P),
// so upstream round-trips lose them. The JS port maps ¿->रू and «->्र.
const EXPECTED_EXTENSIONS = new Map([
  ["P2U:6«", "ट्र"],
  ["P2U:¿", "रू"],
]);
for (const s of PREETI_INPUTS) {
  const expected = runPython(p2uSrc, s);
  const actual = convertPreetiToUnicode(s);
  checked++;
  if (actual !== expected) {
    if (EXPECTED_DEVIATIONS.get("P2U:" + s) === actual) {
      intentional++;
      console.log(`P2U INTENTIONAL ${JSON.stringify(s)}: js=${JSON.stringify(actual)} (correct) py=${JSON.stringify(expected)} (upstream end-of-string bug)`);
    } else if (EXPECTED_EXTENSIONS.get("P2U:" + s) === actual) {
      intentional++;
      console.log(`P2U EXTENSION ${JSON.stringify(s)}: js=${JSON.stringify(actual)} (added) py=${JSON.stringify(expected)} (upstream passthrough)`);
    } else {
      mismatches++;
      console.log(`P2U MISMATCH ${JSON.stringify(s)}: js=${JSON.stringify(actual)} py=${JSON.stringify(expected)}`);
    }
  }
}
for (const s of UNI_INPUTS) {
  const expected = runPython(u2pSrc, s);
  const actual = convertUnicodeToPreeti(s);
  checked++;
  if (actual !== expected) {
    if (EXPECTED_DEVIATIONS.get("U2P:" + s) === actual) {
      intentional++;
      console.log(`U2P INTENTIONAL ${JSON.stringify(s)}: js=${JSON.stringify(actual)} (correct) py=${JSON.stringify(expected)} (upstream end-of-string bug)`);
    } else {
      mismatches++;
      console.log(`U2P MISMATCH ${JSON.stringify(s)}: js=${JSON.stringify(actual)} py=${JSON.stringify(expected)}`);
    }
  }
}
console.log(`checked=${checked} mismatches=${mismatches} intentional=${intentional}`);
process.exit(mismatches === 0 ? 0 : 1);
