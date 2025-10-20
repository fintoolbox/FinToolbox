// pages/calculators/age-pension.js
import { useMemo, useState } from "react";
import Head from "next/head";

/** ─────────────────────────────────────────────────────────────────────
 *  Official settings from 20 Sep 2025 (Services Australia)
 *  Keep these in one place so they’re easy to update next indexation.
 *  ─────────────────────────────────────────────────────────────────────
 *
 *  Max payment (per fortnight, before tax):
 *   - Single: $1,178.70
 *   - Couple (each): $888.50   → combined $1,777.00
 *
 *  Income test (standard rules):
 *   - Free area: $218 (single), $380 (couple combined)
 *   - Reduction: 50c per $1 over free area (single),
 *                25c each (i.e., 50c combined) per $1 over free area (couple)
 *
 *  Assets test:
 *   - Full pension asset limits (homeowner / non-homeowner)
 *     Single: $321,500 / $579,500
 *     Couple combined: $481,500 / $739,500
 *   - Part-pension cut-offs
 *     Single: $714,500 / $972,500
 *     Couple combined: $1,074,000 / $1,332,000
 *   - Taper: $3 per $1,000 (per fortnight) over the relevant threshold
 *
 *  Deeming (financial assets only):
 *   - Singles: 0.75% to $64,200; 2.75% above
 *   - Couples combined: 0.75% to $106,200; 2.75% above
 */

// ——— Maximum rates (per fortnight) ———
const MAX_SINGLE_FT = 1178.70;
const MAX_COUPLE_EACH_FT = 888.50;
const MAX_COUPLE_COMBINED_FT = MAX_COUPLE_EACH_FT * 2; // 1,777.00

// ——— Income test: free areas & taper ———
const INCOME_FREE_AREA_SINGLE_FT = 218;
const INCOME_FREE_AREA_COUPLE_COMBINED_FT = 380;
// Single reduces 50c per $ over; couple reduces 25c each = 50c combined:
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

