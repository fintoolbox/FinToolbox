// pages/calculators/investment-property.js

import { useState, useMemo } from "react";
import Head from "next/head";
import Tooltip from "@/components/Tooltip";
import ChartTooltip from "@/components/ChartTooltip";
import SectionCard from "@/components/SectionCard";
import PageIntro from "@/components/PageIntro";
import SubtleCtaLink from "@/components/SubtleCtaLink";
import SummaryGrid from "@/components/SummaryGrid";
import SummaryCard from "@/components/SummaryCard";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ---------------
// Helpers
// ---------------

function downloadCsv(filename, csv) {
  if (!csv) return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Cashflow table CSV
function cashflowToCsv(rows) {
  if (!rows?.length) return "";

  const headers = [
    "Year",
    "GrossRent",
    "PMFees",
    "FixedExpenses",
    "Interest",
    "Principal",
    "TotalCashExpenses",
    "CashCost",
    "Depreciation",
    "TaxableIncome",
    "TaxChange",
    "AfterTaxCashflow",
    "CumulativeAfterTaxCashflow",
  ];

  const lines = rows.map((r) => [
    r.year,
    r.grossRent,
    r.pmFees,
    r.fixedExpenses,
    r.interest,
    r.principal,
    r.totalCashExpenses,
    r.cashCost,
    r.depreciation,
    r.taxableIncome,
    r.taxChange,
    r.afterTaxCashflow,
    r.cumulativeAfterTaxCashflow,
  ]);

  return [headers, ...lines].map((row) => row.join(",")).join("\n");
}

// Property & loan table CSV
function propertyLoanToCsv(rows) {
  if (!rows?.length) return "";

  const headers = [
    "Year",
    "PropertyValue",
    "OpeningLoan",
    "ClosingLoan",
    "Equity",
  ];

  const lines = rows.map((r) => {
    const equity = r.propertyValue - r.closingLoan;
    return [
      r.year,
      r.propertyValue,
      -r.openingLoan,
      -r.closingLoan,
      equity,
    ];
  });

  return [headers, ...lines].map((row) => row.join(",")).join("\n");
}


function aud0(n) {
  if (!isFinite(n)) return "$0";
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function pct1(n) {
  if (!isFinite(n)) return "–";
  return `${(n * 100).toFixed(1)}%`;
}

// Safely coerce to number
function toNumber(value, fallback = 0) {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Approximate Australian resident income tax (2024–25 rates),
 * including a simple 2% Medicare levy on taxable income.
 *
 * No offsets, no low-income thresholds. Used to estimate the
 * *difference* in tax from rental income and CGT.
 */
function calcIncomeTax2024_25(taxableIncome) {
  const ti = Math.max(0, taxableIncome);
  let tax = 0;

  if (ti <= 18200) {
    tax = 0;
  } else if (ti <= 45000) {
    tax = (ti - 18200) * 0.16;
  } else if (ti <= 135000) {
    tax =
      (45000 - 18200) * 0.16 +
      (ti - 45000) * 0.30;
  } else if (ti <= 190000) {
    tax =
      (45000 - 18200) * 0.16 +
      (135000 - 45000) * 0.30 +
      (ti - 135000) * 0.37;
  } else {
    tax =
      (45000 - 18200) * 0.16 +
      (135000 - 45000) * 0.30 +
      (190000 - 135000) * 0.37 +
      (ti - 190000) * 0.45;
  }

  // Add Medicare levy at a flat 2% of taxable income
  const medicareLevy = ti * 0.02;

  return tax + medicareLevy;
}


/**
 * Core calculation for the Investment Property calculator.
 *
 * Focused on:
 * 1) Cash cost each year (before tax)
 * 2) After-tax cost each year
 * 3) Net gain when selling after N years (after tax & debt)
 *
 * Assumptions:
 * - Straight-line building depreciation over 40 years.
 * - Depreciation reduces CGT cost base.
 * - 50% CGT discount if held > 12 months.
 * - Tax differences are calculated relative to an input taxable income (salary).
 * - Loan can be:
 *    - Principal & interest for full term, or
 *    - Interest-only for 5 years, then P&I for the remaining term.
 */
function calculateInvestmentProperty(inputs) {
  const purchasePrice = toNumber(inputs.purchasePrice);
  const purchaseCosts = toNumber(inputs.purchaseCosts);
  const buildingValue = Math.min(
    toNumber(inputs.buildingValue),
    purchasePrice
  );

  const weeklyRent = toNumber(inputs.weeklyRent);
  const vacancyRate = toNumber(inputs.vacancyRate) / 100;
  const rentGrowthRate = toNumber(inputs.rentGrowthRate) / 100;
  const growthRate = toNumber(inputs.growthRate) / 100;
  const sellingCostRate = toNumber(inputs.sellingCostRate) / 100;

  const holdingYears = Math.max(1, Math.round(toNumber(inputs.holdingYears)));

  const loanAmount = toNumber(inputs.loanAmount);
  const interestRate = toNumber(inputs.interestRate) / 100;
  const loanTermYears = Math.max(1, Math.round(toNumber(inputs.loanTermYears)));
  const loanRepaymentType = inputs.loanRepaymentType || "PI"; // "PI" | "IO5"

  const pmFeeRate = toNumber(inputs.pmFeeRate) / 100;
  const annualRates = toNumber(inputs.annualRates);
  const annualInsurance = toNumber(inputs.annualInsurance);
  const annualStrata = toNumber(inputs.annualStrata);
  const annualLandTax = toNumber(inputs.annualLandTax);
  const annualOther = toNumber(inputs.annualOther);

  const baseTaxableIncome = Math.max(
    0,
    toNumber(inputs.baseTaxableIncome)
  ); // salary / other income

 const expenseGrowthPct = toNumber(inputs.expenseGrowthPct) / 100;


  // Initial cash outlay = deposit + purchase costs
  const deposit = Math.max(0, purchasePrice - loanAmount);
  const initialCashOutlay = deposit + purchaseCosts;

  // Loan details
  const monthsTotal = loanTermYears * 12;
  const monthlyRate = interestRate / 12;
  const ioYears = 5;
  const ioMonths = ioYears * 12;

  // Building depreciation: straight-line over 40 years
  const depYears = 40;
  const annualBuildingDepreciation =
    depYears > 0 ? buildingValue / depYears : 0;

  // Loop through each year
  let balance = loanAmount;
  let monthsElapsed = 0;

  let cumulativeAfterTaxCashflow = 0;
  let totalDepreciationClaimedToDate = 0;

  const cashflow = [];

  for (let year = 1; year <= holdingYears; year++) {
    const propertyValue = purchasePrice * Math.pow(1 + growthRate, year);

    // Rent for this year
    const rentThisYearBeforeVacancy =
      weeklyRent * 52 * Math.pow(1 + rentGrowthRate, year - 1);
    const grossRent = rentThisYearBeforeVacancy * (1 - vacancyRate);

    // Loan amortisation for 12 months
    const openingLoan =
      year === 1 ? loanAmount : cashflow[year - 2]?.closingLoan ?? loanAmount;

    let interestThisYear = 0;
    let principalThisYear = 0;

    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;

      const isIOPeriod =
        loanRepaymentType === "IO5" &&
        monthsElapsed < ioMonths;

      let repaymentMonth = 0;
      let interestMonth = 0;
      let principalMonth = 0;

      if (monthlyRate === 0) {
        // Edge case: 0% interest – just amortise over remaining term
        const remainingMonths = Math.max(monthsTotal - monthsElapsed, 1);
        repaymentMonth = balance / remainingMonths;
        interestMonth = 0;
        principalMonth = Math.min(repaymentMonth, balance);
      } else if (isIOPeriod) {
        // Interest-only period: pay interest only, principal unchanged
        interestMonth = balance * monthlyRate;
        repaymentMonth = interestMonth;
        principalMonth = 0;
      } else {
        // Principal & interest: amortise over remaining term
        const remainingMonths = Math.max(monthsTotal - monthsElapsed, 1);
        const pmt =
          (balance * monthlyRate) /
          (1 - Math.pow(1 + monthlyRate, -remainingMonths));
        repaymentMonth = pmt;
        interestMonth = balance * monthlyRate;
        principalMonth = Math.min(
          repaymentMonth - interestMonth,
          balance + interestMonth
        );
      }

      interestThisYear += interestMonth;
      principalThisYear += principalMonth;

      balance = balance + interestMonth - repaymentMonth;
      if (balance < 0.01) {
        principalThisYear += balance;
        balance = 0;
        monthsElapsed += 1;
        break;
      }

      monthsElapsed += 1;
    }

    const closingLoan = balance;

    // Cash expenses (excluding loan)
// Growth factor for expenses (Year 1 = base level)
const expenseGrowthFactor = Math.pow(1 + expenseGrowthPct, year - 1);

// PM fees scale with rent (so no separate growth needed)
const pmFees = grossRent * pmFeeRate;

// Fixed expenses (rates, insurance, strata, land tax, other) grow each year
const fixedExpensesBase =
  annualRates +
  annualInsurance +
  annualStrata +
  annualLandTax +
  annualOther;

const fixedExpenses = fixedExpensesBase * expenseGrowthFactor;

const cashExpenses = pmFees + fixedExpenses;
const totalCashExpenses = cashExpenses + interestThisYear + principalThisYear;



    // Depreciation this year, capped so we never exceed buildingValue
    const remainingDepreciable =
      buildingValue - totalDepreciationClaimedToDate;
    const depreciation =
      remainingDepreciable > 0
        ? Math.min(annualBuildingDepreciation, remainingDepreciable)
        : 0;
    totalDepreciationClaimedToDate += depreciation;

    // Cashflow before tax (includes principal as cash outflow)
    const beforeTaxCashflow =
      grossRent - cashExpenses - interestThisYear - principalThisYear;
    const cashCost = beforeTaxCashflow < 0 ? -beforeTaxCashflow : 0;

    // Taxable income from property
    const taxableIncome =
      grossRent - cashExpenses - interestThisYear - depreciation;

    // Tax difference: base income vs base income + property taxable income
    const taxWithoutProperty = calcIncomeTax2024_25(baseTaxableIncome);
    const taxWithProperty = calcIncomeTax2024_25(
      baseTaxableIncome + taxableIncome
    );
    const taxChange = taxWithProperty - taxWithoutProperty;
    // positive = extra tax payable, negative = refund

    const afterTaxCashflow = beforeTaxCashflow - taxChange;
    const afterTaxCost = afterTaxCashflow < 0 ? -afterTaxCashflow : 0;

    cumulativeAfterTaxCashflow += afterTaxCashflow;

    // Sale / CGT at end of this year
    const salePrice = propertyValue;
    const sellingCosts = salePrice * sellingCostRate;

    // Cost base includes purchase costs and is reduced by depreciation
    const costBase =
      purchasePrice + purchaseCosts - totalDepreciationClaimedToDate;

    let capitalGain = salePrice - sellingCosts - costBase;
    if (!Number.isFinite(capitalGain)) capitalGain = 0;

    let cgtTax = 0;
    if (capitalGain > 0) {
      // 50% discount if held at least 2 full years
      const discountedGain = year >= 2 ? capitalGain * 0.5 : capitalGain;

      // Tax difference: with vs without the discounted gain in this year
      const taxBeforeCGT = calcIncomeTax2024_25(
        baseTaxableIncome + taxableIncome
      );
      const taxAfterCGT = calcIncomeTax2024_25(
        baseTaxableIncome + taxableIncome + discountedGain
      );
      cgtTax = taxAfterCGT - taxBeforeCGT;
    }

    const loanOutstandingAtSale = closingLoan;

    const netSaleAfterDebtAndTax =
      salePrice - sellingCosts - loanOutstandingAtSale - cgtTax;

    const netIfSoldThisYear =
      cumulativeAfterTaxCashflow +
      netSaleAfterDebtAndTax -
      initialCashOutlay;

    cashflow.push({
      year,
      propertyValue,
      openingLoan,
      closingLoan,
      grossRent,
      pmFees,
      fixedExpenses,
      cashExpenses,
      totalCashExpenses,
      interest: interestThisYear,
      principal: principalThisYear,
      depreciation,
      beforeTaxCashflow,
      cashCost,
      taxableIncome,
      taxChange,
      afterTaxCashflow,
      afterTaxCost,
      cumulativeAfterTaxCashflow,
      salePrice,
      sellingCosts,
      costBase,
      capitalGain,
      cgtTax,
      netSaleAfterDebtAndTax,
      netIfSoldThisYear,
    });
  }

  const firstYear = cashflow[0];
  const lastYear = cashflow[cashflow.length - 1];

  let netGainAtSale = 0;
  let netSaleAfterDebtAndTax = 0;
  let annualisedReturn = 0;

  if (lastYear) {
    netGainAtSale = lastYear.netIfSoldThisYear;
    netSaleAfterDebtAndTax = lastYear.netSaleAfterDebtAndTax;

    const endingWealth = initialCashOutlay + netGainAtSale;
    if (initialCashOutlay > 0 && endingWealth > 0) {
      annualisedReturn =
        Math.pow(endingWealth / initialCashOutlay, 1 / holdingYears) - 1;
    }
  }

  return {
    summary: {
      firstYearCashCost: firstYear ? firstYear.cashCost : 0,
      firstYearAfterTaxCost: firstYear ? firstYear.afterTaxCost : 0,
      avgAnnualCashCost:
        cashflow.length > 0
          ? cashflow.reduce((sum, y) => sum + y.cashCost, 0) /
            cashflow.length
          : 0,
      avgAnnualAfterTaxCost:
        cashflow.length > 0
          ? cashflow.reduce((sum, y) => sum + y.afterTaxCost, 0) /
            cashflow.length
          : 0,
      netGainAtSale,
      netSaleAfterDebtAndTax,
      initialCashOutlay,
      holdingYears,
    },
    cashflow,
  };
}

// ---------------
// Page component
// ---------------

export default function InvestmentPropertyCalculator() {
  const [inputs, setInputs] = useState({
    // Property & purchase
    purchasePrice: 800000,
    purchaseCosts: 40000,
    buildingValue: 400000,
    weeklyRent: 700,
    vacancyRate: 5,
    rentGrowthRate: 2.5,
    growthRate: 3.0,
    sellingCostRate: 2.5,
    holdingYears: 10,

    // Loan
    loanAmount: 640000,
    interestRate: 6.0,
    loanTermYears: 30,
    loanRepaymentType: "PI", // "PI" | "IO5"

    // Ongoing expenses
    pmFeeRate: 7.0,
    annualRates: 3000,
    annualInsurance: 1500,
    annualStrata: 0,
    annualLandTax: 0,
    annualOther: 1000,
    expenseGrowthPct: 2.5,

    // Tax base income
    baseTaxableIncome: 120000, // salary + other taxable income
  });

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setInputs((prev) => ({
      ...prev,
      [field]: value === "" ? "" : field === "loanRepaymentType" ? value : Number(value),
    }));
  };

  const { summary, cashflow } = useMemo(
    () => calculateInvestmentProperty(inputs),
    [inputs]
  );

  const lastYear = cashflow[cashflow.length - 1];

  // Limit how many years appear as columns in the cashflow table (to keep it readable)
  const yearsToShow = cashflow.slice(0, Math.min(cashflow.length, 10));

  const chartCashflow = cashflow.map((row) => ({
    year: row.year,
    afterTaxCashflow: row.afterTaxCashflow,
  }));

  const chartNetIfSold = cashflow.map((row) => ({
    year: row.year,
    netIfSoldThisYear: row.netIfSoldThisYear,
  }));

  // Display logic for the pivoted cashflow table:
  // income rows positive; deductions negative; totals highlighted.
  function cashflowDisplayValue(itemKey, row) {
  const v = row[itemKey] ?? 0;

  switch (itemKey) {
    case "grossRent": // income
      return v;

    case "pmFees":
    case "fixedExpenses":
    case "interest":
    case "principal":
    case "totalCashExpenses":
    case "cashCost":
      // Cash expenses and cash cost shown as negatives
      return -v;

    case "depreciation":
      // Non-cash deduction, show as negative
      return -v;

    case "taxChange":
      // taxChange > 0 = extra tax payable (negative for cashflow)
      // taxChange < 0 = refund (positive for cashflow)
      return -v;

    default:
      // Net figures (taxable income, after-tax cashflow, etc.) in natural sign
      return v;
  }
}

  // Line items for the pivoted cashflow table
  const cashflowLineItems = [
  {
    key: "grossRent",
    label: "Rental income (including vacancy)",
    formatter: aud0,
    isTotal: false,
  },

   {
    key: "pmFees",
    label: "Property management fees",
    formatter: aud0,
    isTotal: false,
  },
  {
    key: "fixedExpenses",
    label: "Other property expenses",
    formatter: aud0,
    isTotal: false,
  },
  {
    key: "interest",
    label: "Loan interest",
    formatter: aud0,
    isTotal: false,
  },
  {
    key: "principal",
    label: "Loan principal",
    formatter: aud0,
    isTotal: false,
  },

  // New: total cash expenses
  {
    key: "totalCashExpenses",
    label: "Total cash expenses",
    formatter: aud0,
    isTotal: true,
    sectionDividerAbove: true,
  },

  // Cash cost total (no duplicate line now)
  {
    key: "cashCost",
    label: "Net cash cost",
    formatter: aud0,
    isTotal: true,
  },

  {
    key: "depreciation",
    label: "Building depreciation (non-cash expense)",
    formatter: aud0,
    isTotal: false,
    sectionDividerAbove: true,
  },
  {
    key: "taxableIncome",
    label: "Taxable gain or loss",
    formatter: aud0,
    isTotal: true,
  },
  {
    key: "taxChange",
    label: "Tax refund / tax payable",
    formatter: aud0,
    isTotal: true,
  },
  {
    key: "afterTaxCashflow",
    label: "After-tax cashflow",
    formatter: aud0,
    isTotal: true,
    sectionDividerAbove: true,
  },

];

  return (
    <>
      <Head>
        <title>
          Investment Property Calculator (Australia) | FinToolbox
        </title>
        <meta
          name="description"
          content="Estimate the cash cost, after-tax cost and net gain from an Australian investment property, including depreciation, negative gearing and capital gains tax on sale."
        />
        <link
          rel="canonical"
          href="https://fintoolbox.com.au/calculators/investment-property"
        />
      </Head>

      {/* Header */}
      <header className="max-w-5xl mx-auto px-4 pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">
          Investment Property Calculator
        </h1>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-4">
        {/* Intro */}
        <PageIntro tone="blue">
          <div className="space-y-2">
            <p>
              Use this calculator to model an Australian investment
              property and determine:
            </p>
            <ul className="list-disc pl-5 text-sm">
              <li>The cash cost each year before tax</li>
              <li>The after-tax cost each year</li>
              <li>The net gain after tax and debt when the property is sold
                in a chosen year</li>
            </ul>
            
          </div>
        </PageIntro>

        <SubtleCtaLink
          className="mt-3"
          href="/blog/"
        >
          Want to learn more? Read the investment property guide →
        </SubtleCtaLink>

        {/* Inputs */}
        <div className="mt-6">
          <SectionCard title="Your assumptions">
            <div className="space-y-6">
              {/* Property & purchase */}
              <div>
                <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm mb-2">
                  Property details
                   </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Purchase price ($)
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={inputs.purchasePrice}
                      onChange={handleChange("purchasePrice")}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Purchase costs ($)
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={inputs.purchaseCosts}
                      onChange={handleChange("purchaseCosts")}
                    />
                    <span className="text-[11px] text-slate-500 mt-1">
                      Stamp duty, legals and other upfront costs.
                    </span>
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600 flex items-center gap-1">
                      Building value ($)
                      <Tooltip text="Building value to calculate capital works deduction. Depreciated straight-line over 40 years." />
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={inputs.buildingValue}
                      onChange={handleChange("buildingValue")}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Holding period (years)
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={inputs.holdingYears}
                      onChange={handleChange("holdingYears")}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Selling costs (% of sale)
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={inputs.sellingCostRate}
                      onChange={handleChange("sellingCostRate")}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Property growth % p.a.
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      className="border rounded px-2 py-1"
                      value={inputs.growthRate}
                      onChange={handleChange("growthRate")}
                    />
                  </label>
                </div>
              </div>

              {/* Rent */}
              <div>
                <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm mb-2">
                  Property income
                  <Tooltip text="Expected rent, rental growth rate and vacancy rate." />
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Weekly rent ($/week)
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={inputs.weeklyRent}
                      onChange={handleChange("weeklyRent")}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Vacancy rate %
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={inputs.vacancyRate}
                      onChange={handleChange("vacancyRate")}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Rent growth % p.a.
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      className="border rounded px-2 py-1"
                      value={inputs.rentGrowthRate}
                      onChange={handleChange("rentGrowthRate")}
                    />
                  </label>

                  
                </div>
              </div>

              {/* Loan */}
              <div>
                <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm mb-2">
                  Mortgage details
                  <Tooltip text="You can model principal & interest for the full term, or interest-only for 5 years then principal & interest." />
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
                  

                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Loan amount ($)
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={inputs.loanAmount}
                      onChange={handleChange("loanAmount")}
                    />
                    <span className="text-[11px] text-slate-500 mt-1">
                      Total purchase price + costs, less your deposit.
                    </span>
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Interest rate % p.a.
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      className="border rounded px-2 py-1"
                      value={inputs.interestRate}
                      onChange={handleChange("interestRate")}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Loan term (years)
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={inputs.loanTermYears}
                      onChange={handleChange("loanTermYears")}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Loan repayment type
                    </span>
                    <select
                      className="border rounded px-2 py-1"
                      value={inputs.loanRepaymentType}
                      onChange={handleChange("loanRepaymentType")}
                    >
                      <option value="PI">
                        Principal &amp; interest for full term
                      </option>
                      <option value="IO5">
                        Interest-only for first 5 years, then P&amp;I
                      </option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Ongoing expenses */}
              <div>
                <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm mb-2">
                  Ongoing expenses
                  <Tooltip text="Annual running costs for the property, excluding loan repayments." />
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Property management fee % of rent
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={inputs.pmFeeRate}
                      onChange={handleChange("pmFeeRate")}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Council and water rates ($/yr)
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={inputs.annualRates}
                      onChange={handleChange("annualRates")}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Insurance ($/yr)
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={inputs.annualInsurance}
                      onChange={handleChange("annualInsurance")}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Strata / body corporate ($/yr)
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={inputs.annualStrata}
                      onChange={handleChange("annualStrata")}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Land tax ($/yr)
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={inputs.annualLandTax}
                      onChange={handleChange("annualLandTax")}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Other expenses ($/yr)
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={inputs.annualOther}
                      onChange={handleChange("annualOther")}
                    />
                  </label>

                  <label className="flex flex-col">
  <span className="text-slate-600 flex items-center gap-1">
    Annual growth in property expenses %
    <Tooltip text="How quickly you expect costs like rates, insurance, strata and maintenance to increase each year." />
  </span>
  <input
    type="number"
    step="0.1"
    className="border rounded px-2 py-1"
    value={inputs.expenseGrowthPct}
    onChange={handleChange("expenseGrowthPct")}
  />
</label>


                </div>
              </div>

              {/* Tax base income */}
              <div>
                <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm mb-2">
                  Tax settings
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
                  <label className="flex flex-col">
                    <span className="text-slate-600">
                      Current annual taxable income ($)
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={inputs.baseTaxableIncome}
                      onChange={handleChange("baseTaxableIncome")}
                    />
                   </label>
                   
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                Tax estimates include a flat 2% Medicare levy.
                </p>

              </div>
            </div>
          </SectionCard>
        </div>

        {/* CASHFLOW TABLE – pivoted (line items down, years across) */}
        <div className="mt-8">
          <SectionCard title="Cashflow breakdown by year">
           
            <div className="overflow-x-auto">
              <table className="min-w-[700px] text-xs text-left">
                <thead className="text-slate-600 border-b text-[11px]">
                  <tr className="border-b align-top">
                    <th className="py-2 pr-4 font-medium">Line item</th>
                    {yearsToShow.map((y) => (
                      <th
                        key={y.year}
                        className="py-2 pr-4 font-medium text-right whitespace-nowrap"
                      >
                        Year {y.year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-slate-800">
  {cashflowLineItems.map((item) => (
    <tr
      key={item.key}
      className={[
        "border-b last:border-0",
        item.isTotal ? "bg-slate-50 font-semibold" : "",
        item.sectionDividerAbove ? "border-t border-slate-300" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <td className="py-2 pr-4 align-top whitespace-nowrap">
        <div className="text-slate-900">{item.label}</div>
        {item.helper && (
          <div className="text-[10px] text-slate-500">
            {item.helper}
          </div>
        )}
      </td>

      {yearsToShow.map((y) => {
        if (item.isLabelOnly) {
          return (
            <td
              key={y.year}
              className="py-2 pr-4 align-top text-right whitespace-nowrap"
            />
          );
        }

        const displayValue = cashflowDisplayValue(item.key, y);
        const valueClass =
          displayValue > 0
            ? "text-emerald-600"
            : displayValue < 0
            ? "text-red-600"
            : "text-slate-800";

        return (
          <td
            key={y.year}
            className={`py-2 pr-4 align-top text-right whitespace-nowrap ${valueClass}`}
          >
            {item.formatter(displayValue)}
          </td>
        );
      })}
    </tr>
  ))}
</tbody>


              </table>
            </div>
            

            {cashflow.length > yearsToShow.length && (
              <p className="mt-2 text-[10px] text-slate-500">
                Showing first {yearsToShow.length} years. Increase the
                holding period to see later years in the charts and
                property/loan table.
              </p>
              
            )}
            <div className="flex justify-end mt-4">
  <button
    type="button"
    onClick={() =>
      downloadCsv(
        "investment-property-cashflow.csv",
        cashflowToCsv(cashflow)
      )
    }
    className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
  >
    Export CSV
  </button>
</div>
          </SectionCard>
        </div>

            {/* SALE SUMMARY + NET POSITION CHART SIDE BY SIDE */}
{lastYear && (
  <div className="mt-8 grid gap-6 lg:grid-cols-2">
    {/* LEFT: SALE SUMMARY TABLE – WIDER, BUT STILL TIDY */}
    <SectionCard title="Sale summary at end of holding period">
      <div className="overflow-x-auto">
        {/* w-full inside the card column to make it wider */}
        <table className="w-full text-xs text-left border-collapse">
          <tbody className="text-slate-800">
            <tr className="border-b">
              <td className="py-2 pr-4 text-slate-600">
                Sale price
              </td>
              <td className="py-2 pl-2 pr-1 text-right">
                {aud0(lastYear.salePrice)}
              </td>
            </tr>

            <tr className="border-b">
              <td className="py-2 pr-4 text-slate-600">
                Selling costs
              </td>
              <td className="py-2 pl-2 pr-1 text-right">
                {aud0(-lastYear.sellingCosts)}
              </td>
            </tr>

            <tr className="border-b">
              <td className="py-2 pr-4 text-slate-600">
                Net sale before loan &amp; tax
              </td>
              <td className="py-2 pl-2 pr-1 text-right">
                {aud0(lastYear.salePrice - lastYear.sellingCosts)}
              </td>
            </tr>

            <tr className="border-b">
              <td className="py-2 pr-4 text-slate-600">
                Loan payout at sale
              </td>
              <td className="py-2 pl-2 pr-1 text-right">
                {aud0(-lastYear.closingLoan)}
              </td>
            </tr>

            <tr className="border-b">
              <td className="py-2 pr-4 text-slate-600">
                Capital gain
              </td>
              <td className="py-2 pl-2 pr-1 text-right">
                {aud0(lastYear.capitalGain)}
              </td>
            </tr>

            <tr className="border-b">
              <td className="py-2 pr-4 text-slate-600">
                Capital gains tax payable
              </td>
              <td className="py-2 pl-2 pr-1 text-right">
                {aud0(-lastYear.cgtTax)}
              </td>
            </tr>

            <tr className="border-b bg-slate-50 font-semibold">
              <td className="py-2 pr-4 text-slate-700">
                Net sale after loan &amp; tax
              </td>
              <td className="py-2 pl-2 pr-1 text-right">
                {aud0(lastYear.netSaleAfterDebtAndTax)}
              </td>
            </tr>

            <tr className="border-b bg-slate-50 font-semibold">
              <td className="py-2 pr-4 text-slate-700">
                Cumulative after-tax cashflow
              </td>
              <td className="py-2 pl-2 pr-1 text-right">
                {aud0(lastYear.cumulativeAfterTaxCashflow)}
              </td>
            </tr>

            <tr className="border-b">
              <td className="py-2 pr-4 text-slate-600">
                Initial cash outlay
                <div className="text-[10px] text-slate-500">
                  Deposit + purchase costs
                </div>
              </td>
              <td className="py-2 pl-2 pr-1 text-right">
                {aud0(summary.initialCashOutlay)}
              </td>
            </tr>

            <tr className="bg-blue-50 font-semibold">
              <td className="py-2 pr-4 text-slate-800">
                Overall net gain
              </td>
              <td className="py-2 pl-2 pr-1 text-right">
                {aud0(summary.netGainAtSale)}
              </td>
            </tr>
          </tbody>
        </table>
        
      </div>
    </SectionCard>

    {/* RIGHT: NET POSITION CHART (IF SOLD EACH YEAR) */}
    <SectionCard title="Overall net gain over time">
      <div className="w-full h-64">
        <ResponsiveContainer>
          {/* 🔁 Paste your existing "net position" chart here.
              Example (if you're using a LineChart / BarChart over netIfSoldThisYear): */}
          <LineChart data={cashflow}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 10, fill: "#4b5563" }}
            />
            <YAxis
              tickFormatter={(v) =>
                (isFinite(v) ? v : 0).toLocaleString("en-AU", {
                  style: "currency",
                  currency: "AUD",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })
              }
              tick={{ fontSize: 10, fill: "#4b5563" }}
            />
            <RTooltip
              content={
                <ChartTooltip
                  valueFormatter={aud0}
                  labelFormatter={(l) => `Year ${l}`}
                />
              }
            />
            <Legend
              wrapperStyle={{
                fontSize: "11px",
                paddingTop: "4px",
              }}
              iconSize={8}
            />
            <Line
              type="monotone"
              dataKey="netIfSoldThisYear"
              name="Net gain if sold"
              stroke="#1e3a8a"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  </div>
)}

{/* PROPERTY VALUE & LOAN BALANCE – TIGHTER, CLOSER COLUMNS */}
<div className="mt-8">
  <SectionCard title="Property value and loan balance over time">
    {/* Constrain max width so columns are physically closer */}
    <div className="overflow-x-auto">
      <div className="max-w-3xl mx-auto">
        <table className="w-full text-xs text-left table-fixed">
          <colgroup>
            <col className="w-12" />   {/* Year */}
            <col className="w-28" />   {/* Property value */}
            <col className="w-28" />   {/* Opening loan */}
            <col className="w-28" />   {/* Closing loan */}
            <col className="w-28" />   {/* Equity */}
          </colgroup>

          <thead className="text-slate-600 border-b text-[11px]">
            <tr className="border-b align-top">
              <th className="py-1.5 pr-1 font-medium text-left">Year</th>
              <th className="py-1.5 px-1 font-medium text-right">Property value</th>
              <th className="py-1.5 px-1 font-medium text-right">Opening loan</th>
              <th className="py-1.5 px-1 font-medium text-right">Closing loan</th>
              <th className="py-1.5 px-1 font-medium text-right">Equity</th>
            </tr>
          </thead>

          <tbody className="text-slate-800">
            {cashflow.map((row) => {
              const equity = row.propertyValue - row.closingLoan;
              return (
                <tr
                  key={row.year}
                  className="border-b last:border-0 align-top"
                >
                  <td className="py-1.5 pr-1 font-medium text-slate-900 whitespace-nowrap">
                    {row.year}
                  </td>
                  <td className="py-1.5 px-1 text-right whitespace-nowrap">
                    {aud0(row.propertyValue)}
                  </td>
                  <td className="py-1.5 px-1 text-right whitespace-nowrap">
                    {aud0(-row.openingLoan)}
                  </td>
                  <td className="py-1.5 px-1 text-right whitespace-nowrap">
                    {aud0(-row.closingLoan)}
                  </td>
                  <td className="py-1.5 px-1 text-right whitespace-nowrap">
                    {aud0(equity)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                "investment-property-values-and-loan.csv",
                propertyLoanToCsv(cashflow)
              )
            }
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>
  </SectionCard>
</div>

       {/* AFTER-TAX CASHFLOW CHART – FULL WIDTH ONLY */}
<div className="mt-8">
  <SectionCard title="After-tax cashflow per year">
    <div className="w-full h-64">
      <ResponsiveContainer>
        <AreaChart data={chartCashflow}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="year"
            tick={{ fontSize: 10, fill: "#4b5563" }}
          />

          <YAxis
            tickFormatter={(v) =>
              (isFinite(v) ? v : 0).toLocaleString("en-AU", {
                style: "currency",
                currency: "AUD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })
            }
            tick={{ fontSize: 10, fill: "#4b5563" }}
          />

          <RTooltip
            content={
              <ChartTooltip
                valueFormatter={aud0}
                labelFormatter={(l) => `Year ${l}`}
              />
            }
          />

          <Legend
            wrapperStyle={{
              fontSize: "11px",
              paddingTop: "4px",
            }}
            iconSize={8}
          />

          <Area
            type="monotone"
            dataKey="afterTaxCashflow"
            name="After-tax cashflow"
            fill="#93c5fd"
            stroke="#1e3a8a"
            fillOpacity={0.25}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </SectionCard>
</div>


        {/* How it works */}
        <div className="mt-8">
          <SectionCard title="How this calculator works">
            <ul className="list-disc pl-5 space-y-3 text-sm text-slate-600">
              
              <li>
                <span className="font-medium text-slate-800">
                  Depreciation and CGT:
                </span>{" "}
                Building value is depreciated straight-line over 40
                years. Depreciation is treated as a deduction for
                rental income but also reduces your CGT cost base
                (purchase price plus purchase costs minus total
                depreciation), which can increase the capital gain on
                sale.
              </li>
              <li>
                <span className="font-medium text-slate-800">
                  Loan structure:
                </span>{" "}
                You can model either principal &amp; interest for the
                full term, or five years of interest-only repayments
                followed by principal &amp; interest over the remaining
                term.
              </li>
              <li>
                <span className="font-medium text-slate-800">
                  Capital gains tax on sale:
                </span>{" "}
                Includes 50% CGT discount for holding periods greater than 1 year. The CGT estimate
                is based on the extra tax payable when the discounted
                gain is added to your other income in the sale year.
              </li>
              <li>
                <span className="font-medium text-slate-800">
                  Net gain on sale:
                </span>{" "}
                The net gain figure adds up all after-tax cashflows,
                adds the net sale proceeds after loan repayment and
                CGT, then subtracts your initial cash outlay (deposit
                plus purchase costs).
              </li>
              <li>
                <span className="font-medium text-slate-800">
                  Limitations:
                </span>{" "}
                Interest rates, growth and tax rules are assumed to be
                constant and simplified.
              </li>
            </ul>
          </SectionCard>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-12 mb-12 text-[11px] text-slate-500 leading-snug">
        <p>
          This calculator is general information only. It does not
          take into account your objectives, financial situation or
          needs and is not tax or financial advice. 
        </p>
      </div>
    </>
  );
}
