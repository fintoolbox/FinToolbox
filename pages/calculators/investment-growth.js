// pages/calculators/investment-growth.js
import { useMemo, useState } from "react";
import Head from "next/head";
import Tooltip from "@/components/Tooltip";
import SectionCard from "@/components/SectionCard";
import PageIntro from "@/components/PageIntro";
import SubtleCtaLink from "@/components/SubtleCtaLink";
import SummaryGrid from "@/components/SummaryGrid";
import SummaryCard from "@/components/SummaryCard";

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
    (isFinite(n) ? n : 0).toLocaleString("en-AU", {
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
          <div>Balance: <span className="font-semibold">{fmt(byKey.Balance || 0)}</span></div>
          <div>Contributed: <span className="font-semibold">{fmt(byKey.Contributed || 0)}</span></div>
          <div>Earnings: <span className="font-semibold">{fmt(byKey.Earnings || 0)}</span></div>
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
    <main>
      {/* Site-wide heading bar */}
      <header className="max-w-5xl mx-auto px-4 pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">
          Investment Growth Calculator (Compound Interest)
        </h1>
      </header>

      {/* Head / SEO */}
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

      <div className="max-w-5xl mx-auto px-4 mt-4">
        {/* Intro card */}
        <PageIntro tone="blue">
          <p>
            Project your balance with <strong>monthly compounding</strong> and <strong>regular contributions</strong>.
            Returns are shown net of annual fees.
          </p>
        </PageIntro>

        <SubtleCtaLink className="mt-3" href="/blog/compound-interest-explained">
          New to compounding? Read the explainer →
        </SubtleCtaLink>

        {/* INPUTS */}
        <div className="mt-6">
          <SectionCard title="Your assumptions">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
              <label className="flex flex-col">
                <span className="text-slate-600">Initial amount ($)</span>
                <input
                  type="number"
                  min="0"
                  className="border rounded px-2 py-1"
                  value={initial}
                  onChange={(e) => setInitial(e.target.value)}
                  inputMode="decimal"
                />
              </label>

              <label className="flex flex-col">
                <span className="text-slate-600 flex items-center gap-2">
                  Regular contribution ($)
                  <Tooltip text="Amount you add regularly at the end of each period." />
                </span>
                <input
                  type="number"
                  min="0"
                  className="border rounded px-2 py-1"
                  value={contrib}
                  onChange={(e) => setContrib(e.target.value)}
                  inputMode="decimal"
                />
              </label>

              <label className="flex flex-col">
                <span className="text-slate-600">Contribution frequency</span>
                <select
                  value={contribFreq}
                  onChange={(e) => setContribFreq(e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  <option value="monthly">Monthly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="weekly">Weekly</option>
                  <option value="annual">Annual</option>
                </select>
              </label>

              <label className="flex flex-col">
                <span className="text-slate-600">Years</span>
                <input
                  type="number"
                  min="1"
                  className="border rounded px-2 py-1"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  inputMode="numeric"
                />
              </label>

              <label className="flex flex-col">
                <span className="text-slate-600 flex items-center gap-2">
                  Return (% p.a.)
                  <Tooltip text="Nominal annual return assumption before fees." />
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="border rounded px-2 py-1"
                  value={returnPct}
                  onChange={(e) => setReturnPct(e.target.value)}
                  inputMode="decimal"
                />
              </label>

              <label className="flex flex-col">
                <span className="text-slate-600 flex items-center gap-2">
                  Fees (% p.a.)
                  <Tooltip text="Annual fee as a % of balance. The calculator subtracts fees from returns." />
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="border rounded px-2 py-1"
                  value={feePct}
                  onChange={(e) => setFeePct(e.target.value)}
                  inputMode="decimal"
                />
              </label>
            </div>
          </SectionCard>
        </div>

        {/* KPI SUMMARY */}
        <div className="mt-8">
          <SectionCard>
            <SummaryGrid>
              <SummaryCard label="Final balance" value={fmt(sim.finalBalance)} />
              <SummaryCard label="Total contributions" value={fmt(sim.totalContrib)} />
              <SummaryCard label="Total earnings" value={fmt(sim.totalEarnings)} />
            </SummaryGrid>
          </SectionCard>
        </div>

        {/* CHART */}
        <div className="mt-8">
          <SectionCard title="Projection">
            <p className="text-[11px] text-slate-600 leading-snug mb-4 max-w-3xl">
              Yearly snapshot of total balance, amount contributed, and earnings.
            </p>

            <div className="w-full h-72">
              <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                  <defs>
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

                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#4b5563" }} />
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
                  <RTooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} iconSize={8} />

                  <Area
                    name="Balance"
                    type="monotone"
                    dataKey="Balance"
                    stroke="#1e3a8a"
                    fill="url(#gBalance)"
                    strokeWidth={2}
                  />
                  <Area
                    name="Contributed"
                    type="monotone"
                    dataKey="Contributed"
                    stroke="#3b82f6"
                    fill="url(#gContrib)"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                  />
                  <Area
                    name="Earnings"
                    type="monotone"
                    dataKey="Earnings"
                    stroke="#60a5fa"
                    fill="url(#gEarnings)"
                    strokeWidth={2}
                    strokeDasharray="2 3"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* TABLE */}
        <div className="mt-8">
          <SectionCard title="Yearly projection">
            <div className="overflow-x-auto">
              <table className="min-w-[720px] text-xs text-left">
                <thead className="text-slate-600 border-b text-[11px]">
                  <tr className="border-b align-top">
                    <th className="py-2 pr-4 font-medium">Year</th>
                    <th className="py-2 pr-4 font-medium">Balance</th>
                    <th className="py-2 pr-4 font-medium">Contributed</th>
                    <th className="py-2 pr-4 font-medium">Earnings</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {sim.rows.map((r) => (
                    <tr key={r.year} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-4">{r.year}</td>
                      <td className="py-2 pr-4">{fmt(r.balance)}</td>
                      <td className="py-2 pr-4">{fmt(r.contributed)}</td>
                      <td className="py-2 pr-4">{fmt(r.earnings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-slate-600">
              Assumes even contributions monthly and a constant net return (return − fees) compounded monthly.
            </p>
          </SectionCard>
        </div>

        {/* FAQ */}
        <div className="mt-8">
          <SectionCard title="FAQs">
            <div className="divide-y">
              {faq.map(({ q, a }, i) => (
                <details key={i} className="py-3 group">
                  <summary className="flex cursor-pointer list-none items-center justify-between">
                    <span className="font-medium text-slate-900">{q}</span>
                    <span className="ml-4 text-slate-400 transition-transform group-open:rotate-180">▾</span>
                  </summary>
                  <div className="mt-2 text-sm text-slate-700">{a}</div>
                </details>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Footer disclaimer (house style) */}
      <div className="max-w-5xl mx-auto px-4 mt-12 mb-12 text-[11px] text-slate-500 leading-snug">
        <p>
          This calculator is general information only. It does not consider your personal objectives, financial situation,
          or needs. Consider speaking with a qualified professional.
        </p>
      </div>
    </main>
  );
}
