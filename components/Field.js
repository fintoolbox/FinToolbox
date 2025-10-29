// components/Field.js
export function Field({ label, suffix, helper, children }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      <div className="flex items-center gap-2">
        <span className="font-medium">{label}</span>
        {suffix && (
          <span className="text-xs text-slate-500 font-normal">{suffix}</span>
        )}
      </div>

      {children /* the actual <input .../> */}

      {helper && (
        <span className="text-[11px] text-slate-500 leading-snug">
          {helper}
        </span>
      )}
    </label>
  );
}
