// pages/calculators/tax-calculator.js
import { useMemo, useState } from "react";
import Head from "next/head";

import Tooltip from "@/components/Tooltip";
import SectionCard from "@/components/SectionCard";
import PageIntro from "@/components/PageIntro";
import SubtleCtaLink from "@/components/SubtleCtaLink";
import SummaryGrid from "@/components/SummaryGrid";
import SummaryCard from "@/components/SummaryCard";

// Currency formatter (house style)
function aud0(n) {
  if (!isFinite(n)) return "$0";
  return (Math.round(n) || 0).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// For offsets shown as negative benefits (e.g., LITO/SAPTO)
const fmtOffsetAud = (n) => (n > 0 ? `-${aud0(n)}` : "$0");


/** ---------- Resident bracket tax (from 1 July 2024) ----------
 *  0–18,200: 0%
 *  18,201–45,000: 16%
 *  45,001–135,000: 30%
 *  135,001–190,000: 37%
 *  190,001+: 45%
 *  Excludes Medicare & offsets here (we add below).
 */
function bracketTax2025Plus(income) {
  if (income <= 18200) return 0;
  if (income <= 45000) return (income - 18200) * 0.16;
  if (income <= 135000) return 4288 + (income - 45000) * 0.30;
  if (income <= 190000) return 31288 + (income - 135000) * 0.37;
  return 51638 + (income - 190000) * 0.45;
}

/** ---------- LITO (Low Income Tax Offset) 2024–25 ----------
 *  ≤ $37,500: $700
 *  $37,501–$45,000: $700 − 5% × (excess over 37,500)
 *  $45,001–$66,667: $325 − 1.5% × (excess over 45,000)
 *  ≥ $66,668: $0
 *  Non-refundable: cannot reduce bracket tax below 0.
 */
function litoAmount(income) {
  if (income <= 37500) return 700;
  if (income <= 45000) return Math.max(0, 700 - 0.05 * (income - 37500));
  if (income <= 66667) return Math.max(0, 325 - 0.015 * (income - 45000));
  return 0;
}

/** ---------- Medicare levy (2%) with low-income thresholds (2024–25) ----------
 * Singles:
 *  - No levy ≤ $27,222
 *  - Phase-in $27,223–$34,027: 10% × (income − 27,222)
 *  - Full 2% > $34,027
 *
 * Families (couple): use combined income + add $4,216 per child after first
 *  - No levy if combined ≤ $45,907 (+ child uplift)
 *  - Phase-in between that and the (approx) upper = lower + (full levy / 0.10) pivot
 *    For simplicity we mirror the single method: reduced levy = 10% × (combined − lower)
 *  - Full 2% once clearly above phase-in (we use the same pivot idea as singles).
 *
 * Seniors/pensioners have higher lower thresholds: single $43,020; family $59,886 (+ per child).
 * (MVP: we apply these higher thresholds when SAPTO is ticked.)
 */
function medicareLevyAnnual({
  taxableIncome,
  maritalStatus,        // 'single' | 'couple'
  dependants,           // integer
  saptoEligible,        // boolean → uses seniors thresholds
  partnerTaxableIncome, // number (0 if single)
}) {
  const income = Math.max(0, taxableIncome);
  const partner = Math.max(0, partnerTaxableIncome || 0);
  const combined = maritalStatus === "couple" ? income + partner : income;

  // base thresholds 2024–25
  const singleLower = saptoEligible ? 43020 : 27222;
  // simple pivot for where full 2% kicks in for singles
  const singleUpper = saptoEligible ? singleLower + (0.02 * singleLower) / 0.10 : 34027;

  const familyLowerBase = saptoEligible ? 59886 : 45907;
  const perChildUplift = 4216; // each dependent child after the first
  const familyLower = familyLowerBase + Math.max(0, dependants - 1) * perChildUplift;
  // simple pivot for families
  const familyUpper = familyLower + (0.02 * familyLower) / 0.10;

  // helper to compute levy for a given income using a lower/upper pivot
  const phasedLevy = (amt, lower, upper) => {
    if (amt <= lower) return 0;
    if (amt <= upper) return 0.10 * (amt - lower); // phased
    return 0.02 * amt; // full rate
  };

  if (maritalStatus === "single") {
    // Singles: thresholds assessed on your income; levy charged on your income.
    return Math.round(phasedLevy(income, singleLower, singleUpper));
  }

  // Couple:
  // Use combined income to determine which regime applies,
  // but ALWAYS charge the levy on *your* income only.
  if (combined <= familyLower) {
    // No levy for either spouse when family income is under the lower threshold.
    return 0;
  }
  if (combined <= familyUpper) {
    // Phase-in zone: apply the phase-in formula to YOUR income against family thresholds.
    return Math.round(Math.max(0, 0.10 * (income - familyLower)));
  }
  // Above the pivot: full levy rate on YOUR income only.
  return Math.round(0.02 * income);
}


/** ---------- Medicare Levy Surcharge (MLS) 2024–25 ----------
 * Applies if NO private hospital cover for the full year, and income is above thresholds.
 * Tiers (singles / families): base ≤ $97,000 / $194,000; Tier1 1.0%; Tier2 1.25%; Tier3 1.5%.
 * Family thresholds +$1,500 per dependent child after the first.
 * MVP simplification: use taxable incomes only for "income for MLS purposes".
 */
function mlsRate({
  maritalStatus,
  taxableIncome,
  partnerTaxableIncome,
  dependants,
}) {
  const singleTiers = [97000, 113000, 151000]; // base end, tier1 end, tier2 end (tier3 above)
  const familyBase = 194000 + Math.max(0, dependants - 1) * 1500;

  const combined =
    maritalStatus === "couple"
      ? Math.max(0, taxableIncome) + Math.max(0, partnerTaxableIncome || 0)
      : Math.max(0, taxableIncome);

  // Determine thresholds by status
  let tierRate = 0;
  if (maritalStatus === "single") {
    if (combined <= singleTiers[0]) tierRate = 0;
    else if (combined <= singleTiers[1]) tierRate = 0.01;
    else if (combined <= singleTiers[2]) tierRate = 0.0125;
    else tierRate = 0.015;
  } else {
    if (combined <= familyBase) tierRate = 0;
    else if (combined <= familyBase + 32000) tierRate = 0.01;   // 194k→226k
    else if (combined <= familyBase + 108000) tierRate = 0.0125; // 226k→302k
    else tierRate = 0.015;
  }
  return tierRate;
}

/** ---------- SAPTO (simple estimate) 2024–25 ----------
 * Max offsets & taper thresholds (per ATO/Summary):
 *  Single:   max $2,230; shade-out threshold $34,919; cut-out $52,759
 *  Couple:   max $1,602 each; shade-out $30,994 each; cut-out $87,620 combined
 *  (MVP: if couple & both eligible, we apply per-person estimate using each income.)
 *  Taper: 12.5c per $ above shade threshold, non-refundable.
 */
function saptoAmount({ maritalStatus, taxpayerIncome, partnerIncome, taxpayerEligible, partnerEligible }) {
  const singleMax = 2230, singleShade = 34919, singleCut = 52759;
  const coupleMaxEach = 1602, coupleShadeEach = 30994, coupleCutCombined = 87620;

  function perPerson(income, max, shade, cut) {
    if (!max) return 0;
    if (income <= shade) return max;
    // linear taper to cut-out
    const excess = Math.max(0, income - shade);
    const tapered = Math.max(0, max - 0.125 * excess);
    // hard zero beyond cut
    if (income >= cut) return 0;
    return tapered;
  }

  if (maritalStatus === "single") {
    if (!taxpayerEligible) return 0;
    return Math.round(perPerson(taxpayerIncome, singleMax, singleShade, singleCut));
  }

  // couple – very simplified approach:
  const combined = (taxpayerIncome || 0) + (partnerIncome || 0);
  if (combined >= coupleCutCombined) return 0;

  const you = taxpayerEligible ? perPerson(taxpayerIncome, coupleMaxEach, coupleShadeEach, Infinity) : 0;
  const spouse = partnerEligible ? perPerson(partnerIncome, coupleMaxEach, coupleShadeEach, Infinity) : 0;

  return Math.round(you + spouse);
}

export default function TaxCalculator() {
  // Inputs
  const [income, setIncome] = useState(90000);
  const [frequency, setFrequency] = useState("annual"); // annual, monthly, fortnightly, weekly
  const [maritalStatus, setMaritalStatus] = useState("single"); // 'single' | 'couple'
  const [partnerIncome, setPartnerIncome] = useState(0);
  const [dependants, setDependants] = useState(0);

  const [includeLITO, setIncludeLITO] = useState(true);
  const [includeMedicare, setIncludeMedicare] = useState(true);
  const [privateHospitalCover, setPrivateHospitalCover] = useState(false);
  const [saptoYou, setSaptoYou] = useState(false);
  const [saptoPartner, setSaptoPartner] = useState(false);

  // Annualise
  const annualIncome = useMemo(() => {
    const v = Number(income) || 0;
    switch (frequency) {
      case "monthly": return v * 12;
      case "fortnightly": return v * 26;
      case "weekly": return v * 52;
      default: return v;
    }
  }, [income, frequency]);

  const partnerAnnualIncome = useMemo(() => {
    const v = Number(partnerIncome) || 0;
    return maritalStatus === "couple" ? v : 0;
  }, [partnerIncome, maritalStatus]);

  // Bracket tax
  const bracketTax = useMemo(() => Math.max(0, bracketTax2025Plus(annualIncome)), [annualIncome]);

  // LITO (non-refundable)
  const lito = useMemo(() => includeLITO ? litoAmount(annualIncome) : 0, [annualIncome, includeLITO]);
  const taxAfterLITO = Math.max(0, bracketTax - lito);

  // SAPTO (simple)
  const sapto = useMemo(
    () => saptoAmount({
      maritalStatus,
      taxpayerIncome: annualIncome,
      partnerIncome: partnerAnnualIncome,
      taxpayerEligible: saptoYou,
      partnerEligible: saptoPartner
    }),
    [maritalStatus, annualIncome, partnerAnnualIncome, saptoYou, saptoPartner]
  );
  const taxAfterOffsets = Math.max(0, taxAfterLITO - sapto);

  // Medicare levy
  const medicare = useMemo(
    () => includeMedicare
      ? medicareLevyAnnual({
          taxableIncome: annualIncome,
          maritalStatus,
          dependants: Math.max(0, parseInt(dependants || 0, 10)),
          saptoEligible: maritalStatus === "single" ? saptoYou : (saptoYou || saptoPartner),
          partnerTaxableIncome: partnerAnnualIncome,
        })
      : 0,
    [annualIncome, maritalStatus, dependants, saptoYou, saptoPartner, partnerAnnualIncome, includeMedicare]
  );

  // MLS (surcharge) if no private hospital cover
  const mlsPct = useMemo(
    () => privateHospitalCover ? 0 : mlsRate({
      maritalStatus,
      taxableIncome: annualIncome,
      partnerTaxableIncome: partnerAnnualIncome,
      dependants: Math.max(0, parseInt(dependants || 0, 10)),
    }),
    [privateHospitalCover, maritalStatus, annualIncome, partnerAnnualIncome, dependants]
  );
  const mls = Math.round(mlsPct * annualIncome); // Applied to your taxable income (MVP)

  // Totals
  const totalTaxAnnual = Math.round(taxAfterOffsets + medicare + mls);
  const netAnnual = Math.max(0, Math.round(annualIncome - totalTaxAnnual));
  const divider = frequency === "monthly" ? 12 : frequency === "fortnightly" ? 26 : frequency === "weekly" ? 52 : 1;

  // Marginal (brackets only)
  const marginalRate = useMemo(() => {
    const y = annualIncome;
    if (y <= 18200) return 0;
    if (y <= 45000) return 16;
    if (y <= 135000) return 30;
    if (y <= 190000) return 37;
    return 45;
  }, [annualIncome]);

  const per = (n) => Math.round(n / divider);
  const takeHomeAnnual = netAnnual;
  const takeHomeMonthly = Math.round(netAnnual / 12);
  const takeHomeFortnightly = Math.round(netAnnual / 26);
  // ——— SEO constants ———
  const pageUrl = "https://fintoolbox.com.au/calculators/tax-calculator";
  const pageTitle = "Income Tax Calculator (Australia)";
  const pageDescription =
    "Estimate Australian income tax with 2025–26 resident tax brackets. Toggle Medicare levy, LITO, SAPTO and MLS. Shows take-home pay by pay frequency.";

  return (
    <main>
  {/* Keep your existing <Head> block exactly as-is above */}

  {/* Heading (matches Debt Recycling) */}
  <header className="max-w-5xl mx-auto px-4 pb-6 border-b border-slate-200">
    <h1 className="text-2xl font-bold text-slate-900">Income Tax Calculator (Australia)</h1>
  </header>

  <div className="max-w-5xl mx-auto px-4 mt-4">
    {/* Blue intro card (PageIntro) */}
    <PageIntro tone="blue">
      <div className="space-y-2">
        <p>
          Estimate your Australian resident income tax (from 1 July 2024), including Medicare levy, SAPTO and the
          Medicare Levy Surcharge (MLS). Toggle options and switch pay frequency to see take-home pay.
        </p>
        <p className="mt-2">
          Enter your income and household details below. We’ll show annual tax plus per-pay figures.
        </p>
      </div>
    </PageIntro>

    {/* Optional guide link */}
    <SubtleCtaLink className="mt-3" href="/blog/lito-explained">Not sure how LITO works? Read the explainer →</SubtleCtaLink> 

    {/* INPUTS – single card, grouped, 3-col grid */}
    <div className="mt-6">
      <SectionCard title="Your assumptions">
        <div className="space-y-6">

          {/* Income & frequency */}
          <div>
            <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm mb-2">
              Income &amp; frequency
              <Tooltip text="Enter your gross pay and frequency. We annualise it for tax calculations." />
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
              <label className="flex flex-col">
                <span className="text-slate-600">Income</span>
                <input
                  type="number"
                  min="0"
                  className="border rounded px-2 py-1"
                  value={income}
                  onChange={(e) => setIncome(Number(e.target.value))}
                  placeholder="e.g. 90000"
                />
              </label>

              <label className="flex flex-col">
                <span className="text-slate-600">Frequency</span>
                <select
                  className="border rounded px-2 py-1"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  <option value="annual">Annual</option>
                  <option value="monthly">Monthly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>

              <label className="flex flex-col">
                <span className="text-slate-600">Marginal rate (bracket)</span>
                <input
                  type="text"
                  className="border rounded px-2 py-1 bg-slate-50"
                  value={`${marginalRate}%`}
                  readOnly
                />
              </label>
            </div>
          </div>

          {/* Household */}
          <div>
            <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm mb-2">
              Household
              <Tooltip text="Status and dependants affect Medicare levy thresholds and MLS family thresholds." />
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
              <label className="flex flex-col">
                <span className="text-slate-600">Status</span>
                <select
                  className="border rounded px-2 py-1"
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                >
                  <option value="single">Single</option>
                  <option value="couple">Couple</option>
                </select>
              </label>

              {maritalStatus === "couple" && (
                <label className="flex flex-col">
                  <span className="text-slate-600">Partner income (annual)</span>
                  <input
                    type="number"
                    min="0"
                    className="border rounded px-2 py-1"
                    value={partnerIncome}
                    onChange={(e) => setPartnerIncome(Number(e.target.value))}
                    placeholder="e.g. 80000"
                  />
                </label>
              )}

              <label className="flex flex-col">
                <span className="text-slate-600">Dependent children</span>
                <input
                  type="number"
                  min="0"
                  className="border rounded px-2 py-1"
                  value={dependants}
                  onChange={(e) => setDependants(Number(e.target.value))}
                />
              </label>
            </div>
          </div>

          {/* Offsets & levies */}
          <div>
            <h3 className="font-medium text-slate-800 flex items-center gap-2 text-sm mb-2">
              Offsets &amp; levies
              <Tooltip text="Toggle whether to apply LITO, SAPTO and the Medicare levy. MLS applies if no private cover and thresholds are exceeded." />
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeMedicare}
                  onChange={(e) => setIncludeMedicare(e.target.checked)}
                />
                Include Medicare levy
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeLITO}
                  onChange={(e) => setIncludeLITO(e.target.checked)}
                />
                Apply LITO
                <Tooltip text="LITO: max $700; tapers to $0 at ~$66,667." />
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={privateHospitalCover}
                  onChange={(e) => setPrivateHospitalCover(e.target.checked)}
                />
                I had private hospital cover all year (disables MLS)
                <Tooltip text="Without cover and above the MLS threshold, a 1.0–1.5% surcharge applies." />
              </label>
            </div>

            {/* SAPTO panel */}
            <div className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm">
              <div className="font-medium">SAPTO (estimate)</div>
              <label className="mt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={saptoYou}
                  onChange={(e) => setSaptoYou(e.target.checked)}
                />
                I’m eligible for SAPTO
                <Tooltip text="Seniors & Pensioners Tax Offset – estimate only." />
              </label>
              {maritalStatus === "couple" && (
                <label className="mt-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={saptoPartner}
                    onChange={(e) => setSaptoPartner(e.target.checked)}
                  />
                  Partner is eligible for SAPTO
                </label>
              )}
            </div>
          </div>

        </div>
      </SectionCard>
    </div>

    {/* RESULTS – Summary cards */}
    <div className="mt-8">
      <SectionCard>
        <SummaryGrid>
          <SummaryCard label="Bracket tax (annual)" value={aud0(bracketTax)} />
          <SummaryCard label="LITO (annual)" value={fmtOffsetAud(lito)} />
          <SummaryCard label="SAPTO (annual)" value={fmtOffsetAud(sapto)} />
          <SummaryCard label="Medicare levy (annual)" value={aud0(medicare)} />
          <SummaryCard label="MLS (annual)" value={aud0(mls)} />
          <SummaryCard label={`Total tax (${frequency})`} value={aud0(per(totalTaxAnnual))} />
          {/* Take-home results (highlighted) */}
<SummaryCard
  label="Take-home pay"
  value={aud0(takeHomeAnnual)}
  suffix="per annum"
  className="bg-blue-50 border-blue-100"
/>
<SummaryCard
  label="Take-home pay"
  value={aud0(takeHomeMonthly)}
  suffix="per month"
  className="bg-blue-50 border-blue-100"
/>
<SummaryCard
  label="Take-home pay"
  value={aud0(takeHomeFortnightly)}
  suffix="per fortnight"
  className="bg-blue-50 border-blue-100"
/>

        </SummaryGrid>
        <div className="mt-3 text-[11px] text-slate-500 leading-snug">
          MLS uses taxable income for simplicity. Real MLS uses “income for MLS purposes” (adds fringe benefits etc).
        </div>
      </SectionCard>
    </div>

    {/* ASSUMPTIONS */}
    <div className="mt-8">
      <SectionCard title="Assumptions & references">
        <ul className="list-disc pl-5 space-y-3 text-sm text-slate-600">
          <li>Resident brackets from 1 July 2024 (excludes Medicare/offsets until applied below).</li>
          <li>Medicare levy 2% with low-income thresholds (2024–25), higher seniors thresholds when SAPTO is ticked.</li>
          <li>MLS tiers 2024–25 (no cover): singles &gt; $97k; families &gt; $194k (+$1,500 per child after first): 1.0% / 1.25% / 1.5%.</li>
          <li>SAPTO is a non-refundable offset; estimate only. Actual rules use “rebate income” and Age Pension eligibility.</li>
          <li>General information only; not tax advice.</li>
        </ul>
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
