// pages/index.js
import Head from "next/head";
import Link from "next/link";
import CardSection from "@/components/ui/CardSection";
import CardLink from "@/components/ui/CardLink";
import ReadingTime from "@/components/ReadingTime";
import PageHeader from "@/components/ui/PageHeader";

export default function Home({ latestPosts = [] }) {
  return (
    <main className="min-h-screen bg-white">
      <Head>
        <title>FinToolbox | Financial Calculators & Tools for Australians</title>
        <meta
          name="description"
          content="Financial Calculators & Tools for Australians — tax, investing, pensions, and home loans."
        />
        <link rel="canonical" href="https://fintoolbox.com.au" />

        {/* ✅ Structured Data: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "FinToolbox",
              url: "https://fintoolbox.com.au",
              logo: "https://fintoolbox.com.au/og-default.png",
              description:
                "Financial Calculators & Tools for Australians.",
            }),
          }}
        />

        {/* ✅ Structured Data: WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "FinToolbox",
              url: "https://fintoolbox.com.au",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://fintoolbox.com.au/search?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </Head>

      <PageHeader
        title="FinToolbox"
        description="Financial Calculators & Tools for Australians."
      />

      <div className="mx-auto max-w-4xl px-6">
        {/* Calculators */}
        <CardSection title="Calculators">
          <CardLink href="/calculators/tax-calculator" title="Income Tax (AU)">
            Estimate tax payable and take-home pay.
          </CardLink>
          <CardLink
            href="/calculators/investment-growth"
            title="Compound Interest"
          >
            Models growth of investments.
          </CardLink>
          <CardLink href="/calculators/mortgage" title="Mortgage Repayments">
            See repayments and total interest.
          </CardLink>
          <CardLink
            href="/calculators/age-pension"
            title="Age Pension (Centrelink)"
          >
            Guide based on assets &amp; income.
          </CardLink>
        </CardSection>

        {/* Latest from the Blog */}
        <CardSection title="Latest post" cols={1}>
          <ul className="space-y-6">
            {latestPosts.length > 0 ? (
              latestPosts.map((p) => (
                <li
                  key={p.slug}
                  className="border-b last:border-0 border-gray-200 pb-6 last:pb-0"
                >
                  <Link
                    href={`/blog/${p.slug}`}
                    className="text-xl font-semibold text-gray-900 hover:text-blue-700"
                  >
                    {p.frontmatter.title}
                  </Link>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    {p.frontmatter.date && (
                      <time
                        dateTime={p.frontmatter.date}
                        suppressHydrationWarning
                      >
                        {new Date(p.frontmatter.date).toLocaleDateString(
                          "en-AU",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </time>
                    )}
                    <ReadingTime
                      minutes={p.frontmatter.readingTime}
                      words={p.frontmatter.wordCount}
                    />
                  </div>

                  {p.frontmatter.excerpt && (
                    <p className="mt-2 text-gray-700">{p.frontmatter.excerpt}</p>
                  )}

                  <div className="mt-3">
                    <Link
                      href={`/blog/${p.slug}`}
                      className="text-blue-700 hover:underline font-medium"
                    >
                      Read more →
                    </Link>
                  </div>
                </li>
              ))
            ) : (
              <li className="text-gray-600">No posts yet — check back soon.</li>
            )}
          </ul>
        </CardSection>

        {/* Why these calculators */}
        <CardSection title="Why these calculators?" cols={1}>
          <div className="text-gray-700 leading-relaxed">
            We built these tools to make Australian money questions simple — no jargon and a clean interface.
            They’re designed to give quick, accurate answers on tax, investing, and retirement. General information only.
          </div>
        </CardSection>
      </div>
    </main>
  );
}

// Build-time: get latest posts, compute reading stats, newest
export async function getStaticProps() {
  const { getAllPosts } = await import("@/lib/mdx");
  const { readingStats } = await import("@/lib/readingTime");

  const all = getAllPosts();

  const latestPosts = all
    .map((p) => {
      const { words, minutes } = readingStats(p.content || "");
      return {
        ...p,
        frontmatter: {
          ...p.frontmatter,
          readingTime: minutes,
          wordCount: words,
          excerpt: p.frontmatter.excerpt || p.frontmatter.description || "",
        },
      };
    })
    .sort((a, b) => {
      const da = new Date(a.frontmatter.date || 0).getTime();
      const db = new Date(b.frontmatter.date || 0).getTime();
      return db - da;
    })
    .slice(0, 1);

  return { props: { latestPosts } };
}

