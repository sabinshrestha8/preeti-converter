// DOCX conversion: modifies text inside the ORIGINAL package instead of
// rebuilding the document, so paragraphs, tables, images, headers, footers,
// numbering, styles, and relationships survive untouched.
//
// Strategy (see docs/document-processing.md):
// - Every text-bearing part (document, headers, footers, footnotes, endnotes,
//   comments) is parsed; each <w:t> run is converted independently with the
//   same engine as the text tool.
// - w:instrText (field codes) and w:del (tracked deletions) are skipped.
// - Run-boundary limitation: a conversion sequence split across two runs with
//   different formatting is converted per-run (documented; mid-syllable splits
//   are rare and this never corrupts the package).
// - Font declarations: Preeti <-> Nirmala UI swapped only where the run
//   already declares the source-side font (never invents fonts blindly).

import JSZip from "jszip";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { convertText, DIRECTIONS } from "../converter/index.js";
import { validateDocxBytes, validateDocxPackage, validateDocxSizes, MAX_TEXT_RUNS } from "./validate-docx.js";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

// Text-bearing parts. Headers/footers use header1.xml, footer2.xml, ... names.
const TEXT_PART_PATTERN = /^word\/(document|header[^/]*|footer[^/]*|footnotes|endnotes|comments)\.xml$/;

const UNICODE_NEPALI_FONTS = new Set(
  ["mangal", "nirmala ui", "kokila", "kalimati", "arial unicode ms", "devanagari mt", "siddhanta"].map((s) => s)
);
const UNICODE_TARGET_FONT = "Nirmala UI";
const PREETI_FONT = "Preeti";

function isTextPart(name) {
  return TEXT_PART_PATTERN.test(name);
}

function hasSkippableAncestor(node) {
  // Skip field-code instructions and tracked deletions: converting them
  // would corrupt fields or resurrect deleted text.
  let el = node.parentNode;
  while (el) {
    const local = el.localName || "";
    if (local === "instrText" || local === "del") return true;
    el = el.parentNode;
  }
  return false;
}

function findRun(node) {
  let el = node.parentNode;
  while (el) {
    if ((el.localName || "") === "r") return el;
    el = el.parentNode;
  }
  return null;
}

function runFonts(run) {
  for (let i = 0; i < run.childNodes.length; i++) {
    const child = run.childNodes[i];
    if ((child.localName || "") === "rPr") {
      for (let j = 0; j < child.childNodes.length; j++) {
        const grand = child.childNodes[j];
        if ((grand.localName || "") === "rFonts") return grand;
      }
      return null;
    }
  }
  return null;
}

function fontName(rFonts, attr) {
  return rFonts ? (rFonts.getAttribute(`w:${attr}`) || rFonts.getAttribute(attr) || "") : "";
}

function setFont(rFonts, name) {
  // w:cs is the font Word uses for Devanagari; theme attributes would
  // override the explicit names, so drop them on the switched run.
  rFonts.setAttribute("w:ascii", name);
  rFonts.setAttribute("w:hAnsi", name);
  rFonts.setAttribute("w:cs", name);
  for (const attr of ["w:asciiTheme", "w:hAnsiTheme", "w:cstheme"]) rFonts.removeAttribute(attr);
}

function updateFontForDirection(run, direction) {
  const rFonts = runFonts(run);
  if (!rFonts) return false;
  const ascii = fontName(rFonts, "ascii").toLowerCase();
  const hAnsi = fontName(rFonts, "hAnsi").toLowerCase();
  if (direction === DIRECTIONS.PREETI_TO_UNICODE) {
    if (ascii === "preeti" || hAnsi === "preeti") {
      setFont(rFonts, UNICODE_TARGET_FONT);
      return true;
    }
    return false;
  }
  if (UNICODE_NEPALI_FONTS.has(ascii) || UNICODE_NEPALI_FONTS.has(hAnsi)) {
    setFont(rFonts, PREETI_FONT);
    return true;
  }
  return false;
}

function textContentOf(node) {
  let s = "";
  for (let i = 0; i < node.childNodes.length; i++) {
    const c = node.childNodes[i];
    if (c.nodeType === 3 || c.nodeType === 4) s += c.data;
  }
  return s;
}

