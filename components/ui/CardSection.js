// components/ui/CardSection.js
export default function CardSection({
  title,
  subtitle,
  children,
  cols = 2,            // grid columns at ≥sm
  className = "",
}) {
  const gridCols =
    cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" :
    cols === 1 ? "sm:grid-cols-1" :
                 "sm:grid-cols-2"; // default 2

  return (
    <section className={`my-10 ${className}`}>
      {(title || subtitle) && (
        <header className="mb-4">
          {title && <h2 className="text-2xl font-semibold">{title}</h2>}
          {subtitle && <p className="mt-1 text-gray-600">{subtitle}</p>}
        </header>
      )}

      <div className="rounded-2xl bg-gray-100 border border-gray-200 p-6 shadow-sm">
        {/* Accept either a grid (cards) or plain content */}
        <div className={`grid gap-6 ${gridCols}`}>
          {children}
        </div>
      </div>
    </section>
  );
}
