import Head from "next/head";
import { useEffect, useState } from "react";
import SEO from "@/components/SEO";

export default function ContactPage() {
  const siteUrl = "https://fintoolbox.com.au";
  const pageUrl = `${siteUrl}/contact`;
  const pageTitle = "Contact FinToolbox";
  const pageDescription =
    "Got a question, bug report, or feature request? Contact FinToolbox — we read every message.";

  // NOTE: keep the real email pieces here, but split so the full address
  // isn't present in the compiled HTML as a single string.
  // Adjust these parts if you want to change the email later.
  const emailUser = "hello.fintoolbox";
  const emailDomain = "gmail.com";
  const emailSubject = "FinToolbox Contact";

  const [emailVisible, setEmailVisible] = useState("");
  const [mailtoHref, setMailtoHref] = useState("");
  const [copyStatus, setCopyStatus] = useState("idle"); // idle | copied | error

  useEffect(() => {
    // Reconstruct in browser only
    const email = `${emailUser}@${emailDomain}`;
    setEmailVisible(email);
    setMailtoHref(`mailto:${email}?subject=${encodeURIComponent(emailSubject)}`);
  }, []);

  function copyEmail() {
    if (!emailVisible) return;
    navigator.clipboard
      .writeText(emailVisible)
      .then(() => {
        setCopyStatus("copied");
        setTimeout(() => setCopyStatus("idle"), 2500);
      })
      .catch(() => {
        // fallback: create temporary input
        try {
          const input = document.createElement("input");
          input.value = emailVisible;
          document.body.appendChild(input);
          input.select();
          document.execCommand("copy");
          document.body.removeChild(input);
          setCopyStatus("copied");
          setTimeout(() => setCopyStatus("idle"), 2500);
        } catch {
          setCopyStatus("error");
          setTimeout(() => setCopyStatus("idle"), 2500);
        }
      });
  }

  // JSON-LD WITHOUT email to avoid exposing it in the page source
  const contactJsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: pageTitle,
    description: pageDescription,
    url: pageUrl,
    isPartOf: { "@type": "WebSite", name: "FinToolbox", url: siteUrl },
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "FinToolbox",
    url: siteUrl,
    // intentionally omitted contactPoint.email to reduce scraping surface
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        availableLanguage: ["English"],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-white">
      <SEO
        title={pageTitle}
        description={pageDescription}
        url={pageUrl}
        image="/og-default.png"
      />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </Head>

      <section className="py-12">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-3xl font-bold text-gray-900">Contact</h1>
          <p className="mt-2 text-gray-700">
            We love to hear about feature requests, partnerships and guest posts.
            Email us and we&lsquo;ll get back to you within a couple of days. And we definitely hate spam as much as you do!
          </p>

          <div className="mt-6 rounded-2xl border p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-600">Email</p>

                {/* The visible email is only rendered client-side via useEffect */}
                <div className="mt-1 flex items-center gap-3">
                  {emailVisible ? (
                    <a
                      href={mailtoHref}
                      className="text-lg font-medium text-blue-700 hover:underline break-all"
                    >
                      {emailVisible}
                    </a>
                  ) : (
                    <span className="text-lg font-medium text-gray-700">[email hidden — enable JavaScript]</span>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  // mailtoHref is empty until client-side runs; that's OK — the link will be hydrated
                  href={mailtoHref || "#"}
                  onClick={(e) => {
                    if (!mailtoHref) {
                      e.preventDefault();
                      // If JS not yet ready, do nothing
                    }
                  }}
                  className="inline-flex items-center rounded-lg bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
                >
                  Open email app
                </a>

                <button
                  type="button"
                  onClick={copyEmail}
                  className="inline-flex items-center rounded-lg border px-4 py-2 text-gray-800 hover:bg-gray-50"
                  aria-live="polite"
                  aria-pressed={copyStatus === "copied"}
                >
                  {copyStatus === "copied" ? "Copied!" : "Copy email"}
                </button>
              </div>
            </div>

            
            <noscript className="mt-4 block text-sm text-gray-600">
              JavaScript is required to view the email address. If JavaScript is disabled for your browser,
              please try emailing <strong>hello [dot] fintoolbox [at] gmail [dot] com</strong> (replace brackets).
            </noscript>
          </div>

          <div className="mt-8 rounded-2xl border p-5">
            <h2 className="text-lg font-semibold text-gray-900">Get in touch! We want to hear from you:</h2>
            <ul className="mt-1 list-disc pl-5 text-gray-700 space-y-1">
              <li>To build a community of like minded finance enthusiasts</li>
              <li>Hear your ideas for features or new calculators that you&lsquo;d find useful</li>
              <li>Tell us about other sites we can link to and build our community</li>
              <li>Advertising products and services on our site that our community will find useful.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
