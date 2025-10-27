// pages/calculators/debt-recycling.js

import { useState, useMemo } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import Tooltip from "../../components/Tooltip";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// -----------------
// Helper functions
// -----------------

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
    return principal / n;
  }
  const num = principal * r * Math.pow(1 + r, n);
  const den = Math.pow(1 + r, n) - 1;
  return den === 0 ? 0 : num / den;
}

// After-tax liquidation value of the portfolio if sold now
function afterTaxLiquidationValue(
  currentPortfolioValue,
  costBase,
  marginalTaxRatePct
) {
  const gain = currentPortfolioValue - costBase;
  if (gain <= 0) {
    return currentPortfolioValue;
  }
  const discountGain = gain * 0.5; // 50% CGT discount assumed
  const taxRate = marginalTaxRatePct / 100;
  const cgt = discountGain * taxRate;
  return currentPortfolioValue - cgt;
}

// Cashflow from investments after:
// - cash yield
// - franking credits (refundable)
// - deductible investment loan interest (negative gearing)
// This cash (after tax/refund) is assumed to be directed to the
// non-deductible home loan in the *following* year.
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
  // Example: $70 franked cash -> $100 assessable, $30 franking credit
  const grossedUpFrankedIncome =
    frankedPortion / (1 - frankingRate || 1);

  const frankingCredit =
    grossedUpFrankedIncome - frankedPortion;

  // Assessable investment income before interest deduction
  const assessableInvestmentIncome =
    unfrankedPortion + grossedUpFrankedIncome;

  // 2. Deductible interest (negative gearing)
  const deductibleInterest =
    avgInvestLoanBalanceForYear *
    (investLoanRatePct / 100);

  // 3. Net taxable investment result
  const taxableAfterInterest =
    assessableInvestmentIncome - deductibleInterest;

  // 4. Tax (or refund) at marginal tax rate (incl Medicare levy)
  const taxRate = marginalTaxRatePct / 100;
  const taxPayableOnNetIncome = taxableAfterInterest * taxRate;
  // can be negative => tax saving

  // 5. Apply franking credits (as refundable tax offset)
  const netTaxAfterFranking =
    taxPayableOnNetIncome - frankingCredit;
  // >0 means you owe tax
  // <0 means net refund / tax benefit

  // 6. Net household cash outcome from portfolio for this year
  // cash distributions
  // minus tax bill
  // plus any franking refund + negative gearing refund
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
  extraMonthlyRepayment,
  projectionYears,
  startingPortfolio,
  existingInvestLoan,
  investGrowthPct,
  investYieldPct,
  frankedPortionPct,
  marginalTaxRatePct,
}) {
  const totalMonths = projectionYears * 12;

  // --- Strategy B state ---
  let homeLoanBalB = homeLoanStart;
  let offsetBalB = offsetBalanceStart;
  let investLoanBalB = existingInvestLoan;
  let portfolioBalB = startingPortfolio;
  let portfolioCostBase = startingPortfolio + existingInvestLoan;

  // Kickstart: pull from offset, pay down home, redraw as invest debt, invest it
  {
    const usableKick = Math.min(
      kickstartFromOffset,
      offsetBalB,
      homeLoanBalB
    );
    if (usableKick > 0) {
      homeLoanBalB -= usableKick;
      offsetBalB -= usableKick;
      investLoanBalB += usableKick;
      portfolioBalB += usableKick;
      portfolioCostBase += usableKick;
    }
  }

  // --- Strategy A state ---
  // Strategy A does NOT invest borrowed money, and leaves offset alone
  let homeLoanBalA = homeLoanStart;
  let offsetBalA = offsetBalanceStart;

  let remainingTermMonths = remainingTermYearsStart * 12;

  // Track year start values for next-year redraw & sweep logic
  let yearStartHomeLoanBalB = homeLoanBalB;
  let yearStartPortfolioBalB = portfolioBalB;
  let yearStartInvestLoanBalB = investLoanBalB;

  // Monthly extra sweep from last year's investment income
  // (after franking + negative gearing tax effects)
  let currentYearIncomeSweepMonthly = 0;

  // -------------------------
  // FROZEN REQUIRED BASE REPAYMENTS
  // -------------------------
  // Strategy B: take total debt at Day 1 (after kickstart)
  // and compute a single P&I repayment over remaining term.
  // Freeze that for the projection.
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

  // Strategy A: same idea, but only the home loan
  const frozenRequiredBaseA =
    homeLoanStart > 0
      ? pmtPAndI(
          homeLoanStart,
          homeRatePct,
          remainingTermYearsStart
        )
      : 0;

  const yearsArr = [];

  // We'll show these in the UI
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

    // ---------------------------------
    // STRATEGY B repayments this month
    // ---------------------------------
    const effectiveBaseCashB = Math.max(
      baseMonthlyRepayment,
      frozenRequiredBaseB
    );
    thisYearUserBase = baseMonthlyRepayment;
    thisYearEffectiveBase = effectiveBaseCashB;

    // Work out how much each split "wants"
    const investOnlyPmtThisMonth =
      investLoanBalB > 0
        ? pmtPAndI(
            investLoanBalB,
            investLoanRatePct,
            remainingTermYearsNow
          )
        : 0;

    // Prioritise paying investment split first
    const payToInvestSplit = Math.min(
      effectiveBaseCashB,
      investOnlyPmtThisMonth
    );

    // Then leftover goes to home split
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

    // If effectiveBaseCashB is > what both splits would ask,
    // dump the surplus onto the home split as extra principal smash.
    if (effectiveBaseCashB > sumOfSplitWants) {
      payToHomeSplit +=
        effectiveBaseCashB - sumOfSplitWants;
    }

    // On top of that, we throw:
    // - your voluntary extraMonthlyRepayment
    // - this year's sweep from last year's investment income (after tax, franking, negative gearing)
    const totalHomeThisMonthB =
      payToHomeSplit +
      extraMonthlyRepayment +
      currentYearIncomeSweepMonthly;

    const totalInvestThisMonthB = payToInvestSplit;

    // Interest calc
    const homeMonthlyRate = (homeRatePct / 100) / 12;
    const investMonthlyRate =
      (investLoanRatePct / 100) / 12;

    // Home interest is charged on (homeLoanBalB - offsetBalB), floored at 0
    const effectiveHomeBalForInterestB = Math.max(
      0,
      homeLoanBalB - offsetBalB
    );
    const homeInterestB =
      effectiveHomeBalForInterestB * homeMonthlyRate;

    const investInterestB =
      investLoanBalB * investMonthlyRate;

    // Reduce principal on home split
    let principalReductionHome =
      totalHomeThisMonthB - homeInterestB;
    if (principalReductionHome < 0) principalReductionHome = 0;
    homeLoanBalB -= principalReductionHome;
    if (homeLoanBalB < 0) homeLoanBalB = 0;

    // Reduce principal on investment split
    let principalReductionInvest =
      totalInvestThisMonthB - investInterestB;
    if (principalReductionInvest < 0)
      principalReductionInvest = 0;
    investLoanBalB -= principalReductionInvest;
    if (investLoanBalB < 0) investLoanBalB = 0;

    // ---------------------------------
    // STRATEGY A repayments this month
    // ---------------------------------
    const effectiveBaseCashA = Math.max(
      baseMonthlyRepayment,
      frozenRequiredBaseA
    );
    const cashToHomeA =
      effectiveBaseCashA + extraMonthlyRepayment;

    const effectiveHomeBalForInterestA = Math.max(
      0,
      homeLoanBalA - offsetBalA
    );
    const homeInterestA =
      effectiveHomeBalForInterestA * homeMonthlyRate;

    let principalReductionA =
      cashToHomeA - homeInterestA;
    if (principalReductionA < 0) principalReductionA = 0;
    homeLoanBalA -= principalReductionA;
    if (homeLoanBalA < 0) homeLoanBalA = 0;

    // countdown term
    if (remainingTermMonths > 0) remainingTermMonths -= 1;

    // ---------------------------------
    // YEAR-END ROLLOVER (December)
    // ---------------------------------
    if (monthInYear === 11) {
      const thisYear = currentYearIdx + 1;

      // Snapshot end-of-year balances BEFORE next year's redraw
      const homeLoanBalB_endOfYear = homeLoanBalB;
      const investLoanBalB_endOfYear = investLoanBalB;

      // average deductible balance for tax calc (negative gearing)
      const avgInvestLoanBalanceForYear =
        (yearStartInvestLoanBalB +
          investLoanBalB_endOfYear) /
        2;

      // 1. Work out how much after-tax cash the portfolio produced this year
      // (cash yield - tax + franking refunds + negative gearing benefit)
      // That becomes next year's "income sweep" to home loan.
      const { afterTaxCashToHomeLoan } =
        calcAfterTaxIncomeSweep({
          portfolioStart: yearStartPortfolioBalB,
          yieldPct: investYieldPct,
          frankedPortionPct,
          marginalTaxRatePct,
          avgInvestLoanBalanceForYear,
          investLoanRatePct,
        });

      const nextYearIncomeSweepMonthly =
        afterTaxCashToHomeLoan / 12;

      // 2. Growth on the portfolio this year (no new redraw yet)
      let portfolioEndOfYearBeforeRedraw =
        yearStartPortfolioBalB *
        (1 + investGrowthPct / 100);

      // Property value now
const houseValYearEnd =
  homeValueStart *
  Math.pow(1 + homeValueGrowthPct / 100, thisYear);

// Strategy A net wealth:
// property + offset cash - remaining home loan
const netWealthA =
  houseValYearEnd +
  offsetBalA -
  homeLoanBalA;

// Strategy B net wealth:
// property + portfolio + remaining offset cash
// minus both loan balances
const netWealthB =
  houseValYearEnd +
  portfolioEndOfYearBeforeRedraw +
  offsetBalB -
  homeLoanBalB_endOfYear -
  investLoanBalB_endOfYear;


      // Wipeout test:
      const afterTaxPortfolioNow = afterTaxLiquidationValue(
        portfolioEndOfYearBeforeRedraw,
        portfolioCostBase,
        marginalTaxRatePct
      );
      const totalDebtNow =
        homeLoanBalB_endOfYear +
        investLoanBalB_endOfYear;
      const surplusIfLiquidated =
        afterTaxPortfolioNow - totalDebtNow;

      // Save row for table/chart
      // work out the effective "base" we forced this year
const effectiveBaseThisYear = Math.max(
  baseMonthlyRepayment,
  frozenRequiredBaseB
);

// this is the actual household cash going out the door each month
// (what you pay altogether), which is what we want to display:
const totalMonthlyOutflowUsed =
  effectiveBaseThisYear + extraMonthlyRepayment;

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

  // keep these if you still want to surface them in the UI above the form
  userBaseMonthlyRepayment: baseMonthlyRepayment,
  effectiveBaseMonthlyRepaymentUsed: effectiveBaseThisYear,

  // new field for the table
  totalMonthlyOutflowUsed,
});


      // 3. Apply redraw for NEXT year:
      // How much did non-deductible home loan actually fall this year?
      let redrawAmount =
        yearStartHomeLoanBalB -
        homeLoanBalB_endOfYear;
      if (redrawAmount < 0) redrawAmount = 0;

      if (redrawAmount > 0) {
        // increase deductible investment loan
        investLoanBalB += redrawAmount;

        // add that redraw into the portfolio for next year
        portfolioEndOfYearBeforeRedraw += redrawAmount;

        // increase CGT cost base (you've contributed more capital)
        portfolioCostBase += redrawAmount;
      }

      // roll forward for next year
      const portfolioOpeningNextYear =
        portfolioEndOfYearBeforeRedraw;
      currentYearIncomeSweepMonthly =
        nextYearIncomeSweepMonthly;
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
  const [kickstartFromOffset, setKickstartFromOffset] =
    useState(30000);
  const [remainingTermYearsStart, setRemainingTermYearsStart] =
    useState(25);
  const [homeRatePct, setHomeRatePct] = useState(5.99);
  const [investLoanRatePct, setInvestLoanRatePct] =
    useState(5.99);

  // Cashflow
  const [baseMonthlyRepayment, setBaseMonthlyRepayment] =
    useState(4000);
  const [extraMonthlyRepayment, setExtraMonthlyRepayment] =
    useState(0);

  // Investments
  const [existingInvestLoan, setExistingInvestLoan] =
    useState(0);
  const [startingPortfolio, setStartingPortfolio] =
    useState(0);
  const [investGrowthPct, setInvestGrowthPct] = useState(5);
  const [investYieldPct, setInvestYieldPct] = useState(3);
  const [frankedPortionPct, setFrankedPortionPct] =
    useState(30);

  // Tax + projection
  const [marginalTaxRatePct, setMarginalTaxRatePct] =
    useState(39); // incl Medicare levy
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
        extraMonthlyRepayment,
        projectionYears,
        startingPortfolio,
        existingInvestLoan,
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
      extraMonthlyRepayment,
      projectionYears,
      startingPortfolio,
      existingInvestLoan,
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

  // First year where "wipeout surplus" >= 0
  const wipeoutYear =
    results.yearsArr?.find(
      (r) => r.surplusIfLiquidated >= 0
    )?.year ?? null;

  return (
    <>
      <Head>
        <title>
          Debt Recycling Calculator (Australia) | FinToolbox
        </title>
        <meta
          name="description"
          content="Compare paying off your home loan vs recycling debt into investments. Models redraw timing, franking credits, negative gearing, CGT on exit, and 'wipeout year'."
        />
        <link
          rel="canonical"
          href="https://www.fintoolbox.com.au/calculators/debt-recycling"
        />
      </Head>

              {/* Intro */}
        <header className="max-w-3xl">
          <h1 className="text-2xl font-bold text-gray-900">
            Debt Recycling Calculator
          </h1>
          <p className="mt-2 text-gray-700 text-sm leading-relaxed">
            Model two strategies:
            <br />
            <span className="font-medium text-gray-900">
              Strategy A
            </span>
            : keep paying off your home loan and leave cash in
            offset.
            <br />
            <span className="font-medium text-gray-900">
              Strategy B
            </span>
            : pay down non-deductible debt, redraw it as
            deductible investment debt, invest it, and use all
            after-tax investment cashflow (including franking
            credits and negative gearing benefits) to attack the
            home loan.
          </p>
        </header>

        {/* INPUT CARD */}
        <section className="bg-white rounded-xl shadow p-4 space-y-6 mt-8 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">
            Your assumptions
          </h2>

          {/* Property & Home Loan */}
          <div>
            <h3 className="font-medium text-gray-800 flex items-center gap-2 text-sm mb-2">
              Property &amp; Home Loan
              <Tooltip text="Your current home value and mortgage position. We assume constant rates and treat home vs investment debt as separate splits." />
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <label className="flex flex-col">
                <span className="text-gray-600 flex items-center gap-1">
                  Home value ($)
                </span>
                <input
                  type="number"
                  className="border rounded px-2 py-1"
                  value={homeValueStart}
                  onChange={(e) =>
                    setHomeValueStart(Number(e.target.value))
                  }
                />
              </label>

              <label className="flex flex-col">
                <span className="text-gray-600 flex items-center gap-1">
                  Home value growth % p.a.
                  <Tooltip text="Expected long-run property growth per year." />
                </span>
                <input
                  type="number"
                  step="0.1"
                  className="border rounded px-2 py-1"
                  value={homeValueGrowthPct}
                  onChange={(e) =>
                    setHomeValueGrowthPct(Number(e.target.value))
                  }
                />
              </label>

              <label className="flex flex-col">
                <span className="text-gray-600 flex items-center gap-1">
                  Home loan balance ($)
                </span>
                <input
                  type="number"
                  className="border rounded px-2 py-1"
                  value={homeLoanStart}
                  onChange={(e) =>
                    setHomeLoanStart(Number(e.target.value))
                  }
                />
              </label>

              <label className="flex flex-col">
                <span className="text-gray-600 flex items-center gap-1">
                  Offset balance ($)
                  <Tooltip text="Cash in offset today. Strategy A leaves this alone. Strategy B may partially deploy it via 'Kickstart from offset'." />
                </span>
                <input
                  type="number"
                  className="border rounded px-2 py-1"
                  value={offsetBalanceStart}
                  onChange={(e) =>
                    setOffsetBalanceStart(Number(e.target.value))
                  }
                />
              </label>

              <label className="flex flex-col">
                <span className="text-gray-600 flex items-center gap-1">
                  Kickstart from offset ($)
                  <Tooltip text="We assume you move this from offset into the home loan, then immediately redraw it as a deductible investment split and invest it on day one. Strategy A does not invest this." />
                </span>
                <input
                  type="number"
                  className="border rounded px-2 py-1"
                  value={kickstartFromOffset}
                  onChange={(e) =>
                    setKickstartFromOffset(
                      Number(e.target.value)
                    )
                  }
                />
              </label>

              <label className="flex flex-col">
                <span className="text-gray-600 flex items-center gap-1">
                  Years remaining on home loan
                  <Tooltip text="How long until the loan would be gone on your current path. We use this to set the repayment floor and keep it flat." />
                </span>
                <input
                  type="number"
                  className="border rounded px-2 py-1"
                  value={remainingTermYearsStart}
                  onChange={(e) =>
                    setRemainingTermYearsStart(
                      Number(e.target.value)
                    )
                  }
                />
              </label>

              <label className="flex flex-col">
                <span className="text-gray-600">
                  Home loan rate % p.a.
                </span>
                <input
                  type="number"
                  step="0.01"
                  className="border rounded px-2 py-1"
                  value={homeRatePct}
                  onChange={(e) =>
                    setHomeRatePct(Number(e.target.value))
                  }
                />
              </label>

              <label className="flex flex-col">
                <span className="text-gray-600">
                  Investment loan rate % p.a.
                </span>
                <input
                  type="number"
                  step="0.01"
                  className="border rounded px-2 py-1"
                  value={investLoanRatePct}
                  onChange={(e) =>
                    setInvestLoanRatePct(Number(e.target.value))
                  }
                />
              </label>
            </div>
          </div>

          {/* Cashflow / Repayments */}
          <div>
            <h3 className="font-medium text-gray-800 flex items-center gap-2 text-sm mb-2">
              Cashflow / Repayments
              <Tooltip text="We assume your base repayment is your current monthly out-of-pocket mortgage spend. Instead of making you spend more, Strategy B gradually shifts that spend from non-deductible home debt to deductible investment debt." />
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <label className="flex flex-col">
                <span className="text-gray-600 flex items-center gap-1">
                  Base monthly repayment ($)
                  <Tooltip text="Your normal monthly mortgage payment today. We also calculate the minimum required to keep the combined home + investment splits on track. If you enter less than that minimum, we use the higher figure in the model." />
                </span>
                <input
                  type="number"
                  className="border rounded px-2 py-1"
                  value={baseMonthlyRepayment}
                  onChange={(e) =>
                    setBaseMonthlyRepayment(
                      Number(e.target.value)
                    )
                  }
                />

                {results.yearsArr?.length > 0 && (
                  <div className="text-[11px] text-gray-500 mt-1 leading-snug">
                    <div>
                      You entered:{" "}
                      <span className="font-medium text-gray-700">
                        {aud0(
                          results.yearsArr[
                            results.yearsArr.length - 1
                          ].userBaseMonthlyRepayment
                        )}
                        /mo
                      </span>
                    </div>
                    <div>
                      Minimum required to keep the total
                      loan on track:{" "}
                      <span className="font-medium text-gray-700">
                        {aud0(
                          results.yearsArr[
                            results.yearsArr.length - 1
                          ]
                            .effectiveBaseMonthlyRepaymentUsed
                        )}
                        /mo
                      </span>
                    </div>
                    <div>
                      We’ve used the higher figure in
                      projections.
                    </div>
                  </div>
                )}
              </label>

              <label className="flex flex-col">
                <span className="text-gray-600 flex items-center gap-1">
                  Extra monthly repayment ($)
                  <Tooltip text="Voluntary extra you throw at your loans each month. We send this to the non-deductible home split first." />
                </span>
                <input
                  type="number"
                  className="border rounded px-2 py-1"
                  value={extraMonthlyRepayment}
                  onChange={(e) =>
                    setExtraMonthlyRepayment(
                      Number(e.target.value)
                    )
                  }
                />
              </label>
            </div>
          </div>

          {/* Investment Assumptions */}
          <div>
            <h3 className="font-medium text-gray-800 flex items-center gap-2 text-sm mb-2">
              Investment Assumptions
              <Tooltip text="We split return into cash income (distributions/dividends) and capital growth. We model franking on the Australian share component and allow investment loan interest to create a negative gearing tax benefit." />
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <label className="flex flex-col">
                <span className="text-gray-600 flex items-center gap-1">
                  Existing investment loan ($)
                </span>
                <input
                  type="number"
                  className="border rounded px-2 py-1"
                  value={existingInvestLoan}
                  onChange={(e) =>
                    setExistingInvestLoan(
                      Number(e.target.value)
                    )
                  }
                />
              </label>

              <label className="flex flex-col">
                <span className="text-gray-600 flex items-center gap-1">
                  Starting portfolio ($)
                  <Tooltip text="Existing invested assets you're counting in this strategy (added to cost base for CGT)." />
                </span>
                <input
                  type="number"
                  className="border rounded px-2 py-1"
                  value={startingPortfolio}
                  onChange={(e) =>
                    setStartingPortfolio(
                      Number(e.target.value)
                    )
                  }
                />
              </label>

              <label className="flex flex-col">
                <span className="text-gray-600">
                  Capital growth % p.a.
                </span>
                <input
                  type="number"
                  step="0.1"
                  className="border rounded px-2 py-1"
                  value={investGrowthPct}
                  onChange={(e) =>
                    setInvestGrowthPct(
                      Number(e.target.value)
                    )
                  }
                />
              </label>

              <label className="flex flex-col">
                <span className="text-gray-600">
                  Cash yield % p.a.
                </span>
                <input
                  type="number"
                  step="0.1"
                  className="border rounded px-2 py-1"
                  value={investYieldPct}
                  onChange={(e) =>
                    setInvestYieldPct(
                      Number(e.target.value)
                    )
                  }
                />
              </label>

              <label className="flex flex-col">
                <span className="text-gray-600">
                  % of yield that is franked
                </span>
                <input
                  type="number"
                  step="1"
                  className="border rounded px-2 py-1"
                  value={frankedPortionPct}
                  onChange={(e) =>
                    setFrankedPortionPct(
                      Number(e.target.value)
                    )
                  }
                />
              </label>
            </div>
          </div>

          {/* Tax & Projection */}
          <div>
            <h3 className="font-medium text-gray-800 flex items-center gap-2 text-sm mb-2">
              Tax &amp; Projection Settings
              <Tooltip text={`Your marginal tax rate (including Medicare levy) is used to:
• tax franked + unfranked income
• apply franking credit refunds
• model negative gearing (deductible investment interest creating a tax saving)
• model CGT if you sold (50% discount).`} />
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <label className="flex flex-col">
                <span className="text-gray-600">
                  Marginal tax rate %
                </span>
                <input
                  type="number"
                  className="border rounded px-2 py-1"
                  value={marginalTaxRatePct}
                  onChange={(e) =>
                    setMarginalTaxRatePct(
                      Number(e.target.value)
                    )
                  }
                />
              </label>

              <label className="flex flex-col">
                <span className="text-gray-600">
                  Projection length (years)
                </span>
                <input
                  type="number"
                  className="border rounded px-2 py-1"
                  value={projectionYears}
                  onChange={(e) =>
                    setProjectionYears(
                      Number(e.target.value)
                    )
                  }
                />
              </label>
            </div>
          </div>
        </section>

        {/* CHART CARD */}
        <section className="rounded-xl border bg-white p-4 shadow mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Net Wealth Over Time
          </h2>

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

    {/* Tooltip + Legend */}
    <RTooltip
      contentStyle={{
        fontSize: "11px",       // ✅ smaller hover box text
        padding: "6px 8px",
      }}
      itemStyle={{
        fontSize: "11px",       // ✅ smaller each line item
      }}
      labelStyle={{
        fontSize: "11px",       // ✅ smaller year label
        fontWeight: 500,
      }}
      formatter={(value) =>
        (isFinite(value) ? value : 0).toLocaleString("en-AU", {
          style: "currency",
          currency: "AUD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
      }
    />

    <Legend
      wrapperStyle={{
        fontSize: "11px",       // ✅ smaller legend text
        paddingTop: "4px",
      }}
      iconSize={8}              // ✅ smaller line icons
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
        </section>

        {/* SUMMARY CARD */}
        <section className="rounded-xl border bg-white p-4 shadow text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div>
            <div className="text-xs text-gray-500">
              Final net wealth
              <br />
              (Strategy A)
            </div>
            <div className="text-base font-semibold text-gray-900">
              {results.yearsArr?.length
                ? aud0(
                    results.yearsArr[
                      results.yearsArr.length - 1
                    ].netWealthA
                  )
                : "—"}
            </div>
          </div>

          <div>
            {/* Final net wealth Strategy B */}
<div>
  <div className="text-xs text-gray-500">
    Final net wealth
    <br />
    (Strategy B)
  </div>

  {/* Strategy B value */}
  <div className="text-base font-semibold text-gray-900">
    {results.yearsArr?.length
      ? aud0(
          results.yearsArr[
            results.yearsArr.length - 1
          ].netWealthB
        )
      : "—"}
  </div>

  {/* Difference line */}
  {results.yearsArr?.length > 0 && (
    <div className="text-[11px] text-gray-500 mt-1">
      vs A:&nbsp;
      <span
        className={
          results.yearsArr[
            results.yearsArr.length - 1
          ].netWealthB -
            results.yearsArr[
              results.yearsArr.length - 1
            ].netWealthA >
          0
            ? "text-green-600 font-medium"
            : "text-red-600 font-medium"
        }
      >
        {(() => {
          const diff =
            results.yearsArr[
              results.yearsArr.length - 1
            ].netWealthB -
            results.yearsArr[
              results.yearsArr.length - 1
            ].netWealthA;
          return `${diff >= 0 ? "+" : ""}${aud0(diff)}`;
        })()}
      </span>
    </div>
  )}
</div>

          </div>

          <div>
            <div className="text-xs text-gray-500">
              Year you could clear
              <br />
              all debt*
            </div>
            <div className="text-base font-semibold text-gray-900">
              {wipeoutYear
                ? `Year ${wipeoutYear}`
                : "Not within projection"}
            </div>
          </div>
        </section>

        <p className="text-[11px] text-gray-500 leading-snug max-w-3xl mt-2">
          *“Clear all debt” means: if you sold the portfolio in that
          year, paid capital gains tax (with a 50% CGT discount on
          gains) at your marginal tax rate, then used the after-tax
          proceeds to pay off both the home loan and the investment
          loan — would the leftover cash be positive?
        </p>

        {/* COMPARISON TABLE */}
        <section className="mt-10 space-y-6">
          <div className="bg-white rounded-xl shadow p-4 overflow-x-auto border">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Year-by-Year Comparison
            </h2>
            <p className="text-xs text-gray-600 mb-4 max-w-3xl">
  “Total monthly repayment ($/mo)” is what we assume you actually
  pay out of pocket each month. We take your base repayment, make
  sure it’s not below the lender’s required minimum for the combined
  loan, then add any extra monthly repayment you entered. We keep
  that household cashflow broadly flat through the strategy so
  you’re not ‘spending more’, just redirecting.
</p>


            <table className="min-w-[900px] text-xs text-left">
              <thead className="text-gray-600 border-b text-[11px]">
                <tr className="border-b align-top">
                  <th className="py-2 pr-4 font-medium">
                    Year
                  </th>

                  <th className="py-2 pr-4 font-medium">
  Total monthly repayment ($/mo)
  <div className="text-[10px] text-gray-500 font-normal">
    Your base + extra (but never less than lender minimum)
  </div>
</th>


                  <th className="py-2 pr-4 font-medium">
                    Home loan (A)
                    <div className="text-[10px] text-gray-500 font-normal">
                      Non-deductible
                    </div>
                  </th>

                  <th className="py-2 pr-4 font-medium">
                    Net wealth (A)
                    <div className="text-[10px] text-gray-500 font-normal">
                      House + offset − loan
                    </div>
                  </th>

                  <th className="py-2 pr-4 font-medium">
                    Home loan (B)
                    <div className="text-[10px] text-gray-500 font-normal">
                      Non-deductible
                    </div>
                  </th>

                  <th className="py-2 pr-4 font-medium">
                    Investment loan (B)
                    <div className="text-[10px] text-gray-500 font-normal">
                      Deductible
                    </div>
                  </th>

                  <th className="py-2 pr-4 font-medium">
                    Portfolio value (B)
                    <div className="text-[10px] text-gray-500 font-normal">
                      Gearing + growth
                    </div>
                  </th>

                  <th className="py-2 pr-4 font-medium">
                    Net wealth (B)
                    <div className="text-[10px] text-gray-500 font-normal">
                      House + portfolio + offset − all debt
                    </div>
                  </th>

                  <th className="py-2 pr-4 font-medium">
                    Wipeout surplus?
                    <div className="text-[10px] text-gray-500 font-normal">
                      If you sold, after tax, could you clear all
                      debt?
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-800">
                {results.yearsArr?.map((row) => (
                  <tr
                    key={row.year}
                    className="border-b last:border-0 align-top"
                  >
                    <td className="py-2 pr-4 font-medium text-gray-900 whitespace-nowrap">
                      {row.year}
                    </td>

                    <td className="py-2 pr-4 whitespace-nowrap">
  {aud0(row.totalMonthlyOutflowUsed)}
  <span className="text-[10px] text-gray-500 ml-1">/mo</span>
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
        </section>

        {/* ASSUMPTIONS & REFERENCES */}
        <div className="mt-10 rounded-2xl border bg-white p-5 text-sm text-gray-600 shadow-sm space-y-2">
          <p className="font-medium">Assumptions &amp; references</p>

          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="text-gray-800 font-medium">
                Strategy A
              </span>
              : You do not implement debt recycling. You keep paying
              your mortgage (plus any extra repayments you enter).
              Your offset account balance stays in offset, reducing
              interest on the home loan. You do not invest borrowed
              money.
              <br />
              <span className="text-gray-800 font-medium">
                Strategy B
              </span>
              : You pay down your non-deductible home loan and then
              redraw that principal as a separate investment loan
              (deductible debt) and invest it. After-tax investment
              cashflow (including franking and negative gearing
              benefits) is redirected into the home loan in future
              years.
            </li>

            <li>
              <span className="text-gray-800 font-medium">
                Kickstart / offset cash:
              </span>{" "}
              “Kickstart from offset ($)” is the cash you’re willing
              to deploy on day one. In Strategy B we assume:
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>
                  You take that amount from offset and pay it into
                  the home loan, shrinking non-deductible debt.
                </li>
                <li>
                  You immediately redraw the same amount as
                  investment debt (deductible) and invest it.
                </li>
              </ul>
              Strategy A leaves that cash in offset instead (more
              liquidity, less gearing).
            </li>

            <li>
              <span className="text-gray-800 font-medium">
                Repayment floor / cashflow:
              </span>{" "}
              “Base monthly repayment ($)” is what you say you pay
              each month today. We also calculate a single P&amp;I
              repayment on the{" "}
              <span className="font-medium text-gray-800">
                combined debt
              </span>{" "}
              (home + investment splits) over the remaining term you
              entered. That figure is frozen at the start and shown
              as{" "}
              <span className="font-medium text-gray-800">
                Base repayment used
              </span>
              . If you typed a lower number, we still model the
              higher number. We assume you keep making at least that
              payment every month, rather than increasing your
              lifestyle cost.
            </li>

            <li>
              <span className="text-gray-800 font-medium">
                How repayments are allocated:
              </span>{" "}
              We treat the home loan and investment loan like two
              splits under one facility:
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>
                  The total “Base repayment used” is treated as
                  broadly flat instead of stepping up each year.
                </li>
                <li>
                  That repayment is first allocated to the
                  investment split (deductible debt), then whatever
                  remains services the home loan split (non-deductible
                  debt).
                </li>
                <li>
                  Your “Extra monthly repayment ($)” plus the next
                  year’s sweep from investments is then thrown at
                  the non-deductible home loan split.
                </li>
              </ul>
              The goal is to convert bad debt into deductible debt
              without forcing you to spend more each month.
            </li>

            <li>
              <span className="text-gray-800 font-medium">
                Timing of redraws:
              </span>{" "}
              We model debt recycling annually. At the end of each
              model year we check how much the non-deductible home
              loan actually fell. At the{" "}
              <span className="font-medium text-gray-800">
                start of the next year
              </span>{" "}
              we assume you redraw that amount as new deductible
              investment debt and invest it. We do not count that
              redraw in the previous year’s closing balances; it
              appears in the next year’s opening position.
            </li>

            <li>
              <span className="text-gray-800 font-medium">
                Investment returns:
              </span>{" "}
              We split total return into:
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>
                  <span className="font-medium text-gray-800">
                    Cash yield % p.a.
                  </span>{" "}
                  (distributions/dividends actually paid to you),
                </li>
                <li>
                  <span className="font-medium text-gray-800">
                    Capital growth % p.a.
                  </span>{" "}
                  (price growth).
                </li>
              </ul>
              We assume ~40% Australian shares / ~60% international.
              Only Australian dividends are franked. We gross up
              franked income using 30% company tax and treat
              franking credits as refundable.
            </li>

            <li>
              <span className="text-gray-800 font-medium">
                After-tax cashflow sweep:
              </span>{" "}
              Each model year we:
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>
                  Calculate cash distributions on the portfolio
                  based on its balance at the start of that year.
                </li>
                <li>
                  Add franking credits (imputation credits) on the
                  Australian portion and gross that up as assessable
                  income.
                </li>
                <li>
                  Subtract the year’s investment loan interest as a{" "}
                  <span className="font-medium text-gray-800">
                    tax-deductible expense
                  </span>{" "}
                  (negative gearing). If interest exceeds income,
                  that creates a tax loss (a tax saving).
                </li>
                <li>
                  Apply your marginal tax rate (including Medicare
                  levy). The result can be a refund.
                </li>
                <li>
                  Final cash = distributions minus any tax payable
                  plus any franking refund plus any negative gearing
                  tax benefit.
                </li>
              </ul>
              We assume you are disciplined and direct{" "}
              <span className="font-medium text-gray-800">
                100% of that after-tax cash
              </span>{" "}
              to reduce the non-deductible home loan split over the{" "}
              <span className="font-medium text-gray-800">
                following 12 months
              </span>
              . We assume you do not spend it.
            </li>

            <li>
              <span className="text-gray-800 font-medium">
                “Wipeout surplus?”:
              </span>{" "}
              For each year we ask: if you sold the entire portfolio
              at that year-end value, paid CGT (with a 50% discount)
              at your marginal tax rate (incl Medicare levy), then
              paid off both the home loan and the investment loan,
              would you have money left? We maintain a running cost
              base that increases every time you gear in new money
              (kickstart + redraws).
            </li>

            <li>
              <span className="text-gray-800 font-medium">
                Interest rates:
              </span>{" "}
              We assume both the home loan rate and the investment
              loan rate remain constant for the full projection.
              Both are modelled as principal &amp; interest, not
              interest-only.
            </li>

            <li>
              <span className="text-gray-800 font-medium">
                Exclusions:
              </span>{" "}
              We do not model lender servicing rules, LVR caps,
              refinance costs, offset changes over time, changes in
              your income/living costs, market volatility, market
              crashes, tax timing differences, or behavioural drift.
              We also assume you always tip tax refunds / franking
              refunds / negative gearing benefits into the home loan.
            </li>

            <li>
              General information only. This is not personal tax,
              credit, or financial advice.
            </li>
          </ul>
        </div>

        {/* FOOTNOTE DISCLAIMER */}
        <section className="mt-6 text-[11px] text-gray-500 leading-snug max-w-3xl">
          This calculator is a simplified projection tool. Real debt
          recycling involves lender structuring, tax advice, and
          discipline in consistently directing surplus cash to your
          home loan. Speak to a qualified professional before
          implementing.
        </section>
    
    </>
  );
}
