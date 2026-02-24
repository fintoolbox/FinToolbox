import { useState, useMemo } from "react";
import Head from "next/head";
import CurrencyInput from "@/components/CurrencyInput";
import Tooltip from "@/components/Tooltip";
import SectionCard from "@/components/SectionCard";
import PageIntro from "@/components/PageIntro";
import SummaryGrid from "@/components/SummaryGrid";
import SummaryCard from "@/components/SummaryCard";
import { Printer } from "lucide-react";

// Helper for currency formatting
function aud(n) {
  if (!isFinite(n)) return "$0.00";
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// --- CONSTANTS (Approximate 2024/2025 Rates) ---
// Moved outside component to avoid recreation on every render (fixes exhaustive-deps)
const RATES = {
  singleNoKids: 762.70,
  singleWithKids: 816.90,
  partnered: 698.30,
  energySupplement: {
    single: 14.10,
    partnered: 10.60,
  },
};

const ASSET_LIMITS = {
  single: { homeowner: 301750, nonHomeowner: 543750 },
  partnered: { homeowner: 451500, nonHomeowner: 693500 }, // Combined assets
};

export default function JobSeekerCalculator() {
  // --- STATE ---
  const [relationshipStatus, setRelationshipStatus] = useState("single"); // 'single' | 'partnered'
  const [hasChildren, setHasChildren] = useState(false);
  const [isHomeowner, setIsHomeowner] = useState(false);
  const [incomeFortnight, setIncomeFortnight] = useState(0);
  const [partnerIncomeFortnight, setPartnerIncomeFortnight] = useState(0);
  const [assets, setAssets] = useState(5000);

  // --- CALCULATION ---
  const results = useMemo(() => {
    let maxBaseRate = 0;
    let energySupp = 0;
    let assetLimit = 0;

    // 1. Determine Max Rate & Asset Limit based on status
    if (relationshipStatus === "single") {
      maxBaseRate = hasChildren ? RATES.singleWithKids : RATES.singleNoKids;
      energySupp = RATES.energySupplement.single;
      assetLimit = isHomeowner
        ? ASSET_LIMITS.single.homeowner
        : ASSET_LIMITS.single.nonHomeowner;
    } else {
      maxBaseRate = RATES.partnered;
      energySupp = RATES.energySupplement.partnered;
      assetLimit = isHomeowner
        ? ASSET_LIMITS.partnered.homeowner
        : ASSET_LIMITS.partnered.nonHomeowner;
    }

    const maxPaymentTotal = maxBaseRate + energySupp;

    // 2. Asset Test (JobSeeker is generally "sudden death" - if over, you get 0)
    if (assets > assetLimit) {
      return {
        payment: 0,
        maxPaymentTotal,
        incomeReduction: 0,
        isAssetIneligible: true,
        assetLimit,
      };
    }

    // 3. Personal Income Test
    // Rules:
    // - First $150: $0 reduction
    // - $150 to $256: 50c reduction per dollar
    // - Over $256: 60c reduction per dollar
    let incomeReduction = 0;
    const incomeFreeArea = 150;
    const lowerTaperLimit = 256;

    if (incomeFortnight > incomeFreeArea) {
      if (incomeFortnight <= lowerTaperLimit) {
        incomeReduction += (incomeFortnight - incomeFreeArea) * 0.5;
      } else {
        // Calculate reduction for the band between 150 and 256
        incomeReduction += (lowerTaperLimit - incomeFreeArea) * 0.5;
        // Calculate reduction for amount above 256
        incomeReduction += (incomeFortnight - lowerTaperLimit) * 0.6;
      }
    }

    // 4. Partner Income Test (if applicable)
    // Simplified: Partner income reduces your payment by 60c for every dollar over the partner cut-out threshold.
    // We'll use a simplified threshold approximation for the partner income free area (~$1400).
    if (relationshipStatus === "partnered") {
      const partnerIncomeFreeArea = 1400; 
      if (partnerIncomeFortnight > partnerIncomeFreeArea) {
        incomeReduction += (partnerIncomeFortnight - partnerIncomeFreeArea) * 0.6;
      }
    }

    let payment = maxPaymentTotal - incomeReduction;
    if (payment < 0) payment = 0;

    return {
      payment,
      maxPaymentTotal,
      incomeReduction,
      isAssetIneligible: false,
      assetLimit,
    };
  }, [
    relationshipStatus,
    hasChildren,
    isHomeowner,
    incomeFortnight,
    partnerIncomeFortnight,
    assets,
  ]);

  return (
    <>
      <Head>
        <title>JobSeeker Payment Calculator | FinToolbox</title>
        <meta
          name="description"
          content="Estimate your fortnightly JobSeeker Payment based on your income, assets, and relationship status."
        />
      </Head>

      <header className="max-w-5xl mx-auto px-4 pb-6 border-b border-slate-200 no-print">
        <h1 className="text-2xl font-bold text-slate-900">
          JobSeeker Payment Calculator
        </h1>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="no-print">
          <PageIntro tone="blue">
            <p>
              The <strong>JobSeeker Payment</strong> provides financial help if
              you are between 22 and Age Pension age and looking for work. It is
              also available if you are sick or injured and cannot do your usual
              work or study for a short time.
            </p>
            <p className="mt-2">
              Use this calculator to estimate your fortnightly payment based on
              the income and assets tests.
            </p>
          </PageIntro>

          {/* INPUTS */}
          <div className="mt-6">
            <SectionCard title="Your Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm text-slate-700">
                
                {/* Relationship Status */}
                <label className="flex flex-col">
                  <span className="text-slate-600 font-medium mb-1">Relationship Status</span>
                  <select
                    className="border rounded px-3 py-2 bg-white"
                    value={relationshipStatus}
                    onChange={(e) => setRelationshipStatus(e.target.value)}
                  >
                    <option value="single">Single</option>
                    <option value="partnered">Partnered</option>
                  </select>
                </label>

                {/* Children */}
                <label className="flex flex-col">
                  <span className="text-slate-600 font-medium mb-1">Do you have dependent children?</span>
                  <select
                    className="border rounded px-3 py-2 bg-white"
                    value={hasChildren ? "yes" : "no"}
                    onChange={(e) => setHasChildren(e.target.value === "yes")}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>

                {/* Homeowner */}
                <label className="flex flex-col">
                  <span className="text-slate-600 font-medium mb-1">Do you own your home?</span>
                  <select
                    className="border rounded px-3 py-2 bg-white"
                    value={isHomeowner ? "yes" : "no"}
                    onChange={(e) => setIsHomeowner(e.target.value === "yes")}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>

                {/* Income */}
                <label className="flex flex-col">
                  <span className="text-slate-600 font-medium mb-1">
                    Your gross income (per fortnight)
                    <Tooltip text="Income from employment, investments, or other sources before tax." />
                  </span>
                  <CurrencyInput
                    className="w-full"
                    value={incomeFortnight}
                    onChange={(v) => setIncomeFortnight(Number(v))}
                  />
                </label>

                {/* Partner Income */}
                {relationshipStatus === "partnered" && (
                  <label className="flex flex-col">
                    <span className="text-slate-600 font-medium mb-1">
                      Partner&apos;s gross income (per fortnight)
                    </span>
                    <CurrencyInput
                      className="w-full"
                      value={partnerIncomeFortnight}
                      onChange={(v) => setPartnerIncomeFortnight(Number(v))}
                    />
                  </label>
                )}

                {/* Assets */}
                <label className="flex flex-col">
                  <span className="text-slate-600 font-medium mb-1">
                    Total assessable assets
                    <Tooltip text="Market value of assets (excluding your principal home). Includes savings, shares, cars, household contents, etc." />
                  </span>
                  <CurrencyInput
                    className="w-full"
                    value={assets}
                    onChange={(v) => setAssets(Number(v))}
                  />
                </label>
              </div>
            </SectionCard>
          </div>

          {/* RESULTS */}
          <div className="mt-8 printable-section">
            <SectionCard title="Estimated Payment">
              <SummaryGrid>
                <SummaryCard
                  label="Estimated Fortnightly Payment"
                  value={aud(results.payment)}
                  badgeText={results.payment === 0 ? "Not Eligible" : "Eligible"}
                  badgeTone={results.payment > 0 ? "positive" : "neutral"}
                />
                <SummaryCard
                  label="Maximum Basic Rate + Energy Supp."
                  value={aud(results.maxPaymentTotal)}
                />
                <SummaryCard
                  label="Income Reduction"
                  value={`-${aud(results.incomeReduction)}`}
                  badgeText={results.incomeReduction > 0 ? "Applied" : null}
                  badgeTone="neutral"
                />
              </SummaryGrid>

              {results.isAssetIneligible && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-md text-sm text-red-800">
                  <strong>Assets Exceeded:</strong> Your assessable assets of{" "}
                  {aud(assets)} exceed the limit of {aud(results.assetLimit)} for
                  your situation. JobSeeker Payment cuts out completely if assets
                  exceed this limit.
                </div>
              )}

              {!results.isAssetIneligible && results.payment === 0 && results.incomeReduction > 0 && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-md text-sm text-orange-800">
                  <strong>Income Too High:</strong> Your income (or your partner&apos;s
                  income) has reduced your payment to $0.
                </div>
              )}

              <div className="mt-6 flex justify-end no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-md bg-gray-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700"
                >
                  <Printer className="h-4 w-4" />
                  Print Results
                </button>
              </div>
            </SectionCard>
          </div>

          {/* ASSUMPTIONS */}
          <div className="mt-8 no-print">
            <SectionCard title="Assumptions & How It Works">
              <ul className="list-disc pl-5 space-y-3 text-sm text-slate-600">
                <li>
                  <span className="text-slate-800 font-medium">
                    Rates & Thresholds:
                  </span>{" "}
                  The calculator uses approximate rates for the 2024-2025
                  financial year. These values are subject to change and are for
                  estimation purposes only.
                </li>
                <li>
                  <span className="text-slate-800 font-medium">
                    Asset Test:
                  </span>{" "}
                  The assets test for JobSeeker Payment is a &quot;sudden death&quot;
                  test. If your assessable assets exceed the limit for your
                  situation, your payment is reduced to $0. Your principal home
                  is exempt from the assets test.
                </li>
                <li>
                  <span className="text-slate-800 font-medium">
                    Personal Income Test Tapers:
                  </span>{" "}
                  Your payment is reduced based on your fortnightly income. The
                  calculator applies a reduction of 50 cents for each dollar
                  between $150 and $256, and 60 cents for each dollar over $256.
                </li>
                <li>
                  <span className="text-slate-800 font-medium">
                    Exclusions:
                  </span>{" "}
                  This calculator does not include any other potential payments
                  you may be eligible for, such as Rent Assistance,
                  Pharmaceutical Allowance, or other supplements.
                </li>
              </ul>
            </SectionCard>
          </div>

          {/* DISCLAIMER */}
          <div className="mt-8 mb-12 text-[11px] text-slate-500 leading-snug no-print">
            <p>
              This calculator provides an estimate only based on general JobSeeker
              Payment rates and thresholds (approx. 2024/2025 values). It does not
              account for Rent Assistance, Pharmaceutical Allowance, or Remote Area
              Allowance. Actual payments are determined by Centrelink.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}