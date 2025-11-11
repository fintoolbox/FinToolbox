// pages/index.js
import Head from "next/head";
import Link from "next/link";
import Image from "next/image"
import { Calculator, Home as HomeIcon, Repeat, HandCoins, PiggyBank, ChartColumn } from "lucide-react";
import CardSection from "@/components/ui/CardSection";
import CardLink from "@/components/ui/CardLink";
import ReadingTime from "@/components/ReadingTime";


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
              logo: "https://fintoolbox.com.au/logo.png",
              description: "Financial Calculators & Tools for Australians.",
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
                target:
                  "https://fintoolbox.com.au/search?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </Head>

      {/* ===== HERO (optimized spacing) ===== */}
<section className="bg-gray-50">
  <div className="mx-auto max-w-5xl px-6 pt-6 pb-14 text-center sm:pt-8 sm:pb-16 lg:pt-10 lg:pb-20">
    <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
      FinToolbox
    </h1>
    <p className="mx-auto mt-2 max-w-xl text-lg text-gray-600">
      Financial Calculators &amp; Tools for Australians
    </p>
    <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <Link
        href="/calculators/"
        className="inline-block rounded-md bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
      >
        Explore Calculators
      </Link>
      <Link
        href="/blog"
        className="inline-block rounded-md border border-blue-700 px-6 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
      >
        Read the Blog
      </Link>
    </div>
  </div>
</section>


      <div className="mx-auto max-w-4xl px-6 px-6 pb-6 md:pb-8">
        {/* Calculators */}
        <CardSection title="Calculators" cols={3}>
  <CardLink
    href="/calculators/debt-recycling"
    title="Debt Recycling"
    icon={Repeat}
  >
    Convert your home loan to investment debt
  </CardLink>

  <CardLink
    href="/calculators/tax-calculator"
    title="Income Tax"
    icon={Calculator}
  >
    Calculate your take home pay
  </CardLink>

  <CardLink
    href="/calculators/investment-growth"
    title="Compound Interest"
    icon={PiggyBank}
  >
    Investment growth over time
  </CardLink>

  <CardLink
    href="/calculators/mortgage"
    title="Mortgage Repayments"
    icon={HomeIcon}
  >
    Payoff your home loan faster
  </CardLink>

  <CardLink
    href="/calculators/age-pension"
    title="Centrelink Age Pension"
    icon={HandCoins}
  >
    How much Age Pension you can receive
  </CardLink>

  <CardLink
    href="/calculators/account-based-pension"
    title="Account Based Pension"
    icon={ChartColumn}
  >
    How long your super will last in retirement
  </CardLink>
</CardSection>

        {/* Latest from the Blog */}
<CardSection title="Latest post" cols={1}>
  <ul className="space-y-8">
    {latestPosts.length > 0 ? (
      latestPosts.map((post) => {
        const { slug } = post;
        const {
          title,
          date,
          readingTime,
          wordCount,
          excerpt,
          coverImage,
        } = post.frontmatter;

        return (
          <li key={slug} className="border-b border-gray-200 pb-6 last:border-0">
            <Link
              href={`/blog/${slug}`}
              className="group grid grid-cols-[112px_1fr] gap-4 sm:grid-cols-[192px_1fr] items-start"
            >
              {/* Thumbnail (16:9) */}
              {coverImage ? (
                <div className="relative h-[70px] w-[112px] sm:h-[108px] sm:w-[192px] overflow-hidden rounded-lg bg-gray-200">
                  <Image
                    src={coverImage}
                    alt={title || "Blog post thumbnail"}
                    fill
                    sizes="(min-width: 640px) 192px, 112px"
                    className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                </div>
              ) : (
                <div
                  className="h-[70px] w-[112px] sm:h-[108px] sm:w-[192px] rounded-lg bg-gray-200"
                  aria-hidden="true"
                />
              )}

              {/* Text block */}
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 group-hover:text-blue-700">
                  {title}
                </h2>

                {/* meta row */}
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  {date && (
                    <time dateTime={date} suppressHydrationWarning>
                      {new Date(date).toLocaleDateString("en-AU", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  )}
                  {/* Reading time – keep signature parity */}
                  <ReadingTime minutes={readingTime} words={wordCount} />
                </div>

                {excerpt && <p className="mt-2 text-gray-700">{excerpt}</p>}

                <div className="mt-3">
                  <span className="text-blue-700 hover:underline font-medium">
                    Read more →
                  </span>
                </div>
              </div>
            </Link>
          </li>
        );
      })
    ) : (
      <li className="text-gray-600">No posts yet — check back soon.</li>
    )}
  </ul>
</CardSection>

        {/* Why these calculators */}
        {/*
        <CardSection title="Why these calculators?" cols={1}>
          <div className="leading-relaxed text-gray-700">
            We built these tools to make Australian money questions simple — no
            jargon and a clean interface. They’re designed to give quick,
            accurate answers on tax, investing, and retirement. General
            information only.
          </div>
        </CardSection> */}
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
