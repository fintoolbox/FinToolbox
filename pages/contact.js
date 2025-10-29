import Head from "next/head";
import { useState } from "react";
import SEO from "@/components/SEO";
import Link from "next/link";

export default function ContactPage() {
  const siteUrl = "https://fintoolbox.com.au";
  const pageUrl = `${siteUrl}/contact`;
  const pageTitle = "Contact FinToolbox";
  const pageDescription =
    "Got a question, bug report, or feature request? Contact FinToolbox — we read every message.";

  const [status, setStatus] = useState({ state: "idle", msg: "" });

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    // Honeypot anti-spam field
    if (formData.get("company")) {
      setStatus({ state: "error", msg: "Submission blocked." });
      return;
    }

    setStatus({ state: "loading", msg: "Sending…" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          subject: formData.get("subject"),
          message: formData.get("message"),
          consent: formData.get("consent") === "on",
        }),
      });

      if (!res.ok) throw new Error("Request failed");

      setStatus({ state: "success", msg: "Thanks! We’ll get back to you soon." });
      form.reset();
    } catch {
      setStatus({
        state: "error",
        msg: "Couldn’t send right now. You can also email us directly: hello@fintoolbox.com.au",
      });
    }
  }

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
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "hello@fintoolbox.com.au",
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
            Questions, bugs, or feature ideas? Send a message below. We aim to reply within a couple of business days.
          </p>

          <div className="mt-6 rounded-2xl border p-5">
            <form onSubmit={onSubmit} className="grid gap-4" noValidate>
              {/* Honeypot field */}
              <input
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="name">
                  Your name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="e.g. Jane Citizen"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="subject">
                  Subject
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  required
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="Feature request, bug report, question…"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  required
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="Tell us the details…"
                />
              </div>

              <label className="flex items-start gap-2 text-sm">
                <input id="consent" name="consent" type="checkbox" required className="mt-1" />
                <span>
                  I understand FinToolbox provides general information only and that my message may be stored to help respond.
                </span>
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-60"
                  disabled={status.state === "loading"}
                >
                  {status.state === "loading" ? "Sending…" : "Send message"}
                </button>

                {/* Mail fallback */}
                <a
                  href="mailto:hello@fintoolbox.com.au?subject=FinToolbox%20Contact"
                  className="text-sm text-blue-700 hover:underline"
                >
                  or email hello@fintoolbox.com.au
                </a>
              </div>

              {status.state !== "idle" && (
                <p
                  className={
                    status.state === "success"
                      ? "text-sm text-green-700"
                      : status.state === "error"
                      ? "text-sm text-red-700"
                      : "text-sm text-gray-600"
                  }
                  role={status.state === "error" ? "alert" : undefined}
                >
                  {status.msg}
                </p>
              )}
            </form>

            <p className="mt-4 text-xs text-gray-500">
              No Facebook or LinkedIn yet. For media or partnership queries, please use the subject line “Media”.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border p-5">
            <h2 className="text-lg font-semibold text-gray-900">Before you write</h2>
            <ul className="mt-1 list-disc pl-5 text-gray-700 space-y-1">
              <li>We can’t provide personal financial advice.</li>
              <li>Bug reports: include device, browser, and steps to reproduce.</li>
              <li>Feature ideas: links or screenshots help a lot.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