function setTextContent(node, value, doc) {
  while (node.firstChild) node.removeChild(node.firstChild);
  if (value !== "") node.appendChild(doc.createTextNode(value));
  if (/^[\s\u00a0]|[ \t\n\r\u00a0]$/.test(value)) {
    node.setAttribute("xml:space", "preserve");
  }
}

// Ancestors whose descendants convert individually but never merge with
// neighbors: merging across them would move text over link/field/control
// boundaries. (w:del and w:instrText are skipped entirely, see above.)
const MERGE_BARRIER_ANCESTORS = new Set(["fldSimple", "sdt", "hyperlink", "smartTag", "ins"]);

function hasNamedAncestor(node, names) {
  let el = node.parentNode;
  while (el) {
    if (names.has(el.localName || "")) return true;
    el = el.parentNode;
  }
  return false;
}

function nearestPara(node) {
  let el = node.parentNode;
  while (el) {
    if ((el.localName || "") === "p") return el;
    el = el.parentNode;
  }
  return null;
}

function runSignature(run) {
  // Comparable formatting fingerprint, or null when the run must stand alone.
  // Only rPr + w:t (+ zero-width proofErr, ignored) may merge; tabs, breaks,
  // drawings, field chars, or bookmark markers make a run a barrier so joint
  // text can never leapfrog them.
  let sig = "";
  for (let i = 0; i < run.childNodes.length; i++) {
    const ch = run.childNodes[i];
    if (ch.nodeType === 3) {
      if (/^\s*$/.test(ch.data || "")) continue;
      return null;
    }
    if (ch.nodeType !== 1) continue;
    const local = ch.localName || "";
    if (local === "rPr") sig += "|R" + new XMLSerializer().serializeToString(ch);
    else if (local === "t") sig += "|T";
    else if (local === "proofErr") continue; // zero-width spellcheck marker
    else return null;
  }
  return sig;
}

function runsAdjacent(run1, run2) {
  if (run1 === run2) return true; // two w:t split inside one run
  let s = run1.nextSibling;
  while (s && s !== run2) {
    if (s.nodeType === 3) {
      if (!/^\s*$/.test(s.data || "")) return false;
    } else if ((s.localName || "") !== "proofErr") {
      return false; // bookmark, comment range, or any other marker: barrier
    }
    s = s.nextSibling;
  }
  return s === run2;
}

export function convertDocxXml(xmlString, direction) {
  // xmldom throws on fatal errors but only reports recoverable ones (e.g. an
  // undefined entity); writing back a leniently-parsed part could corrupt it,
  // so both fail. Raw parser messages are not shown to the user.
  let doc;
  try {
    doc = new DOMParser({
      onError: (level) => {
        if (level !== "warning") throw new Error(level);
      },
    }).parseFromString(xmlString, "text/xml");
  } catch {
    throw new Error("Part of this document is damaged (invalid XML) and it can't be converted. Try opening it in Word and saving it again.");
  }
  const runs = doc.getElementsByTagNameNS(W_NS, "t");
  if (runs.length > MAX_TEXT_RUNS) {
    throw new Error("The document has an unusually high number of text runs and was rejected as a safety limit.");
  }
  let runsTotal = 0;
  let runsConverted = 0;
  let fontsUpdated = 0;
  // getElementsByTagNameNS returns a live list; snapshot it first.
  const nodes = Array.from(runs);
  // Script census for the wrong-direction check in convertDocx.
  let devanagariChars = 0;
  let asciiChars = 0;
  for (const node of nodes) {
    const t = textContentOf(node);
    devanagariChars += (t.match(/[ऀ-ॿ]/g) || []).length;
    asciiChars += (t.match(/[!-~]/g) || []).length;
  }
  // Group consecutive w:t nodes whose runs share identical formatting so
  // conversion sequences split across runs (ikar, reph, digraphs) convert
  // jointly. Anything structural between them breaks the group.
  const groups = [];
  let current = null;
  let prevRun = null;
  for (const node of nodes) {
    const run = findRun(node);
    let key = null;
    if (run && !hasSkippableAncestor(node) && !hasNamedAncestor(node, MERGE_BARRIER_ANCESTORS)) {
      const sig = runSignature(run);
      if (sig !== null) key = { para: nearestPara(node), sig, run };
    }
    if (key && current && current.para === key.para && current.sig === key.sig && runsAdjacent(prevRun, key.run)) {
      current.nodes.push(node);
    } else {
      current = key ? { ...key, nodes: [node], mergeable: true } : null;
      groups.push(key ? current : { nodes: [node], mergeable: false });
    }
    prevRun = run;
  }
  for (const group of groups) {
    if (!group.mergeable || group.nodes.length === 1) {
      for (const node of group.nodes) {
        if (hasSkippableAncestor(node)) continue;
        const original = textContentOf(node);
        if (original === "") continue;
        runsTotal += 1;
        let converted;
        try {
          converted = convertText(original, direction);
        } catch {
          continue; // never break a document because one run failed
        }
        if (converted !== original) {
          setTextContent(node, converted, doc);
          runsConverted += 1;
          const run = findRun(node);
          if (run && updateFontForDirection(run, direction)) fontsUpdated += 1;
        }
      }
      continue;
    }
    // Joint path: identical formatting, so the converted text lands in the
    // first node and the emptied followers keep (now irrelevant) formatting.
    // Nodes are never removed, only emptied — structure cannot shift.
    const texts = group.nodes.map(textContentOf);
    const nonEmpty = texts.filter((t) => t !== "").length;
    if (nonEmpty === 0) continue;
    const joint = texts.join("");
    runsTotal += nonEmpty;
    let converted;
    try {
      converted = convertText(joint, direction);
    } catch {
      continue;
    }
    if (converted !== joint) {
      setTextContent(group.nodes[0], converted, doc);
      for (let k = 1; k < group.nodes.length; k++) setTextContent(group.nodes[k], "", doc);
      runsConverted += nonEmpty;
      const run = findRun(group.nodes[0]);
      if (run && updateFontForDirection(run, direction)) fontsUpdated += 1;
    }
  }
  return {
    xml: new XMLSerializer().serializeToString(doc),
    stats: { runsTotal, runsConverted, fontsUpdated, devanagariChars, asciiChars },
  };
}

