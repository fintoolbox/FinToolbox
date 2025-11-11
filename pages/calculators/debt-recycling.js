// pages/calculators/debt-recycling.js

import { useState, useMemo } from "react";
import Head from "next/head";
// import Layout from "../../components/Layout"; // not needed here
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";

// -----------------
// Helper functions
// -----------------

// Add this helper near the component top-level
function yearsToCsv(years) {
  if (!years?.length) return "";
  const headers = [
    "Year",
    "HomeLoanA",
    "NetWealthA",
    "HomeLoanB",
    "InvestLoanB",
    "PortfolioB",
    "NetWealthB",
    "DebtFreePositionB"
  ];
  const rows = years.map(r => [
    r.year,
    r.homeLoanA,
    r.netWealthA,
    r.homeLoanB,
    r.investLoanB,
    r.portfolioB,
    r.netWealthB,
    r.surplusIfLiquidated
  ]);
  const escape = (v) => (typeof v === "string" && v.includes(",") ? `"${v}"` : v);
  return [headers, ...rows].map(row => row.map(escape).join(",")).join("\n");
}

function downloadCsv(filename, csv) {
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


function aud0(n) {
  if (!isFinite(n)) return "$0";
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// Standard P&I repayment formula (monthly payment)
function pmtPAndI(principal, annualRatePct, remainingYears) {
  if (principal <= 0) return 0;
  const r = (annualRatePct / 100) / 12; // monthly rate
  const n = remainingYears * 12; // total months
  if (r === 0) {
    return n === 0 ? 0 : principal / n;
  }
  const num = principal * r * Math.pow(1 + r, n);
  const den = Math.pow(1 + r, n) - 1;
  return den === 0 ? 0 : num / den;
}

// After-tax liquidation value of the portfolio if sold now
function afterTaxLiquidationValue(currentPortfolioValue, costBase, marginalTaxRatePct) {
  const gain = currentPortfolioValue - costBase;
  if (gain <= 0) {
    return currentPortfolioValue;
  }
  const discountGain = gain * 0.5; // 50% CGT discount assumed
  const taxRate = marginalTaxRatePct / 100;
  const cgt = discountGain * taxRate;
  return currentPortfolioValue - cgt;
}

// After-tax income sweep calc
function calcAfterTaxIncomeSweep({
  portfolioStart,
  yieldPct,
  frankedPortionPct,
  marginalTaxRatePct,
  avgInvestLoanBalanceForYear,
  investLoanRatePct,
}) {
  // 1. Cash distributions actually received
  const cashIncome = portfolioStart * (yieldPct / 100);

  // Split cash income into franked vs unfranked
  const frankedPortion = cashIncome * (frankedPortionPct / 100);
  const unfrankedPortion = cashIncome - frankedPortion;

  // Assume 30% company tax for franking
  const frankingRate = 0.30;

  // Gross up franked dividends to get assessable income
  const grossedUpFrankedIncome =
    frankedPortion / ((1 - frankingRate) || 1);

  const frankingCredit = grossedUpFrankedIncome - frankedPortion;

  // Assessable income before interest deduction
  const assessableInvestmentIncome =
    unfrankedPortion + grossedUpFrankedIncome;

  // Deductible interest (negative gearing)
  const deductibleInterest =
    avgInvestLoanBalanceForYear * (investLoanRatePct / 100);

  // Net taxable result
  const taxableAfterInterest =
    assessableInvestmentIncome - deductibleInterest;

  // Tax (or refund) at marginal tax rate (incl Medicare levy)
  const taxRate = marginalTaxRatePct / 100;
  const taxPayableOnNetIncome = taxableAfterInterest * taxRate;

  // Apply franking credits as refundable offset
  const netTaxAfterFranking = taxPayableOnNetIncome - frankingCredit;

  // Household cash outcome from portfolio for this year
  const afterTaxCashToHomeLoan = cashIncome - netTaxAfterFranking;

  return {
    afterTaxCashToHomeLoan,
  };
}

// Core simulation engine
function simulate({
  homeValueStart,
  homeValueGrowthPct,
  homeLoanStart,
  offsetBalanceStart,
  kickstartFromOffset,
  remainingTermYearsStart,
  homeRatePct,
  investLoanRatePct,
  baseMonthlyRepayment,
  projectionYears,
  investGrowthPct,
  investYieldPct,
  frankedPortionPct,
  marginalTaxRatePct,
}) {
  const totalMonths = projectionYears * 12;

  // --- Strategy B state ---
  let homeLoanBalB = homeLoanStart;
  let offsetBalB = offsetBalanceStart;
  let investLoanBalB = 0; // starting from zero now
  let portfolioBalB = 0; // starting from zero now
  let portfolioCostBase = 0; // cost base starts at 0

  // Kickstart: pull from offset, pay down home, redraw as invest debt, invest it
  {
    const usableKick = Math.min(kickstartFromOffset, offsetBalB, homeLoanBalB);
    if (usableKick > 0) {
      homeLoanBalB -= usableKick;
      offsetBalB -= usableKick;
      investLoanBalB += usableKick;
      portfolioBalB += usableKick;
      portfolioCostBase += usableKick; // contributed capital
    }
  }

  // --- Strategy A state ---
  let homeLoanBalA = homeLoanStart;
  let offsetBalA = offsetBalanceStart;

  let remainingTermMonths = remainingTermYearsStart * 12;

  // Track year start values for next-year redraw & sweep logic
  let yearStartHomeLoanBalB = homeLoanBalB;
  let yearStartPortfolioBalB = portfolioBalB;
  let yearStartInvestLoanBalB = investLoanBalB;

  // Monthly sweep from last year's investment income (after tax)
  let currentYearIncomeSweepMonthly = 0;

  // -------------------------
  // FROZEN REQUIRED BASE REPAYMENTS
  // -------------------------
  const totalDebtStartB = homeLoanBalB + investLoanBalB;
  const weightedRateStartPctB =
    totalDebtStartB > 0
      ? (homeLoanBalB * homeRatePct +
          investLoanBalB * investLoanRatePct) /
        totalDebtStartB
      : 0;

  const frozenRequiredBaseB =
    totalDebtStartB > 0
      ? pmtPAndI(
          totalDebtStartB,
          weightedRateStartPctB,
          remainingTermYearsStart
        )
      : 0;

  const frozenRequiredBaseA =
    homeLoanStart > 0
      ? pmtPAndI(
          homeLoanStart,
          homeRatePct,
          remainingTermYearsStart
        )
      : 0;

  const yearsArr = [];

  // We'll show these in the UI under the input
  let thisYearUserBase = baseMonthlyRepayment;
  let thisYearEffectiveBase = Math.max(
    baseMonthlyRepayment,
    frozenRequiredBaseB
  );

  for (let month = 0; month < totalMonths; month++) {
    const currentYearIdx = Math.floor(month / 12); // 0 = Year 1
    const monthInYear = month % 12;

    const remainingTermYearsNow = Math.max(
      remainingTermMonths / 12,
      0.0001
    );

    // --- STRATEGY B repayments this month ---
    const effectiveBaseCashB = Math.max(
      baseMonthlyRepayment,
      frozenRequiredBaseB
    );
    thisYearUserBase = baseMonthlyRepayment;
    thisYearEffectiveBase = effectiveBaseCashB;

    const investOnlyPmtThisMonth =
      investLoanBalB > 0
        ? pmtPAndI(
            investLoanBalB,
            investLoanRatePct,
            remainingTermYearsNow
          )
        : 0;

    // pay investment split first
    const payToInvestSplit = Math.min(
      effectiveBaseCashB,
      investOnlyPmtThisMonth
    );

    // leftover goes to home split
    let payToHomeSplit = effectiveBaseCashB - payToInvestSplit;

    const homeOnlyPmtThisMonth =
      homeLoanBalB > 0
        ? pmtPAndI(
            homeLoanBalB,
            homeRatePct,
            remainingTermYearsNow
          )
        : 0;

    const sumOfSplitWants =
      investOnlyPmtThisMonth + homeOnlyPmtThisMonth;

    // If we're paying more than both splits strictly "need",
    // dump the surplus on the home split (non-deductible)
    if (effectiveBaseCashB > sumOfSplitWants) {
      payToHomeSplit += effectiveBaseCashB - sumOfSplitWants;
    }

    // plus sweep from prior-year investment income
    const totalHomeThisMonthB =
      payToHomeSplit + currentYearIncomeSweepMonthly;

    const totalInvestThisMonthB = payToInvestSplit;

    // Interest calc
    const homeMonthlyRate = (homeRatePct / 100) / 12;
    const investMonthlyRate = (investLoanRatePct / 100) / 12;

    // home interest applies to (homeLoanBalB - offsetBalB), floored at 0
    const effectiveHomeBalForInterestB = Math.max(
      0,
      homeLoanBalB - offsetBalB
    );
    const homeInterestB =
      effectiveHomeBalForInterestB * homeMonthlyRate;

    const investInterestB =
      investLoanBalB * investMonthlyRate;

    // principal reduction on home split
    let principalReductionHome = totalHomeThisMonthB - homeInterestB;
    if (principalReductionHome < 0) principalReductionHome = 0;
    homeLoanBalB -= principalReductionHome;
    if (homeLoanBalB < 0) homeLoanBalB = 0;

    // principal reduction on investment split
    let principalReductionInvest = totalInvestThisMonthB - investInterestB;
    if (principalReductionInvest < 0) principalReductionInvest = 0;
    investLoanBalB -= principalReductionInvest;
    if (investLoanBalB < 0) investLoanBalB = 0;

    // --- STRATEGY A repayments this month ---
    const effectiveBaseCashA = Math.max(
      baseMonthlyRepayment,
      frozenRequiredBaseA
    );
    const cashToHomeA = effectiveBaseCashA;

    const effectiveHomeBalForInterestA = Math.max(
      0,
      homeLoanBalA - offsetBalA
    );
    const homeInterestA =
      effectiveHomeBalForInterestA * homeMonthlyRate;

    let principalReductionA = cashToHomeA - homeInterestA;
    if (principalReductionA < 0) principalReductionA = 0;
    homeLoanBalA -= principalReductionA;
    if (homeLoanBalA < 0) homeLoanBalA = 0;

    // countdown term
    if (remainingTermMonths > 0) remainingTermMonths -= 1;

    // --- YEAR-END ROLLOVER (December) ---
    if (monthInYear === 11) {
      const thisYear = currentYearIdx + 1;

      // snapshot balances BEFORE next year's redraw
      const homeLoanBalB_endOfYear = homeLoanBalB;
      const investLoanBalB_endOfYear = investLoanBalB;

      // avg deductible balance for tax calc (negative gearing)
      const avgInvestLoanBalanceForYear =
        (yearStartInvestLoanBalB + investLoanBalB_endOfYear) / 2;

      // 1. after-tax cash the portfolio produced this year
      const { afterTaxCashToHomeLoan } = calcAfterTaxIncomeSweep({
        portfolioStart: yearStartPortfolioBalB,
        yieldPct: investYieldPct,
        frankedPortionPct,
        marginalTaxRatePct,
        avgInvestLoanBalanceForYear,
        investLoanRatePct,
      });

      const nextYearIncomeSweepMonthly =
        afterTaxCashToHomeLoan / 12;

      // 2. growth on the portfolio this year (no redraw yet)
      let portfolioEndOfYearBeforeRedraw =
        yearStartPortfolioBalB * (1 + investGrowthPct / 100);

      // Property value now
      const houseValYearEnd =
        homeValueStart *
        Math.pow(1 + homeValueGrowthPct / 100, thisYear);

      // Strategy A net wealth
      const netWealthA =
        houseValYearEnd + offsetBalA - homeLoanBalA;

      // Strategy B net wealth
      const netWealthB =
        houseValYearEnd +
        portfolioEndOfYearBeforeRedraw +
        offsetBalB -
        homeLoanBalB_endOfYear -
        investLoanBalB_endOfYear;

      // Wipeout test
      const afterTaxPortfolioNow = afterTaxLiquidationValue(
        portfolioEndOfYearBeforeRedraw,
        portfolioCostBase,
        marginalTaxRatePct
      );
      const totalDebtNow =
        homeLoanBalB_endOfYear + investLoanBalB_endOfYear;
      const surplusIfLiquidated =
        afterTaxPortfolioNow - totalDebtNow;

      // push row for UI
      const effectiveBaseThisYear = Math.max(
        baseMonthlyRepayment,
        frozenRequiredBaseB
      );

      yearsArr.push({
        year: thisYear,

        homeLoanA: homeLoanBalA,
        netWealthA,

        homeLoanB: homeLoanBalB_endOfYear,
        investLoanB: investLoanBalB_endOfYear,
        portfolioB: portfolioEndOfYearBeforeRedraw,
        netWealthB,

        afterTaxPortfolioNow,
        totalDebtNow,
        surplusIfLiquidated,

        userBaseMonthlyRepayment: baseMonthlyRepayment,
        effectiveBaseMonthlyRepaymentUsed: effectiveBaseThisYear,
      });

      // 3. redraw for NEXT year
      let redrawAmount =
        yearStartHomeLoanBalB - homeLoanBalB_endOfYear;
      if (redrawAmount < 0) redrawAmount = 0;

      if (redrawAmount > 0) {
        // increase deductible investment loan
        investLoanBalB += redrawAmount;

        // add that redraw into next year's portfolio opening
        portfolioEndOfYearBeforeRedraw += redrawAmount;

        // bump CGT cost base (new contributed capital)
        portfolioCostBase += redrawAmount;
      }

      // roll state forward
      const portfolioOpeningNextYear = portfolioEndOfYearBeforeRedraw;
      currentYearIncomeSweepMonthly = nextYearIncomeSweepMonthly;
      yearStartHomeLoanBalB = homeLoanBalB;
      yearStartPortfolioBalB = portfolioOpeningNextYear;
      yearStartInvestLoanBalB = investLoanBalB;
    }
  }

  return { yearsArr };
}

// -----------------
// Page component
// -----------------

export default function DebtRecyclingCalculator() {
  // INPUT STATE

  // Home & loans
  const [homeValueStart, setHomeValueStart] = useState(900000);
  const [homeValueGrowthPct, setHomeValueGrowthPct] = useState(3);
  const [homeLoanStart, setHomeLoanStart] = useState(600000);
  const [offsetBalanceStart, setOffsetBalanceStart] = useState(50000);
  const [kickstartFromOffset, setKickstartFromOffset] = useState(30000);
  const [remainingTermYearsStart, setRemainingTermYearsStart] = useState(25);
  const [homeRatePct, setHomeRatePct] = useState(5.99);
  const [investLoanRatePct, setInvestLoanRatePct] = useState(5.99);

  // Cashflow (single repayment input now)
  const [baseMonthlyRepayment, setBaseMonthlyRepayment] = useState(4000);

  // Investment return assumptions
  const [investGrowthPct, setInvestGrowthPct] = useState(5);
  const [investYieldPct, setInvestYieldPct] = useState(3);
  const [frankedPortionPct, setFrankedPortionPct] = useState(30);

  // Tax + projection
  const [marginalTaxRatePct, setMarginalTaxRatePct] = useState(39); // incl Medicare levy
  const [projectionYears, setProjectionYears] = useState(20);

  // RUN SIM
  const results = useMemo(
    () =>
      simulate({
        homeValueStart,
        homeValueGrowthPct,
        homeLoanStart,
        offsetBalanceStart,
        kickstartFromOffset,
        remainingTermYearsStart,
        homeRatePct,
        investLoanRatePct,
        baseMonthlyRepayment,
        projectionYears,
        investGrowthPct,
        investYieldPct,
        frankedPortionPct,
        marginalTaxRatePct,
      }),
    [
      homeValueStart,
      homeValueGrowthPct,
      homeLoanStart,
      offsetBalanceStart,
      kickstartFromOffset,
      remainingTermYearsStart,
      homeRatePct,
      investLoanRatePct,
      baseMonthlyRepayment,
      projectionYears,
      investGrowthPct,
      investYieldPct,
      frankedPortionPct,
      marginalTaxRatePct,
    ]
  );

  // Chart data
  const chartData = results.yearsArr?.map((row) => ({
    year: row.year,
    "Strategy A Net Wealth": row.netWealthA,
    "Strategy B Net Wealth": row.netWealthB,
  }));

  // Wipeout / payoff comparison chart data
const wipeoutChartData = results.yearsArr?.map((row) => ({
  year: row.year,
  "Strategy A Remaining Home Loan": -row.homeLoanA || 0,
  "Strategy B Debt Free Position": row.surplusIfLiquidated || 0,
}));

  // First year where "wipeout surplus" >= 0
  const wipeoutYear =
    results.yearsArr?.find((r) => r.surplusIfLiquidated >= 0)?.year ?? null;

  return (
    <>
      <Head>
        <title>Debt Recycling Calculator (Australia) | FinToolbox</title>
        <meta
          name="description"
          content="Compare paying off your home loan vs recycling debt into investments. Models redraw timing, franking credits, negative gearing, CGT on exit, and 'wipeout year'."
        />
        <link
          rel="canonical"
          href="https://fintoolbox.com.au/calculators/debt-recycling"
        />
      </Head>

      {/* Intro */}
      <header className="max-w-5xl mx-auto px-4 pb-6 border-b border-slate-200">
  <h1 className="text-2xl font-bold text-slate-900">
    Debt Recycling Calculator
  </h1>
</header>
  
<div className="max-w-5xl mx-auto px-4 mt-4">
{/* Intro info section */}
<PageIntro tone="blue">
  <div className="space-y-2">
    <p>
      <span className="font-semibold">Debt recycling</span>{" "}
      is a strategy to convert your home loan into investment debt. Put simply, you make additional payments into your home loan,
      then redraw those repayments as a separate <em>tax-deductible</em> investment loan and
      invest. Over time, investment income (and the tax benefits of 
      negative gearing) help accelerate your home loan repayments while you build a portfolio. 
      These additional lump sum payments to your home loan are redrawn (usually annually) and invested. 
      &lsquo;Bad&rsquo; debt is recycled into &lsquo;good&rsquo; debt over time.
    </p>

  <p>
    Use this debt recycling calculator to understand how debt recycling works and to calculate the long term benefits of
    employing this strategy. Model how long before you will be debt free, and compare the benefits of this strategy with simply paying down your home loan.
  </p>

      </div>
</PageIntro>

<div className="prose prose-sm mt-6 text-slate-700">
  
</div>

<SubtleCtaLink className="mt-3" href="/blog/debt-recycling-strategy-australia">
  Not sure how debt recycling works? Read the full guide →
</SubtleCtaLink>


            {/* INPUT CARD */}
      <div className="mt-6">
      <SectionCard title="Your assumptions">
        <div className="space-y-6">
        {/* Property & Home Loan */}
        <div>
          <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm mb-2">
            Property &amp; Home Loan
            <Tooltip text="Your current property value, offset account balance and mortgage position." />
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
            <label className="flex flex-col">
              <span className="text-slate-600 flex items-center gap-1">
                Home value ($)
              </span>
              <input
                type="number"
                className="border rounded px-2 py-1"
                value={homeValueStart}
                onChange={(e) => setHomeValueStart(Number(e.target.value))}
              />
            </label>

            <label className="flex flex-col">
              <span className="text-slate-600 flex items-center gap-1">
                Home value growth % p.a.
                <Tooltip text="Expected property price growth per year." />
              </span>
              <input
                type="number"
                step="0.1"
                className="border rounded px-2 py-1"
                value={homeValueGrowthPct}
                onChange={(e) => setHomeValueGrowthPct(Number(e.target.value))}
              />
            </label>

            <label className="flex flex-col">
              <span className="text-slate-600 flex items-center gap-1">
                Home loan balance ($)
              </span>
              <input
                type="number"
                className="border rounded px-2 py-1"
                value={homeLoanStart}
                onChange={(e) => setHomeLoanStart(Number(e.target.value))}
              />
            </label>

            <label className="flex flex-col">
              <span className="text-slate-600 flex items-center gap-1">
                Offset account balance ($)
              </span>
              <input
                type="number"
                className="border rounded px-2 py-1"
                value={offsetBalanceStart}
                onChange={(e) => setOffsetBalanceStart(Number(e.target.value))}
              />
            </label>

            <label className="flex flex-col">
              <span className="text-slate-600 flex items-center gap-1">
                Initial deposit from offset ($)
                <Tooltip text="The starting amount transferred from your offset into your home loan, then immediately redrawn as a deductible investment loan." />
              </span>
              <input
                type="number"
                className="border rounded px-2 py-1"
                value={kickstartFromOffset}
                onChange={(e) =>
                  setKickstartFromOffset(Number(e.target.value))
                }
              />
            </label>

            <label className="flex flex-col">
              <span className="text-slate-600 flex items-center gap-1">
                Years remaining on home loan
                <Tooltip text="The length of your current home loan. We use this to calculate the minimum monthly repayment." />
              </span>
              <input
                type="number"
                className="border rounded px-2 py-1"
                value={remainingTermYearsStart}
                onChange={(e) =>
                  setRemainingTermYearsStart(Number(e.target.value))
                }
              />
            </label>

            <label className="flex flex-col">
              <span className="text-slate-600">Home loan rate % p.a.</span>
              <input
                type="number"
                step="0.01"
                className="border rounded px-2 py-1"
                value={homeRatePct}
                onChange={(e) => setHomeRatePct(Number(e.target.value))}
              />
            </label>

            <label className="flex flex-col">
              <span className="text-slate-600">
                Investment loan rate % p.a.
              </span>
              <input
                type="number"
                step="0.01"
                className="border rounded px-2 py-1"
                value={investLoanRatePct}
                onChange={(e) => setInvestLoanRatePct(Number(e.target.value))}
              />
            </label>
          </div>
        </div>

        {/* Cashflow / Repayments */}
        <div>
          <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm mb-2">
            Monthly Repayment
            <Tooltip text="Your current monthly repayments. Adjust the figure to see what difference increasing your payment makes. If you enter less than the calculated minimum, we use the minimum repayment in the projection." />
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
            <label className="flex flex-col">
              <span className="text-slate-600 flex items-center gap-1">
                Monthly repayment ($/mo)
              </span>
              <input
                type="number"
                className="border rounded px-2 py-1"
                value={baseMonthlyRepayment}
                onChange={(e) =>
                  setBaseMonthlyRepayment(Number(e.target.value))
                }
              />

              {results.yearsArr?.length > 0 && (
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                  
                  <div>
                    Calculated minimum monthly repayment:{" "}
                    <span className="font-medium text-slate-700">
                      {aud0(
                        results.yearsArr[
                          results.yearsArr.length - 1
                        ].effectiveBaseMonthlyRepaymentUsed
                      )}
                      /mo
                    </span>
                  </div>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Investment Assumptions */}
        <div>
          <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm mb-2">
            Investment Assumptions
            <Tooltip text="Enter the expected investment portfolio growth, income yield and % of income which is fully franked." />
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
            <label className="flex flex-col">
              <span className="text-slate-600">Capital growth % p.a.</span>
              <input
                type="number"
                step="0.1"
                className="border rounded px-2 py-1"
                value={investGrowthPct}
                onChange={(e) => setInvestGrowthPct(Number(e.target.value))}
              />
            </label>

            <label className="flex flex-col">
              <span className="text-slate-600">Cash yield % p.a.</span>
              <input
                type="number"
                step="0.1"
                className="border rounded px-2 py-1"
                value={investYieldPct}
                onChange={(e) => setInvestYieldPct(Number(e.target.value))}
              />
            </label>

            <label className="flex flex-col">
              <span className="text-slate-600">% of yield that is franked</span>
              <input
                type="number"
                step="1"
                className="border rounded px-2 py-1"
                value={frankedPortionPct}
                onChange={(e) => setFrankedPortionPct(Number(e.target.value))}
              />
            </label>
          </div>
        </div>

        {/* Tax & Projection */}
        <div>
          <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm mb-2">
            Tax &amp; Projection Settings
            <Tooltip text="Enter your marginal tax rate (including Medicare levy) between 0% and 47%" />
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
            <label className="flex flex-col">
              <span className="text-slate-600">Marginal tax rate %</span>
              <input
                type="number"
                className="border rounded px-2 py-1"
                value={marginalTaxRatePct}
                onChange={(e) =>
                  setMarginalTaxRatePct(Number(e.target.value))
                }
              />
            </label>

            <label className="flex flex-col">
              <span className="text-slate-600">Projection length (years)</span>
              <input
                type="number"
                className="border rounded px-2 py-1"
                value={projectionYears}
                onChange={(e) =>
                  setProjectionYears(Number(e.target.value))
                }
              />
            </label>
          </div>
        </div>
        </div>
      </SectionCard>
      
    </div>

            {/* CHART CARD */}
      <div className="mt-8">
        <SectionCard title="Net Wealth Over Time">
          <div className="w-full h-64">
            <ResponsiveContainer>
              <LineChart data={chartData}>
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

                <RTooltip content={<ChartTooltip 
                valueFormatter={aud0} 
                labelFormatter={(l) => `Year ${l}`}
                />} />

                <Legend
                  wrapperStyle={{
                    fontSize: "11px",
                    paddingTop: "4px",
                  }}
                  iconSize={8}
                />

                <Line
                  type="monotone"
                  dataKey="Strategy A Net Wealth"
                  stroke="#93c5fd"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Strategy B Net Wealth"
                  stroke="#1e3a8a"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>


{/* SUMMARY – cards-in-card */}
<div className="mt-8">
  <SectionCard>
    <SummaryGrid>
      {/* Strategy A */}
      <SummaryCard
        label="Final net wealth (Strategy A)"
        value={
          results.yearsArr?.length
            ? aud0(results.yearsArr[results.yearsArr.length - 1].netWealthA)
            : "—"
        }
      />

      {/* Strategy B with diff pill */}
      {(() => {
        const has = results.yearsArr?.length > 0;
        const a = has ? results.yearsArr[results.yearsArr.length - 1].netWealthA : 0;
        const b = has ? results.yearsArr[results.yearsArr.length - 1].netWealthB : 0;
        const diff = b - a;
        const tone = !has ? "neutral" : diff > 0 ? "positive" : diff < 0 ? "negative" : "neutral";
        const badge = !has ? null : `${diff >= 0 ? "+" : ""}${aud0(diff)} vs A`;

        return (
          <SummaryCard
            label="Final net wealth (Strategy B)"
            value={has ? aud0(b) : "—"}
            badgeText={badge}
            badgeTone={tone}
          />
        );
      })()}

      {/* Debt-free year */}
      <SummaryCard
        label="Year you could clear all debt"
        value={wipeoutYear ? `Year ${wipeoutYear}` : "Not within projection"}
    
      />
    </SummaryGrid>
  </SectionCard>
</div>




            {/* DEBT-FREE CHART */}
      <div className="mt-8">
        <SectionCard title="When will I be debt free?">
          <p className="text-[11px] text-slate-600 leading-snug mb-4 max-w-3xl">
            This compares how much you still owe on your home loan under{" "}
            <span className="font-medium text-slate-800">Strategy A</span>{" "}
            against how much surplus you’d have if you sold your investments,
            paid capital gains tax, and cleared <em>all</em> debts under{" "}
            <span className="font-medium text-slate-800">Strategy B</span>.
            When the dark bar turns positive, you’re debt free.
          </p>

          <div className="w-full h-64">
            <ResponsiveContainer>
              <BarChart data={wipeoutChartData}>
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
      showTotal={false}  
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

                <Bar
                  dataKey="Strategy A Remaining Home Loan"
                  fill="#93c5fd"
                />
                <Bar
                  dataKey="Strategy B Debt Free Position"
                  fill="#1e3a8a"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-slate-500 leading-snug max-w-3xl mt-4">
            *“<b>Debt Free Position</b>” - if you sold your investment portfolio in that
            year and paid CGT (including 50% CGT discount), would you have enough cash to
            pay off both your home loan and your investment loan?
          </p>
        </SectionCard>
      </div>


            {/* COMPARISON TABLE */}
      <div className="mt-8">
  <SectionCard
  title={
    <div className="flex-1 min-w-0 flex items-center gap-2">
      <span className="truncate">Year-by-Year Comparison</span>

      
    </div>
  }
>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] text-xs text-left">
              <thead className="text-slate-600 border-b text-[11px]">
                <tr className="border-b align-top">
                  <th className="py-2 pr-4 font-medium">Year</th>

                  <th className="py-2 pr-4 font-medium">
                    Home loan (A)
                    <div className="text-[10px] text-slate-500 font-normal">
                      Non-deductible
                    </div>
                  </th>

                  <th className="py-2 pr-4 font-medium">
                    Net wealth (A)
                    <div className="text-[10px] text-slate-500 font-normal">
                      Total assets − debt
                    </div>
                  </th>

                  <th className="py-2 pr-4 font-medium">
                    Home loan (B)
                    <div className="text-[10px] text-slate-500 font-normal">
                      Non-deductible
                    </div>
                  </th>

                  <th className="py-2 pr-4 font-medium">
                    Investment loan (B)
                    <div className="text-[10px] text-slate-500 font-normal">
                      Deductible
                    </div>
                  </th>

                  <th className="py-2 pr-4 font-medium">
                    Portfolio value (B)
                    <div className="text-[10px] text-slate-500 font-normal">
                      Investments
                    </div>
                  </th>

                  <th className="py-2 pr-4 font-medium">
                    Net wealth (B)
                    <div className="text-[10px] text-slate-500 font-normal">
                      Total assets − debt
                    </div>
                  </th>

                  <th className="py-2 pr-4 font-medium">
                    Am I debt free (B)?
                    <div className="text-[10px] text-slate-500 font-normal">
                      After CGT, would I be debt free?
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="text-slate-800">
                {results.yearsArr?.map((row) => (
                  <tr
                    key={row.year}
                    className="border-b last:border-0 align-top"
                  >
                    <td className="py-2 pr-4 font-medium text-slate-900 whitespace-nowrap">
                      {row.year}
                    </td>

                    <td className="py-2 pr-4 whitespace-nowrap">
                      {aud0(row.homeLoanA)}
                    </td>

                    <td className="py-2 pr-4 whitespace-nowrap">
                      {aud0(row.netWealthA)}
                    </td>

                    <td className="py-2 pr-4 whitespace-nowrap">
                      {aud0(row.homeLoanB)}
                    </td>

                    <td className="py-2 pr-4 whitespace-nowrap">
                      {aud0(row.investLoanB)}
                    </td>

                    <td className="py-2 pr-4 whitespace-nowrap">
                      {aud0(row.portfolioB)}
                    </td>

                    <td className="py-2 pr-4 whitespace-nowrap">
                      {aud0(row.netWealthB)}
                    </td>

                    <td className="py-2 pr-4 whitespace-nowrap">
                      {aud0(row.surplusIfLiquidated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
          </div>
          <div className="flex justify-end mt-4">
  <button
    type="button"
    onClick={() =>
      downloadCsv(
        "debt-recycling-results.csv",
        yearsToCsv(results.yearsArr)
      )
    }
    className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
  >
    Export CSV
  </button>
</div>
        </SectionCard>
      </div>


            {/* ASSUMPTIONS & REFERENCES */}
      <div className="mt-8">
        <SectionCard title="How this calculator works">
          <ul className="list-disc pl-5 space-y-3 text-sm text-slate-600">
            
            <li>
              <span className="text-slate-800 font-medium">
                How repayments are allocated:
              </span>{" "}
              We treat the home loan and investment loan as two splits under one
              facility:
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>
                  The total monthly repayment remains static throughout the projection.
                </li>
                <li>
                  The monthly repayment is first allocated to the investment loan
                  as a minimum repayment, then the balance is paid into the home loan.
                </li>
                <li>
                  The following year&rsquo;s income from investments (after tax, plus any negative gearing benefit) is
                  then paid into the home loan.
                </li>
              </ul>
            </li>

            <li>
              <span className="text-slate-800 font-medium">
                Timing of redraws:
              </span>{" "}
              We model debt recycling annually. At the end of each year we
              check how much the home loan actually fell, above the minimum repayments. At the start of the next year
              we assume you redraw that amount as a new tax-deductible investment loan
              and invest it. 
            </li>

            <li>
              <span className="text-slate-800 font-medium">
                Investment returns:
              </span>{" "}
              We split total return into:
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>
                  <span className="font-medium text-slate-800">
                    Cash yield % p.a.
                  </span>{" "}
                  (distributions/dividends actually paid to you),
                </li>
                <li>
                  <span className="font-medium text-slate-800">
                    Capital growth % p.a.
                  </span>{" "}
                  (price growth).
                </li>
              </ul>
              
            </li>

            <li>
              <span className="text-slate-800 font-medium">
                After-tax cashflow to home loan:
              </span>{" "}
              Annually we:
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>
                  Calculate cash distributions on the portfolio based on its
                  balance at the start of that year.
                </li>
                <li>
                  Add franking credits based on the % input and gross that up as assessable income.
                </li>
                <li>
                  Subtract the year’s investment loan interest as a tax-deductible expense. 
                  If interest exceeds income, that creates a tax loss (negative gearing).
                </li>
                <li>
                  Apply your marginal tax rate (including Medicare levy). The
                  result can be a refund or amount payable.
                </li>
                <li>
                  Final cash applied to the home loan = distributions +/- any tax refund / payable.
                </li>
                <li>
                  We assume that you direct 100% of that after-tax investment income
              as additional repayments to your non-deductible home loan split over the following 12 months.
              </li>
                
              </ul>
              
            </li>

            <li>
              <span className="text-slate-800 font-medium">
                “When will I be debt free?”:
              </span>{" "}
              For each year we calculate if you sold your entire investment portfolio at that
              year-end value, paid CGT (with a 50% discount) at your marginal tax
              rate (incl Medicare levy), would you have enough cash to repay your home loan and investment loan? 
              We maintain a running cost base that increases every time new money is added to the portfolio.
            </li>

            <li>
              <span className="text-slate-800 font-medium">Interest rates:</span>{" "}
              We assume both the home loan and investment loan interest rates
              remain constant for the full projection. Both are modelled as
              principal &amp; interest, not interest-only.
            </li>
                     
          </ul>

        </SectionCard>
      </div>
</div>
<div className="max-w-5xl mx-auto px-4 mt-12 mb-12 text-[11px] text-slate-500 leading-snug">
  <p>
    This calculator is general information only. It does not consider your
    personal objectives, financial situation, or needs. Speak to a qualified
    tax professional before implementing.
  </p>
</div>

      </>
  );
}
