// components/SummaryCard.js
export default function SummaryCard({
  label,
  value,
  note,
  badgeText,
  badgeTone,
  suffix,
  className = "",
}) {
  const badgeColour =
    badgeTone === "positive"
      ? "bg-green-50 text-green-700 ring-green-200"
      : badgeTone === "negative"
      ? "bg-red-50 text-red-700 ring-red-200"
      : "bg-slate-50 text-slate-700 ring-slate-200";

  // Detect if caller is supplying their own background or border colour
  const classes = className.split(/\s+/);
  const hasBg = classes.some((c) => c.startsWith("bg-"));
  const hasBorderColor = classes.some((c) => c.startsWith("border-") && c !== "border");

  return (
    <div
      className={[
        "rounded-xl",
        "border",
        hasBorderColor ? "" : "border-slate-200",
        hasBg ? "" : "bg-white",
        "p-4",
        "shadow-sm",
        "flex flex-col justify-between",
        className,
      ].join(" ").trim()}
    >
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="mt-1 text-lg font-semibold text-slate-900">
  {value}
  {suffix && (
    <span className="ml-1 text-[11px] font-normal text-slate-600">
      {suffix}
    </span>
  )}
</div>

        {note ? <div className="mt-1 text-[11px] text-slate-500">{note}</div> : null}
      </div>

      {badgeText ? (
        <div className={`mt-3 self-end rounded-full px-2 py-1 text-[11px] ring-1 ${badgeColour}`}>
          {badgeText}
        </div>
      ) : null}
    </div>
  );
}

