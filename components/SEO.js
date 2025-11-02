import Head from "next/head";

export default function SEO({
  title = "FinToolbox",
  description = "Financial Calculators & Tools for Australians.",
  url = "https://fintoolbox.com.au",
  image = "/og-default.png",
  noindex = false, // optional
  siteName = "FinToolbox",
  locale = "en_AU",
}) {
  // Ensure canonical is clean (no query/hash)
  let canonical;
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    canonical = u.toString();
  } catch {
    canonical = url; // fallback if a relative URL ever sneaks in
  }

  // Ensure og:image is absolute (handle relative like "/og-default.png")
  let ogImage = image;
  try {
    ogImage = new URL(image, canonical).toString();
  } catch {
    // leave as-is if URL() fails (shouldn't in normal use)
  }

  const fullTitle = title ? `${title} | ${siteName}` : siteName;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Canonical */}
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Head>
  );
}


