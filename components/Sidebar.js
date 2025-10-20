// components/Sidebar.js
import Link from "next/link";

function Box({ title, children }) {
  return (
    <div className="w-full rounded-2xl border bg-white p-4 shadow-sm">
      {title && (
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">
          {title}
        </h3>
      )}
      <div>{children}</div>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 flex w-[240px] flex-col items-stretch gap-4">
        {/* Calculators list */}
        <Box title="Calculators">
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/calculators/tax-calculator" className="text-blue-700 hover:underline">
                Income Tax (AU)
              </Link>
            </li>
            <li>
              <Link href="/calculators/investment-growth" className="text-blue-700 hover:underline">
                Compound Interest
              </Link>
            </li>
            <li>
              <Link href="/calculators/mortgage" className="text-blue-700 hover:underline">
                Mortgage Repayments
              </Link>
            </li>
            <li>
              <Link href="/calculators/age-pension" className="text-blue-700 hover:underline">
                Age Pension (Centrelink)
              </Link>
            </li>
          </ul>
        </Box>

        {/* Useful links */}
        <Box title="Useful links">
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/blog" className="text-blue-700 hover:underline">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/about" className="text-blue-700 hover:underline">
                About
              </Link>
            </li>
            <li>
              <Link href="/disclaimer" className="text-blue-700 hover:underline">
                Disclaimer
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-blue-700 hover:underline">
                Contact
              </Link>
            </li>
          </ul>
        </Box>
      </div>
    </aside>
  );
}
