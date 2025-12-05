// pages/blog/tags/[tag].js
import Link from "next/link";
import Head from "next/head";
import Image from "next/image";
import SEO from "@/components/SEO";
import ReadingTime from "@/components/ReadingTime";
import { collectTags, tagToSlug } from "@/utils/tags";
import { SITE_URL } from "@/lib/site";

export default function TagPage({ tag, posts }) {
  const siteUrl = SITE_URL;
  const tagUrl = new URL(`/blog/tags/${tag.slug}`, siteUrl).toString();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: new URL("/blog", siteUrl).toString() },
      { "@type": "ListItem", position: 3, name: `Tag: ${tag.tag}`, item: tagUrl },
    ],
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <SEO
          title={`Posts tagged "${tag.tag}" | FinToolbox`}
          description={`Browse FinToolbox blog posts tagged "${tag.tag}".`}
          url={tagUrl}
          image="/og-default.png"
        />

        <Head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
          />
        </Head>

        <div className="mb-4">
          <Link href="/blog" className="text-sm text-blue-700 hover:underline">
            ← Back to blog
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">#{tag.tag}</h1>
        <p className="text-sm text-slate-600 mb-6">
          {posts.length} post{posts.length === 1 ? "" : "s"} tagged with “{tag.tag}”.
        </p>

        <ul className="space-y-8">
          {posts.map((post) => {
            const { slug } = post;
            const { title, date, readingTime, excerpt, coverImage } = post.frontmatter;

            return (
              <li key={slug} className="border-b border-gray-200 pb-6">
                <Link
                  href={`/blog/${slug}`}
                  className="group grid grid-cols-[112px_1fr] gap-4 sm:grid-cols-[192px_1fr] items-start"
                >
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

                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 group-hover:text-blue-700">
                      {title}
                    </h2>
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

export async function getStaticProps({ params }) {
  const { getAllPosts } = await import("@/lib/mdx");
  const { readingStats } = await import("@/lib/readingTime");

  const all = getAllPosts().map((p) => {
    const { minutes, words } = readingStats(p.content);
    return {
      ...p,
      frontmatter: {
        ...p.frontmatter,
        readingTime: minutes,
        wordCount: words,
        excerpt: p.frontmatter.excerpt || p.frontmatter.description || "",
      },
    };
  });

  const targetTag = params.tag;
  const posts = all.filter((p) =>
    Array.isArray(p.frontmatter?.tags)
      ? p.frontmatter.tags.some((t) => tagToSlug(t) === targetTag)
      : false
  );

  if (!posts.length) {
    return { notFound: true };
  }

  // Use the first post's casing for display
  const firstTag = posts[0].frontmatter.tags.find((t) => tagToSlug(t) === targetTag) || targetTag;

  return {
    props: {
      tag: { tag: firstTag, slug: targetTag },
      posts,
    },
  };
}

export async function getStaticPaths() {
  const { getAllPosts } = await import("@/lib/mdx");
  const tags = collectTags(getAllPosts());
  return {
    paths: tags.map((t) => ({ params: { tag: t.slug } })),
    fallback: false,
  };
}
