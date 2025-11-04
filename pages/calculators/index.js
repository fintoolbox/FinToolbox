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

          <CardSection cols={3}>
                      <CardLink href="/calculators/debt-recycling" title="Debt Recycling">
                                    Convert your home loan to investment debt
                                  </CardLink>
                      <CardLink href="/calculators/tax-calculator" title="Income Tax">
                        Calculate your take home pay
                      </CardLink>
                      <CardLink
                        href="/calculators/investment-growth"
                        title="Compound Interest"
                      >Investment growth over time
                      </CardLink>
                      <CardLink href="/calculators/mortgage" title="Mortgage Repayments">
                        Payoff your home loan faster
                      </CardLink>
                      <CardLink
                        href="/calculators/age-pension"
                        title="Centrelink Age Pension"
                      >How much Age Pension you can receive
                      </CardLink>
                      <CardLink href="/calculators/account-based-pension" title="Account Based Pension">
                                    How long your super will last in retirement
                                  </CardLink>
                    </CardSection>
        </div>
      </section>
    </main>
  );
}
