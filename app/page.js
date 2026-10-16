"use client";

import { useState } from "react";
import Link from "next/link";
import Converter from "../components/Converter.js";
import DocumentUploader from "../components/DocumentUploader.js";

const TABS = [
  { id: "text", label: "Text Converter" },
  { id: "document", label: "Word Document" },
  { id: "how", label: "How to Use" },
  { id: "about", label: "About" },
];

export default function Home() {
  const [tab, setTab] = useState("text");

  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <h1 className="brand">Preeti Converter</h1>
          <p className="tagline">Free Nepali Preeti ↔ Unicode converter. Private by design: everything runs in your browser.</p>
        </div>
      </header>

      <nav className="wrap main-nav" aria-label="Main">
        <div role="tablist" aria-label="Converter sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              id={`tab-${t.id}`}
              className={tab === t.id ? "tab active" : "tab"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="wrap">
        <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === "text" && <Converter />}
          {tab === "document" && <DocumentUploader />}

          {tab === "how" && (
            <section aria-labelledby="how-heading">
              <h2 id="how-heading">How to use</h2>
              <h3>Convert pasted text</h3>
              <ol>
                <li>Open the Text Converter tab and pick a direction.</li>
                <li>Paste your text. The output updates instantly.</li>
                <li>Use Copy output, then paste into Word, email, or your website.</li>
              </ol>
              <h3>Convert a Word document</h3>
              <ol>
                <li>Open the Word Document tab and pick a direction.</li>
                <li>Drop in an editable .docx file (up to 10 MB).</li>
                <li>Press Convert document, then download the result.</li>
                <li>Open it in Word or LibreOffice and check tables, headers, and page breaks.</li>
              </ol>
              <h3>Tips</h3>
              <ul>
                <li>For Unicode → Preeti you need the Preeti font installed to read the result.</li>
                <li>Scanned PDFs and photos cannot be converted here — only real text.</li>
                <li>Keep a copy of the original file before converting.</li>
              </ul>
            </section>
          )}

          {tab === "about" && (
            <section aria-labelledby="about-heading">
              <h2 id="about-heading">About this tool</h2>
              <p>
                Preeti is a legacy Nepali font encoding from the pre-Unicode era: it stores Nepali text using ASCII
                code points, so it only reads correctly with the Preeti font installed. Unicode (UTF-8) is the modern
                standard that works on websites, phones, and computers without special fonts.
              </p>
              <h3>Known limitations</h3>
              <ul>
                <li>Conversion is not perfectly reversible: Preeti and Unicode cover slightly different character sets.</li>
                <li>A syllable split across two differently formatted Word runs converts per-run.</li>
                <li>English letters and digits typed in the source encoding are interpreted as Nepali keystrokes.</li>
                <li>Password-protected or corrupted documents are rejected with an explanation.</li>
              </ul>
              <h3>Privacy</h3>
              <p>
                Text and documents are processed locally in your browser. Nothing is uploaded, logged, or stored on any
                server.
              </p>
            </section>
          )}
        </div>

        <section className="seo-content" aria-label="About Preeti and Unicode conversion">
          <h2>Preeti to Unicode and Unicode to Preeti, explained</h2>
          <h3>What is Preeti encoding?</h3>
          <p>
            Preeti is a legacy Nepali typeface encoding that maps Nepali characters onto English keyboard positions.
            Documents written in Preeti look correct only when the Preeti font is applied; without it they appear as
            random English letters. Changing the font alone does not convert the underlying encoding.
          </p>
          <h3>What is Nepali Unicode?</h3>
          <p>
            Unicode Nepali (Devanagari, UTF-8) is the standard encoding used by modern operating systems, browsers, and
            phones. Unicode text is searchable, accessible to screen readers, and renders without installing any special
            font.
          </p>
          <h3>How to convert Preeti to Unicode</h3>
          <p>
            Paste Preeti-encoded text into the converter with the Preeti → Unicode direction, or upload an editable
            .docx file to the document converter. Special sequences — vowel signs, conjuncts, reph — are reordered
            into correct Unicode order automatically.
          </p>
          <h3>How to convert Unicode to Preeti</h3>
          <p>
            Switch to the Unicode → Preeti direction and paste standard Nepali text. The result is Preeti-encoded, so
            install the Preeti font to display it, typically for legacy printing workflows.
          </p>
          <h3>Why Word document pagination may change</h3>
          <p>
            Converted text can be slightly longer or shorter than the original, so line and page breaks may shift even
            though tables, images, and styles stay in place. Always review the downloaded document before printing.
          </p>
        </section>
      </main>

      <footer className="wrap site-footer">
        <p>Preeti Converter — free, local, no sign-up. Preeti → Unicode and Unicode → Preeti for text and .docx files.</p>
        <p>
          <Link href="/privacy">Privacy policy</Link>
        </p>
      </footer>
    </>
  );
}
