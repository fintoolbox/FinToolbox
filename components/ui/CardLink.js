import Link from "next/link";

export default function CardLink({ href, title, children }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm
                 transition hover:shadow-md hover:border-brand-300
                 hover:border-l-4 hover:border-l-brand-500"
    >
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <p className="mt-2 text-gray-600 leading-relaxed">{children}</p>
    </Link>
  );
}

