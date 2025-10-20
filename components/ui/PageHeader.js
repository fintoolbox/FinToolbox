// components/ui/PageHeader.js
export default function PageHeader({ title, description, children }) {
  return (
    <section className="relative mx-6">
      {/* Soft shadow that appears just below the sticky site header */}
      <div className="pointer-events-none absolute -top-4 inset-x-0 h-4 bg-gradient-to-b from-black/10 to-transparent rounded-t-2xl" />

      {/* The header card is pulled up slightly (-mt) so it tucks under the sticky header */}
      <div className="relative -mt-6 lg:-mt-8 rounded-2xl border border-gray-200 bg-gray-100 shadow-lg ring-1 ring-black/5">
        <div className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-4 text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
              {description}
            </p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
