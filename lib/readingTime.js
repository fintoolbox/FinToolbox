// lib/readingTime.js
export function readingStats(markdown, { wpm = 230 } = {}) {
  if (!markdown) return { words: 0, minutes: 1 };
  const words = markdown
    .replace(/<\/?[^>]+(>|$)/g, "") // strip html if any
    .replace(/[`*_>#-]/g, " ")      // strip md-ish punctuation
    .trim()
    .split(/\s+/).filter(Boolean).length;

  const minutes = Math.max(1, Math.ceil(words / wpm));
  return { words, minutes };
}
