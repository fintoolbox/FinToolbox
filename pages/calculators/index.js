// pages/calculators/index.js
import Head from "next/head";
import CardSection from "@/components/ui/CardSection";
import CardLink from "@/components/ui/CardLink";

export default function CalculatorsIndex() {
  return (
    <main className="min-h-screen bg-white">
      <Head>
        <title>Calculators | FinToolbox</title>
        <meta
          name="description"
          content="Financial Calculators & Tools for Australians. Browse all financial calculators: tax, compound interest, mortgage, and age pension."
        />
      </Head>

      <section className="py-10">
        <div className="mx-auto max-w-4xl px-6">
          <h1 className="text-3xl font-bold mb-6">Calculators</h1>

          <CardSection cols={2}>
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
