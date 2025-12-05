// pages/calculators/mortgage.js
import { useMemo, useState } from "react";
import Head from "next/head";
import SEO from "@/components/SEO";
import CurrencyInput from "@/components/CurrencyInput";
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

// Fixed-rate level payment per period
function pmt(principal, annualRatePct, years, periodsPerYear) {
  const r = (annualRatePct / 100) / periodsPerYear;
  const n = years * periodsPerYear;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export default function MortgageCalculator() {
  // Inputs
  const [loanAmount, setLoanAmount] = useState(600000);
  const [interest, setInterest] = useState(6.5); // % p.a.
  const [termYears, setTermYears] = useState(30);
  const [frequency, setFrequency] = useState("monthly"); // monthly, fortnightly, weekly
  const [extra, setExtra] = useState(0); // extra repayment per chosen frequency

  // Table view toggle
  const [scheduleMode, setScheduleMode] = useState("annual"); // 'period' | 'annual'

  const periods =
    frequency === "weekly" ? 52 : frequency === "fortnightly" ? 26 : 12;
  const principal = Number(loanAmount) || 0;

  // Base scheduled repayment
  const baseRepayment = useMemo(
    () =>
      Math.round(
        pmt(
          principal,
          Number(interest) || 0,
          Number(termYears) || 0,
          periods
        )
      ),
    [principal, interest, termYears, periods]
  );

  // Core simulation (returns totals, schedule rows, yearly chart points)
  const simulate = (extraPerPeriod) => {
    const r = (Number(interest) || 0) / 100 / periods;
    let bal = principal;
    const base = baseRepayment;
    const payScheduled = Math.max(0, base + (Number(extraPerPeriod) || 0));

    if (bal <= 0)
      return {
        ok: true,
        periodsToZero: 0,
        totalInterest: 0,
        totalPaid: 0,
        rows: [],
        yearlyPoints: [],
      };

    if (payScheduled <= bal * r)
      return {
        ok: false,
        never: true,
        message:
          "Repayment is less than interest each period — loan will not amortise.",
        periodsToZero: Infinity,
        totalInterest: Infinity,
        totalPaid: Infinity,
        rows: [],
        yearlyPoints: [],
      };

    let totalInterest = 0;
    let totalPaid = 0;
    const rows = [];
    const yearlyPoints = [];
    let cumulativeInterest = 0;
    let k = 0;
    const maxSteps = termYears * periods * 2;

    while (bal > 0 && k < maxSteps) {
      const interestPortion = bal * r;
      const principalPortion = Math.min(payScheduled - interestPortion, bal);
      const payActual = Math.max(0, interestPortion + principalPortion);

      const minPaid = Math.min(base, payActual);
      const extraPaid = Math.max(0, payActual - minPaid);

      const endBal = Math.max(0, bal - principalPortion);

      totalInterest += interestPortion;
      totalPaid += payActual;
      cumulativeInterest += interestPortion;

      rows.push({
        period: k + 1,
        minPayment: Math.round(minPaid),
        extraPayment: Math.round(extraPaid),
        repayment: Math.round(payActual),
        interest: Math.round(interestPortion),
        principal: Math.round(principalPortion),
        balance: Math.round(endBal),
      });

      if ((k + 1) % periods === 0 || endBal === 0) {
        const year = Math.ceil((k + 1) / periods);
        yearlyPoints.push({
          year,
          Balance: Math.round(endBal),
          "Cumulative Interest": Math.round(cumulativeInterest),
        });
      }

      bal = endBal;
      k++;
    }

    return {
      ok: true,
      periodsToZero: k,
      totalInterest: Math.round(totalInterest),
      totalPaid: Math.round(totalPaid),
      rows,
      yearlyPoints,
    };
  };

  // Baseline (no extra) vs With extra
  const simBase = useMemo(
    () => simulate(0),
    [principal, interest, periods, termYears, baseRepayment]
  );
  const simExtra = useMemo(
    () => simulate(Number(extra) || 0),
    [principal, interest, periods, termYears, baseRepayment, extra]
  );

  // Payoff durations
  const payoff = (periodsToZero) => {
    if (!isFinite(periodsToZero)) return null;
    const yrs = periodsToZero / periods;
    return {
      years: Math.floor(yrs),
      months: Math.round((yrs - Math.floor(yrs)) * 12),
    };
  };
  const payoffBase = payoff(simBase.periodsToZero);
  const payoffWithExtra = payoff(simExtra.periodsToZero);

  // Savings
  const interestSaved =
    isFinite(simBase.totalInterest) && isFinite(simExtra.totalInterest)
      ? Math.max(0, simBase.totalInterest - simExtra.totalInterest)
      : null;
  const monthsSaved =
    isFinite(simBase.periodsToZero) && isFinite(simExtra.periodsToZero)
      ? Math.max(0, simBase.periodsToZero - simExtra.periodsToZero)
      : null;
  const timeSaved =
    monthsSaved != null
      ? {
          years: Math.floor(monthsSaved / periods),
          months: Math.round(((monthsSaved / periods) % 1) * 12),
        }
      : null;

  // Chart data merging both
  const chartData = useMemo(() => {
    const byYear = new Map();
    simBase.yearlyPoints.forEach((p) =>
      byYear.set(p.year, { year: p.year, BalanceBase: p.Balance })
    );
    simExtra.yearlyPoints.forEach((p) => {
      const prev = byYear.get(p.year) || { year: p.year };
      byYear.set(p.year, { ...prev, BalanceExtra: p.Balance });
    });
    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  }, [simBase.yearlyPoints, simExtra.yearlyPoints]);

  // Annualised schedule (with extra)
  const annualRows = useMemo(() => {
    const rows = simExtra.rows;
    if (!rows?.length) return [];
    const byYear = new Map();
    for (const r of rows) {
      const y = Math.ceil(r.period / periods);
      const agg = byYear.get(y) || {
        year: y,
        minPayment: 0,
        extraPayment: 0,
        repayment: 0,
        interest: 0,
        principal: 0,
        balance: r.balance,
      };
      agg.minPayment += r.minPayment;
      agg.extraPayment += r.extraPayment;
      agg.repayment += r.repayment;
      agg.interest += r.interest;
      agg.principal += r.principal;
      agg.balance = r.balance;
      byYear.set(y, agg);
    }
    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  }, [simExtra.rows, periods]);

  // Formatters
  const fmt = (n) =>
    isFinite(n)
      ? n.toLocaleString("en-AU", {
          style: "currency",
          currency: "AUD",
          maximumFractionDigits: 0,
        })
      : "N/A";

  // SEO constants for this page
  const pageUrl = "https://fintoolbox.com.au/calculators/mortgage";
  const pageTitle = "Mortgage Repayment Calculator (Australia)";
  const pageDescription =
    "Compare minimum vs extra repayments, see payoff time and interest, and view a full amortisation schedule. Australian mortgage calculator.";

  return (
    <main>
      {/* Site-wide heading bar */}
      <header className="max-w-5xl mx-auto px-4 pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">
          Mortgage Repayment Calculator
        </h1>
      </header>

      {/* Centralised SEO (kept) */}
      <SEO
        title={pageTitle}
        description={pageDescription}
        url={pageUrl}
        image="https://fintoolbox.com.au/og-default.png"
      />
      {/* Extra meta / JSON-LD that aren’t in SEO */}
      <Head>
        {/* JSON-LD: WebApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Mortgage Repayment Calculator (Australia)",
              url: pageUrl,
              description: pageDescription,
              applicationCategory: "FinanceApplication",
              operatingSystem: "All",
              isAccessibleForFree: true,
              inLanguage: "en-AU",
              offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
              publisher: {
                "@type": "Organization",
                name: "FinToolbox",
                url: "https://fintoolbox.com.au",
              },
            }),
          }}
        />
      </Head>

      <div className="max-w-5xl mx-auto px-4 mt-4">
        {/* Blue intro card */}
        <PageIntro tone="blue">
          <p>
            Compare your home loan under <strong>minimum repayments</strong> vs{" "}
            <strong>adding extra each period</strong>. See remaining balance,
            payoff time, total interest, and a full amortisation schedule.
          </p>
        </PageIntro>

        <SubtleCtaLink className="mt-3" href="/blog/mortgage-repayment-calculator-australia">
          Need help with calculating mortgage payments? Read the explainer →
        </SubtleCtaLink>

        {/* INPUTS – grouped like the house style */}
        <div className="mt-6">
          <SectionCard title="Loan details">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
              <label className="flex flex-col">
                <span className="text-slate-600">Loan amount ($)</span>
                <CurrencyInput
                  min="0"
                  className="w-full"
                  value={loanAmount}
                  onChange={setLoanAmount}
                />
              </label>

              <label className="flex flex-col">
                <span className="text-slate-600 flex items-center gap-2">
                  Interest rate (% p.a.)
                  <Tooltip text="Nominal annual interest rate. Assumes constant rate for the life of the loan." />
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="border rounded px-2 py-1"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                />
              </label>

              <label className="flex flex-col">
                <span className="text-slate-600">Term (years)</span>
                <input
                  type="number"
                  min="1"
                  className="border rounded px-2 py-1"
                  value={termYears}
                  onChange={(e) => setTermYears(e.target.value)}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700 mt-4">
              <label className="flex flex-col">
                <span className="text-slate-600">Repayment frequency</span>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  <option value="monthly">Monthly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>

              <label className="flex flex-col">
                <span className="text-slate-600">
                  Extra repayments ({frequency})
                </span>
                <input
                  type="number"
                  min="0"
                  className="border rounded px-2 py-1"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                />
              </label>
            </div>
          </SectionCard>
        </div>

        {/* KPI SUMMARY – house style */}
        <div className="mt-8">
          <SectionCard>
            <SummaryGrid>
              <SummaryCard
                label={`Minimum repayment (${frequency})`}
                value={fmt(baseRepayment)}
              />
              <SummaryCard
                label={`With extra (${frequency})`}
                value={fmt(baseRepayment + (Number(extra) || 0))}
              />
              <SummaryCard
                label="Payoff time (min only)"
                value={
                  payoffBase
                    ? `${payoffBase.years}y ${payoffBase.months}m`
                    : "N/A"
                }
              />
              <SummaryCard
                label="Payoff time (with extra)"
                value={
                  payoffWithExtra
                    ? `${payoffWithExtra.years}y ${payoffWithExtra.months}m`
                    : "N/A"
                }
              />
              <SummaryCard
                label="Total interest (min only)"
                value={fmt(simBase.totalInterest)}
              />
              <SummaryCard
                label="Total interest (with extra)"
                value={fmt(simExtra.totalInterest)}
              />
              <SummaryCard
                label="Interest saved with extra"
                value={
                  interestSaved != null ? fmt(interestSaved) : "—"
                }
              />
              <SummaryCard
                label="Time saved with extra"
                value={
                  timeSaved ? `${timeSaved.years}y ${timeSaved.months}m` : "—"
                }
              />
            </SummaryGrid>
          </SectionCard>
        </div>

        {/* CHART – balances by year */}
        <div className="mt-8">
          <SectionCard title="Balance projection">
            <p className="text-[11px] text-slate-600 leading-snug mb-4 max-w-3xl">
              Remaining balance at the end of each year under minimum repayments vs. with your extra amount.
            </p>

            <div className="w-full h-72">
              <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="gBase" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1e3a8a" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#1e3a8a" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gExtra" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>

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
                        maximumFractionDigits: 0,
                      })
                    }
                    tick={{ fontSize: 10, fill: "#4b5563" }}
                  />
                  <RTooltip
                    content={
                      <ChartTooltip
                        valueFormatter={(v) =>
                          (isFinite(v) ? v : 0).toLocaleString("en-AU", {
                            style: "currency",
                            currency: "AUD",
                            maximumFractionDigits: 0,
                          })
                        }
                        labelFormatter={(l) => `Year ${l}`}
                      />
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} iconSize={8} />
                  <Area
                    name="Balance (min only)"
                    type="monotone"
                    dataKey="BalanceBase"
                    stroke="#1e3a8a"
                    fill="url(#gBase)"
                    strokeWidth={2}
                  />
                  <Area
                    name="Balance (with extra)"
                    type="monotone"
                    dataKey="BalanceExtra"
                    stroke="#60a5fa"
                    fill="url(#gExtra)"
                    strokeWidth={2}
                    strokeDasharray="2 3"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* AMORTISATION TABLE */}
        <div className="mt-8">
          <SectionCard title="Amortisation schedule (with extra)">
            <div className="flex items-center justify-between mb-3">
              <div />
              <div className="inline-flex rounded-lg border bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setScheduleMode("period")}
                  className={`px-3 py-1 text-sm rounded-md ${
                    scheduleMode === "period"
                      ? "bg-gray-800 text-white"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Per period
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMode("annual")}
                  className={`px-3 py-1 text-sm rounded-md ${
                    scheduleMode === "annual"
                      ? "bg-gray-800 text-white"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Annual summary
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {scheduleMode === "period" ? (
                <table className="min-w-[900px] text-xs text-left">
                  <thead className="text-slate-600 border-b text-[11px]">
                    <tr className="border-b align-top">
                      <th className="py-2 pr-4 font-medium">Period</th>
                      <th className="py-2 pr-4 font-medium">Min repayment</th>
                      <th className="py-2 pr-4 font-medium">Extra repayment</th>
                      <th className="py-2 pr-4 font-medium">Total repayment</th>
                      <th className="py-2 pr-4 font-medium">Interest</th>
                      <th className="py-2 pr-4 font-medium">Principal</th>
                      <th className="py-2 pr-4 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-800">
                    {simExtra.rows.map((r) => (
                      <tr key={r.period} className="border-b last:border-0 align-top">
                        <td className="py-2 pr-4">{r.period}</td>
                        <td className="py-2 pr-4">{fmt(r.minPayment)}</td>
                        <td className="py-2 pr-4">{fmt(r.extraPayment)}</td>
                        <td className="py-2 pr-4">{fmt(r.repayment)}</td>
                        <td className="py-2 pr-4">{fmt(r.interest)}</td>
                        <td className="py-2 pr-4">{fmt(r.principal)}</td>
                        <td className="py-2 pr-4">{fmt(r.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-[900px] text-xs text-left">
                  <thead className="text-slate-600 border-b text-[11px]">
                    <tr className="border-b align-top">
                      <th className="py-2 pr-4 font-medium">Year</th>
                      <th className="py-2 pr-4 font-medium">Min repayment</th>
                      <th className="py-2 pr-4 font-medium">Extra repayment</th>
                      <th className="py-2 pr-4 font-medium">Total repayment</th>
                      <th className="py-2 pr-4 font-medium">Interest</th>
                      <th className="py-2 pr-4 font-medium">Principal</th>
                      <th className="py-2 pr-4 font-medium">Ending balance</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-800">
                    {annualRows.map((r) => (
                      <tr key={r.year} className="border-b last:border-0 align-top">
                        <td className="py-2 pr-4">{r.year}</td>
                        <td className="py-2 pr-4">{fmt(r.minPayment)}</td>
                        <td className="py-2 pr-4">{fmt(r.extraPayment)}</td>
                        <td className="py-2 pr-4">{fmt(r.repayment)}</td>
                        <td className="py-2 pr-4">{fmt(r.interest)}</td>
                        <td className="py-2 pr-4">{fmt(r.principal)}</td>
                        <td className="py-2 pr-4">{fmt(r.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <p className="mt-2 text-[11px] text-slate-600">
              Minimum = scheduled payment without extra; Extra = the additional amount you chose.
              Final period may be lower than the usual payment. Assumes constant rate/frequency.
            </p>
          </SectionCard>
        </div>

        {/* Footer disclaimer (house style) */}
        <div className="max-w-5xl mx-auto mt-12 mb-12 text-[11px] text-slate-500 leading-snug">
          <p>
            This calculator is general information only. It does not consider your personal objectives, financial situation,
            or needs. Consider speaking with a qualified professional.
          </p>
        </div>
      </div>
    </main>
  );
}
