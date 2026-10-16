import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://preeti-converter.example.com";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Preeti Converter — Free Nepali Preeti ↔ Unicode Converter",
  description:
    "Convert Nepali text and Word (.docx) documents between legacy Preeti encoding and standard Unicode. Free, private, runs entirely in your browser.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "Preeti Converter — Free Nepali Preeti ↔ Unicode Converter",
    description:
      "Paste text or upload a .docx file and convert between Preeti and Unicode Nepali. No sign-up, nothing uploaded.",
    siteName: "Preeti Converter",
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
