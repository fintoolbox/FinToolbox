import Head from "next/head";

// One source of truth for your base URL.
// Create .env.local with: NEXT_PUBLIC_SITE_URL=https://fintoolbox.com.au
const BASE =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://fintoolbox.com.au").replace(/\/+$/, "");

function buildCanonical(inputUrl) {
  try {
    // Allow either a path ("/blog/post") or a full URL.
    // Resolve against BASE, then force host/protocol to BASE (kills any lingering "www.").
    const u = new URL(inputUrl, BASE);
    const b = new URL(BASE);
    u.protocol = b.protocol;
    u.host = b.host;
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    // Fallback to BASE if something odd is passed in.
    return BASE;
  }
}

function absolutizeImage(image, canonical) {
  try {
    // If image is relative like "/og-default.png", make it absolute using BASE.
    // If absolute, leave it—host normalization is not needed for images.
    return new URL(image, BASE).toString();
  } catch {
    return image;
  }
}

export default function SEO({
  title = "FinToolbox",
  description = "Financial Calculators & Tools for Australians.",
  // Pass *paths* like "/blog/my-post" from pages; full URLs still work but will be normalized.
  url = "/",
  image = "/og-default.png",
  noindex = false, // optional
  siteName = "FinToolbox",
  locale = "en_AU",
}) {
  const canonical = buildCanonical(url);
  const ogImage = absolutizeImage(image, canonical);
  const fullTitle = title ? `${title} | ${siteName}` : siteName;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex,follow" />}

      {/* Canonical */}
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:url" content={canonical} />
    </Head>
  );
}
