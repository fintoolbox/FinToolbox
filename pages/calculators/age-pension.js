// pages/calculators/age-pension.js
import { useMemo, useState } from "react";
import Head from "next/head";
import CurrencyInput from "@/components/CurrencyInput";
import Tooltip from "@/components/Tooltip";
import SectionCard from "@/components/SectionCard";
import PageIntro from "@/components/PageIntro";
import SubtleCtaLink from "@/components/SubtleCtaLink";
import SummaryGrid from "@/components/SummaryGrid";
import SummaryCard from "@/components/SummaryCard";

/** ─────────────────────────────────────────────────────────────────────
 * Age Pension Calculator – site-wide layout
 * Updated settings effective 20 Sep 2025 (Services Australia)
 * ────────────────────────────────────────────────────────────────────
 *
 * Max payment (per fortnight, before tax):
 *  - Single: $1,178.70
 *  - Couple (each): $888.50 → combined $1,777.00
 *
 * Income test (standard rules):
 *  - Free area: $218 (single), $380 (couple combined)
 *  - Reduction: 50c per $1 over free area (single),
 *               25c each (i.e., 50c combined) per $1 over free area (couple)
 *
 * Assets test:
 *  - Full pension asset limits (homeowner / non-homeowner)
 *    Single: $321,500 / $579,500
 *    Couple combined: $481,500 / $739,500
 *  - Part-pension cut-offs
 *    Single: $714,500 / $972,500
 *    Couple combined: $1,074,000 / $1,332,000
 *  - Taper: $3 per $1,000 (per fortnight) over the relevant threshold
 *
 * Deeming (financial assets only):
 *  - Singles: 0.75% to $64,200; 2.75% above
 *  - Couples combined: 0.75% to $106,200; 2.75% above
 */

// ——— Maximum rates (per fortnight) ———
const MAX_SINGLE_FT = 1178.70;
const MAX_COUPLE_EACH_FT = 888.50;
const MAX_COUPLE_COMBINED_FT = MAX_COUPLE_EACH_FT * 2;

// ——— Income test: free areas & taper ———
const INCOME_FREE_AREA_SINGLE_FT = 218;
const INCOME_FREE_AREA_COUPLE_COMBINED_FT = 380;
const INCOME_TAPER_SINGLE_PER_$ = 0.50;
const INCOME_TAPER_COUPLE_COMBINED_PER_$ = 0.50;

// ——— Assets test: full-pension limits & cut-offs (homeowner / non-homeowner) ———
const FULL_LIMIT_SINGLE_HOME = 321500;
const FULL_LIMIT_SINGLE_NONHOME = 579500;
const FULL_LIMIT_COUPLE_HOME_COMBINED = 481500;
const FULL_LIMIT_COUPLE_NONHOME_COMBINED = 739500;

const CUTOFF_SINGLE_HOME = 714500;
const CUTOFF_SINGLE_NONHOME = 972500;
const CUTOFF_COUPLE_HOME_COMBINED = 1074000;
const CUTOFF_COUPLE_NONHOME_COMBINED = 1332000;

// Taper: $3 per $1,000 per fortnight
const ASSETS_TAPER_PER_1000_FT = 3;

// ——— Deeming thresholds & rates (from 20 Sep 2025) ———
const DEEMING_THRESHOLD_SINGLE = 64200;
const DEEMING_THRESHOLD_COUPLE_COMBINED = 106200;
const DEEMING_LOWER_RATE = 0.0075; // 0.75% p.a.
const DEEMING_UPPER_RATE = 0.0275; // 2.75% p.a.

// ——— Work Bonus (simplified) ———
const WORK_BONUS_FT = 300;

// Helpers
const clamp = (x, max) => Math.max(0, Math.min(x, max));
const aud0 = (n) =>
  (isFinite(n) ? n : 0).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });

// Deeming calculation (returns FORTNIGHTLY deemed income)
function deemingFt({ status, financialAssets }) {
  const amt = Math.max(0, Number(financialAssets) || 0);
  if (amt === 0) return 0;

  const threshold =
    status === "single" ? DEEMING_THRESHOLD_SINGLE : DEEMING_THRESHOLD_COUPLE_COMBINED;

  const lower = Math.min(amt, threshold);
  const upper = Math.max(0, amt - threshold);

  const annual = lower * DEEMING_LOWER_RATE + upper * DEEMING_UPPER_RATE;
  return annual / 26; // convert annual to fortnightly
}

