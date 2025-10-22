// pages/calculators/account-based-pension.js
import { useMemo, useState } from "react";
import Head from "next/head";
import Tooltip from "../../components/Tooltip";
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
 *  - Minimum drawdown is on the opening balance each financial year.
 *  - Earnings & fees via average-balance approximation:
 *      earnings ≈ (opening − 0.5 × withdrawals) × return%
 *      fees ≈ opening × fee%
 *  - Payments are modeled as evenly spread through the year.
 * ──────────────────────────────────────────────────────────────────── */

// Currency fmt
const aud0 = (n) =>
  (isFinite(n) ? n : 0).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
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
  return 0.14;
}

export default function AccountBasedPensionCalculator() {
  // — Inputs —
  const [openingBalance, setOpeningBalance] = useState(500000);
  const [age, setAge] = useState(67);
  const [returnPct, setReturnPct] = useState(6.0); // p.a. gross investment return
  const [feePct, setFeePct] = useState(0.7);       // p.a. fees %
  const [years, setYears] = useState(25);

  // Requested annual pension (user’s target)
  const [requestedAnnual, setRequestedAnnual] = useState(35000);

  // CPI indexing for requested amount
  const [indexByInflation, setIndexByInflation] = useState(true);
  const [inflationPct, setInflationPct] = useState(2.5);

  const sim = useMemo(() => {
    const startBal = Math.max(0, Number(openingBalance) || 0);
    const startAge = Math.max(0, Math.floor(Number(age) || 0));
    const r = (Number(returnPct) || 0) / 100;
    const f = (Number(feePct) || 0) / 100;
    const horizon = Math.max(0, Math.floor(Number(years) || 0));
    const req0 = Math.max(0, Number(requestedAnnual) || 0);
    const cpi = (Number(inflationPct) || 0) / 100;

    const earningsApprox = (opening, payment) =>
      Math.max(0, (opening - 0.5 * payment) * r);
    const feesApprox = (opening) => opening * f;

    let bal = startBal;
    const rows = [];
    const chartIncome = [];
    const chartBalance = [];

    let totalIncome = 0;
    let totalEarnings = 0;
    let totalFees = 0;

    for (let y = 0; y < horizon; y++) {
      const currentAge = startAge + y;
      const opening = bal;

      if (opening <= 0) {
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

      const requestedIndexed = indexByInflation ? req0 * Math.pow(1 + cpi, y) : req0;
      const payment = Math.min(opening, Math.max(minDrawdown, requestedIndexed));

      const earnings = earningsApprox(opening, payment);
      const fees = feesApprox(opening);
      let closing = opening + earnings - fees - payment;
      if (closing < 0) closing = 0;

      totalIncome += payment;
      totalEarnings += earnings;
      totalFees += fees;

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

      chartIncome.push({ age: currentAge, Income: Math.round(payment) });
      chartBalance.push({ age: currentAge, Balance: Math.round(closing) });

      bal = closing;
    }

    // First-year info
    const firstRate = minDrawdownRate(startAge);
    const firstMin = startBal * firstRate;
    const firstRequested = req0;
    const firstPaid = Math.min(startBal, Math.max(firstMin, firstRequested));

    return {
      rows,
      chartIncome,
      chartBalance,
      totals: {
        totalIncome: Math.round(totalIncome),
        totalEarnings: Math.round(totalEarnings),
        totalFees: Math.round(totalFees),
        endingBalance: Math.round(bal),
      },
      firstYear: {
        minRate: firstRate,
        minAmount: Math.round(firstMin),
        requested: Math.round(firstRequested),
        paid: Math.round(firstPaid),
      },
    };
  }, [openingBalance, age, returnPct, feePct, years, requestedAnnual, indexByInflation, inflationPct]);

  const IncomeTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const v = payload[0]?.value ?? 0;
    return (
      <div className="rounded-lg border bg-white p-3 text-xs shadow-md">
        <div className="mb-1 font-semibold">Age {label}</div>
        <div>Income paid: <span className="font-semibold">{aud0(v)}</span></div>
      </div>
    );
  };

  const BalanceTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const v = payload[0]?.value ?? 0;
    return (
      <div className="rounded-lg border bg-white p-3 text-xs shadow-md">
        <div className="mb-1 font-semibold">Age {label}</div>
        <div>Balance: <span className="font-semibold">{aud0(v)}</span></div>
      </div>
    );
  };

  // ——— SEO constants ———
  const pageUrl = "https://fintoolbox.com.au/calculators/account-based-pension";
  const pageTitle = "Account-Based Pension (ABP) Calculator (Australia)";
  const pageDescription =
    "Calculate your Account Based Pension income (with CPI indexing). See how long your super will last.";

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
              name: "Account-Based Pension (ABP) Calculator",
              url: pageUrl,
              description: pageDescription,
              applicationCategory: "FinanceApplication",
              operatingSystem: "All",
              isAccessibleForFree: true,
              inLanguage: "en-AU",
              offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
              publisher: { "@type": "Organization", name: "FinToolbox", url: "https://fintoolbox.com.au" },
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
                { "@type": "ListItem", position: 3, name: "Account-Based Pension" },
              ],
            }),
          }}
        />
      </Head>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mt-3 text-3xl font-bold text-gray-900">Account-Based Pension (ABP) Calculator</h1>
        <p className="mt-2 text-gray-600">
          Use this calculator to work out how long your super will last in retirement. 
          Set the balance at commencement, your starting age, rate of return, and optionally increase payments by inflation.
        </p>

        {/* Inputs */}
        <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Opening balance ($)</label>
              <input
                type="number"
                min="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Your age (years)</label>
              <input
                type="number"
                min="0"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Investment return (p.a. %)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={returnPct}
                onChange={(e) => setReturnPct(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Fees (p.a. %)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={feePct}
                onChange={(e) => setFeePct(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2"
              />
            </div>

            {/* Legislated minimum rates table */}
            <div className="sm:col-span-2 rounded-lg bg-gray-50 p-3">
              <div className="text-sm font-medium text-gray-700">Legislated minimum drawdown rates</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-700 sm:grid-cols-7">
                {DRAW_RATES.map((r) => (
                  <div key={r.range} className="rounded border bg-white px-2 py-1 text-center">
                    <div className="font-medium">{r.label}</div>
                    <div>{(r.rate * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current minimum (this year) */}
            <div className="sm:col-span-2 rounded-lg bg-gray-50 p-3">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Current minimum (this year):</span>{" "}
                {(sim.firstYear.minRate * 100).toFixed(1)}% &nbsp;=&nbsp; {aud0(sim.firstYear.minAmount)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Based on your opening balance and age. Minimums update as your age increases each year.
              </div>
            </div>

            {/* Requested annual pension (compact) + Tooltip + CPI */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Annual pension amount ($)
                <Tooltip text="If your chosen amount is below the legal minimum for a year, the minimum will be paid instead." />
              </label>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  min="0"
                  value={requestedAnnual}
                  onChange={(e) => setRequestedAnnual(e.target.value)}
                  className="w-56 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={indexByInflation}
                    onChange={(e) => setIndexByInflation(e.target.checked)}
                  />
                  Index by inflation (CPI)
                </label>
                <div className="flex items-center gap-2 text-sm">
                  <span>Inflation (% p.a.)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={inflationPct}
                    onChange={(e) => setInflationPct(e.target.value)}
                    className="w-24 rounded-md border px-2 py-1 text-sm outline-none focus:ring-2"
                    disabled={!indexByInflation}
                  />
                </div>
              </div>
            </div>

            {/* Projection length (compact) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Projection length (years)</label>
              <input
                type="number"
                min="1"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className="mt-1 w-28 rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2"
              />
            </div>
          </div>

          {/* KPIs (compact) */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">First-year minimum rate</div>
              <div className="mt-1 text-lg font-semibold">
                {(sim.firstYear.minRate * 100).toFixed(1)}%
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">First-year minimum amount</div>
              <div className="mt-1 text-lg font-semibold">
                {aud0(sim.firstYear.minAmount)}
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">First-year income (paid)</div>
              <div className="mt-1 text-lg font-semibold">
                {aud0(sim.firstYear.paid)}
              </div>
            </div>
          </div>
        </section>

        {/* Chart – Income only */}
        <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Income projection</h2>
          <p className="text-sm text-gray-600 mt-1">
            Your annual pension (indexed by CPI if enabled). When below the minimum, the minimum is paid.
          </p>

          <div className="mt-4 h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sim.chartIncome} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e3a8a" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#1e3a8a" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="age" tickLine={false} axisLine={{ stroke: "#e5e7eb" }} tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis
                  tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
                  width={56}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                />
                <RTooltip content={<IncomeTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 8 }} />
                <Area
                  name="Annual income (paid)"
                  type="monotone"
                  dataKey="Income"
                  stroke="#1e3a8a"
                  fill="url(#gIncome)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* NEW Chart – Balance each year */}
        <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Account balance projection</h2>
          <p className="text-sm text-gray-600 mt-1">
            Estimated end-of-year balance after income, earnings and fees.
          </p>

          <div className="mt-4 h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sim.chartBalance} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="gBal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="age" tickLine={false} axisLine={{ stroke: "#e5e7eb" }} tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis
                  tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
                  width={56}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                />
                <RTooltip content={<BalanceTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 8 }} />
                <Area
                  name="Balance"
                  type="monotone"
                  dataKey="Balance"
                  stroke="#60a5fa"
                  fill="url(#gBal)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Results / totals */}
        <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Total income withdrawn</div>
              <div className="mt-1 text-xl font-semibold">{aud0(sim.totals.totalIncome)}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Total earnings</div>
              <div className="mt-1 text-xl font-semibold">{aud0(sim.totals.totalEarnings)}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Ending balance</div>
              <div className="mt-1 text-xl font-semibold">{aud0(sim.totals.endingBalance)}</div>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Earnings/fees use an average-balance approximation. Actual outcomes depend on timing, market performance, fees and rules.
          </p>
        </section>

        {/* Table */}
        <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-700 mb-2">Year-by-year breakdown</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1 pr-4">Year</th>
                  <th className="py-1 pr-4">Age</th>
                  <th className="py-1 pr-4">Opening</th>
                  <th className="py-1 pr-4">Min %</th>
                  <th className="py-1 pr-4">Minimum</th>
                  <th className="py-1 pr-4">Requested (indexed)</th>
                  <th className="py-1 pr-4">Paid</th>
                  <th className="py-1 pr-4">Earnings</th>
                  <th className="py-1 pr-4">Fees</th>
                  <th className="py-1 pr-4">Closing</th>
                </tr>
              </thead>
              <tbody>
                {sim.rows.map((r) => (
                  <tr key={r.year} className="border-t">
                    <td className="py-1 pr-4">{r.year}</td>
                    <td className="py-1 pr-4">{r.age}</td>
                    <td className="py-1 pr-4">{aud0(r.opening)}</td>
                    <td className="py-1 pr-4">{(r.minRate * 100).toFixed(1)}%</td>
                    <td className="py-1 pr-4">{aud0(r.minDrawdown)}</td>
                    <td className="py-1 pr-4">{aud0(r.requestedIndexed)}</td>
                    <td className="py-1 pr-4">{aud0(r.payment)}</td>
                    <td className="py-1 pr-4">{aud0(r.earnings)}</td>
                    <td className="py-1 pr-4">{aud0(r.fees)}</td>
                    <td className="py-1 pr-4">{aud0(r.closing)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Notes */}
        <section className="mt-6 rounded-2xl border bg-white p-5 text-sm text-gray-600 shadow-sm space-y-2">
          <p className="font-medium">Assumptions & notes</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>This chart shows your annual pension only (with optional CPI indexing).</li>
            <li>If your chosen amount is below the minimum for a year, the minimum is paid.</li>
            <li>Minimums are calculated on the opening balance at the start of each financial year, using standard rates.</li>
            <li>Earnings and fees are approximated using average balances; actual results vary.</li>
            <li>General information only; not financial advice.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