// Helpers
const clamp = (x, max) => Math.max(0, Math.min(x, max));
const aud0 = (n) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

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

  // — Inputs for tests —
  // Field 1: assets that do NOT attract deeming (home contents, vehicles, etc.)
  const [nonDeemedAssets, setNonDeemedAssets] = useState(200000);
  // Field 2: financial assets that ARE deemed (cash, shares, managed funds, ABPs, etc.)
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
    if (status === "single") {
      const totalIncome = (Number(incomeFt) || 0) + deemedIncomeFt;
      const excess = Math.max(0, totalIncome - INCOME_FREE_AREA_SINGLE_FT);
      const reduction = excess * INCOME_TAPER_SINGLE_PER_$;
      const result = MAX_SINGLE_FT - reduction;
      return clamp(result, MAX_SINGLE_FT);
    }

    // couple — combine both partners’ other income, add deemed income once (threshold is combined)
    const combinedOther = (Number(incomeFt) || 0) + (Number(partnerIncomeFt) || 0);
    const combinedIncome = combinedOther + deemedIncomeFt;
    const excess = Math.max(0, combinedIncome - INCOME_FREE_AREA_COUPLE_COMBINED_FT);
    const reductionCombined = excess * INCOME_TAPER_COUPLE_COMBINED_PER_$;
    const combinedResult = MAX_COUPLE_COMBINED_FT - reductionCombined;
    return clamp(combinedResult, MAX_COUPLE_COMBINED_FT);
  }, [status, incomeFt, partnerIncomeFt, deemedIncomeFt]);

  // — Assets test (now uses totalAssets = nonDeemedAssets + finAssets) —
  const assetsTestFt = useMemo(() => {
    const a = Math.max(0, Number(totalAssets) || 0);

    if (status === "single") {
      // choose homeowner vs non-homeowner threshold
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

  const pageUrl = "https://fintoolbox.com.au/calculators/age-pension";
  const pageTitle = "Age Pension Calculator (Australia)";
  const pageDescription =
    "Estimate your Australian Age Pension using the income and assets tests, with deeming applied to financial assets. Updated for 20 Sep 2025.";

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
              name: "Age Pension Calculator (Australia)",
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
                { "@type": "ListItem", position: 3, name: "Age Pension" }
              ]
            }),
          }}
        />
      </Head>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* <a href="/" className="text-sm text-blue-600 hover:underline">&larr; Back</a> */}
        <h1 className="mt-3 text-3xl font-bold text-gray-900">
          Age Pension Calculator (Australia) – Updated Estimate
        </h1>

        {/* Current settings note */}
        <div className="mt-3 rounded-lg bg-brand-50 p-4 text-sm text-gray-800">
          <div className="font-semibold">Current settings (from 20 Sep 2025)</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Max rate: {aud0(MAX_SINGLE_FT)} (single), {aud0(MAX_COUPLE_EACH_FT)} each for couples (combined {aud0(MAX_COUPLE_COMBINED_FT)}).</li>
            <li>Income test: free area {aud0(INCOME_FREE_AREA_SINGLE_FT)} (single), {aud0(INCOME_FREE_AREA_COUPLE_COMBINED_FT)} (couple combined); taper 50c per $1 over (combined for couples).</li>
            <li>Assets test (full pension limits): single {aud0(FULL_LIMIT_SINGLE_HOME)} / {aud0(FULL_LIMIT_SINGLE_NONHOME)} (home / non-home), couple combined {aud0(FULL_LIMIT_COUPLE_HOME_COMBINED)} / {aud0(FULL_LIMIT_COUPLE_NONHOME_COMBINED)}.</li>
            <li>Assets cut-offs (no pension): single {aud0(CUTOFF_SINGLE_HOME)} / {aud0(CUTOFF_SINGLE_NONHOME)}; couple combined {aud0(CUTOFF_COUPLE_HOME_COMBINED)} / {aud0(CUTOFF_COUPLE_NONHOME_COMBINED)}.</li>
            <li>Deeming: 0.75% to ${DEEMING_THRESHOLD_SINGLE.toLocaleString()} (single) / ${DEEMING_THRESHOLD_COUPLE_COMBINED.toLocaleString()} (couple combined), then 2.75%.</li>
          </ul>
          <p className="mt-2 text-[11px] text-gray-600">General information only.</p>
        </div>

        <p className="mt-3 text-gray-600">
          This tool estimates your fortnightly Age Pension by applying both the income and assets tests and taking the lower result. Deeming is included for financial assets.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Inputs */}
          <div className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            >
              <option value="single">Single</option>
              <option value="couple">Couple</option>
            </select>

            <label className="block text-sm font-medium text-gray-700">Homeowner?</label>
            <select
              value={homeowner ? "yes" : "no"}
              onChange={(e) => setHomeowner(e.target.value === "yes")}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>

            <label className="block text-sm font-medium text-gray-700">
              Non-deemed assets ($)
              <span className="block text-xs font-normal text-gray-500">
                Home contents, vehicles, etc. (not subject to deeming). Included in the assets test.
              </span>
            </label>
            <input
              type="number"
              min="0"
              value={nonDeemedAssets}
              onChange={(e) => setNonDeemedAssets(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
            />

            <label className="block text-sm font-medium text-gray-700">
              Financial assets subject to deeming ($)
              <span className="block text-xs font-normal text-gray-500">
                Cash, term deposits, shares, managed funds, account-based pensions. Included in the assets test and used to calculate deemed income.
              </span>
            </label>
            <input
              type="number"
              min="0"
              value={finAssets}
              onChange={(e) => setFinAssets(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
            />

            <div className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900 space-y-1">
              <div><span className="font-medium">Total assessable assets:</span> {aud0(Math.round(totalAssets))}</div>
              <div><span className="font-medium">Deemed income (fortnight):</span> {aud0(Math.round(deemedIncomeFt))}</div>
            </div>

            <label className="block text-sm font-medium text-gray-700">Other assessable income (per fortnight)</label>
            <input
              type="number"
              min="0"
              value={incomeFt}
              onChange={(e) => setIncomeFt(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
            />

            {status === "couple" && (
              <>
                <label className="block text-sm font-medium text-gray-700">Partner’s other assessable income (per fortnight)</label>
                <input
                  type="number"
                  min="0"
                  value={partnerIncomeFt}
                  onChange={(e) => setPartnerIncomeFt(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                />
              </>
            )}
          </div>

          {/* Results */}
          <div className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-gray-500">Income test result</div>
                <div className="mt-1 text-2xl font-semibold">{aud0(Math.round(incomeTestFt))}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Assets test result</div>
                <div className="mt-1 text-2xl font-semibold">{aud0(Math.round(assetsTestFt))}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-gray-500">Estimated pension (per fortnight)</div>
                <div className="mt-1 text-2xl font-semibold">{aud0(Math.round(pensionFt))}</div>

                <div className="mt-2 text-sm text-gray-600">
                  Annual payment:{" "}
                  <span className="font-semibold">{aud0(Math.round(pensionFt * 26))}</span>
                </div>
              </div>
            </div>

            <div className="mt-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              Notes: this is a simplified estimate. For couples, the estimated pension is the total combined pension amount (both members receive 50% of this amount).
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-5 text-sm text-gray-600 shadow-sm space-y-2">
          <p className="font-medium">Assumptions & references</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Max rates and payment components (from 20 Sep 2025): single {aud0(MAX_SINGLE_FT)}, couple each {aud0(MAX_COUPLE_EACH_FT)} (combined {aud0(MAX_COUPLE_COMBINED_FT)}).</li>
            <li>Income test free areas and taper (standard rules): single ${INCOME_FREE_AREA_SINGLE_FT}, couple combined ${INCOME_FREE_AREA_COUPLE_COMBINED_FT}, taper 50c per $ over free area.</li>
            <li>Assets test limits and cut-offs as listed above; taper $3 per $1,000 per fortnight over the full-pension limit.</li>
            <li>Deeming rates & thresholds (20 Sep 2025): 0.75% to ${DEEMING_THRESHOLD_SINGLE.toLocaleString()} (single) / ${DEEMING_THRESHOLD_COUPLE_COMBINED.toLocaleString()} (couple combined), then 2.75%.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
