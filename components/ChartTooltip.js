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
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
      {/* Label */}
      <div className="mb-1 text-[11px] font-medium text-slate-800">
        {labelFormatter ? labelFormatter(label) : label}
      </div>

      {/* Series rows */}
      <div className="space-y-1">
        {items.map((p, idx) => {
          const color = p.color || (p.payload && p.payload.fill) || "#334155";
          const name = p.name ?? p.dataKey ?? `Series ${idx + 1}`;
          const val = valueFormatter(p.value);

          return (
            <div key={`${name}-${idx}`} className="flex items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-slate-600">{name}</span>
              </div>
              <span className="tabular-nums text-slate-900">{val}</span>
            </div>
          );
        })}
      </div>

      {/* Optional total */}
      {showTotal && (
        <div className="mt-2 border-t border-slate-100 pt-1 text-right text-[11px]">
          <span className="text-slate-500">{totalPrefix}</span>
          <span className="tabular-nums text-slate-900">{valueFormatter(total)}</span>
        </div>
      )}
    </div>
  );
}

