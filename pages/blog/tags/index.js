// pages/blog/tags/index.js
import Link from "next/link";
import Head from "next/head";
import SEO from "@/components/SEO";
import { collectTags } from "@/utils/tags";
import { SITE_URL } from "@/lib/site";

export default function TagsIndex({ tags }) {
  const siteUrl = SITE_URL;
  const pageUrl = new URL("/blog/tags", siteUrl).toString();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: new URL("/blog", siteUrl).toString() },
      { "@type": "ListItem", position: 3, name: "Tags", item: pageUrl },
    ],
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <SEO
          title="Blog Tags | FinToolbox"
          description="Browse FinToolbox blog posts by topic."
          url={pageUrl}
          image="/og-default.png"
        />

        <Head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
          />
        </Head>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Tags</h1>
        <p className="text-sm text-slate-600 mb-4">
          Explore posts by topic. Click a tag to see all related articles.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tags.map((tag) => (
            <Link
              key={tag.slug}
              href={`/blog/tags/${tag.slug}`}
              className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-blue-200 hover:text-blue-800"
            >
              <span>#{tag.tag}</span>
              <span className="text-xs text-slate-500 group-hover:text-blue-700">{tag.count} posts</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

export async function getStaticProps() {
  const { getAllPosts } = await import("@/lib/mdx");
  const tags = collectTags(getAllPosts());
  return { props: { tags } };
}
