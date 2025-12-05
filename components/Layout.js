// components/Layout.js
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import Breadcrumbs from "./Breadcrumbs";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SITE_URL } from "@/lib/site";
import { inter } from "@/lib/fonts";

const links = [
  { href: "/", label: "Home" },
  { href: "/calculators", label: "Calculators" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

// added back vercel 
const CURRENT_YEAR = new Date().getFullYear();

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useRouter();
  const isActive = (href) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  const siteUrl = SITE_URL;

  // Site-wide JSON-LD (global)
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "FinToolbox",
    url: siteUrl,
    logo: new URL("/logo.png", siteUrl).toString(),
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "FinToolbox",
    url: siteUrl,
  };

  return (
    <div className={`${inter.className} min-h-screen bg-gray-50 text-gray-900`}>
      <Head>
        {/* Favicons & App Icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#ffffff" />

        {/* IMPORTANT: page-specific SEO is handled by <SEO /> or local <Head> in each page */}

        {/* Global structured data */}
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

      {/* Header / nav */}
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
                  isActive(l.href) ? "text-blue-700 font-semibold bg-blue-50" : "text-gray-700 hover:text-blue-800",
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
                  <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-2 py-2 hover:bg-gray-100">
                    {l.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main id="main" className="mx-auto max-w-5xl px-6 py-10">
        <Breadcrumbs />
        {children}

        {/* Footer */}
        <footer className="mt-10 border-t bg-white">
          <div className="px-6 py-6 text-sm text-gray-600">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p>© {CURRENT_YEAR} FinToolbox. General information only.</p>
              <div className="flex gap-4">
                <Link href="/about" className="hover:text-blue-700">About</Link>
                <Link href="/disclaimer" className="hover:text-blue-700">Disclaimer</Link>
                <Link href="/contact" className="hover:text-blue-700">Contact</Link>
                <Link href="/blog" className="hover:text-blue-700">Blog</Link>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* Vercel Speed Insights (optional perf analytics) */}
      <SpeedInsights />
    </div>
  );
}
