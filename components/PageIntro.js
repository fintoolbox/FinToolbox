// components/PageIntro.js
import React from "react";

/**
 * A simple, reusable info card that sits under the page heading.
 * Tones: "blue" | "slate" | "amber"
 */
export default function PageIntro({
  tone = "blue",
  title,          // optional bold title at the top
  children,       // your paragraph(s)
  className = "", // extra classes if needed
}) {
  const toneMap = {
    blue:  { bg: "bg-blue-50",  border: "border-blue-200",  text: "text-slate-900",  title: "text-slate-950" },
    slate: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-800", title: "text-slate-900" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", title: "text-amber-950" },
  };
  const t = toneMap[tone] || toneMap.blue;

  return (
    <div className={`rounded-lg border ${t.bg} ${t.border} p-4 text-sm ${t.text} ${className}`}>
      {title ? <div className={`font-semibold ${t.title}`}>{title}</div> : null}
      {children}
    </div>
  );
}
