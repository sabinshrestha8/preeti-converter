"use client";

import { useRef, useState } from "react";
import { DIRECTIONS } from "../lib/converter/index.js";
import { MAX_FILE_BYTES } from "../lib/document/validate-docx.js";

const STAGES = {
  idle: "Choose a .docx file to begin.",
  reading: "Reading file…",
  converting: "Converting text inside the document…",
  preparing: "Preparing download…",
  done: "Conversion complete. Download your file below.",
};

export default function DocumentUploader() {
  const [direction, setDirection] = useState(DIRECTIONS.PREETI_TO_UNICODE);
  const [file, setFile] = useState(null);
  const [stage, setStage] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { url, filename, stats }
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  function pickFile(list) {
    setError("");
    setResult(null);
    const f = list?.[0];
    if (!f) return;
    if (!/\.docx$/i.test(f.name)) {
      setError("Only .docx files are supported. PDFs, images, and scanned documents cannot be converted in this release.");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setError(`“${f.name}” is ${(f.size / 1024 / 1024).toFixed(1)} MB, above the 10 MB limit.`);
      return;
    }
    setFile(f);
    setStage("idle");
  }

  async function convert() {
    if (!file) return;
    setError("");
    setResult(null);
    try {
      setStage("reading");
      const buffer = await file.arrayBuffer();
      // Loaded on demand so the ZIP/XML libraries are not in the initial bundle.
      const { convertDocx, convertedFilename } = await import("../lib/document/transform-docx.js");
      setStage("converting");
      // Yield so the stage text paints before the (fast but synchronous-feeling) work.
      await new Promise((r) => setTimeout(r, 30));
      const { data, stats } = await convertDocx(buffer, direction);
      setStage("preparing");
      const blob = new Blob([data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const filename = convertedFilename(file.name, direction);
      setResult({ url, filename, stats });
      setStage("done");
    } catch (e) {
      setStage("idle");
      setError(e?.message || "Conversion failed. The file may be corrupted or protected.");
    }
  }

  function reset() {
    if (result) URL.revokeObjectURL(result.url);
    setFile(null);
    setResult(null);
    setError("");
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  const busy = stage === "reading" || stage === "converting" || stage === "preparing";

  return (
    <section aria-labelledby="doc-converter-heading">
      <h2 id="doc-converter-heading">Word document converter</h2>
      <p className="hint">Editable .docx only. Your file never leaves this browser tab.</p>

      <div className="direction-row" role="group" aria-label="Document conversion direction">
        <button
          type="button"
          className={direction === DIRECTIONS.PREETI_TO_UNICODE ? "tab active" : "tab"}
          aria-pressed={direction === DIRECTIONS.PREETI_TO_UNICODE}
          onClick={() => setDirection(DIRECTIONS.PREETI_TO_UNICODE)}
        >
          Preeti → Unicode
        </button>
        <button
          type="button"
          className={direction === DIRECTIONS.UNICODE_TO_PREETI ? "tab active" : "tab"}
          aria-pressed={direction === DIRECTIONS.UNICODE_TO_PREETI}
          onClick={() => setDirection(DIRECTIONS.UNICODE_TO_PREETI)}
        >
          Unicode → Preeti
        </button>
      </div>

      <div
        className={dragOver ? "dropzone over" : "dropzone"}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pickFile(e.dataTransfer.files);
        }}
      >
        <p>Drag &amp; drop your .docx here, or</p>
        <label className="file-label">
          Choose file
          <input
            ref={inputRef}
            type="file"
            accept=".docx"
            className="visually-hidden"
            onChange={(e) => pickFile(e.target.files)}
          />
        </label>
      </div>

      {file && (
        <dl className="file-meta">
          <div>
            <dt>File</dt>
            <dd>{file.name}</dd>
          </div>
          <div>
            <dt>Size</dt>
            <dd>{(file.size / 1024).toFixed(1)} KB</dd>
          </div>
        </dl>
      )}

      <div className="panel-actions">
        <button type="button" onClick={convert} disabled={!file || busy}>
          {busy ? "Converting…" : "Convert document"}
        </button>
        {(file || result) && (
          <button type="button" className="ghost" onClick={reset}>
            Reset
          </button>
        )}
      </div>

      {busy && <p className="status" role="status">{STAGES[stage]}</p>}

      {result && (
        <div className="result" role="status">
          <p>
            <strong>{STAGES.done}</strong>
          </p>
          <p className="hint">
            {result.stats.runsConverted} of {result.stats.runsTotal} text runs converted
            {result.stats.fontsUpdated > 0 && `, ${result.stats.fontsUpdated} font declarations updated`}.
          </p>
          <a className="download" href={result.url} download={result.filename}>
            Download {result.filename}
          </a>
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <p className="hint">
        Tables, images, headers, and footers are preserved in place. A syllable split across two differently formatted
        runs converts per-run. Password-protected files are rejected.
      </p>
    </section>
  );
}
