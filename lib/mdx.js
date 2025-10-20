// lib/mdx.js
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const POSTS_PATH = path.join(process.cwd(), "content", "posts");

// --- helpers ---
function stripMarkdown(md = "") {
  return md
    // remove code blocks
    .replace(/```[\s\S]*?```/g, "")
    // remove inline code
    .replace(/`[^`]*`/g, "")
    // remove images/links but keep text
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[[^\]]*]\([^)]*\)/g, (m) => m.replace(/\[|\]|\([^)]*\)/g, ""))
    // remove headings, blockquotes, md chars
    .replace(/^#+\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/[*_~#>-]/g, " ")
    // collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

function deriveExcerpt(content = "", maxLen = 180) {
  // first paragraph split on blank line
  const firstPara = content.split(/\n\s*\n/)[0] || content;
  const clean = stripMarkdown(firstPara);
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

function normalizeDate(input) {
  if (!input) return null;
  const t = new Date(input);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

// --- API ---
export function getPostSlugs() {
  if (!fs.existsSync(POSTS_PATH)) return [];
  return fs
    .readdirSync(POSTS_PATH)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));
}

export function getPostBySlug(slug) {
  const realSlug = slug.replace(/\.(md|mdx)$/, "");
  const fullPathMdx = path.join(POSTS_PATH, `${realSlug}.mdx`);
  const fullPathMd = path.join(POSTS_PATH, `${realSlug}.md`);
  const fullPath = fs.existsSync(fullPathMdx) ? fullPathMdx : fullPathMd;

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Post not found: ${realSlug}`);
  }

  const file = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(file);

  const date = normalizeDate(data.date);
  const frontmatter = {
    ...data,
    date, // normalized ISO or null
    // prefer explicit excerpt, fallback to description, else derive
    excerpt: data.excerpt || data.description || deriveExcerpt(content),
  };

  return { slug: realSlug, frontmatter, content };
}

export function getAllPosts() {
  const slugs = getPostSlugs();
  const posts = slugs.map((s) => getPostBySlug(s));

  // Filter out drafts
  const published = posts.filter((p) => !p.frontmatter?.draft);

  // Sort by date desc (undated posts go last)
  return published.sort((a, b) => {
    const da = new Date(a.frontmatter.date || 0).getTime();
    const db = new Date(b.frontmatter.date || 0).getTime();
    return db - da;
  });
}
