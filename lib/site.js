// lib/site.js
export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://fintoolbox.com.au").replace(/\/+$/, "");
