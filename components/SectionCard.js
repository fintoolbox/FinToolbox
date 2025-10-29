export default function SectionCard({ title, aside, children }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
      {(title || aside) && (
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
          {title && (
            <h2 className="text-xl font-semibold text-slate-900">
              {title}
            </h2>
          )}

          {aside && (
            <div className="text-sm text-slate-500 leading-snug md:text-right">
              {aside}
            </div>
          )}
        </div>
      )}

      <div>{children}</div>
    </section>
  );
}
