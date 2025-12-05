// components/ChartTooltip.js
import React from "react";
import { number0 } from "@/utils/format";

/**
 * Reusable tooltip content for Recharts.
 *
 * Props:
 * - valueFormatter: (n) => string   (default: number0)
 * - labelFormatter: (label) => string  (optional)
 * - showTotal: boolean (optional)     → sums payload values and shows a footer line
 * - totalPrefix: string (optional)    → e.g. "Total: "
 */
export default function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = number0,
  labelFormatter,
  showTotal = false,
  totalPrefix = "Total: ",
}) {
  if (!active || !payload || payload.length === 0) return null;

  // Filter out undefined/NaN and hidden series
  const items = payload.filter(
    (p) => p && typeof p.value !== "undefined" && !Number.isNaN(p.value)
  );

  const total = items.reduce((sum, p) => sum + (Number(p.value) || 0), 0);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/95 px-4 py-3 text-slate-900 shadow-[0_22px_50px_-28px_rgba(15,23,42,0.7)] ring-1 ring-white/80 backdrop-blur">
      {/* Label */}
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />
        <span>{labelFormatter ? labelFormatter(label) : label}</span>
      </div>

      {/* Series rows */}
      <div className="space-y-1.5">
        {items.map((p, idx) => {
          const color = p.color || (p.payload && p.payload.fill) || "#334155";
          const name = p.name ?? p.dataKey ?? `Series ${idx + 1}`;
          const val = valueFormatter(p.value);

          return (
            <div
              key={`${name}-${idx}`}
              className="flex items-center justify-between gap-3 text-[12px] leading-snug"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-sm ring-2 ring-white/80"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="text-slate-700">{name}</span>
              </div>
              <span className="tabular-nums font-medium text-slate-900">{val}</span>
            </div>
          );
        })}
      </div>

      {/* Optional total */}
      {showTotal && (
        <div className="mt-3 border-t border-slate-100 pt-2 text-right text-[12px]">
          <span className="text-slate-500">{totalPrefix}</span>
          <span className="ml-1 tabular-nums font-semibold text-slate-900">
            {valueFormatter(total)}
          </span>
        </div>
      )}
    </div>
  );
}

