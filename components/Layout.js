// components/Layout.js
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Breadcrumbs from "./Breadcrumbs";

const links = [
  { href: "/", label: "Home" },
  { href: "/calculators/tax-calculator", label: "Income Tax" },
  { href: "/calculators/investment-growth", label: "Compound Interest" },
  { href: "/calculators/mortgage", label: "Mortgage" },
  { href: "/calculators/age-pension", label: "Age Pension" },
  { href: "/blog", label: "Blog" },
];

function Year() {
  const [y, setY] = useState("");
  useEffect(() => setY(String(new Date().getFullYear())), []);
  return <span suppressHydrationWarning>{y}</span>;
}

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useRouter();
  const isActive = (href) => pathname === href || (href !== "/" && pathname.startsWith(href));

  const siteUrl = "https://fintoolbox.com.au";

  // JSON-LD (site-wide)
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "FinToolbox",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "FinToolbox",
    url: siteUrl,
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Head>
        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" />

        {/* Core SEO */}
        <title>FinToolbox — Smart Financial Calculators</title>
        <meta
          name="description"
          content="Financial Calculators & Tools for Australians — free, accurate, and easy to use."
        />
        <link rel="canonical" href={siteUrl} />

        {/* Open Graph / Social */}
        <meta property="og:title" content="FinToolbox — Smart Financial Calculators" />
        <meta property="og:description" content="Financial Calculators & Tools for Australians." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:image" content="/og-image.jpg" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FinToolbox — Smart Financial Calculators" />
        <meta name="twitter:description" content="Financial Calculators & Tools for Australians." />
        <meta name="twitter:image" content="/og-image.jpg" />

        {/* JSON-LD */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      </Head>

      {/* Skip link for accessibility */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 rounded bg-black px-3 py-2 text-white"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-xl font-bold text-gray-900 transition-colors hover:text-blue-700"
            aria-label="FinToolbox — Financial Calculators & Tools for Australians"
          >
            FinToolbox
            <span className="sr-only"> — Financial Calculators &amp; Tools for Australians</span>
          </Link>

          {/* Desktop nav */}
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

          {/* Mobile menu button */}
          <button
            className="rounded-lg border px-3 py-1 text-sm sm:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>

        {/* Mobile dropdown */}
        {open && (
          <div className="sm:hidden border-t bg-white" id="mobile-nav">
            <nav className="mx-auto max-w-6xl px-6 py-3 text-sm" aria-label="Primary mobile">
              <div className="grid gap-2">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-2 py-2 hover:bg-gray-100"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main content (no sidebar) */}
      <main id="main" className="mx-auto max-w-5xl px-6 py-10">
        <Breadcrumbs />
        {children}

        {/* Footer */}
        <footer className="mt-10 border-t bg-white">
          <div className="px-6 py-6 text-sm text-gray-600">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p>
                © <Year /> FinToolbox. General information only.
              </p>
              <div className="flex gap-4">
                <Link href="/about" className="hover:text-blue-700">
                  About
                </Link>
                <Link href="/disclaimer" className="hover:text-blue-700">
                  Disclaimer
                </Link>
                <Link href="/contact" className="hover:text-blue-700">
                  Contact
                </Link>
                <Link href="/blog" className="hover:text-blue-700">
                  Blog
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
