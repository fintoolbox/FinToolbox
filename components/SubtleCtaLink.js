// components/SubtleCtaLink.js
import Link from "next/link";

/**
 * A small, low-contrast CTA/link that sits *between* the intro card and the first content card.
 * Spacing is tuned to look visually centered between padded blocks.
 */
export default function SubtleCtaLink({
  href,
  children,
  className = "",
}) {
  return (
    <p className={`mt-4 mb-2 text-xs text-indigo-700 font-medium ${className}`}>
      <Link href={href} className="underline hover:no-underline">
        {children}
      </Link>
    </p>
  );
}
