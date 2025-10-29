// components/ResultStat.js
export default function ResultStat({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-semibold text-slate-900">
        {value}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
