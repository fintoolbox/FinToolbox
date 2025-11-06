// pages/sitemap.xml.js
import fs from "fs";
import path from "path";
import { calculators } from "../lib/pages"; // e.g. ["/calculators/mortgage", ...]

// Add any known redirect-source paths here so they never appear in the sitemap.
const redirectBlacklist = new Set([
  // "/blog/compund-interest-explained", // example: typo slug -> correct slug
]);

export async function getServerSideProps({ res }) {
  const siteUrl = "https://fintoolbox.com.au"; // no trailing slash

  // Server-only imports
  const { getAllPosts } = await import("../lib/mdx");
  const posts = getAllPosts(); // [{ slug, frontmatter, content }]

  // Helpers
  const norm = (p) => {
    let s = p.startsWith("/") ? p : `/${p}`;
    if (s !== "/" && s.endsWith("/")) s = s.slice(0, -1);
    return s;
  };
  const full = (p) => `${siteUrl}${p === "/" ? "" : p}`;
  const toIso = (d) => {
    const t = new Date(d);
    return isNaN(t.getTime()) ? new Date().toISOString() : t.toISOString();
  };
  const postFileMtime = (slug) => {
    try {
      // adjust if your posts live elsewhere
      const POSTS_PATH = path.join(process.cwd(), "content", "posts");
      const filePath = path.join(POSTS_PATH, `${slug}.mdx`);
      const stat = fs.statSync(filePath);
      return stat.mtime.toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  // Core URLs (only if they actually resolve in your app)
  const corePaths = [
    "/",                    // home
    "/blog",                // blog index
    // remove this if you don't have a calculators index page:
    // "/calculators",
    ...calculators,
  ]
    .map(norm)
    .filter((p) => !redirectBlacklist.has(p));

  // Build entries
  const entries = [];

  // Core pages
  for (const p of corePaths) {
    entries.push({
      loc: full(p),
      lastmod: new Date().toISOString(),
    });
  }

  // Blog posts (exclude noindex and posts that canonicalise elsewhere)
  for (const post of posts) {
    const slug = String(post.slug || "").trim();
    if (!slug) continue;

    const fm = post.frontmatter || {};
    const selfPath = norm(`/blog/${slug}`);

    // 1) Skip redirect sources
    if (redirectBlacklist.has(selfPath)) continue;

    // 2) Skip if noindex flag
    if (fm.noindex === true) continue;

    // 3) Skip if this post declares a canonical that is NOT itself
    // Allow common fields: canonical, canonicalUrl
    const canonical = (fm.canonical || fm.canonicalUrl || "").trim();
    if (canonical && !canonical.endsWith(selfPath)) {
      // canonical points elsewhere -> don't include this page
      continue;
    }

    // 4) lastmod: prefer updatedAt -> date -> file mtime
    const lastmod =
      (fm.updatedAt && toIso(fm.updatedAt)) ||
      (fm.date && toIso(fm.date)) ||
      postFileMtime(slug);

    entries.push({
      loc: full(selfPath),
      lastmod,
    });
  }

  // De-dupe and stable sort
  const unique = Array.from(new Map(entries.map((e) => [e.loc, e])).values());
  unique.sort((a, b) => a.loc.localeCompare(b.loc));

  // Minimal, clean XML (no priority/changefreq; Google ignores them)
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    unique
      .map(
        (u) =>
          `  <url>\n` +
          `    <loc>${u.loc}</loc>\n` +
          `    <lastmod>${u.lastmod}</lastmod>\n` +
          `  </url>`
      )
      .join("\n") +
    `\n</urlset>\n`;

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400"); // 1 day
  res.write(xml);
  res.end();

  return { props: {} };
}

export default function SiteMap() {
  return null;
}