export async function convertDocx(arrayBuffer, direction) {
  if (direction !== DIRECTIONS.PREETI_TO_UNICODE && direction !== DIRECTIONS.UNICODE_TO_PREETI) {
    throw new Error(`Unknown conversion direction: ${direction}`);
  }
  const bytes = validateDocxBytes(arrayBuffer);
  let zip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new Error("The file could not be opened as a .docx (ZIP) package. It may be corrupted, password-protected, or not a Word document.");
  }
  validateDocxPackage(Object.keys(zip.files));
  validateDocxSizes(
    Object.values(zip.files)
      .filter((f) => !f.dir)
      .map((f) => ({ size: f._data?.uncompressedSize ?? 0, isTextPart: isTextPart(f.name) }))
  );
  const stats = { partsProcessed: 0, runsTotal: 0, runsConverted: 0, fontsUpdated: 0, bytesIn: bytes.byteLength, bytesOut: 0 };
  const partNames = Object.keys(zip.files).filter((name) => !zip.files[name].dir && isTextPart(name));
  let devanagariChars = 0;
  let asciiChars = 0;
  for (const name of partNames) {
    let xmlString;
    try {
      xmlString = await zip.files[name].async("string");
    } catch {
      throw new Error(`Could not read ${name}. The file may be password-protected or corrupted.`);
    }
    const { xml, stats: partStats } = convertDocxXml(xmlString, direction);
    zip.file(name, xml);
    stats.partsProcessed += 1;
    stats.runsTotal += partStats.runsTotal;
    stats.runsConverted += partStats.runsConverted;
    stats.fontsUpdated += partStats.fontsUpdated;
    devanagariChars += partStats.devanagariChars;
    asciiChars += partStats.asciiChars;
  }
  // Preeti text is ASCII, so a document that is mostly Devanagari is already
  // Unicode: Preeti -> Unicode would leave it alone and garble its digits and
  // English. ponytail: majority heuristic, no override for unusual mixes.
  if (direction === DIRECTIONS.PREETI_TO_UNICODE && devanagariChars > asciiChars) {
    throw new Error("This document already looks like Unicode Nepali text, so there is nothing to convert to Unicode. Did you mean Unicode → Preeti?");
  }
  const data = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  stats.bytesOut = data.byteLength;
  return { data, stats };
}

export function convertedFilename(originalName, direction) {
  const base = (originalName || "document").replace(/\.docx$/i, "");
  const suffix = direction === DIRECTIONS.UNICODE_TO_PREETI ? "-preeti" : "-unicode";
  return `${base}${suffix}.docx`;
}
