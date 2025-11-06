import Head from "next/head";
import { useRouter } from "next/router";

const SITE = "https://fintoolbox.com.au";

export default function SEO({
  title = "FinToolbox",
  description = "Financial Calculators & Tools for Australians.",
  url,                 // optional: pass a full absolute URL if you want to override
  image = "/og-default.png",
  noindex = false,     // optional: force noindex for a page
  siteName = "FinToolbox",
  locale = "en_AU",
}) {
  const { asPath = "/" } = useRouter();

  // Build a canonical from the current route if none was provided
  const routePath = asPath.split("#")[0];              // strip hash
  const routeNoQuery = routePath.split("?")[0];        // strip query
  const fallbackCanonical = new URL(routeNoQuery || "/", SITE).toString();

  let canonical = url || fallbackCanonical;
  try {
    const u = new URL(canonical);
    u.search = "";                                     // ensure clean canonical
    u.hash = "";
    canonical = u.toString();
  } catch {
    // leave as-is if someone passes a non-absolute string
  }

  // Ensure og:image is absolute
  let ogImage = image;
  try {
    ogImage = new URL(image, canonical).toString();
  } catch {}

  // Auto noindex for /search (in addition to explicit noindex prop)
  const isSearch = routeNoQuery.startsWith("/search");
  const robots = (noindex || isSearch) ? "noindex, nofollow" : "index, follow";

  const fullTitle = title ? `${title} | ${siteName}` : siteName;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Robots */}
      <meta name="robots" content={robots} />

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

