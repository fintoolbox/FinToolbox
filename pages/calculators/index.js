import Head from "next/head";
import SEO from "@/components/SEO";
import CardSection from "@/components/ui/CardSection";
import CardLink from "@/components/ui/CardLink";

export default function CalculatorsIndex() {
  const pageUrl = "https://fintoolbox.com.au/calculators";
  const pageTitle = "All Financial Calculators (Australia) | FinToolbox";
  const pageDescription =
    "Browse free Australian financial calculators: tax, mortgage, compound interest, retirement, Age Pension and more.";

  return (
    <main className="min-h-screen bg-white">
      {/* canonical, title, desc, OG, etc */}
      <SEO
        title={pageTitle}
        description={pageDescription}
        url={pageUrl}
        image="https://fintoolbox.com.au/og-default.png"
      />

      {/* You can still have extra <Head> tags here if you want, like page-specific JSON-LD */}
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </Head>

      <section className="py-10">
        <div className="mx-auto max-w-4xl px-6">
          <h1 className="text-3xl font-bold mb-6">Calculators</h1>

          <CardSection cols={2}>
            <CardLink href="/calculators/debt-recycling" title="Debt Recycling">
              Model paying off your home loan vs recycling into investments.
            </CardLink>
            <CardLink href="/calculators/tax-calculator" title="Income Tax (AU)">
              Estimate tax payable and take-home pay.
            </CardLink>
            <CardLink href="/calculators/investment-growth" title="Compound Interest">
              Project balance with regular contributions.
            </CardLink>
            <CardLink href="/calculators/mortgage" title="Mortgage Repayments">
              See repayments and total interest.
            </CardLink>
            <CardLink href="/calculators/age-pension" title="Age Pension (Centrelink)">
              Rough guide based on assets &amp; income.
            </CardLink>
            <CardLink href="/calculators/account-based-pension" title="Account Based Pension">
              How long your super will last in retirement.
            </CardLink>
          </CardSection>
        </div>
      </section>
    </main>
  );
}
