// DOCX pipeline tests. Run with: npm test
// Fixtures are synthetic .docx packages built in-code with JSZip, so no
// binary blobs or third-party documents are needed.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import { convertDocx, convertDocxXml, convertedFilename } from "../lib/document/transform-docx.js";
import { DIRECTIONS } from "../lib/converter/index.js";
import {
  validateDocxSizes,
  MAX_FILE_BYTES,
  MAX_PART_BYTES,
  MAX_UNCOMPRESSED_BYTES,
  MAX_ZIP_ENTRIES,
} from "../lib/document/validate-docx.js";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

function run(text, { font = null, bold = false } = {}) {
  const rPr =
    font || bold
      ? `<w:rPr>${font ? `<w:rFonts w:ascii="${font}" w:hAnsi="${font}"/>` : ""}${bold ? "<w:b/>" : ""}</w:rPr>`
      : "";
  return `<w:r>${rPr}<w:t${text.startsWith(" ") || text.endsWith(" ") ? ' xml:space="preserve"' : ""}>${text}</w:t></w:r>`;
}

function para(...runs) {
  return `<w:p>${runs.join("")}</w:p>`;
}

function contentTypes(extra = "") {
  return `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>${extra}</Types>`;
}

function rels() {
  return `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
}

function docRels({ header = false, footer = false, image = false, hyperlink = false } = {}) {
  let i = 1;
  let out = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`;
  out += `<Relationship Id="rId${i++}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
  if (header) out += `<Relationship Id="rId${i++}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>`;
  if (footer) out += `<Relationship Id="rId${i++}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>`;
  if (image) out += `<Relationship Id="rId${i++}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>`;
  if (hyperlink) out += `<Relationship Id="rIdH" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com" TargetMode="External"/>`;
  return out + `</Relationships>`;
}

