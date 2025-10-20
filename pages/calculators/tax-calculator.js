// pages/calculators/tax-calculator.js
import { useMemo, useState } from "react";
import Head from "next/head";
import Tooltip from "../../components/Tooltip";

// helpers for display
const fmtMoney = (n) => `$${Math.round(n).toLocaleString()}`;
const fmtOffset = (n) => (n > 0 ? `−${fmtMoney(n)}` : "$0");


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
  const combined = maritalStatus === "couple" ? income + Math.max(0, partnerTaxableIncome || 0) : income;

  // base thresholds 2024–25
  const singleLower = saptoEligible ? 43020 : 27222;
  const singleUpper = saptoEligible ?  /* approximate pivot */ 43020 + (0.02 * 43020) / 0.10 : 34027;

  const familyLowerBase = saptoEligible ? 59886 : 45907;
  const perChildUplift = 4216; // each dependent child after the first
  const familyLower =
    familyLowerBase + Math.max(0, dependants - 1) * perChildUplift;

  // A simple "pivot" for where full 2% kicks in for families.
  const familyUpper = familyLower + (0.02 * familyLower) / 0.10;

  // Helper to compute levy for a given (combined) amount
  const levyFrom = (amt, lower, upper) => {
    if (amt <= lower) return 0;
    if (amt <= upper) return 0.10 * (amt - lower); // phased
    return 0.02 * amt; // full rate
  };

  if (maritalStatus === "single") {
    return Math.round(levyFrom(income, singleLower, singleUpper));
  }
  // couple
  return Math.round(levyFrom(combined, familyLower, familyUpper));
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

  // ——— SEO constants ———
  const pageUrl = "https://fintoolbox.com.au/calculators/tax-calculator";
  const pageTitle = "Income Tax Calculator (Australia)";
  const pageDescription =
    "Estimate Australian income tax with 2024–25 resident brackets. Toggle Medicare levy, LITO, SAPTO and MLS. Shows take-home pay by pay frequency.";

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
              name: "Income Tax Calculator (Australia)",
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
                { "@type": "ListItem", position: 3, name: "Income Tax" }
              ]
            }),
          }}
        />
      </Head>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* <a href="/" className="text-sm text-blue-600 hover:underline">&larr; Back</a> */}
        <h1 className="mt-3 text-3xl font-bold text-gray-900">Income Tax Calculator (Australia)</h1>
        <p className="mt-2 text-gray-600">
          Resident brackets from 1 July 2024. Toggles for Medicare levy, LITO, SAPTO, and MLS.
        </p>

        {/* Inputs */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
            <label className="block text-sm font-medium text-gray-700">Income</label>
            <input type="number" min="0" value={income} onChange={(e) => setIncome(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2" placeholder="e.g. 90000" />

            <label className="block text-sm font-medium text-gray-700">Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">
              <option value="annual">Annual</option>
              <option value="monthly">Monthly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="weekly">Weekly</option>
            </select>

            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">
              <option value="single">Single</option>
              <option value="couple">Couple</option>
            </select>

            {maritalStatus === "couple" && (
              <>
                <label className="block text-sm font-medium text-gray-700">Partner income (annual)</label>
                <input type="number" min="0" value={partnerIncome} onChange={(e) => setPartnerIncome(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2" placeholder="e.g. 80000" />
              </>
            )}

            <label className="block text-sm font-medium text-gray-700">Dependent children</label>
            <input type="number" min="0" value={dependants} onChange={(e) => setDependants(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2" />

            <div className="mt-2 space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={includeMedicare} onChange={(e) => setIncludeMedicare(e.target.checked)} />
                Include Medicare levy
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={includeLITO} onChange={(e) => setIncludeLITO(e.target.checked)} />
                Apply LITO (Low-Income Tax Offset)
                <Tooltip text="LITO: reduces tax for low-to-middle incomes (max $700, tapers to $0 at ~$67k)." />
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={privateHospitalCover} onChange={(e) => setPrivateHospitalCover(e.target.checked)} />
                I had private hospital cover all year (disables MLS)
                <Tooltip text="If you don’t have cover and earn above the MLS threshold ($97k single / $194k family), a 1–1.5% surcharge applies." />
              </label>
              <div className="rounded-lg bg-yellow-50 p-2">
                <div className="font-medium">SAPTO (estimate)</div>
                <label className="mt-1 flex items-center gap-2">
                  <input type="checkbox" checked={saptoYou} onChange={(e) => setSaptoYou(e.target.checked)} />
                  I’m eligible for SAPTO
                  <Tooltip text="SAPTO: Seniors & Pensioners Tax Offset – available if you meet Age Pension age & income criteria." />
                </label>
                {maritalStatus === "couple" && (
                  <label className="mt-1 flex items-center gap-2">
                    <input type="checkbox" checked={saptoPartner} onChange={(e) => setSaptoPartner(e.target.checked)} />
                    Partner is eligible for SAPTO
                  </label>
                )}
              </div>
            </div>

            <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900 space-y-1">
              <div><span className="font-medium">Annualised:</span> ${annualIncome.toLocaleString()}</div>
              <div><span className="font-medium">Marginal rate (bracket):</span> {marginalRate}%</div>
            </div>
          </div>

          {/* Results */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-gray-500">Bracket tax (annual)</div>
                <div className="mt-1 text-2xl font-semibold">{fmtMoney(bracketTax)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">LITO (annual)</div>
                <div className="mt-1 text-2xl font-semibold">{fmtOffset(lito)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">SAPTO (annual)</div>
                <div className="mt-1 text-2xl font-semibold">{fmtOffset(sapto)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Medicare levy (annual)</div>
                <div className="mt-1 text-2xl font-semibold">{fmtMoney(medicare)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">MLS (annual)</div>
                <div className="mt-1 text-2xl font-semibold">{fmtMoney(mls)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Total tax ({frequency})</div>
                <div className="mt-1 text-2xl font-semibold">{fmtMoney(per(totalTaxAnnual))}</div>
              </div>
            </div>

            <div className="mt-2 rounded-lg bg-gray-50 p-3">
              <div className="text-sm text-gray-500">Take-home pay ({frequency})</div>
              <div className="mt-1 text-2xl font-semibold">{fmtMoney(per(netAnnual))}</div>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              MLS uses taxable income for simplicity. Real MLS uses “income for MLS purposes” (adds fringe benefits etc).
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-6 rounded-2xl border bg-white p-5 text-sm text-gray-600 shadow-sm space-y-2">
          <p className="font-medium">Notes & assumptions</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Medicare levy full rate 2%, with low-income thresholds (2024–25) – higher seniors thresholds when SAPTO checked.</li>
            <li>MLS tiers 2024–25 (no hospital cover): singles &gt; $97k, families &gt; $194k (+$1,500 per child after first) at 1.0% / 1.25% / 1.5%.</li>
            <li>SAPTO is a non-refundable offset; simple estimate only. Real rules use “rebate income” and eligibility for Age Pension.</li>
            <li>General information only; not tax advice.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
