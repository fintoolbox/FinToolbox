import Head from "next/head";
import SEO from "@/components/SEO";
import Link from "next/link";

export default function DisclaimerPage() {
  const siteUrl = "https://fintoolbox.com.au";
  const pageUrl = `${siteUrl}/disclaimer`;
  const pageTitle = "Disclaimer | FinToolbox";
  const pageDescription =
    "General information disclaimer for FinToolbox — financial calculators and tools for Australians.";

  const disclaimerJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pageTitle,
    description: pageDescription,
    url: pageUrl,
    isPartOf: { "@type": "WebSite", name: "FinToolbox", url: siteUrl },
  };

  return (
    <main className="min-h-screen bg-white">
      <SEO
        title={pageTitle}
        description={pageDescription}
        url={pageUrl}
        image="/og-default.png"
      />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(disclaimerJsonLd) }}
        />
      </Head>

      <section className="py-12">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-3xl font-bold text-gray-900">Disclaimer</h1>
          <p className="mt-2 text-gray-700">
            The information and tools on FinToolbox are provided for{" "}
            <strong>general informational purposes only</strong>. They are not
            financial, taxation, legal, or investment advice.
          </p>

          <div className="mt-8 space-y-6 text-gray-700 leading-relaxed">
            <p>
              FinToolbox aims to help Australians make sense of personal
              finance by offering simple calculators and guides. The results
              from these tools are estimates only and may not reflect your
              exact circumstances.
            </p>

            <p>
              The data, thresholds, and rates used in calculators (such as tax,
              pension, or superannuation rules) are sourced from Australian
              Government and ATO publications, but may change without notice.
              While care is taken to ensure accuracy, FinToolbox{" "}
              <strong>does not guarantee</strong> that all information is
              current or error-free.
            </p>

            <p>
              You should not rely solely on these calculators or articles when
              making financial decisions. Always consider your personal
              objectives, financial situation, and needs before acting on any
              information. For personal advice, consult a licensed financial
              adviser or tax professional.
            </p>

            <p>
              FinToolbox and its contributors accept no responsibility or
              liability for any loss or damage arising directly or indirectly
              from the use of, or reliance on, the information or results
              provided by this website.
            </p>

            <p>
              Some links on FinToolbox may direct you to external websites. We
              are not responsible for the content or accuracy of any external
              sites linked from this platform.
            </p>

            <p>
              If you find an error or believe a calculator is outdated, please{" "}
              <Link
                href="/contact"
                className="text-blue-700 hover:underline font-medium"
              >
                contact us
              </Link>{" "}
              so we can review and correct it promptly.
            </p>
          </div>

          
        </div>
      </section>
    </main>
  );
}
