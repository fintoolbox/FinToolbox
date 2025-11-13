import Head from "next/head";
import SEO from "@/components/SEO";
import { Calculator, Home as HomeIcon, Repeat, HandCoins, PiggyBank, ChartColumn, ChartNoAxesColumnIncreasing } from "lucide-react";
import CardSection from "@/components/ui/CardSection";
import CardLink from "@/components/ui/CardLink";
<ChartNoAxesColumnIncreasing />
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
                   
        {/* Tax Calculators */}
        <h1 className="text-3xl font-bold mb-6">Tax Calculators</h1>
        <CardSection cols={3}>
  <CardLink
    href="/calculators/debt-recycling"
    title="Debt Recycling"
    icon={Repeat}
  >
    Convert your home loan to investment debt
  </CardLink>

  <CardLink
    href="/calculators/salary-sacrifice"
    title="Salary Sacrifice"
    icon={ChartNoAxesColumnIncreasing}
  >
    Understand the benefits of salary sacrificing
  </CardLink>

  <CardLink
    href="/calculators/tax-calculator"
    title="Income Tax"
    icon={Calculator}
  >
    Calculate your take home pay
  </CardLink>

  </CardSection>

{/* Investment Calculators */}
<h1 className="text-3xl font-bold mb-6">Investment Calculators</h1>
        <CardSection cols={3}>
  

  <CardLink
    href="/calculators/investment-growth"
    title="Compound Interest"
    icon={PiggyBank}
  >
    Investment growth over time
  </CardLink>

    <CardLink
    href="/calculators/account-based-pension"
    title="Account Based Pension"
    icon={ChartColumn}
  >
    How long your super will last in retirement
  </CardLink>
</CardSection>

{/* Debt Calculators */}
<h1 className="text-3xl font-bold mb-6">Debt Calculators</h1>
        <CardSection cols={3}>
  <CardLink
    href="/calculators/debt-recycling"
    title="Debt Recycling"
    icon={Repeat}
  >
    Convert your home loan to investment debt
  </CardLink>

    <CardLink
    href="/calculators/mortgage"
    title="Mortgage Repayments"
    icon={HomeIcon}
  >
    Payoff your home loan faster
  </CardLink>

  </CardSection>

{/* Centrelink Calculators */}
<h1 className="text-3xl font-bold mb-6">Centrelink Calculators</h1>
        <CardSection cols={3}>
  
    <CardLink
    href="/calculators/age-pension"
    title="Centrelink Age Pension"
    icon={HandCoins}
  >
    How much Age Pension you can receive
  </CardLink>

  
</CardSection>


        </div>
      </section>
    </main>
  );
}
