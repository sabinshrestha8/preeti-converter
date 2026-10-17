import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://preeti-converter.example.com";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Privacy — Preeti Converter",
  description:
    "How Preeti Converter handles your text and documents: everything is processed locally in your browser. Nothing is uploaded, stored, or logged.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "website",
    url: "/privacy",
    title: "Privacy — Preeti Converter",
    description:
      "Everything is processed locally in your browser. Nothing is uploaded, stored, or logged.",
    siteName: "Preeti Converter",
  },
  robots: { index: true, follow: true },
};

export default function Privacy() {
  return (
    <main className="wrap">
      <section aria-labelledby="privacy-heading">
        <h1 id="privacy-heading">Privacy policy</h1>
        <p>
          Preeti Converter processes your text and Word documents{" "}
          <strong>locally in your browser tab</strong>. The web server only
          delivers the page; your text and documents are never sent to it. There
          are no accounts, no uploads, no document storage, no analytics, and no
          logs of what you convert.
        </p>
        <h3>What stays on your device</h3>
        <ul>
          <li>Text you type or paste.</li>
          <li>Word files you upload, and the converted files you download.</li>
          <li>Everything disappears when you close the tab.</li>
        </ul>
        <h3>What leaves your device</h3>
        <ul>
          <li>
            Nothing you convert. The only network requests are the ordinary
            ones your browser makes to load this site itself (page, styles,
            scripts), which any hosting provider necessarily observes as
            anonymous request metadata.
          </li>
        </ul>
        <h3>What can change this</h3>
        <ul>
          <li>
            If analytics, crash reporting, advertising, or accounts are ever
            added, this page will be updated first and the implementation
            re-verified against it.
          </li>
        </ul>
        <h3>File safety</h3>
        <ul>
          <li>Files are validated before conversion (type, size, structure).</li>
          <li>Corrupt or password-protected documents are rejected safely.</li>
          <li>Document macros and embedded code are never executed.</li>
        </ul>
        <p>
          <Link className="download" href="/">
            Back to Preeti Converter
          </Link>
        </p>
      </section>
      <section className="seo-content" aria-label="About this policy">
        <h2>Why a converter needs a privacy policy</h2>
        <p>
          Government letters, school records, and office documents are often
          confidential. A converter that uploaded them for processing would put
          that confidentiality at risk. This tool is built so that risk cannot
          occur by design — there is simply nowhere for your content to go.
        </p>
      </section>
    </main>
  );
}
