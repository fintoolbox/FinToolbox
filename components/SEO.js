import Head from "next/head";

export default function SEO({
  title = "FinToolbox",
  description = "Financial Calculators & Tools for Australians.",
  url = "https://fintoolbox.com.au",
  image = "/og-default.png"
}) {
  const fullTitle = title ? `${title} | FinToolbox` : "FinToolbox";
  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      <link rel="canonical" href={url} />
    </Head>
  );
}