export default function AgePensionCalculator() {
  const [status, setStatus] = useState("single"); // 'single' | 'couple'
  const [homeowner, setHomeowner] = useState(true);
  const [workBonusYou, setWorkBonusYou] = useState(false);
  const [workBonusPartner, setWorkBonusPartner] = useState(false); // used only if couple

  // — Inputs (split across cards to match house style) —
  // Assets (1) – non-deemed (home contents, vehicles, etc.)
  const [nonDeemedAssets, setNonDeemedAssets] = useState(200000);
  // Assets (2) – deemed financial assets (cash, shares, ABPs, etc.)
  const [finAssets, setFinAssets] = useState(100000);

  // Other assessable income (excluding deeming), per fortnight
  const [incomeFt, setIncomeFt] = useState(300);
  const [partnerIncomeFt, setPartnerIncomeFt] = useState(0); // if couple

  // — Derived: total assessable assets for the assets test —
  const totalAssets = useMemo(() => {
    const a = Math.max(0, Number(nonDeemedAssets) || 0);
    const b = Math.max(0, Number(finAssets) || 0);
    return a + b;
  }, [nonDeemedAssets, finAssets]);

  // — Compute deemed income —
  const deemedIncomeFt = useMemo(
    () => deemingFt({ status, financialAssets: finAssets }),
    [status, finAssets]
  );

  // — Income test (standard rules only; transitional not implemented) —
  const incomeTestFt = useMemo(() => {
    // apply work bonus per person (simplified)
    const adj = (v, eligible) => Math.max(0, (Number(v) || 0) - (eligible ? WORK_BONUS_FT : 0));

    if (status === "single") {
      const otherAdj = adj(incomeFt, workBonusYou);
      const totalIncome = otherAdj + deemedIncomeFt;

      const excess = Math.max(0, totalIncome - INCOME_FREE_AREA_SINGLE_FT);
      const reduction = excess * INCOME_TAPER_SINGLE_PER_$;
      const result = MAX_SINGLE_FT - reduction;
      return clamp(result, MAX_SINGLE_FT);
    }

    // couple — apply work bonus to each person's other income separately, then combine
    const youAdj = adj(incomeFt, workBonusYou);
    const partnerAdj = adj(partnerIncomeFt, workBonusPartner);

    const combinedOther = youAdj + partnerAdj;
    const combinedIncome = combinedOther + deemedIncomeFt;

    const excess = Math.max(0, combinedIncome - INCOME_FREE_AREA_COUPLE_COMBINED_FT);
    const reductionCombined = excess * INCOME_TAPER_COUPLE_COMBINED_PER_$;
    const combinedResult = MAX_COUPLE_COMBINED_FT - reductionCombined;
    return clamp(combinedResult, MAX_COUPLE_COMBINED_FT);
  }, [
    status,
    incomeFt,
    partnerIncomeFt,
    deemedIncomeFt,
    workBonusYou,
    workBonusPartner,
  ]);

  // — Assets test (uses totalAssets = nonDeemedAssets + finAssets) —
  const assetsTestFt = useMemo(() => {
    const a = Math.max(0, Number(totalAssets) || 0);

    if (status === "single") {
      const fullLimit = homeowner ? FULL_LIMIT_SINGLE_HOME : FULL_LIMIT_SINGLE_NONHOME;
      const cutOff = homeowner ? CUTOFF_SINGLE_HOME : CUTOFF_SINGLE_NONHOME;

      if (a >= cutOff) return 0;

      const excess = Math.max(0, a - fullLimit);
      const reduction = (excess / 1000) * ASSETS_TAPER_PER_1000_FT;
      const result = MAX_SINGLE_FT - reduction;
      return clamp(result, MAX_SINGLE_FT);
    }

    // couple combined
    const fullLimit = homeowner ? FULL_LIMIT_COUPLE_HOME_COMBINED : FULL_LIMIT_COUPLE_NONHOME_COMBINED;
    const cutOff = homeowner ? CUTOFF_COUPLE_HOME_COMBINED : CUTOFF_COUPLE_NONHOME_COMBINED;

    if (a >= cutOff) return 0;

    const excess = Math.max(0, a - fullLimit);
    const reduction = (excess / 1000) * ASSETS_TAPER_PER_1000_FT;
    const result = MAX_COUPLE_COMBINED_FT - reduction;
    return clamp(result, MAX_COUPLE_COMBINED_FT);
  }, [status, homeowner, totalAssets]);

  // — Final payment (lower of the two tests) —
  const pensionFt = useMemo(
    () => Math.min(incomeTestFt, assetsTestFt),
    [incomeTestFt, assetsTestFt]
  );

  // — Display helpers —
  const pensionEachFt = status === "couple" ? pensionFt / 2 : pensionFt;
  const annualCombined = pensionFt * 26;
  const annualEach = pensionEachFt * 26;

  // ——— SEO constants ———
  const pageUrl = "https://fintoolbox.com.au/calculators/age-pension";
  const pageTitle = "Age Pension Calculator (Australia)";
  const pageDescription =
    "Estimate your Australian Age Pension using the income and assets tests, with deeming applied to financial assets. Updated for 20 Sep 2025.";

  return (
    <main>
      {/* Heading (matches other calculators) */}
      <header className="max-w-5xl mx-auto px-4 pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Age Pension Calculator (Australia)</h1>
      </header>

      {/* SEO head tag (kept from your version) */}
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
              name: "Age Pension Calculator (Australia)",
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
                { "@type": "ListItem", position: 3, name: "Age Pension" },
              ],
            }),
          }}
        />
      </Head>

      <div className="max-w-5xl mx-auto px-4 mt-4">
        {/* Blue intro card (house style) */}
        <PageIntro tone="blue">
          <div className="space-y-2">
            <p>
              Estimate your fortnightly <em>Age Pension</em> by applying both the{' '}
              <strong>income test</strong> and the <strong>assets test</strong> — the lower result is paid.
              Deeming is automatically applied to financial assets.
            </p>
            <p className="text-[12px] text-blue-900/80">
              Settings reflect <strong>20 Sep 2025</strong> rates and thresholds.
            </p>
          </div>
        </PageIntro>

        <SubtleCtaLink className="mt-3" href="/blog/age-pension-explained">
          New to the Age Pension? Read the explainer →
        </SubtleCtaLink>

        {/* INPUTS – grouped like your ABP layout */}
        <div className="mt-6">
          <SectionCard title="Household & home">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
              <label className="flex flex-col">
                <span className="text-slate-600">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  <option value="single">Single</option>
                  <option value="couple">Couple</option>
                </select>
              </label>

              <label className="flex flex-col">
                <span className="text-slate-600 flex items-center gap-2">
                  Homeowner?
                  <Tooltip text="Select 'Yes' if you (or your partner) own the home you live in." />
                </span>
                <select
                  value={homeowner ? "yes" : "no"}
                  onChange={(e) => setHomeowner(e.target.value === "yes")}
                  className="border rounded px-2 py-1"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
            </div>
          </SectionCard>
        </div>

        <div className="mt-6">
          <SectionCard title="Your assets">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700">
              <label className="flex flex-col">
                <span className="text-slate-600 flex items-center gap-2">
                  Non-deemed assets ($)
                  <Tooltip text="Home contents, vehicles etc. Included in the assets test but NOT deemed for income." />
                </span>
                <CurrencyInput
                  min="0"
                  className="w-full"
                  value={nonDeemedAssets}
                  onChange={setNonDeemedAssets}
                />
              </label>

              <label className="flex flex-col">
                <span className="text-slate-600 flex items-center gap-2">
                  Financial assets subject to deeming ($)
                  <Tooltip text="Cash, term deposits, shares, managed funds, account-based pensions. Included in the assets test AND used to calculate deemed income." />
                </span>
                <CurrencyInput
                  min="0"
                  className="w-full"
                  value={finAssets}
                  onChange={setFinAssets}
                />
              </label>
            </div>

            {/* Helper strip */}
            <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
              <div>
                <span className="font-medium">Total assessable assets:&nbsp;</span>
                {aud0(Math.round(totalAssets))}
              </div>
              <div className="text-[11px] text-blue-900/80 mt-1">
                Both fields are combined for the assets test. Only financial assets are deemed for the income test.
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="mt-6">
          <SectionCard title="Your income">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700">
              <label className="flex flex-col">
                <span className="text-slate-600 flex items-center gap-2">
                  Other assessable income (per fortnight)
                  <Tooltip text="Employment or other assessable income, excluding deeming." />
                </span>
                <input
                  type="number"
                  min="0"
                  className="border rounded px-2 py-1"
                  value={incomeFt}
                  onChange={(e) => setIncomeFt(e.target.value)}
                />
              </label>

              {status === "couple" && (
                <label className="flex flex-col">
                  <span className="text-slate-600">Partner’s other assessable income (per fortnight)</span>
                  <input
                    type="number"
                    min="0"
                    className="border rounded px-2 py-1"
                    value={partnerIncomeFt}
                    onChange={(e) => setPartnerIncomeFt(e.target.value)}
                  />
                </label>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={workBonusYou}
                  onChange={(e) => setWorkBonusYou(e.target.checked)}
                />
                I’m eligible for the Work Bonus
              </label>

              {status === "couple" && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={workBonusPartner}
                    onChange={(e) => setWorkBonusPartner(e.target.checked)}
                  />
                  Partner is eligible for the Work Bonus
                </label>
              )}
            </div>

            <div className="mt-3 rounded-lg bg-blue-50 p-3 text-[12px] text-blue-900">
              If eligible, the first {aud0(WORK_BONUS_FT)} of each person’s employment income per fortnight
              is disregarded under the income test (simplified; carry-forward balances not modelled).
            </div>
          </SectionCard>
        </div>

        {/* RESULTS – Summary cards (house style) */}
        <div className="mt-8">
          <SectionCard>
            <SummaryGrid>
              <SummaryCard label="Income test result (per fortnight)" value={aud0(Math.round(incomeTestFt))} />
              <SummaryCard label="Assets test result (per fortnight)" value={aud0(Math.round(assetsTestFt))} />
              <SummaryCard
                label={status === "couple" ? "Estimated pension (combined / fortnight)" : "Estimated pension (per fortnight)"}
                value={aud0(Math.round(pensionFt))}
              />
              {status === "single" ? (
                <SummaryCard label="Annual payment" value={aud0(Math.round(annualCombined))} />
              ) : (
                <>
                  <SummaryCard label="Your pension (per fortnight)" value={aud0(Math.round(pensionEachFt))} />
                  <SummaryCard label="Partner pension (per fortnight)" value={aud0(Math.round(pensionEachFt))} />
                  <SummaryCard label="Combined annual payment" value={aud0(Math.round(annualCombined))} />
                </>
              )}
              <SummaryCard label="Deemed income (per fortnight)" value={aud0(Math.round(deemedIncomeFt))} />
              <SummaryCard label="Total assessable assets" value={aud0(Math.round(totalAssets))} />
            </SummaryGrid>
          </SectionCard>
        </div>

        {/* ASSUMPTIONS & REFERENCES */}
        <div className="mt-8">
          <SectionCard title="Assumptions & references">
            <ul className="list-disc pl-5 space-y-3 text-sm text-slate-600">
              <li>
                Max rates (20 Sep 2025): single {aud0(MAX_SINGLE_FT)}, couple each {aud0(MAX_COUPLE_EACH_FT)} (combined {aud0(MAX_COUPLE_COMBINED_FT)}).
              </li>
              <li>
                Income test free areas: {aud0(INCOME_FREE_AREA_SINGLE_FT)} (single), {aud0(INCOME_FREE_AREA_COUPLE_COMBINED_FT)} (couple combined).
                Taper: 50c per $1 over free area (combined for couples).
              </li>
              <li>
                Assets test limits & cut-offs as listed above; taper ${ASSETS_TAPER_PER_1000_FT} per $1,000 per fortnight over the full-pension limit.
              </li>
              <li>
                Deeming (20 Sep 2025): {`${(DEEMING_LOWER_RATE * 100).toFixed(2)}%`} to ${DEEMING_THRESHOLD_SINGLE.toLocaleString()} (single) / ${DEEMING_THRESHOLD_COUPLE_COMBINED.toLocaleString()} (couple combined),
                then {`${(DEEMING_UPPER_RATE * 100).toFixed(2)}%`}.
              </li>
              <li>
                Work Bonus (simplified): if ticked, we disregard the first {aud0(WORK_BONUS_FT)} of each eligible person’s employment income per fortnight before applying the income test.
                Carry-forward “Work Bonus balance” is not modelled.
              </li>
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
