// pages/calculators/account-based-pension.js
import { useMemo, useState, useEffect } from "react";
import Head from "next/head";
import Tooltip from "@/components/Tooltip";
import SectionCard from "@/components/SectionCard";
import PageIntro from "@/components/PageIntro";
import SubtleCtaLink from "@/components/SubtleCtaLink";
import SummaryGrid from "@/components/SummaryGrid";
import SummaryCard from "@/components/SummaryCard";
import ChartTooltip from "@/components/ChartTooltip";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
} from "recharts";

/** ─────────────────────────────────────────────────────────────────────
 * Account-Based Pension (ABP) – income-only chart (CPI-indexed if enabled)
 * If requested income < minimum in any year, the minimum is paid instead.
 * Assumptions:
 * - Minimum drawdown is on the opening balance each financial year.
 * - Earnings & fees via average-balance approximation:
 * earnings ≈ (opening − 0.5 × withdrawals) × return%
 * fees ≈ opening × fee%
 * - Payments are modeled as evenly spread through the year.
 * ──────────────────────────────────────────────────────────────────── */

// Currency formatter for display values
const aud0 = (n) =>
  (isFinite(n) ? n : 0).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });

// Currency formatter for Y-Axis ticks in charts (handles large numbers)
const currencyTickFormatter = (v) =>
  (isFinite(v) ? v : 0).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

// Legislated minimum drawdown rates (as at 1 July 2025)
const DRAW_RATES = [
  { label: "Under 65", range: "<65", rate: 0.04 },
  { label: "65–74", range: "65–74", rate: 0.05 },
  { label: "75–79", range: "75–79", rate: 0.06 },
  { label: "80–84", range: "80–84", rate: 0.07 },
  { label: "85–89", range: "85–89", rate: 0.09 },
  { label: "90–94", range: "90–94", rate: 0.11 },
  { label: "95+", range: "95+", rate: 0.14 },
];

function minDrawdownRate(age) {
  if (age < 65) return 0.04;
  if (age <= 74) return 0.05;
  if (age <= 79) return 0.06;
  if (age <= 84) return 0.07;
  if (age <= 89) return 0.09;
  if (age <= 94) return 0.11;
  // Age 95 and above
  return 0.14;
}

