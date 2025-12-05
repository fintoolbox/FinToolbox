// utils/tags.js
/**
 * Lightweight tag helpers for blog pages.
 */
export function tagToSlug(tag = "") {
  return String(tag)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function collectTags(posts = []) {
  const counts = new Map();
  for (const p of posts) {
    const tags = Array.isArray(p?.frontmatter?.tags)
      ? p.frontmatter.tags
      : [];
    tags.forEach((t) => {
      const slug = tagToSlug(t);
      if (!slug) return;
      const current = counts.get(slug) || { tag: t, slug, count: 0 };
      // Preserve the first encountered casing of the tag for display.
      counts.set(slug, { ...current, count: current.count + 1, tag: current.tag || t });
    });
  }
  return Array.from(counts.values()).sort((a, b) =>
    a.tag.localeCompare(b.tag, "en", { sensitivity: "base" })
  );
}
