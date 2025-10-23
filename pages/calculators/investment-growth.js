// pages/calculators/investment-growth.js
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

export default function InvestmentGrowth() {
  // ——— Inputs ———
  const [initial, setInitial] = useState(10000);
  const [contrib, setContrib] = useState(500);
  const [contribFreq, setContribFreq] = useState("monthly"); // monthly, fortnightly, weekly, annual
  const [years, setYears] = useState(20);
  const [returnPct, setReturnPct] = useState(7);   // % p.a.
  const [feePct, setFeePct] = useState(0.5);       // % p.a.

  // ——— Helpers ———
  const fmt = (n) =>
    n.toLocaleString("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    });

  const annualContrib = useMemo(() => {
    const v = Number(contrib) || 0;
    if (contribFreq === "weekly") return v * 52;
    if (contribFreq === "fortnightly") return v * 26;
    if (contribFreq === "monthly") return v * 12;
    return v; // annual
  }, [contrib, contribFreq]);

  // ——— Simulation (monthly compounding, contributions spread monthly) ———
  const sim = useMemo(() => {
    const months = (Number(years) || 0) * 12;
    const rYear = Math.max(0, (Number(returnPct) || 0) / 100);
    const fYear = Math.max(0, (Number(feePct) || 0) / 100);
    const rMonth = (rYear - fYear) / 12; // net of fees
    let bal = Number(initial) || 0;
    let totalContrib = bal;
    const rows = [];
    const contribPerMonth = annualContrib / 12;

    for (let m = 1; m <= months; m++) {
      bal = bal * (1 + rMonth);   // growth
      bal += contribPerMonth;     // contribution at month end
      totalContrib += contribPerMonth;

      if (m % 12 === 0 || m === months) {
        rows.push({
          year: m / 12,
          balance: Math.round(bal),
          contributed: Math.round(totalContrib),
          earnings: Math.round(bal - totalContrib),
        });
      }
    }
    return {
      finalBalance: Math.round(bal),
      totalContrib: Math.round(totalContrib),
      totalEarnings: Math.round(bal - totalContrib),
      rows,
    };
  }, [initial, annualContrib, years, returnPct, feePct]);

  // ——— Chart data ———
  const chartData = useMemo(
    () =>
      sim.rows.map((r) => ({
        year: r.year,
        Balance: r.balance,
        Contributed: r.contributed,
        Earnings: r.earnings,
      })),
    [sim.rows]
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const byKey = Object.fromEntries(payload.map((p) => [p.name, p.value]));
    return (
      <div className="rounded-lg border bg-white p-3 text-xs shadow-md">
        <div className="mb-1 font-semibold">Year {label}</div>
        <div className="space-y-0.5">
          <div>Balance: <span className="font-medium">{fmt(byKey.Balance || 0)}</span></div>
          <div>Contributed: <span className="font-medium">{fmt(byKey.Contributed || 0)}</span></div>
          <div>Earnings: <span className="font-medium">{fmt(byKey.Earnings || 0)}</span></div>
        </div>
      </div>
    );
  };

  // ——— SEO constants ———
  const pageUrl = "https://fintoolbox.com.au/calculators/investment-growth";
  const pageTitle = "Investment Growth Calculator (Compound Interest, Australia)";
  const pageDescription =
    "Project your investment balance with monthly compounding and regular contributions. Returns shown net of fees. Australia-focused assumptions.";

  // ——— FAQ content (kept in one source of truth to match JSON-LD) ———
  const faq = [
    {
      q: "What does the Investment Growth Calculator do?",
      a: "It projects how your investment balance grows over time with compound interest and regular contributions, showing final balance, total contributions, and earnings net of fees."
    },
    {
      q: "How does compounding affect my investment?",
      a: "Compounding means you earn returns on both your initial investment and the returns already earned, causing your balance to accelerate over time. The longer you invest, the stronger the effect."
    },
    {
      q: "Are the results adjusted for inflation?",
      a: "No. Results are shown in nominal terms unless you manually adjust the return rate for expected inflation. You can use a lower return rate to approximate real (after-inflation) growth."
    },
    {
      q: "Are fees and taxes included?",
      a: "You can specify annual fees in percentage terms, and the calculator deducts them from returns automatically. It does not include personal tax, which varies by individual circumstances."
    },
    {
      q: "Can I use this calculator for Australian superannuation?",
      a: "Yes. The calculator works for superannuation or any investment that compounds over time. Just enter your super balance, expected return, and regular contributions to see projections."
    },
  ];

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
              name: "Investment Growth Calculator (Compound Interest, Australia)",
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
                { "@type": "ListItem", position: 3, name: "Investment Growth" }
              ]
            }),
          }}
        />

        {/* JSON-LD: FAQPage (matches visible content below) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faq.map(({ q, a }) => ({
                "@type": "Question",
                name: q,
                acceptedAnswer: { "@type": "Answer", text: a },
              })),
            }),
          }}
        />
      </Head>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mt-3 text-3xl font-bold text-gray-900">
          Investment Growth Calculator (Compound Interest)
        </h1>
        <p className="mt-2 text-gray-600">
          Project your balance with monthly compounding and regular contributions. Return shown net of annual fees.
        </p>

        {/* ——— Inputs (Top) ——— */}
        <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Initial amount</label>
              <input
                type="number"
                min="0"
                value={initial}
                onChange={(e) => setInitial(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                inputMode="decimal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Regular contribution</label>
              <input
                type="number"
                min="0"
                value={contrib}
                onChange={(e) => setContrib(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                inputMode="decimal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contribution frequency</label>
              <select
                value={contribFreq}
                onChange={(e) => setContribFreq(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                <option value="monthly">Monthly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="weekly">Weekly</option>
                <option value="annual">Annual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Years</label>
              <input
                type="number"
                min="1"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Return (p.a. %)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={returnPct}
                onChange={(e) => setReturnPct(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                inputMode="decimal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Fees (p.a. %)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={feePct}
                onChange={(e) => setFeePct(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                inputMode="decimal"
              />
            </div>
          </div>

          {/* KPI row */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Final balance</div>
              <div className="mt-1 text-xl font-semibold">{fmt(sim.finalBalance)}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Total contributions</div>
              <div className="mt-1 text-xl font-semibold">{fmt(sim.totalContrib)}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Total earnings</div>
              <div className="mt-1 text-xl font-semibold">{fmt(sim.totalEarnings)}</div>
            </div>
          </div>
        </section>

        {/* ——— Chart (Middle) ——— */}
        <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Projection</h2>
          <p className="text-sm text-gray-600 mt-1">Yearly snapshot of balance, total contributed, and earnings.</p>

          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                <defs>
                  {/* Blue gradients */}
                  <linearGradient id="gBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e3a8a" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1e3a8a" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gContrib" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="gEarnings" x1="0" y1="0" x2="0" y2="1">
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
                  tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  width={56}
                />
                <RTooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 8 }} />

                <Area
                  name="Balance"
                  type="monotone"
                  dataKey="Balance"
                  stroke="#1e3a8a"
                  fill="url(#gBalance)"
                  strokeWidth={2}
                  isAnimationActive
                />
                <Area
                  name="Contributed"
                  type="monotone"
                  dataKey="Contributed"
                  stroke="#3b82f6"
                  fill="url(#gContrib)"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  isAnimationActive
                />
                <Area
                  name="Earnings"
                  type="monotone"
                  dataKey="Earnings"
                  stroke="#60a5fa"
                  fill="url(#gEarnings)"
                  strokeWidth={2}
                  strokeDasharray="2 3"
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ——— Table (Bottom) ——— */}
        <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-700 mb-2">Yearly projection</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1 pr-4">Year</th>
                  <th className="py-1 pr-4">Balance</th>
                  <th className="py-1 pr-4">Contributed</th>
                  <th className="py-1 pr-4">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {sim.rows.map((r) => (
                  <tr key={r.year} className="border-t">
                    <td className="py-1 pr-4">{r.year}</td>
                    <td className="py-1 pr-4">{fmt(r.balance)}</td>
                    <td className="py-1 pr-4">{fmt(r.contributed)}</td>
                    <td className="py-1 pr-4">{fmt(r.earnings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Assumes even contributions monthly and a constant net return (return − fees) compounded monthly.
          </p>
        </section>

        {/* ——— Visible FAQ (matches JSON-LD) ——— */}
        <section id="faq" className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">FAQs</h2>
          <div className="mt-3 divide-y">
            {faq.map(({ q, a }, i) => (
              <details key={i} className="py-3 group">
                <summary className="flex cursor-pointer list-none items-center justify-between">
                  <span className="font-medium text-gray-900">{q}</span>
                  <span className="ml-4 text-gray-400 transition-transform group-open:rotate-180">▾</span>
                </summary>
                <div className="mt-2 text-sm text-gray-700">{a}</div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
