export default function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://preeti-converter.example.com";
  return [{ url: `${base}/`, lastModified: new Date(), changeFrequency: "monthly", priority: 1 }];
}
