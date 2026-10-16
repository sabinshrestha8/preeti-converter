"use client";

import { useMemo, useState } from "react";
import { convertText, DIRECTIONS } from "../lib/converter/index.js";

const SAMPLES = {
  [DIRECTIONS.PREETI_TO_UNICODE]: "g]kfn ;/sf/\n;/sf/ g]kfn xf]",
  [DIRECTIONS.UNICODE_TO_PREETI]: "नेपाल सरकार\nसरकार नेपाल हो",
};

const LABELS = {
  [DIRECTIONS.PREETI_TO_UNICODE]: { from: "Preeti", to: "Unicode", inputPh: "Paste Preeti text here, e.g. g]kfn" },
  [DIRECTIONS.UNICODE_TO_PREETI]: { from: "Unicode", to: "Preeti", inputPh: "Paste Unicode Nepali here, e.g. नेपाल" },
};

export default function Converter() {
  const [direction, setDirection] = useState(DIRECTIONS.PREETI_TO_UNICODE);
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  // Conversion is sub-millisecond for ordinary input, so output derives
  // directly during render: no debounce, no stale output, no worker.
  const output = useMemo(() => {
    if (input === "") return "";
    try {
      return convertText(input, direction);
    } catch {
      return "";
    }
  }, [input, direction]);

  const labels = LABELS[direction];

  async function copyOutput() {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (permissions, insecure context): select the
      // output so the user can copy manually instead of failing silently.
      setCopyError("Automatic copy was blocked by the browser. The output below is selected — press Ctrl+C to copy.");
      document.getElementById("converter-output")?.select();
    }
  }

  function swapDirection() {
    setDirection((d) =>
      d === DIRECTIONS.PREETI_TO_UNICODE ? DIRECTIONS.UNICODE_TO_PREETI : DIRECTIONS.PREETI_TO_UNICODE
    );
    setInput(output);
    setCopied(false);
    setCopyError("");
  }

  return (
    <section aria-labelledby="text-converter-heading">
      <h2 id="text-converter-heading">Text converter</h2>

      <div className="direction-row" role="group" aria-label="Conversion direction">
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
        <button type="button" className="ghost" onClick={swapDirection} title="Swap direction and convert back">
          ⇄ Swap
        </button>
      </div>

      <div className="panels">
        <div className="panel">
          <label htmlFor="converter-input">
            {labels.from} input <span className="count">{input.length} characters</span>
          </label>
          <textarea
            id="converter-input"
            rows={9}
            placeholder={labels.inputPh}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="panel-actions">
            <button type="button" className="ghost" onClick={() => setInput(SAMPLES[direction])}>
              Load sample
            </button>
            <button type="button" className="ghost" onClick={() => setInput("")} disabled={input === ""}>
              Clear
            </button>
          </div>
        </div>

        <div className="panel">
          <label htmlFor="converter-output">
            {labels.to} output <span className="count">{output.length} characters</span>
          </label>
          <textarea
            id="converter-output"
            rows={9}
            readOnly
            placeholder={input === "" ? `Converted ${labels.to} text appears here` : ""}
            value={output}
            aria-live="polite"
          />
          <div className="panel-actions">
            <button type="button" onClick={copyOutput} disabled={output === ""}>
              {copied ? "Copied ✓" : "Copy output"}
            </button>
          </div>
        </div>
      </div>

      <p className="status" role="status">
        {copyError ||
          (input === ""
            ? "Type or paste text above. Conversion happens instantly, in your browser — nothing is uploaded."
            : `Converted ${input.length} → ${output.length} characters.`)}
      </p>
      <p className="hint">
        Round-trip conversion is not always exact (Preeti and Unicode do not cover identical character sets). See
        limitations below.
      </p>
    </section>
  );
}
