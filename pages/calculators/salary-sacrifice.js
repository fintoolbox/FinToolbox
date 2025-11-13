// pages/calculators/salary-sacrifice.js

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
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
} from "recharts";

// ─────────────────────────────────────────────────────────────
// Helper constants & functions
// ─────────────────────────────────────────────────────────────

// NOTE: Update these if rules change.
const CONCESSIONAL_CAP_GENERAL = 30000; // General concessional cap (approx for 2025–26)
const DIV293_THRESHOLD = 250000; // Div 293 income threshold (approx)
const SUPER_CONTRIB_TAX_RATE = 0.15; // 15% contributions tax

// Currency formatting
function aud0(n) {
  if (!isFinite(n)) return "$0";
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function aud2(n) {
  if (!isFinite(n)) return "$0.00";
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// 2025–26 income tax (approx Stage 3 schedule, no offsets, no HELP)
function incomeTax2025_26(taxable) {
  const t = Math.max(0, taxable || 0);

  if (t <= 18200) return 0;

  if (t <= 45000) {
    return (t - 18200) * 0.16;
  }

  if (t <= 135000) {
    const base = (45000 - 18200) * 0.16;
    return base + (t - 45000) * 0.30;
  }

  if (t <= 190000) {
    const base =
      (45000 - 18200) * 0.16 +
      (135000 - 45000) * 0.30;
    return base + (t - 135000) * 0.37;
  }

  const base =
    (45000 - 18200) * 0.16 +
    (135000 - 45000) * 0.30 +
    (190000 - 135000) * 0.37;
  return base + (t - 190000) * 0.45;
}

// Flat 2% Medicare levy (simplified – ignores low-income thresholds)
function medicareLevy(taxable) {
  const t = Math.max(0, taxable || 0);
  return t * 0.02;
}

// Simplified Div 293 calculation
function div293ExtraTax({
  taxableIncome,
  salarySacrificeAnnual,
  totalConcessional,
}) {
  const t = Math.max(0, taxableIncome || 0);
  const sac = Math.max(0, salarySacrificeAnnual || 0);
  const concessional = Math.max(0, totalConcessional || 0);

  const incomeForDiv293 = t + sac;
  if (incomeForDiv293 <= DIV293_THRESHOLD || concessional <= 0) {
    return 0;
  }

  const excess = incomeForDiv293 - DIV293_THRESHOLD;
  const taxableConcessional = Math.min(concessional, excess);
  return taxableConcessional * 0.15;
}

// Projection CSV helper
function projectionToCsv(rows) {
  if (!rows?.length) return "";
  const headers = [
    "Year",
    "SuperWithoutSacrifice",
    "SuperWithSacrifice",
    "Difference",
    "CumulativeTaxSavings",
  ];
  const lines = rows.map((r) => [
    r.year,
    r.superA,
    r.superB,
    r.diff,
    r.taxSavedCumulative,
  ]);
  const escape = (v) =>
    typeof v === "string" && v.includes(",") ? `"${v}"` : v;
  return [headers, ...lines]
    .map((row) => row.map(escape).join(","))
    .join("\n");
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// Core calculator logic
// ─────────────────────────────────────────────────────────────

function calculateSalarySacrifice({
  taxableIncomeBeforeSacrifice,
  payFrequency,
  salarySacrificePerPeriod,
  sgRatePct,
  currentSuperBalance,
  superReturnPct,
  yearsToRetirement,
}) {
  const income = Math.max(0, taxableIncomeBeforeSacrifice || 0);
  const sgRate = Math.max(0, sgRatePct || 0) / 100;

  // Periods per year
  const periodsPerYear =
    payFrequency === "weekly"
      ? 52
      : payFrequency === "fortnightly"
      ? 26
      : 12;

  const sacrificePerPeriod = Math.max(0, salarySacrificePerPeriod || 0);
  let annualSalarySacrifice = sacrificePerPeriod * periodsPerYear;
  annualSalarySacrifice = Math.min(annualSalarySacrifice, income);

  // Max theoretical salary sacrifice to hit the cap (based on SG only)
  const sgOnly = income * sgRate;
  const remainingCap = Math.max(
    0,
    CONCESSIONAL_CAP_GENERAL - sgOnly
  );
  const suggestedSacrificeAnnual = remainingCap;
  const suggestedSacrificePerPeriod =
    periodsPerYear > 0 ? remainingCap / periodsPerYear : 0;

  // ── Scenario A: No salary sacrifice ──
  const concessionalA = sgOnly;
  const contribTaxA = concessionalA * SUPER_CONTRIB_TAX_RATE;

  const taxableA = income;
  const incomeTaxA = incomeTax2025_26(taxableA);
  const medicareA = medicareLevy(taxableA);

  const div293A = div293ExtraTax({
    taxableIncome: taxableA,
    salarySacrificeAnnual: 0,
    totalConcessional: concessionalA,
  });

  const netConcessionalA = concessionalA - contribTaxA - div293A;
  const totalTaxA =
    incomeTaxA + medicareA + contribTaxA + div293A;
  const takeHomeA = taxableA - incomeTaxA - medicareA;

  // ── Scenario B: With salary sacrifice ──
  const concessionalB = sgOnly + annualSalarySacrifice;
  const contribTaxB = concessionalB * SUPER_CONTRIB_TAX_RATE;

  const taxableB = income - annualSalarySacrifice;
  const incomeTaxB = incomeTax2025_26(taxableB);
  const medicareB = medicareLevy(taxableB);

  const div293B = div293ExtraTax({
    taxableIncome: taxableB,
    salarySacrificeAnnual: annualSalarySacrifice,
    totalConcessional: concessionalB,
  });

  const netConcessionalB = concessionalB - contribTaxB - div293B;
  const totalTaxB =
    incomeTaxB + medicareB + contribTaxB + div293B;
  const takeHomeB = taxableB - incomeTaxB - medicareB;

  // Comparisons
  const changeTakeHome = takeHomeB - takeHomeA; // usually negative
  const extraNetToSuper = netConcessionalB - netConcessionalA;
  const taxSavedTotal = totalTaxA - totalTaxB; // +ve = tax saving

  const effectiveTaxRateOnSac =
    annualSalarySacrifice > 0
      ? 1 - extraNetToSuper / annualSalarySacrifice
      : null;

  const overConcessionalCap = concessionalB > CONCESSIONAL_CAP_GENERAL;

  // ── Projection to retirement ──
  const years = Math.max(0, Math.floor(yearsToRetirement || 0));
  const returnRate = (superReturnPct || 0) / 100;

  let balanceA = Math.max(0, currentSuperBalance || 0);
  let balanceB = Math.max(0, currentSuperBalance || 0);

  const projectionRows = [];
  for (let y = 1; y <= years; y++) {
    balanceA = balanceA * (1 + returnRate) + netConcessionalA;
    balanceB = balanceB * (1 + returnRate) + netConcessionalB;
    const diff = balanceB - balanceA;
    const cumulativeTaxSaved = taxSavedTotal * y;
    projectionRows.push({
      year: y,
      superA: balanceA,
      superB: balanceB,
      diff,
      taxSavedCumulative: cumulativeTaxSaved,
    });
  }

  const finalSuperA =
    projectionRows.length > 0
      ? projectionRows[projectionRows.length - 1].superA
      : balanceA;
  const finalSuperB =
    projectionRows.length > 0
      ? projectionRows[projectionRows.length - 1].superB
      : balanceB;
  const finalDiff = finalSuperB - finalSuperA;

  return {
    scenarios: {
      A: {
        concessional: concessionalA,
        netConcessional: netConcessionalA,
        incomeTax: incomeTaxA,
        medicare: medicareA,
        contribTax: contribTaxA,
        div293: div293A,
        totalTax: totalTaxA,
        takeHome: takeHomeA,
      },
      B: {
        concessional: concessionalB,
        netConcessional: netConcessionalB,
        incomeTax: incomeTaxB,
        medicare: medicareB,
        contribTax: contribTaxB,
        div293: div293B,
        totalTax: totalTaxB,
        takeHome: takeHomeB,
      },
    },
    annualSalarySacrifice,
    changeTakeHome,
    extraNetToSuper,
    taxSavedTotal,
    effectiveTaxRateOnSac,
    overConcessionalCap,
    projectionRows,
    finalSuperA,
    finalSuperB,
    finalDiff,
    suggestedSacrificeAnnual,
    suggestedSacrificePerPeriod,
  };
}

// ─────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────

export default function SalarySacrificeCalculator() {
  const [taxableIncomeBeforeSacrifice, setTaxableIncomeBeforeSacrifice] =
    useState(120000);
  const [payFrequency, setPayFrequency] = useState("fortnightly"); // weekly, fortnightly, monthly
  const [salarySacrificePerPeriod, setSalarySacrificePerPeriod] =
    useState(500);

  const [sgRatePct, setSgRatePct] = useState(12);
  const [currentSuperBalance, setCurrentSuperBalance] =
    useState(200000);
  const [superReturnPct, setSuperReturnPct] = useState(6);
  const [yearsToRetirement, setYearsToRetirement] = useState(20);

  const results = useMemo(
    () =>
      calculateSalarySacrifice({
        taxableIncomeBeforeSacrifice,
        payFrequency,
        salarySacrificePerPeriod,
        sgRatePct,
        currentSuperBalance,
        superReturnPct,
        yearsToRetirement,
      }),
    [
      taxableIncomeBeforeSacrifice,
      payFrequency,
      salarySacrificePerPeriod,
      sgRatePct,
      currentSuperBalance,
      superReturnPct,
      yearsToRetirement,
    ]
  );

  const {
    scenarios,
    annualSalarySacrifice,
    changeTakeHome,
    extraNetToSuper,
    taxSavedTotal,
    effectiveTaxRateOnSac,
    overConcessionalCap,
    projectionRows,
    finalSuperA,
    finalSuperB,
    finalDiff,
    suggestedSacrificeAnnual,
    suggestedSacrificePerPeriod,
  } = results;

  const scenarioA = scenarios.A;
  const scenarioB = scenarios.B;

  const periodsPerYear =
    payFrequency === "weekly"
      ? 52
      : payFrequency === "fortnightly"
      ? 26
      : 12;

  const payLabel =
    payFrequency === "weekly"
      ? "week"
      : payFrequency === "fortnightly"
      ? "fortnight"
      : "month";

  const changeTakeHomePerPeriod =
    periodsPerYear > 0 ? changeTakeHome / periodsPerYear : 0;
  const extraNetToSuperPerPeriod =
    periodsPerYear > 0 ? extraNetToSuper / periodsPerYear : 0;
  const taxSavedPerPeriod =
    periodsPerYear > 0 ? taxSavedTotal / periodsPerYear : 0;

  // Projection chart data
  const chartProjectionData = projectionRows.map((row) => ({
    year: row.year,
    "Super without salary sacrifice": row.superA,
    "Super with salary sacrifice": row.superB,
  }));

  return (
    <>
      <Head>
        <title>Salary Sacrifice to Super Calculator | FinToolbox</title>
        <meta
          name="description"
          content="Compare your take-home pay, super contributions, and total tax with and without salary sacrifice into super. Includes a projection to retirement."
        />
        <link
          rel="canonical"
          href="https://fintoolbox.com.au/calculators/salary-sacrifice"
        />
      </Head>

      {/* Header */}
      <header className="max-w-5xl mx-auto px-4 pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">
          Salary Sacrifice to Super Calculator
        </h1>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-4">
        {/* Intro */}
        <PageIntro tone="blue">
          <div className="space-y-2">
            <p>
              <span className="font-semibold">
                Salary sacrificing into super
              </span>{" "}
              means giving up some of your take-home pay and directing it
              into your super fund before tax. The sacrificed amount is
              generally taxed more favourably than taking the income as
              cash, which can reduce the overall tax you pay.
            </p>
            <p>
              Use this calculator to compare your{" "}
              <span className="font-medium">
                take-home pay per {payLabel}
              </span>{" "}
              and{" "}
              <span className="font-medium">
                contributions going into super
              </span>{" "}
              with and without salary sacrifice, then see the potential
              impact on your super balance if you keep salary sacrificing
              until retirement.
            </p>
          </div>
        </PageIntro>

        <SubtleCtaLink className="mt-3" href="/blog">
          Want to learn more about salary sacrifice? Read the blog →
        </SubtleCtaLink>

        {/* INPUT CARD */}
        <div className="mt-6">
          <SectionCard title="Your assumptions">
            <div className="space-y-6 text-sm text-slate-700">
              {/* Income & super */}
              <div>
                <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm mb-2">
                  Income &amp; super
                  <Tooltip text="Your taxable income before any salary sacrifice, your employer super contributions and your current super balance." />
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <label className="flex flex-col">
                    <span className="text-slate-600 flex items-center gap-1">
                      Annual income ($)
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={taxableIncomeBeforeSacrifice}
                      onChange={(e) =>
                        setTaxableIncomeBeforeSacrifice(
                          Number(e.target.value)
                        )
                      }
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600 flex items-center gap-1">
                      Employer super guarantee rate (%)
                      <Tooltip text="Your compulsory employer super contributions. Default is the current SG rate." />
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      className="border rounded px-2 py-1"
                      value={sgRatePct}
                      onChange={(e) => setSgRatePct(Number(e.target.value))}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600 flex items-center gap-1">
                      Current super balance ($)
                      <Tooltip text="Your current super balance used as the starting point for the projection." />
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={currentSuperBalance}
                      onChange={(e) =>
                        setCurrentSuperBalance(Number(e.target.value))
                      }
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600 flex items-center gap-1">
                      Years until retirement
                      <Tooltip text="How many years you plan to keep working and contributing to super." />
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={yearsToRetirement}
                      onChange={(e) =>
                        setYearsToRetirement(Number(e.target.value))
                      }
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600 flex items-center gap-1">
                      Expected super investment return (% p.a.)
                      <Tooltip text="Average long-term investment return on your super balance, before tax and after fees." />
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      className="border rounded px-2 py-1"
                      value={superReturnPct}
                      onChange={(e) =>
                        setSuperReturnPct(Number(e.target.value))
                      }
                    />
                  </label>
                </div>
              </div>

              {/* Salary sacrifice settings */}
              <div>
                <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm mb-2">
                  Salary sacrifice settings
                  <Tooltip text="Enter how much you want to salary sacrifice into super each pay period." />
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <label className="flex flex-col">
                    <span className="text-slate-600 flex items-center gap-1">
                      Pay frequency
                    </span>
                    <select
                      className="border rounded px-2 py-1 bg-white"
                      value={payFrequency}
                      onChange={(e) => setPayFrequency(e.target.value)}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>

                  <label className="flex flex-col">
                    <span className="text-slate-600 flex items-center gap-1">
                      Salary sacrifice per {payLabel} ($)
                    </span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={salarySacrificePerPeriod}
                      onChange={(e) =>
                        setSalarySacrificePerPeriod(Number(e.target.value))
                      }
                    />
                    <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Approximate annual salary sacrifice:{" "}
                      <span className="font-medium text-slate-700">
                        {aud0(annualSalarySacrifice)}
                      </span>
                    </div>
                  </label>
                </div>

                {/* Cap guidance */}
                <div className="mt-3 text-[11px] text-slate-600 leading-snug">
                  <div>
                    To reach the general concessional cap of{" "}
                    <span className="font-medium text-slate-800">
                      {aud0(CONCESSIONAL_CAP_GENERAL)}
                    </span>{" "}
                    based on your current employer contributions, you could
                    salary sacrifice approximately:
                  </div>
                  <div className="mt-1">
                    <span className="font-medium text-slate-800">
                      {aud0(suggestedSacrificeAnnual)}
                    </span>{" "}
                    per year (
                    <span className="font-medium text-slate-800">
                      {aud0(suggestedSacrificePerPeriod)}
                    </span>{" "}
                    per {payLabel}).
                  </div>
                </div>
              </div>

              {/* Cap & Div 293 note */}
              <div className="text-[11px] text-slate-600 leading-snug border-t border-slate-100 pt-3">
                <div>
                  Total concessional contributions without salary sacrifice:{" "}
                  <span className="font-medium text-slate-800">
                    {aud0(scenarioA.concessional)}
                  </span>{" "}
                  per year.
                </div>
                <div>
                  Total concessional contributions with salary sacrifice:{" "}
                  <span className="font-medium text-slate-800">
                    {aud0(scenarioB.concessional)}
                  </span>{" "}
                  per year.
                </div>
                <div>
                  General concessional cap:{" "}
                  <span className="font-medium text-slate-800">
                    {aud0(CONCESSIONAL_CAP_GENERAL)}
                  </span>{" "}
                  per year.
                </div>
                {overConcessionalCap && (
                  <div className="mt-1 text-red-600">
                    Warning: based on these inputs you may exceed the general
                    concessional contributions cap.
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* SUMMARY CARD */}
        <div className="mt-8">
          <SectionCard title="Results">
            <SummaryGrid>
              {/* Take-home per period A */}
              <SummaryCard
                label={`Net take-home pay per ${payLabel} (no salary sacrifice)`}
                value={
                  periodsPerYear > 0
                    ? aud0(scenarioA.takeHome / periodsPerYear)
                    : "—"
                }
              />

              {/* Take-home per period B with diff */}
              {(() => {
                const diffPerPeriod = changeTakeHomePerPeriod;
                const tone =
                  diffPerPeriod > 0
                    ? "positive"
                    : diffPerPeriod < 0
                    ? "negative"
                    : "neutral";
                const badge =
                  diffPerPeriod === 0
                    ? "No change"
                    : `${diffPerPeriod > 0 ? "+" : ""}${aud2(
                        diffPerPeriod
                      )} per ${payLabel}`;
                return (
                  <SummaryCard
                    label={`Net take-home pay per ${payLabel} (with salary sacrifice)`}
                    value={
                      periodsPerYear > 0
                        ? aud0(scenarioB.takeHome / periodsPerYear)
                        : "—"
                    }
                    badgeText={badge}
                    badgeTone={tone}
                  />
                );
              })()}

              {/* Extra to super per period */}
              {(() => {
                const tone =
                  extraNetToSuperPerPeriod > 0
                    ? "positive"
                    : extraNetToSuperPerPeriod < 0
                    ? "negative"
                    : "neutral";
                const badge =
                  extraNetToSuper === 0
                    ? "No extra contribution"
                    : `${extraNetToSuper > 0 ? "+" : ""}${aud0(
                        extraNetToSuper
                      )} per year`;
                return (
                  <SummaryCard
                    label={`Extra going into super per ${payLabel} (after contributions tax & Div 293 if applicable)`}
                    value={aud2(extraNetToSuperPerPeriod)}
                    badgeText={badge}
                    badgeTone={tone}
                  />
                );
              })()}

              {/* Tax savings card */}
              {(() => {
                const tone =
                  taxSavedTotal > 0
                    ? "positive"
                    : taxSavedTotal < 0
                    ? "negative"
                    : "neutral";
                const value =
                  taxSavedTotal >= 0
                    ? aud0(taxSavedTotal)
                    : aud0(-taxSavedTotal);
                const badge =
                  taxSavedTotal > 0
                    ? "Estimated tax saving"
                    : taxSavedTotal < 0
                    ? "Extra tax payable"
                    : "No tax difference";
                return (
                  <SummaryCard
                    label="Estimated tax saved (this year)"
                    value={value}
                    badgeText={badge}
                    badgeTone={tone}
                  />
                );
              })()}

              {/* Projected super before salary sacrifice */}
              <SummaryCard
                label="Projected super at retirement (no salary sacrifice)"
                value={aud0(finalSuperA)}
              />

              {/* Projected super with salary sacrifice */}
              {(() => {
                const tone =
                  finalDiff > 0
                    ? "positive"
                    : finalDiff < 0
                    ? "negative"
                    : "neutral";
                const badge =
                  finalDiff === 0
                    ? "No difference at retirement"
                    : `${finalDiff > 0 ? "+" : ""}${aud0(
                        finalDiff
                      )} vs no salary sacrifice`;
                return (
                  <SummaryCard
                    label="Projected super at retirement (with salary sacrifice)"
                    value={aud0(finalSuperB)}
                    badgeText={badge}
                    badgeTone={tone}
                  />
                );
              })()}
            </SummaryGrid>

            
          </SectionCard>
        </div>

        {/* CHART – Projection only */}
        <div className="mt-8">
          <SectionCard title="Projected super balance">
            <div className="w-full h-64">
              <ResponsiveContainer>
                <LineChart data={chartProjectionData}>
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
                    dataKey="Super without salary sacrifice"
                    stroke="#93c5fd"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Super with salary sacrifice"
                    stroke="#1e3a8a"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* TABLE – Projection details with cumulative tax savings */}
<div className="mt-8">
  <SectionCard title="Projection details">
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-xs text-left">
        <colgroup>
          <col className="w-16" />           {/* Year */}
          <col className="w-[22%]" />        {/* Super without */}
          <col className="w-[22%]" />        {/* Super with */}
          <col className="w-[22%]" />        {/* Difference */}
          <col className="w-[22%]" />        {/* Cumulative tax */}
        </colgroup>

        <thead className="text-slate-600 border-b text-[11px]">
          <tr className="border-b align-top">
            <th className="py-2 pr-3 font-medium text-left">Year</th>
            <th className="py-2 px-3 font-medium text-right">
              Super without salary sacrifice
            </th>
            <th className="py-2 px-3 font-medium text-right">
              Super with salary sacrifice
            </th>
            <th className="py-2 px-3 font-medium text-right">
              Difference
            </th>
            <th className="py-2 pl-3 font-medium text-right">
              Cumulative tax savings
            </th>
          </tr>
        </thead>

        <tbody className="text-slate-800">
          {projectionRows?.map((row) => (
            <tr
              key={row.year}
              className="border-b last:border-0 align-top"
            >
              <td className="py-2 pr-3 font-medium text-slate-900 text-left">
                {row.year}
              </td>
              <td className="py-2 px-3 text-right">
                {aud0(row.superA)}
              </td>
              <td className="py-2 px-3 text-right">
                {aud0(row.superB)}
              </td>
              <td className="py-2 px-3 text-right">
                {aud0(row.diff)}
              </td>
              <td className="py-2 pl-3 text-right">
                {aud0(row.taxSavedCumulative)}
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
            "salary-sacrifice-projection.csv",
            projectionToCsv(projectionRows)
          )
        }
        className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Export CSV
      </button>
    </div>
  </SectionCard>
</div>


        {/* ASSUMPTIONS */}
        <div className="mt-8">
          <SectionCard title="How this calculator works">
            <ul className="list-disc pl-5 space-y-3 text-sm text-slate-600">
              <li>
                <span className="text-slate-800 font-medium">
                  Tax year and tax logic:
                </span>{" "}
                This calculator uses 2025&ndash;26 tax rates including Medicare Levy. It does
                not include any tax offsets (such as LITO) or HECS/HELP
                repayments.
              </li>
             
              <li>
                <span className="text-slate-800 font-medium">
                  Contributions tax and Div 293:
                </span>{" "}
                All concessional contributions are taxed at 15% inside super. We then
                approximate any additional 15% Division 293 tax if your
                income and contributions exceed the $250,000 threshold. 
              </li>
            
              <li>
                <span className="text-slate-800 font-medium">
                  Projections to retirement:
                </span>{" "}
                For the projection, we start with your current super balance,
                then each year:
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>
                    Add your net concessional contributions
                    (after 15% contributions tax and any Div 293 tax), and
                  </li>
                  <li>
                    Apply the long-term investment return you enter, assumed
                    constant each year.
                  </li>
                </ul>
              </li>
              <li>
                <span className="text-slate-800 font-medium">
                  Contribution caps:
                </span>{" "}
                We compare your total concessional contributions to the general
                concessional cap. The calculator allows you to exceed the cap
                and shows a warning, but any excess contributions tax or penalties are excluded.
              </li>
            </ul>
          </SectionCard>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="max-w-5xl mx-auto px-4 mt-12 mb-12 text-[11px] text-slate-500 leading-snug">
        <p>
          This calculator is general information only. It does not consider your
          personal objectives, financial situation, or needs, and it uses
          simplified tax rules and assumptions. 
        </p>
      </div>
    </>
  );
}