export default function AccountBasedPensionCalculator() {
  // — Inputs —
  const [openingBalance, setOpeningBalance] = useState(500000);
  const [age, setAge] = useState(67);
  const [returnPct, setReturnPct] = useState(6.0); // p.a. gross investment return
  const [feePct, setFeePct] = useState(0.7); // p.a. fees %
  const [years, setYears] = useState(25);

  // Requested annual pension (user’s target)
  const [requestedAnnual, setRequestedAnnual] = useState(35000);

  // CPI indexing for requested amount
  const [indexByInflation, setIndexByInflation] = useState(true);
  const [inflationPct, setInflationPct] = useState(2.5);

  // Mount guard to avoid zero-size charts on first SSR render / route transitions
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sim = useMemo(() => {
    // --- Data Sanitisation & Conversion ---
    const startBal = Math.max(0, Number(openingBalance) || 0);
    const startAge = Math.max(0, Math.floor(Number(age) || 0));
    const r = (Number(returnPct) || 0) / 100; // annual return rate
    const f = (Number(feePct) || 0) / 100; // annual fee rate
    const horizon = Math.max(0, Math.floor(Number(years) || 0));
    const req0 = Math.max(0, Number(requestedAnnual) || 0); // requested initial payment
    const cpi = (Number(inflationPct) || 0) / 100; // inflation rate

    // --- Simulation Functions ---
    // Earnings approximation based on average balance
    const earningsApprox = (opening, payment) =>
      Math.max(0, (opening - 0.5 * payment) * r);
    // Fees approximation based on opening balance
    const feesApprox = (opening) => opening * f;

    // --- Simulation Variables ---
    let currentBalance = startBal;
    const rows = [];
    const chartIncome = [];
    const chartBalance = [];

    let totalIncome = 0;
    let totalEarnings = 0;
    let totalFees = 0;

    // --- Simulation Loop ---
    for (let y = 0; y < horizon; y++) {
      const currentAge = startAge + y;
      const opening = currentBalance;

      if (opening <= 0) {
        // If balance is depleted, record zeros for the rest of the projection
        rows.push({
          year: y + 1,
          age: currentAge,
          minRate: minDrawdownRate(currentAge),
          opening: 0,
          minDrawdown: 0,
          requestedIndexed: indexByInflation
            ? Math.round(req0 * Math.pow(1 + cpi, y))
            : Math.round(req0),
          payment: 0,
          earnings: 0,
          fees: 0,
          closing: 0,
        });

        chartIncome.push({ age: currentAge, Income: 0 });
        chartBalance.push({ age: currentAge, Balance: 0 });
        continue;
      }

      const minRate = minDrawdownRate(currentAge);
      const minDrawdown = opening * minRate;

      // Requested amount, indexed if CPI is enabled
      const requestedIndexed = indexByInflation
        ? req0 * Math.pow(1 + cpi, y)
        : req0;

      // Payment is the MAX of the minimum or the requested amount
      let payment = Math.max(minDrawdown, requestedIndexed);
      let earnings = 0;
      let fees = 0;
      let closing = 0;

      // ✅ Depletion check (pragmatic simplification): 
      // If the required payment exceeds the balance, pay only the remainder.
      if (payment >= opening) {
        payment = opening;
        closing = 0;
        // If account is emptied, we assume no full-year earnings/fees apply
        earnings = 0; 
        fees = 0;
      } else {
        earnings = earningsApprox(opening, payment);
        fees = feesApprox(opening);
        closing = opening + earnings - fees - payment;
        // Safety check, should be redundant if logic is perfect, but good practice
        if (closing < 0) closing = 0; 
      }

      totalIncome += payment;
      totalEarnings += earnings;
      totalFees += fees;

      // --- Record Row Data ---
      rows.push({
        year: y + 1,
        age: currentAge,
        minRate,
        opening: Math.round(opening),
        minDrawdown: Math.round(minDrawdown),
        requestedIndexed: Math.round(requestedIndexed),
        payment: Math.round(payment),
        earnings: Math.round(earnings),
        fees: Math.round(fees),
        closing: Math.round(closing),
      });

      // --- Record Chart Data ---
      chartIncome.push({ age: currentAge, Income: Math.round(payment) });
      chartBalance.push({ age: currentAge, Balance: Math.round(closing) });

      currentBalance = closing;
    }

    // --- Summary Calculations ---
    const firstRate = minDrawdownRate(startAge);
    const firstMin = startBal * firstRate;
    const firstRequested = req0;
    const firstPaid = Math.min(startBal, Math.max(firstMin, firstRequested));

    // Find first year where the closing balance hits zero
    let depletionAge = null;
    for (const r of rows) {
      if (r.closing === 0) {
        depletionAge = r.age; // age in the year the balance first hits $0
        break;
      }
    }

    return {
      rows,
      chartIncome,
      chartBalance,
      totals: {
        totalIncome: Math.round(totalIncome),
        totalEarnings: Math.round(totalEarnings),
        totalFees: Math.round(totalFees),
        endingBalance: Math.round(currentBalance),
      },
      firstYear: {
        minRate: firstRate,
        minAmount: Math.round(firstMin),
        requested: Math.round(firstRequested),
        paid: Math.round(firstPaid),
      },
      depletionAge,
    };
  }, [openingBalance, age, returnPct, feePct, years, requestedAnnual, indexByInflation, inflationPct]);

  // Depletion note message generator
  const depletionNote = sim.depletionAge
    ? `Your pension is projected to last until you reach age ${sim.depletionAge}.`
    : `Your pension is projected to last beyond the projection period.`;

  // ——— SEO constants ———
  const pageTitle = "Account-Based Pension (ABP) Calculator (Australia)";
  const pageDescription =
    "Calculate your Account Based Pension income (with CPI indexing). See how long your super will last.";

  return (
    <main>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </Head>
      
      {/* Heading (matches Debt Recycling) */}
      <header className="max-w-5xl mx-auto px-4 pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">
          Account-Based Pension (ABP) Calculator
        </h1>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-4">
        {/* Blue intro card */}
        <PageIntro tone="blue">
          <div className="space-y-2">
            <p>
              Estimate your retirement income from an account-based pension using
              Australian minimum drawdown rules. See how CPI indexing, returns and
              fees affect both your <em>income</em> and <em>remaining balance</em> over time.
            </p>
            <p className="mt-2">
              If your chosen income is below the legislated minimum in any year,
              the minimum is paid instead.
            </p>
          </div>
        </PageIntro>

        {/* Optional explainer link (edit or remove if you don’t have this post yet) */}
        <SubtleCtaLink className="mt-3" href="/blog/how-to-use-an-account-based-pension-calculator">
          New to account-based pensions? Read the explainer →
        </SubtleCtaLink>

        {/* INPUTS – single card, grouped, 3-col grid */}
        <div className="mt-6">
          <SectionCard title="Your assumptions">
            <div className="space-y-6">
              {/* Opening + Age + Horizon */}
              <div>
                <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm mb-2">
                  Starting point
                  <Tooltip text="Your opening balance, current age and projection length." />
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
                  <label className="flex flex-col">
                    <span className="text-slate-600">Opening balance ($)</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      className="border rounded px-2 py-1"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(Number(e.target.value))}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600">Your age (years)</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      className="border rounded px-2 py-1"
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600">Projection length (years)</span>
                    <input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      className="border rounded px-2 py-1"
                      value={years}
                      onChange={(e) => setYears(Number(e.target.value))}
                    />
                  </label>
                </div>
              </div>

              {/* Returns & Fees */}
              <div>
                <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm mb-2">
                  Returns &amp; fees
                  <Tooltip text="Annual investment return (gross) and ongoing fees as a % of balance." />
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
                  <label className="flex flex-col">
                    <span className="text-slate-600">Investment return (% p.a.)</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      inputMode="decimal"
                      className="border rounded px-2 py-1"
                      value={returnPct}
                      onChange={(e) => setReturnPct(Number(e.target.value))}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600">Fees (% p.a.)</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      inputMode="decimal"
                      className="border rounded px-2 py-1"
                      value={feePct}
                      onChange={(e) => setFeePct(Number(e.target.value))}
                    />
                  </label>
                </div>
              </div>

              {/* Income settings */}
              <div>
                <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm mb-2">
                  Income settings
                  <Tooltip text="If your chosen amount is below the legal minimum in a year, the minimum will be paid instead." />
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
                  <label className="flex flex-col">
                    <span className="text-slate-600">Requested annual income ($)</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      className="border rounded px-2 py-1"
                      value={requestedAnnual}
                      onChange={(e) => setRequestedAnnual(Number(e.target.value))}
                    />
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={indexByInflation}
                      onChange={(e) => setIndexByInflation(e.target.checked)}
                    />
                    Index by inflation (CPI)
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="text-slate-600">Inflation (% p.a.)</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      inputMode="decimal"
                      className="border rounded px-2 py-1 w-24"
                      value={inflationPct}
                      onChange={(e) => setInflationPct(Number(e.target.value))}
                      disabled={!indexByInflation}
                    />
                  </label>
                </div>

                {/* Current year minimum helper strip */}
                <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                  <div>
                    <span className="font-medium">This year’s minimum:&nbsp;</span>
                    {(sim.firstYear.minRate * 100).toFixed(1)}% = {aud0(sim.firstYear.minAmount)}
                  </div>
                  <div className="text-[11px] text-blue-900/80 mt-1">
                    Minimum is calculated on the opening balance at the start of each financial year.
                  </div>
                </div>
              </div>

              {/* Legislated minimum rates table */}
              <div>
                <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm mb-2">
                  Legislated minimum drawdown rates
                </h3>
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-700 sm:grid-cols-7">
                  {DRAW_RATES.map((r) => (
                    <div key={r.range} className="rounded border bg-white px-2 py-1 text-center">
                      <div className="font-medium">{r.label}</div>
                      <div>{(r.rate * 100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* CHART – Income */}
        <div className="mt-8">
          <SectionCard title="Income projection">
            <p className="text-[11px] text-slate-600 leading-snug mb-4 max-w-3xl">
              Annual pension paid (indexed by CPI if enabled). If requested income is below the minimum in a year,
              the minimum is paid.
            </p>

            <div className="w-full h-64">
              {mounted && (
                <ResponsiveContainer>
                  <AreaChart data={sim.chartIncome}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" tick={{ fontSize: 10, fill: "#4b5563" }} />
                    <YAxis
                      tickFormatter={currencyTickFormatter} // Reusable formatter
                      tick={{ fontSize: 10, fill: "#4b5563" }}
                    />
                    <RTooltip
                      content={
                        <ChartTooltip
                          valueFormatter={aud0}
                          labelFormatter={(l) => `Age ${l}`}
                        />
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} iconSize={8} />
                    <Area
                      type="monotone"
                      dataKey="Income"
                      name="Annual income (paid)"
                      stroke="#1e3a8a"
                      fill="#bfdbfe"
                      fillOpacity={0.35}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>
        </div>

        {/* CHART – Balance */}
        <div className="mt-8">
          <SectionCard title="Account balance projection">
            <p className="text-[11px] text-slate-600 leading-snug mb-4 max-w-3xl">
              Estimated end-of-year balance after income, earnings and fees.
            </p>

            <div className="w-full h-64">
              {mounted && (
                <ResponsiveContainer>
                  <AreaChart data={sim.chartBalance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" tick={{ fontSize: 10, fill: "#4b5563" }} />
                    <YAxis
                      tickFormatter={currencyTickFormatter} // Reusable formatter
                      tick={{ fontSize: 10, fill: "#4b5563" }}
                    />
                    <RTooltip
                      content={
                        <ChartTooltip
                          valueFormatter={aud0}
                          labelFormatter={(l) => `Age ${l}`}
                        />
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} iconSize={8} />
                    <Area
                      type="monotone"
                      dataKey="Balance"
                      name="Balance"
                      stroke="#60a5fa"
                      fill="#dbeafe"
                      fillOpacity={0.5}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>
        </div>

        {/* RESULTS – summary cards */}
        <div className="mt-8">
          <SectionCard>
            <SummaryGrid>
              <SummaryCard label="Total income withdrawn" value={aud0(sim.totals.totalIncome)} />
              <SummaryCard label="Total earnings" value={aud0(sim.totals.totalEarnings)} />
              <SummaryCard
                label="Ending balance"
                value={aud0(sim.totals.endingBalance)}
              />
            </SummaryGrid>
            {/* Depletion message block */}
            <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-base font-medium text-center text-slate-700">
                {depletionNote}
              </p>
            </div>
          </SectionCard>
        </div>

        {/* TABLE – year by year */}
        <div className="mt-8">
          <SectionCard title="Year-by-year breakdown">
            <div className="overflow-x-auto">
              <table className="min-w-[900px] text-xs text-left">
                <thead className="text-slate-600 border-b text-[11px]">
                  <tr className="border-b align-top">
                    <th className="py-2 pr-4 font-medium">Year</th>
                    <th className="py-2 pr-4 font-medium">Age</th>
                    <th className="py-2 pr-4 font-medium">Opening</th>
                    <th className="py-2 pr-4 font-medium">Min %</th>
                    <th className="py-2 pr-4 font-medium">Minimum pmt</th>
                    <th className="py-2 pr-4 font-medium">Requested pmt</th>
                    <th className="py-2 pr-4 font-medium">Paid</th>
                    <th className="py-2 pr-4 font-medium">Earnings</th>
                    <th className="py-2 pr-4 font-medium">Fees</th>
                    <th className="py-2 pr-4 font-medium">Closing</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {sim.rows.map((r) => (
                    <tr key={r.year} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-4 font-medium text-slate-900 whitespace-nowrap">{r.year}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{r.age}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{aud0(r.opening)}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{(r.minRate * 100).toFixed(1)}%</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{aud0(r.minDrawdown)}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{aud0(r.requestedIndexed)}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{aud0(r.payment)}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{aud0(r.earnings)}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{aud0(r.fees)}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{aud0(r.closing)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* ASSUMPTIONS */}
        <div className="mt-8">
          <SectionCard title="Assumptions & references">
            <ul className="list-disc pl-5 space-y-3 text-sm text-slate-600">
              <li>If the requested amount is below the legislated minimum in any year, the minimum is paid instead.</li>
              <li>Minimum drawdown rates are based on the legislated rates effective 1 July 2025.</li>
              <li>Earnings & fees use an average-balance approximation.</li>
              <li>If the calculated payment in any year exceeds the opening balance, only the remaining balance is paid out and the closing balance is set to zero.</li>
            </ul>
          </SectionCard>
        </div>
      </div>

      {/* Footer disclaimer (house style) */}
      <div className="max-w-5xl mx-auto px-4 mt-12 mb-12 text-[11px] text-slate-500 leading-snug">
        <p>
          This calculator is general information only. It does not consider your personal objectives, financial situation,
          or needs.
        </p>
      </div>
    </main>
  );

}