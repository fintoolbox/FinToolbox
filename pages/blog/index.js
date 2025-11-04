// pages/blog/index.js
import Link from "next/link";
import Image from "next/image";
import ReadingTime from "@/components/ReadingTime";
import SEO from "@/components/SEO";
import Head from "next/head";

export default function BlogIndex({ posts }) {
  const siteUrl = "https://fintoolbox.com.au";
  const pageUrl = `${siteUrl}/blog`;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: pageUrl },
    ],
  };

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "FinToolbox Blog",
    url: pageUrl,
    description:
      "Articles on personal finance, investing, tax and retirement for Australians — clear explanations with simple calculators.",
  };

  // ItemList for article listing on the index page
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: posts.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteUrl}/blog/${p.slug}`,
      name: p.frontmatter.title,
    })),
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <SEO
          title="Blog | FinToolbox"
          description="Articles on personal finance, investing, tax and retirement — clear explanations with simple calculators."
          url={pageUrl}
          image="/og-default.png"
        />

        <Head>
          {/* JSON-LD: Breadcrumbs, Blog, and the ItemList of posts */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
          />
        </Head>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Blog</h1>

        <ul className="space-y-8">
          {posts.map((post) => {
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
              <li key={slug} className="border-b border-gray-200 pb-6">
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
                        priority={false}
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
                      <ReadingTime minutes={readingTime} />
                    </div>

                    {excerpt && <p className="mt-2 text-gray-700">{excerpt}</p>}

                    <div className="mt-3">
                      {/* Expose a real link for SRs even though the whole card is clickable */}
                      <span className="text-blue-700 hover:underline font-medium">
                        Read more →
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}

// ✅ Server-only imports + compute reading stats + sort newest first
export async function getStaticProps() {
  const { getAllPosts } = await import("@/lib/mdx");
  const { readingStats } = await import("@/lib/readingTime");

  const posts = getAllPosts()
    .map((p) => {
      const { words, minutes } = readingStats(p.content);
      return {
        ...p,
        frontmatter: {
          ...p.frontmatter,
          readingTime: minutes,
          wordCount: words,
          // Allow either "excerpt" or "description" to feed the list
          excerpt: p.frontmatter.excerpt || p.frontmatter.description || "",
        },
      };
    })
    .sort((a, b) => {
      const da = new Date(a.frontmatter.date || 0).getTime();
      const db = new Date(b.frontmatter.date || 0).getTime();
      return db - da; // newest first
    });

  return { props: { posts } };
}
