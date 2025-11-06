// pages/sitemap.xml.js
import { calculators } from "../lib/pages"; // shared list of calculator paths (e.g. "/calculators/mortgage")

export async function getServerSideProps({ res }) {
  const siteUrl = "https://fintoolbox.com.au"; // no trailing slash

  // Server-only: load MDX posts
  const { getAllPosts } = await import("../lib/mdx");
  const posts = getAllPosts(); // [{ slug, frontmatter: { date, updatedAt? }, ... }]

  // ---- helpers ----
  const normalise = (p) => {
    // ensure leading slash, remove trailing slash except root
    let s = p.startsWith("/") ? p : `/${p}`;
    if (s !== "/" && s.endsWith("/")) s = s.slice(0, -1);
    return s;
  };
  const iso = (d) => {
    const t = new Date(d);
    return isNaN(t.getTime()) ? new Date().toISOString() : t.toISOString();
  };

  // Core pages (paths only)
  const staticPaths = [
    "/",
    "/calculators",
    "/blog",
    ...calculators, // reuse your shared list of calculator paths
  ].map(normalise);

  // Build URL objects
  const urls = [];

  // Static/core pages
  for (const p of staticPaths) {
    urls.push({
      loc: `${siteUrl}${p === "/" ? "" : p}`,
      lastmod: new Date().toISOString(),
      changefreq: p === "/" ? "daily" : p.startsWith("/calculators") ? "weekly" : "weekly",
      priority: p === "/" ? 1.0 : p === "/calculators" || p === "/blog" ? 0.8 : 0.7,
    });
  }

  // Blog posts
  for (const post of posts) {
    const p = normalise(`/blog/${post.slug}`);
    const lm = post.frontmatter?.updatedAt || post.frontmatter?.date || new Date().toISOString();
    urls.push({
      loc: `${siteUrl}${p}`,
      lastmod: iso(lm),
      changefreq: "monthly",
      priority: 0.6,
    });
  }

  // De-dupe by loc (in case of overlaps)
  const unique = Array.from(
    new Map(urls.map((u) => [u.loc, u])).values()
  );

  // XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${unique
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  // Cache for a day (feel free to tune)
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
  res.write(xml);
  res.end();

  return { props: {} };
}

export default function SiteMap() {
  return null;
}
