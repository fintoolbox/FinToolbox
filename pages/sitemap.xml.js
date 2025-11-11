// pages/sitemap.xml.js
import { SITE_URL } from "@/lib/site"; // central base URL (see Step 0 below)
import { calculators } from "../lib/pages"; // shared list of calculator paths (e.g. "/calculators/mortgage")

export async function getServerSideProps({ res }) {
  const siteUrl = SITE_URL; // no trailing slash
  const nowIso = new Date().toISOString();

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
    return isNaN(t.getTime()) ? nowIso : t.toISOString();
  };
  const loc = (path) => `${siteUrl}${path === "/" ? "" : path}`;

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
      loc: loc(p),
      lastmod: nowIso,
      changefreq: p === "/" ? "daily" : p.startsWith("/calculators") ? "weekly" : "weekly",
      priority: p === "/" ? 1.0 : p === "/calculators" || p === "/blog" ? 0.8 : 0.7,
    });
  }

  // Blog posts
  for (const post of posts) {
    const p = normalise(`/blog/${post.slug}`);
    const lm = post.frontmatter?.updatedAt || post.frontmatter?.date || nowIso;
    urls.push({
      loc: loc(p),
      lastmod: iso(lm),
      changefreq: "monthly",
      priority: 0.6,
    });
  }

  // De-dupe by loc (in case of overlaps) & make output stable
  const unique = Array.from(new Map(urls.map((u) => [u.loc, u])).values()).sort((a, b) =>
    a.loc.localeCompare(b.loc)
  );

  // XML
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    unique
      .map(
        (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
      )
      .join("\n") +
    `\n</urlset>`;

  // Headers + send
  res.setHeader("Content-Type", "application/xml");
  // cache at the edge for 1h; allow serving stale for a day while revalidating
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  res.write(xml);
  res.end();

  return { props: {} };
}

// No page component render
export default function SiteMap() {
  return null;
}
