// components/ui/CardLink.js
import Link from "next/link";

export default function CardLink({
  href,
  title,
  icon: Icon,
  children,
  prefetch = true, // 👈 NEW: allow turning prefetch off
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className="group block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm
                 transition hover:shadow-md hover:border-blue-300"
    >
      <div className="flex flex-col items-start text-left">
        {Icon && (
          <div
            className="mb-3 flex h-16 w-16 items-center justify-center rounded-xl
                       bg-blue-50 text-blue-700 transition
                       group-hover:bg-blue-600 group-hover:text-white"
          >
            <Icon size={36} strokeWidth={1.8} />
          </div>
        )}
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 leading-relaxed text-gray-600">{children}</p>
      </div>
    </Link>
  );
}
