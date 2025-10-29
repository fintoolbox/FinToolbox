// pages/sitemap.xml.js
import { calculators } from "../lib/pages"; // <-- shared list of calculator URLs

export async function getServerSideProps({ res }) {
  const siteUrl = "https://fintoolbox.com.au";

  // Dynamically load posts from your MDX library (server-side only)
  const { getAllPosts } = await import("../lib/mdx");
  const posts = getAllPosts(); // returns array of { slug, frontmatter, ... }

  // Static core pages
  const staticPaths = [
    "",
    "/calculators",
    "/blog",
    ...calculators, // reuse the shared list
  ];

  // Combine all URLs
  const urls = [
    ...staticPaths.map((p) => `${siteUrl}${p}`),
    ...posts.map((p) => `${siteUrl}/blog/${p.slug}`),
  ];

  const lastmod = new Date().toISOString();

  // Build XML sitemap string
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls
      .map(
        (url) => `
      <url>
        <loc>${url}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
      </url>`
      )
      .join("")}
  </urlset>`;

  // Return the XML response
  res.setHeader("Content-Type", "application/xml");
  res.write(xml);
  res.end();

  return { props: {} };
}

// This page itself doesn't render anything visible — it only serves XML
export default function SiteMap() {
  return null;
}
