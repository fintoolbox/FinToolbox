import Link from "next/link";
import { useRouter } from "next/router";

const links = [
  { href: "/", label: "Home" },
  { href: "/calculators/tax-calculator", label: "Income Tax" },
  { href: "/calculators/account-based-pension", label: "Account Based Pension" },
  { href: "/calculators/mortgage", label: "Mortgage" },
  { href: "/calculators/age-pension", label: "Age Pension" },
  { href: "/blog", label: "Blog" },
];

export default function Header() {
  const { pathname } = useRouter();
  const isActive = (href) => pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold text-gray-900 hover:text-blue-700">
          FinToolbox
        </Link>

        <nav className="hidden items-center gap-5 text-sm sm:flex" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={[
                "rounded-md px-2 py-1 transition-colors",
                isActive(l.href)
                  ? "text-blue-700 font-semibold bg-blue-50"
                  : "text-gray-700 hover:text-blue-800",
              ].join(" ")}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/contact"
          className="hidden sm:inline-block rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors"
        >
          Contact
        </Link>
      </div>
    </header>
  );
}
