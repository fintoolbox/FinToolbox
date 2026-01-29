// pages/calculators/commonwealth-seniors-health-card.js

import { useState, useMemo } from "react";
import Head from "next/head";
import CurrencyInput from "@/components/CurrencyInput";
import Tooltip from "@/components/Tooltip";
import SectionCard from "@/components/SectionCard";
import PageIntro from "@/components/PageIntro";
import SubtleCtaLink from "@/components/SubtleCtaLink";

// ---------------
// Helpers
// ---------------

function aud0(n) {
  if (!isFinite(n)) return "$0";
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function toNumber(value, fallback = 0) {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Calculate Deemed Income on Account-Based Pensions (2025-26 Rates).
 *
 * Deeming rates (from 20 Sep 2025):
 * - Lower rate: 0.75%
 * - Upper rate: 2.75%
 *
 * Thresholds:
 * - Single: $64,200
 * - Couple (combined): $106,200
 */
function calculateDeeming(balance, status) {
  const lowerRate = 0.0075;
  const upperRate = 0.0275;
  
  let threshold = 64200;
  if (status === "couple" || status === "separated") {
    threshold = 106200;
  }

  if (balance <= threshold) {
    return balance * lowerRate;
  }

  const lowerPart = threshold * lowerRate;
  const upperPart = (balance - threshold) * upperRate;
  return lowerPart + upperPart;
}

/**
 * Core calculation for CSHC Eligibility.
 * Based on 20 Sep 2025 thresholds.
 */
function calculateCSHC(inputs) {
  const status = inputs.relationshipStatus || "single";
  const numChildren = toNumber(inputs.numChildren);
  
  // 1. Calculate Adjusted Taxable Income (ATI)
  const taxableIncome = toNumber(inputs.taxableIncome);
  const foreignIncome = toNumber(inputs.foreignIncome);
  const investmentLosses = toNumber(inputs.investmentLosses);
  const employerBenefits = toNumber(inputs.employerBenefits);
  const reportableSuper = toNumber(inputs.reportableSuper);

  const ati =
    taxableIncome +
    foreignIncome +
    investmentLosses +
    employerBenefits +
    reportableSuper;

  // 2. Calculate Deemed Income from Account-Based Pensions
  const pensionBalance = toNumber(inputs.accountBasedPensionBalance);
  const deemedIncome = calculateDeeming(pensionBalance, status);

  // 3. Total Assessable Income
  const totalAssessableIncome = ati + deemedIncome;

  // 4. Determine Threshold (2025-26 rates)
  // Single: $101,105
  // Couple: $161,768
  // Separated (illness/respite): $202,210
  // Child add-on: $639.60 per child
  let baseThreshold = 101105;
  if (status === "couple") baseThreshold = 161768;
  if (status === "separated") baseThreshold = 202210;

  const childAddOn = numChildren * 639.60;
  const totalThreshold = baseThreshold + childAddOn;

  const isEligible = totalAssessableIncome < totalThreshold;
  const gap = totalThreshold - totalAssessableIncome;

  return {
    ati,
    deemedIncome,
    totalAssessableIncome,
    totalThreshold,
    isEligible,
    gap,
  };
}

// ---------------
// Page component
// ---------------

export default function CommonwealthSeniorsHealthCardCalculator() {
  const [inputs, setInputs] = useState({
    relationshipStatus: "single", // "single" | "couple" | "separated"
    numChildren: 0,
    
    // Income components (Annual)
    taxableIncome: 0,
    foreignIncome: 0,
    investmentLosses: 0,
    employerBenefits: 0,
    reportableSuper: 0,

    // Assets subject to deeming
    accountBasedPensionBalance: 0,
  });

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setInputs((prev) => ({
      ...prev,
      [field]: value === "" ? "" : field === "relationshipStatus" ? value : Number(value),
    }));
  };

  const handleCurrencyChange = (field) => (raw) => {
    setInputs((prev) => ({
      ...prev,
      [field]: raw === "" ? "" : Number(raw),
    }));
  };

  const {
    ati,
    deemedIncome,
    totalAssessableIncome,
    totalThreshold,
    isEligible,
    gap,
  } = useMemo(() => calculateCSHC(inputs), [inputs]);

  const isCouple = inputs.relationshipStatus !== "single";

  return (
    <>
      <Head>
        <title>
          Commonwealth Seniors Health Card Calculator | FinToolbox
        </title>
        <meta
          name="description"
          content="Check your eligibility for the Commonwealth Seniors Health Card (CSHC) based on the latest 2025-26 income thresholds and deeming rates."
        />
        <link
          rel="canonical"
          href="https://fintoolbox.com.au/calculators/commonwealth-seniors-health-card"
        />
      </Head>

      {/* Header */}
      <header className="max-w-5xl mx-auto px-4 pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">
          Commonwealth Seniors Health Card Calculator
        </h1>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-4">
        {/* Intro */}
        <PageIntro tone="blue">
          <div className="space-y-2">
            <p>
              The Commonwealth Seniors Health Card (CSHC) provides cheaper health care and medicines to older Australians who do not qualify for the Age Pension.
            </p>
            <p>
              Use this calculator to test your eligibility against the <strong>income test</strong>. There is no assets test for this card.
            </p>
          </div>
        </PageIntro>

        <SubtleCtaLink
          className="mt-3"
          href="/blog/commonwealth-seniors-health-card-guide"
        >
          Read the full guide to the Commonwealth Seniors Health Card →
        </SubtleCtaLink>

        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          
          {/* LEFT COLUMN: INPUTS */}
          <div className="lg:col-span-7 space-y-6">
            <SectionCard title="Your details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700">
                <label className="flex flex-col">
                  <span className="text-slate-600">Relationship status</span>
                  <select
                    className="border rounded px-2 py-1.5 bg-white"
                    value={inputs.relationshipStatus}
                    onChange={handleChange("relationshipStatus")}
                  >
                    <option value="single">Single</option>
                    <option value="couple">Couple (living together)</option>
                    <option value="separated">Couple (separated by illness)</option>
                  </select>
                </label>

                <label className="flex flex-col">
                  <span className="text-slate-600">Dependent children</span>
                  <input
                    type="number"
                    min="0"
                    className="border rounded px-2 py-1.5"
                    value={inputs.numChildren}
                    onChange={handleChange("numChildren")}
                  />
                </label>
              </div>
            </SectionCard>

            <SectionCard title="Income test components">
              <p className="text-xs text-slate-500 mb-4">
                Enter annual amounts. If you are a couple, enter the <strong>combined</strong> income for both you and your partner.
              </p>
              
              <div className="space-y-4 text-sm text-slate-700">
                <label className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-slate-600">
                    Taxable Income
                    <span className="block text-[10px] text-slate-400 font-normal">
                      Gross income minus allowable deductions
                    </span>
                  </span>
                  <div className="w-full sm:w-40">
                    <CurrencyInput
                      className="w-full"
                      value={inputs.taxableIncome}
                      onChange={handleCurrencyChange("taxableIncome")}
                    />
                  </div>
                </label>

                <label className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-slate-600">
                    Target foreign income
                    <span className="block text-[10px] text-slate-400 font-normal">
                      Income from overseas not taxed in Australia
                    </span>
                  </span>
                  <div className="w-full sm:w-40">
                    <CurrencyInput
                      className="w-full"
                      value={inputs.foreignIncome}
                      onChange={handleCurrencyChange("foreignIncome")}
                    />
                  </div>
                </label>

                <label className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-slate-600">
                    Total net investment losses
                    <span className="block text-[10px] text-slate-400 font-normal">
                      Negative gearing losses (financial & property) added back
                    </span>
                  </span>
                  <div className="w-full sm:w-40">
                    <CurrencyInput
                      className="w-full"
                      value={inputs.investmentLosses}
                      onChange={handleCurrencyChange("investmentLosses")}
                    />
                  </div>
                </label>

                <label className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-slate-600">
                    Employer provided benefits
                    <span className="block text-[10px] text-slate-400 font-normal">
                      Reportable fringe benefits in excess of $1,000
                    </span>
                  </span>
                  <div className="w-full sm:w-40">
                    <CurrencyInput
                      className="w-full"
                      value={inputs.employerBenefits}
                      onChange={handleCurrencyChange("employerBenefits")}
                    />
                  </div>
                </label>

                <label className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-slate-600">
                    Reportable super contributions
                    <span className="block text-[10px] text-slate-400 font-normal">
                      Salary sacrifice and personal deductible contributions
                    </span>
                  </span>
                  <div className="w-full sm:w-40">
                    <CurrencyInput
                      className="w-full"
                      value={inputs.reportableSuper}
                      onChange={handleCurrencyChange("reportableSuper")}
                    />
                  </div>
                </label>

                <div className="border-t border-slate-100 my-4 pt-4">
                  <label className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-slate-600">
                      Account-based pension balance
                      <Tooltip text="The current account balance of any account-based pensions you (or your partner) own. These are subject to deeming." />
                      <span className="block text-[10px] text-slate-400 font-normal">
                        Total balance subject to deeming
                      </span>
                    </span>
                    <div className="w-full sm:w-40">
                      <CurrencyInput
                        className="w-full"
                        value={inputs.accountBasedPensionBalance}
                        onChange={handleCurrencyChange("accountBasedPensionBalance")}
                      />
                    </div>
                  </label>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* RIGHT COLUMN: RESULTS */}
          <div className="lg:col-span-5 space-y-6">
            <SectionCard title="Eligibility Result">
              <div className={`p-4 rounded-lg border-l-4 mb-6 ${
                isEligible 
                  ? "bg-emerald-50 border-emerald-500 text-emerald-900" 
                  : "bg-red-50 border-red-500 text-red-900"
              }`}>
                <div className="font-bold text-lg mb-1">
                  {isEligible ? "Likely Eligible" : "Not Eligible"}
                </div>
                <div className="text-sm opacity-90">
                  {isEligible 
                    ? `Your assessable income is below the threshold by ${aud0(gap)}.`
                    : `Your assessable income exceeds the threshold by ${aud0(-gap)}.`
                  }
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-600">Adjusted Taxable Income</span>
                  <span className="font-medium text-slate-900">{aud0(ati)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-600 flex items-center gap-1">
                    Deemed Income
                    <Tooltip text="Income assumed to be earned from your account-based pensions using current deeming rates (0.75% / 2.75%)." />
                  </span>
                  <span className="font-medium text-slate-900">{aud0(deemedIncome)}</span>
                </div>
                
                <div className="flex justify-between items-center pt-2 text-base">
                  <span className="font-bold text-slate-800">Total Assessable Income</span>
                  <span className="font-bold text-slate-900">{aud0(totalAssessableIncome)}</span>
                </div>

                <div className="flex justify-between items-center pt-1 text-xs text-slate-500">
                  <span>Income limit ({isCouple ? "Couple" : "Single"})</span>
                  <span>{aud0(totalThreshold)}</span>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="How it works">
              <ul className="list-disc pl-5 space-y-2 text-xs text-slate-600">
                <li>
                  <strong>Age Requirement:</strong> You must be of Age Pension age (currently 67).
                </li>
                <li>
                  <strong>Income Test:</strong> The test assesses your Adjusted Taxable Income (ATI) plus deemed income from account-based pensions.
                </li>
                <li>
                  <strong>Deeming:</strong> Since 2015, account-based pensions are subject to deeming for the CSHC. The current rates (Jan 2026) are 0.75% on the lower threshold and 2.75% on the excess.
                </li>
                <li>
                  <strong>No Assets Test:</strong> Unlike the Age Pension, the CSHC does not have an assets test.
                </li>
              </ul>
            </SectionCard>
          </div>

        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-12 mb-12 text-[11px] text-slate-500 leading-snug">
        <p>
          This calculator is provided for general information only and is based on rates applicable as of January 2026. It does not constitute financial or legal advice. Eligibility is determined by Services Australia at the time of application.
        </p>
      </div>
    </>
  );
}
