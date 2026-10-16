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

async function makeDocx({ bodyInner, header = null, footer = null, image = false, hyperlink = false }) {
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

describe("DOCX long document performance", () => {
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
