// pages/calculators/mortgage.js
import { useMemo, useState } from "react";
import Head from "next/head";
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
  const [scheduleMode, setScheduleMode] = useState("period"); // 'period' | 'annual'

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

  const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  // Use dataKey so keys match your chartData fields (BalanceBase/BalanceExtra)
  const byKey = Object.fromEntries(
    payload.map((p) => [p.dataKey, p.value])
  );

  // nicer display when one series has already hit zero and drops out
  const show = (v) =>
    v == null ? "—" : v.toLocaleString("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    });

  return (
    <div className="rounded-lg border bg-white p-3 text-xs shadow-md">
      <div className="mb-1 font-semibold">Year {label}</div>
      <div>
        Balance (min pmt):{" "}
        <span className="font-medium">{show(byKey.BalanceBase)}</span>
      </div>
      <div>
        Balance (extra pmt):{" "}
        <span className="font-medium">{show(byKey.BalanceExtra)}</span>
      </div>
    </div>
  );
};


  // ——— SEO constants ———
  const pageUrl = "https://fintoolbox.com.au/calculators/mortgage";
  const pageTitle = "Mortgage Repayment Calculator (Australia)";
  const pageDescription =
    "Compare minimum vs extra repayments, see payoff time and interest, and view a full amortisation schedule. Australian mortgage calculator.";

  return (
    <main className="min-h-screen bg-gray-50">
      <Head>
        <title>{`${pageTitle} | FinToolbox`}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={pageUrl} />

        {/* Open Graph */}
        <meta property="og:title" content={`${pageTitle} | FinToolbox`} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://fintoolbox.com.au/og-default.png" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${pageTitle} | FinToolbox`} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content="https://fintoolbox.com.au/og-default.png" />

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
              publisher: { "@type": "Organization", name: "FinToolbox", url: "https://fintoolbox.com.au" }
            }),
          }}
        />

        {/* JSON-LD: Breadcrumbs */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://fintoolbox.com.au" },
                { "@type": "ListItem", position: 2, name: "Calculators", item: "https://fintoolbox.com.au/calculators" },
                { "@type": "ListItem", position: 3, name: "Mortgage" }
              ]
            }),
          }}
        />
      </Head>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mt-3 text-3xl font-bold text-gray-900">
          Mortgage Repayment Calculator
        </h1>
        <p className="mt-2 text-gray-600">
          Compare your loan with minimum repayments vs. adding extra each
          period. Calculate payoff time, interest, and a full amortisation schedule.
        </p>

        {/* Inputs */}
        <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Loan amount
              </label>
              <input
                type="number"
                min="0"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Interest rate (p.a. %)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Term (years)
              </label>
              <input
                type="number"
                min="1"
                value={termYears}
                onChange={(e) => setTermYears(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Repayment frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                <option value="monthly">Monthly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Extra repayments ({frequency})
              </label>
              <input
                type="number"
                min="0"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
              />
            </div>
          </div>

          {/* KPIs */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">
                Min repayments ({frequency})
              </div>
              <div className="mt-1 text-xl font-semibold">
                {fmt(baseRepayment)}
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">
                With extra repayments ({frequency})
              </div>
              <div className="mt-1 text-xl font-semibold">
                {fmt(baseRepayment + (Number(extra) || 0))}
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">
                Payoff time (with extra repayments)
              </div>
              <div className="mt-1 text-xl font-semibold">
                {payoffWithExtra
                  ? `${payoffWithExtra.years}y ${payoffWithExtra.months}m`
                  : "N/A"}
              </div>
            </div>
          </div>
        </section>

        {/* Chart */}
        <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Projection</h2>
          <p className="text-sm text-gray-600 mt-1">
            Remaining balance each year: minimum vs. with extra repayments.
          </p>

          {/* 👇 Added `min-w-0` so ResponsiveContainer always gets a positive width */}
          <div className="mt-4 h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 20, bottom: 0, left: -10 }}
              >
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
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                />
                <YAxis
                  tickFormatter={(v) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                  }
                  width={56}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                />
                <RTooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 8 }} />
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
        </section>

        {/* Totals & Savings */}
        <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Total interest (min repayments)</div>
              <div className="mt-1 text-xl font-semibold">
                {fmt(simBase.totalInterest)}
              </div>
              <div className="text-xs text-gray-500 mt-2">Payoff time</div>
              <div className="font-medium">
                {payoffBase
                  ? `${payoffBase.years}y ${payoffBase.months}m`
                  : "N/A"}
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Total interest (with extra repayments)</div>
              <div className="mt-1 text-xl font-semibold">
                {fmt(simExtra.totalInterest)}
              </div>
              <div className="text-xs text-gray-500 mt-2">Payoff time</div>
              <div className="font-medium">
                {payoffWithExtra
                  ? `${payoffWithExtra.years}y ${payoffWithExtra.months}m`
                  : "N/A"}
              </div>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <div className="text-xs text-blue-700">Savings with extra repayments</div>
              <div className="mt-1 text-xl font-semibold text-blue-900">
                {interestSaved != null ? `${fmt(interestSaved)} interest` : "—"}
              </div>
              <div className="text-sm text-blue-900 mt-1">
                {timeSaved
                  ? `${timeSaved.years}y ${timeSaved.months}m faster`
                  : "—"}
              </div>
            </div>
          </div>
        </section>

        {/* Amortisation Schedule */}
        <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-gray-700">
              Amortisation schedule (with extra)
            </div>
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
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-1 pr-4">Period</th>
                    <th className="py-1 pr-4">Min repayment</th>
                    <th className="py-1 pr-4">Extra repayment</th>
                    <th className="py-1 pr-4">Total repayment</th>
                    <th className="py-1 pr-4">Interest</th>
                    <th className="py-1 pr-4">Principal</th>
                    <th className="py-1 pr-4">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {simExtra.rows.map((r) => (
                    <tr key={r.period} className="border-t">
                      <td className="py-1 pr-4">{r.period}</td>
                      <td className="py-1 pr-4">{fmt(r.minPayment)}</td>
                      <td className="py-1 pr-4">{fmt(r.extraPayment)}</td>
                      <td className="py-1 pr-4">{fmt(r.repayment)}</td>
                      <td className="py-1 pr-4">{fmt(r.interest)}</td>
                      <td className="py-1 pr-4">{fmt(r.principal)}</td>
                      <td className="py-1 pr-4">{fmt(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-1 pr-4">Year</th>
                    <th className="py-1 pr-4">Min repayment</th>
                    <th className="py-1 pr-4">Extra repayment</th>
                    <th className="py-1 pr-4">Total repayment</th>
                    <th className="py-1 pr-4">Interest</th>
                    <th className="py-1 pr-4">Principal</th>
                    <th className="py-1 pr-4">Ending balance</th>
                  </tr>
                </thead>
                <tbody>
                  {annualRows.map((r) => (
                    <tr key={r.year} className="border-t">
                      <td className="py-1 pr-4">{r.year}</td>
                      <td className="py-1 pr-4">{fmt(r.minPayment)}</td>
                      <td className="py-1 pr-4">{fmt(r.extraPayment)}</td>
                      <td className="py-1 pr-4">{fmt(r.repayment)}</td>
                      <td className="py-1 pr-4">{fmt(r.interest)}</td>
                      <td className="py-1 pr-4">{fmt(r.principal)}</td>
                      <td className="py-1 pr-4">{fmt(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Minimum = scheduled payment without extra; Extra = additional amount
            you chose. Final period may be lower than the usual payment.
            Assumes constant rate/frequency.
          </p>
        </section>
      </div>
    </main>
  );
}
