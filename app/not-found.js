import Link from "next/link";

// Own metadata so the 404 does not inherit the homepage title and canonical
// URL. (Next.js adds robots noindex to 404 responses itself.)
export const metadata = {
  title: "Page not found — Preeti Converter",
  alternates: { canonical: null },
};

export default function NotFound() {
  return (
    <main className="wrap">
      <section aria-labelledby="missing-heading">
        <h1 id="missing-heading">Page not found</h1>
        <p>
          The page you asked for does not exist. The converter tools are one
          click away:
        </p>
        <p>
          <Link className="download" href="/">
            Back to Preeti Converter
          </Link>
        </p>
      </section>
    </main>
  );
}
