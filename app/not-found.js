import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap">
      <section aria-labelledby="missing-heading">
        <h2 id="missing-heading">Page not found</h2>
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