function styles() {
  return `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="${W}"><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
}

function documentXml(bodyInner) {
  return `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${W}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${bodyInner}</w:body></w:document>`;
}

async function makeDocx({ bodyInner, header = null, footer = null, image = false, hyperlink = false, parts = {} }) {
  const zip = new JSZip();
  let extras = "";
  if (header) extras += `<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>`;
  if (footer) extras += `<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>`;
  zip.file("[Content_Types].xml", contentTypes(extras));
  zip.file("_rels/.rels", rels());
  zip.file("word/document.xml", documentXml(bodyInner));
  zip.file("word/_rels/document.xml.rels", docRels({ header: !!header, footer: !!footer, image, hyperlink }));
  zip.file("word/styles.xml", styles());
  if (header) zip.file("word/header1.xml", `<?xml version="1.0" encoding="UTF-8"?><w:hdr xmlns:w="${W}">${header}</w:hdr>`);
  if (footer) zip.file("word/footer1.xml", `<?xml version="1.0" encoding="UTF-8"?><w:ftr xmlns:w="${W}">${footer}</w:ftr>`);
  if (image) zip.file("word/media/image1.png", PNG_1PX);
  for (const [name, content] of Object.entries(parts)) zip.file(name, content);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

async function readPart(buffer, name) {
  const zip = await JSZip.loadAsync(buffer);
  return zip.files[name].async("string");
}

function textsOf(xmlString) {
  const doc = new DOMParser().parseFromString(xmlString, "text/xml");
  return Array.from(doc.getElementsByTagNameNS(W, "t")).map((n) => n.textContent);
}

describe("DOCX Preeti -> Unicode", () => {
  let input;
  before(async () => {
    input = await makeDocx({
      bodyInner: para(run("g]kfn", { font: "Preeti", bold: true }), run(" ;/sf/", { font: "Preeti" })),
    });
  });

  it("converts runs and swaps Preeti font for Nirmala UI, keeping bold", async () => {
    const { data, stats } = await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    const xml = await readPart(data, "word/document.xml");
    assert.deepEqual(textsOf(xml), ["नेपाल", " सरकार"]);
    assert.match(xml, /w:ascii="Nirmala UI"/);
    assert.match(xml, /<w:b\/>/);
    assert.equal(stats.runsConverted, 2);
    assert.equal(stats.partsProcessed, 1);
  });

  it("leaves the original upload unchanged", async () => {
    const beforeHash = createHash("sha256").update(input).digest("hex");
    await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    assert.equal(createHash("sha256").update(input).digest("hex"), beforeHash);
  });

  it("output is a valid ZIP with required parts and parseable XML", async () => {
    const { data } = await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    assert.equal(data[0], 0x50);
    assert.equal(data[1], 0x4b);
    const zip = await JSZip.loadAsync(data);
    assert.ok(zip.files["word/document.xml"]);
    assert.ok(zip.files["[Content_Types].xml"]);
    assert.ok(zip.files["word/_rels/document.xml.rels"]);
    new DOMParser().parseFromString(await readPart(data, "word/document.xml"), "text/xml");
  });
});

describe("DOCX Unicode -> Preeti", () => {
  it("converts runs and swaps Mangal font for Preeti", async () => {
    const input = await makeDocx({ bodyInner: para(run("नेपाल", { font: "Mangal" })) });
    const { data } = await convertDocx(input, DIRECTIONS.UNICODE_TO_PREETI);
    const xml = await readPart(data, "word/document.xml");
    assert.deepEqual(textsOf(xml), ["g]kfn"]);
    assert.match(xml, /w:ascii="Preeti"/);
  });
});

describe("DOCX structures", () => {
  it("converts table cells but keeps tbl/tr/tc structure", async () => {
    const input = await makeDocx({
      bodyInner: `<w:tbl><w:tr><w:tc>${para(run("g]kfn", { font: "Preeti" }))}</w:tc><w:tc>${para(run(";/sf/", { font: "Preeti" }))}</w:tc></w:tr></w:tbl>`,
    });
    const { data } = await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    const xml = await readPart(data, "word/document.xml");
    assert.deepEqual(textsOf(xml), ["नेपाल", "सरकार"]);
    assert.match(xml, /<w:tbl>/);
    assert.equal((xml.match(/<w:tc>/g) || []).length, 2);
  });

  it("converts headers and footers", async () => {
    const input = await makeDocx({
      bodyInner: para(run("g]kfn", { font: "Preeti" })),
      header: para(run(";/sf/", { font: "Preeti" })),
      footer: para(run("g]kfn", { font: "Preeti" })),
    });
    const { data, stats } = await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    assert.deepEqual(textsOf(await readPart(data, "word/header1.xml")), ["सरकार"]);
    assert.deepEqual(textsOf(await readPart(data, "word/footer1.xml")), ["नेपाल"]);
    assert.equal(stats.partsProcessed, 3);
  });

  it("skips field codes and tracked deletions", async () => {
    const input = await makeDocx({
      bodyInner: para(
        `<w:r><w:instr><w:instrText>PAGE g]kfn</w:instrText></w:instr></w:r>`,
        `<w:del><w:r><w:t>g]kfn</w:t></w:r></w:del>`,
        run("g]kfn", { font: "Preeti" })
      ),
    });
    const { data } = await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    const xml = await readPart(data, "word/document.xml");
    assert.match(xml, /PAGE g\]kfn/);
    assert.match(xml, /<w:del>.*g\]kfn.*<\/w:del>/s);
    assert.match(xml, /नेपाल/);
  });

  it("preserves images and hyperlink relationships byte-for-byte", async () => {
    const input = await makeDocx({
      bodyInner:
        para(run("g]kfn", { font: "Preeti" })) +
        `<w:p><w:hyperLink r:id="rIdH"><w:r><w:t>;/sf/</w:t></w:r></w:hyperLink></w:p>`,
      image: true,
      hyperlink: true,
    });
    const { data } = await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    const zip = await JSZip.loadAsync(data);
    assert.deepEqual(Buffer.from(await zip.files["word/media/image1.png"].async("uint8array")), PNG_1PX);
    const relsXml = await zip.files["word/_rels/document.xml.rels"].async("string");
    assert.match(relsXml, /https:\/\/example\.com/);
    assert.match(relsXml, /media\/image1\.png/);
  });

  it("preserves spaces via xml:space", async () => {
    const { xml } = convertDocxXml(documentXml(para(run(" g]kfn ", { font: "Preeti" }))), DIRECTIONS.PREETI_TO_UNICODE);
    assert.match(xml, /xml:space="preserve"> नेपाल </);
  });

  it("converts split ikar jointly when formatting is identical", async () => {
    const input = await makeDocx({ bodyInner: para(run("l"), run("s")) });
    const { data } = await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    // Identical (unformatted) runs merge: "ls" -> "कि" in the first node.
    assert.deepEqual(textsOf(await readPart(data, "word/document.xml")), ["कि", ""]);
  });

  it("falls back to per-run conversion when formatting differs", async () => {
    const input = await makeDocx({ bodyInner: para(run("l", { bold: true }), run("s")) });
    const { data } = await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    assert.deepEqual(textsOf(await readPart(data, "word/document.xml")), ["ि", "क"]);
  });

  it("does not merge across tabs", async () => {
    const input = await makeDocx({
      bodyInner: `<w:p><w:r><w:t>l</w:t></w:r><w:r><w:tab/><w:t>s</w:t></w:r></w:p>`,
    });
    const { data } = await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    const xml = await readPart(data, "word/document.xml");
    assert.deepEqual(textsOf(xml), ["ि", "क"]);
    assert.match(xml, /<w:tab\/>/);
  });

  it("does not merge across bookmarks", async () => {
    const input = await makeDocx({
      bodyInner: `<w:p><w:r><w:t>l</w:t></w:r><w:bookmarkStart w:id="0" w:name="b"/><w:bookmarkEnd w:id="0"/><w:r><w:t>s</w:t></w:r></w:p>`,
    });
    const { data } = await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    const xml = await readPart(data, "word/document.xml");
    assert.deepEqual(textsOf(xml), ["ि", "क"]);
    assert.match(xml, /bookmarkStart/);
  });

  it("does not merge across paragraphs", async () => {
    const input = await makeDocx({ bodyInner: para(run("l")) + para(run("s")) });
    const { data } = await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    assert.deepEqual(textsOf(await readPart(data, "word/document.xml")), ["ि", "क"]);
  });
});

describe("DOCX validation and errors", () => {
  it("rejects non-ZIP bytes", async () => {
    await assert.rejects(convertDocx(new Uint8Array(Buffer.from("%PDF-1.4 fake")), DIRECTIONS.PREETI_TO_UNICODE), /not a Word/);
  });

  it("rejects empty input", async () => {
    await assert.rejects(convertDocx(new Uint8Array(0), DIRECTIONS.PREETI_TO_UNICODE), /empty/);
  });

  it("rejects oversized files", async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big[0] = 0x50;
    big[1] = 0x4b;
    await assert.rejects(convertDocx(big, DIRECTIONS.PREETI_TO_UNICODE), /above the 10 MB limit/);
  });

  it("rejects ZIPs missing document.xml", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", contentTypes());
    const buf = await zip.generateAsync({ type: "uint8array" });
    await assert.rejects(convertDocx(buf, DIRECTIONS.PREETI_TO_UNICODE), /missing its main document/);
  });

  it("rejects unknown directions", async () => {
    await assert.rejects(convertDocx(new Uint8Array([0x50, 0x4b]), "sideways"), /Unknown conversion direction/);
  });
});

// Release-readiness regressions (docs/release-readiness-audit.md).
describe("DOCX regressions: parts, fonts and structure", () => {
  const xmlPart = (root, inner) => `<?xml version="1.0" encoding="UTF-8"?><w:${root} xmlns:w="${W}">${inner}</w:${root}>`;

  it("converts footnotes, endnotes and comments", async () => {
    const input = await makeDocx({
      bodyInner: para(run("g]kfn", { font: "Preeti" })),
      parts: {
        "word/footnotes.xml": xmlPart("footnotes", `<w:footnote w:id="1">${para(run(";/sf/", { font: "Preeti" }))}</w:footnote>`),
        "word/endnotes.xml": xmlPart("endnotes", `<w:endnote w:id="1">${para(run("/fd", { font: "Preeti" }))}</w:endnote>`),
        "word/comments.xml": xmlPart("comments", `<w:comment w:id="0">${para(run("g]kfn", { font: "Preeti" }))}</w:comment>`),
      },
    });
    const { data, stats } = await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    assert.deepEqual(textsOf(await readPart(data, "word/footnotes.xml")), ["सरकार"]);
    assert.deepEqual(textsOf(await readPart(data, "word/endnotes.xml")), ["राम"]);
    assert.deepEqual(textsOf(await readPart(data, "word/comments.xml")), ["नेपाल"]);
    assert.equal(stats.partsProcessed, 4);
  });

  it("switches the complex-script font (w:cs) and drops theme overrides", async () => {
    const { xml } = convertDocxXml(
      documentXml(`<w:p><w:r><w:rPr><w:rFonts w:ascii="Preeti" w:hAnsi="Preeti" w:cs="Preeti" w:cstheme="minorBidi"/></w:rPr><w:t>g]kfn</w:t></w:r></w:p>`),
      DIRECTIONS.PREETI_TO_UNICODE
    );
    assert.match(xml, /w:cs="Nirmala UI"/);
    assert.doesNotMatch(xml, /cstheme|"Preeti"/);
  });

  it("converts hyperlink text but keeps the hyperlink element", async () => {
    const input = await makeDocx({
      bodyInner: `<w:p><w:hyperlink r:id="rIdH"><w:r><w:t>;/sf/</w:t></w:r></w:hyperlink></w:p>`,
      hyperlink: true,
    });
    const { data } = await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    const xml = await readPart(data, "word/document.xml");
    assert.deepEqual(textsOf(xml), ["सरकार"]);
    assert.match(xml, /<w:hyperlink r:id="rIdH">/);
  });

  it("keeps list numbering properties and the numbering part untouched", async () => {
    const numbering = xmlPart("numbering", `<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>`);
    const input = await makeDocx({
      bodyInner: `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>${run("g]kfn", { font: "Preeti" })}</w:p>`,
      parts: { "word/numbering.xml": numbering },
    });
    const { data } = await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    const xml = await readPart(data, "word/document.xml");
    assert.match(xml, /<w:numPr><w:ilvl w:val="0"\/><w:numId w:val="1"\/><\/w:numPr>/);
    assert.equal(await readPart(data, "word/numbering.xml"), numbering);
  });

  it("pinned: Preeti -> Unicode converts English in any font (no font filter)", async () => {
    // Documented limitation: fonts are often inherited from styles/themes, so
    // runs are not filtered by font. Calibri English becomes Devanagari.
    const input = await makeDocx({ bodyInner: para(run("g]kfn", { font: "Preeti" }), run(" Hi", { font: "Calibri" })) });
    const { data } = await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    assert.deepEqual(textsOf(await readPart(data, "word/document.xml")), ["नेपाल", " ज्ष्"]);
  });

  it("Unicode -> Preeti leaves English words intact", async () => {
    const input = await makeDocx({ bodyInner: para(run("Simple नेपाल", { font: "Mangal" })) });
    const { data } = await convertDocx(input, DIRECTIONS.UNICODE_TO_PREETI);
    assert.deepEqual(textsOf(await readPart(data, "word/document.xml")), ["Simple g]kfn"]);
  });

  it("accepts a document with no convertible text", async () => {
    const input = await makeDocx({ bodyInner: `<w:p/><w:sectPr/>` });
    const { data, stats } = await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    assert.equal(stats.runsTotal, 0);
    assert.equal(stats.runsConverted, 0);
    assert.ok((await JSZip.loadAsync(data)).files["word/document.xml"]);
  });
});

describe("DOCX regressions: unsafe and damaged input", () => {
  it("rejects password-protected / legacy .doc (OLE) files with a specific message", async () => {
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
    await assert.rejects(convertDocx(ole, DIRECTIONS.PREETI_TO_UNICODE), /password-protected or in the old Word 97-2003/);
  });

  it("rejects malformed XML with a friendly message, not the parser's", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", contentTypes());
    zip.file("word/document.xml", `<w:document xmlns:w="${W}"><w:body><w:p><w:t>secret</w:body></w:document>`);
    const buf = await zip.generateAsync({ type: "uint8array" });
    await assert.rejects(convertDocx(buf, DIRECTIONS.PREETI_TO_UNICODE), (e) => {
      assert.match(e.message, /damaged \(invalid XML\)/);
      assert.doesNotMatch(e.message, /secret|mismatch/);
      return true;
    });
  });

  it("rejects XML that only parses leniently (undefined entity)", () => {
    assert.throws(() => convertDocxXml(documentXml(para("<w:r><w:t>&nbsp;</w:t></w:r>")), DIRECTIONS.PREETI_TO_UNICODE), /damaged/);
  });

  it("rejects a text part whose declared size exceeds the per-part limit", async () => {
    // ~26 MB of whitespace compresses to a few KB: the classic zip-bomb shape.
    const zip = new JSZip();
    zip.file("[Content_Types].xml", contentTypes());
    zip.file("word/document.xml", documentXml(" ".repeat(MAX_PART_BYTES + 1)));
    const buf = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    assert.ok(buf.byteLength < MAX_FILE_BYTES);
    await assert.rejects(convertDocx(buf, DIRECTIONS.PREETI_TO_UNICODE), /expands to more data/);
  });

  it("enforces package-wide size and entry-count limits", () => {
    const tooBig = /expands to more data/;
    assert.throws(() => validateDocxSizes([{ size: MAX_UNCOMPRESSED_BYTES, isTextPart: false }, { size: 1, isTextPart: false }]), tooBig);
    assert.throws(() => validateDocxSizes(Array.from({ length: MAX_ZIP_ENTRIES + 1 }, () => ({ size: 0 }))), tooBig);
    validateDocxSizes([{ size: MAX_PART_BYTES, isTextPart: true }]); // at the limit is fine
  });
});

describe("DOCX long document performance", () => {
  it("converts a ~40-page document (1,600 paragraphs, mixed formatting)", async () => {
    // ~12 words/paragraph x 1,600 ≈ 19,000 words ≈ 40 pages of A4 text.
    const line = "g]kfn ;/sf/sf] cfly{s l:ylt /fli6«o k|fyldstf xf] . ";
    const paras = Array.from({ length: 1_600 }, (_, i) =>
      para(run(line, { font: "Preeti", bold: i % 3 === 0 }), run(`${i + 1}`, { font: "Preeti" }))
    ).join("");
    const input = await makeDocx({ bodyInner: paras });
    const started = Date.now();
    const { data, stats } = await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    const ms = Date.now() - started;
    console.log(`    1,600-paragraph docx: ${(input.length / 1024).toFixed(0)} KB -> ${(data.length / 1024).toFixed(0)} KB in ${ms} ms`);
    assert.equal(stats.runsConverted, 3_200);
    assert.ok(ms < 60_000, `took ${ms} ms`);
    const first = textsOf(await readPart(data, "word/document.xml"))[0];
    assert.equal(first, "नेपाल सरकारको आर्थिक स्थिति राष्ट्रिय प्राथमिकता हो । ");
  });

  it("converts ~800 paragraphs and reports timing", async () => {
    const sentences = ["g]kfn ;/sf/", ";/sf/ g]kfn", "/fd", "s{", "lgkfn", "qm", "!@#", "k|m"]; // all covered by converter tests
    const paras = Array.from(
      { length: 800 },
      (_, i) => para(run(`${sentences[i % sentences.length]} ${i + 1}`, { font: "Preeti" }))
    ).join("");
    const input = await makeDocx({ bodyInner: paras });
    const started = Date.now();
    const { data, stats } = await convertDocx(input, DIRECTIONS.PREETI_TO_UNICODE);
    const ms = Date.now() - started;
    console.log(`    800-paragraph docx: ${(input.length / 1024).toFixed(0)} KB -> ${(data.length / 1024).toFixed(0)} KB in ${ms} ms, runs=${stats.runsConverted}`);
    assert.equal(stats.runsConverted, 800);
    assert.ok(ms < 60_000, `took ${ms} ms`);
    const zip = await JSZip.loadAsync(data);
    assert.ok(zip.files["word/document.xml"]);
  });
});

describe("convertedFilename", () => {
  it("inserts direction suffix before .docx", () => {
    assert.equal(convertedFilename("letter.docx", DIRECTIONS.PREETI_TO_UNICODE), "letter-unicode.docx");
    assert.equal(convertedFilename("letter.docx", DIRECTIONS.UNICODE_TO_PREETI), "letter-preeti.docx");
    assert.equal(convertedFilename("letter", DIRECTIONS.PREETI_TO_UNICODE), "letter-unicode.docx");
  });
});
