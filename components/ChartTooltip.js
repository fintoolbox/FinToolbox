export default function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-800 shadow-sm">
      <div className="font-medium text-slate-900 mb-1">
        {label}
      </div>

      {payload.map((row, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between gap-4"
        >
          <span className="text-slate-600">{row.name}</span>
          <span className="font-semibold">
            {formatMaybeAUD(row.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// Helper that matches what you show in charts now
function formatMaybeAUD(v) {
  if (!isFinite(v)) return "$0";
  return v.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
