import Head from "next/head";
import SEO from "@/components/SEO";
import Link from "next/link";

export default function AboutPage() {
  const siteUrl = "https://fintoolbox.com.au";
  const pageUrl = `${siteUrl}/about`;
  const pageTitle = "About FinToolbox";
  const pageDescription =
    "FinToolbox helps Australians make smarter money decisions with clear, accurate financial calculators and guides.";

  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
        />
      </Head>

      <section className="py-12">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-3xl font-bold text-gray-900">About FinToolbox</h1>
          <p className="mt-2 text-gray-700">
            FinToolbox is a collection of simple, reliable calculators and tools
            built to make Australian money questions clear — whether you’re
            planning tax, comparing home loans, or checking your retirement
            readiness.
          </p>

          <div className="mt-8 space-y-6 text-gray-700 leading-relaxed">
            <p>
              Our goal is to make personal finance easier to understand for
              everyone in Australia. We believe good tools should be{" "}
              <strong>fast, transparent, and private</strong> — that means no
              tracking, no ads following you around, and no storing of your
              input data.
            </p>

            <p>
              Each calculator is built using current Australian tax, pension,
              and investment rules, sourced directly from the Australian
              Government and ATO. They’re regularly updated to reflect policy
              changes and upcoming financial year thresholds.
            </p>

            <p>
              While the results are accurate and based on official figures,
              FinToolbox provides <strong>general information only</strong>.
              We’re not licensed to give financial advice and encourage users to
              seek professional guidance where needed.
            </p>

            <p>
              FinToolbox will continue to expand — adding new tools for
              superannuation, savings goals, investment returns, and household
              budgeting — all built with the same clarity and accuracy you can
              trust.
            </p>

            <p>
              If you’d like to get in touch with ideas, feedback, or a bug
              report, visit our{" "}
              <Link
                href="/contact"
                className="text-blue-700 hover:underline font-medium"
              >
                contact page
              </Link>
              .
            </p>
          </div>

          <p className="mt-10 text-xs text-gray-500">
            © {new Date().getFullYear()} FinToolbox. General information only.
          </p>
        </div>
      </section>
    </main>
  );
}
