// pages/blog/[slug].js
import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import { MDXRemote } from "next-mdx-remote";
import SEO from "@/components/SEO";
import Tooltip from "@/components/Tooltip";
import MDXComponents from "@/components/MDXComponents";
import ReadingTime from "@/components/ReadingTime";
import { SITE_URL } from "@/lib/site";
import { tagToSlug } from "@/utils/tags";

export default function BlogPostPage({ source, frontmatter, slug }) {
  const siteUrl = SITE_URL;

  // Self URL for this post
  const blogUrl = new URL(`/blog/${slug}`, siteUrl).toString();

  // Canonical override map (when a post intentionally targets a calculator keyword)
  const canonicalOverrideMap = {
    "mortgage-repayment-calculator-australia": new URL("/calculators/mortgage", siteUrl).toString(),
    // "some-other-post-slug": new URL("/calculators/some-other-calculator", siteUrl).toString(),
  };

  const canonicalUrl = canonicalOverrideMap[slug] || blogUrl;

  const title = frontmatter?.title || slug;
  const description = frontmatter?.excerpt || frontmatter?.description || "";
  const image = frontmatter?.coverImage || new URL("/og-default.png", siteUrl).toString();

  const published = frontmatter?.date || null;
  const modified = frontmatter?.updatedAt || frontmatter?.updated || frontmatter?.date || null;

  // JSON-LD: Breadcrumbs
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: new URL("/blog", siteUrl).toString() },
      { "@type": "ListItem", position: 3, name: title, item: blogUrl },
    ],
  };

  // JSON-LD: BlogPosting
  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    mainEntityOfPage: { "@type": "WebPage", "@id": blogUrl },
    headline: title,
    description,
    image: new URL(image, siteUrl).toString(),
    author: frontmatter?.author
      ? { "@type": "Person", name: frontmatter.author }
      : { "@type": "Organization", name: "FinToolbox" },
    publisher: {
      "@type": "Organization",
      name: "FinToolbox",
      logo: { "@type": "ImageObject", url: new URL("/og-default.png", siteUrl).toString() },
    },
    datePublished: published || undefined,
    dateModified: modified || undefined,
    inLanguage: "en-AU",
    keywords: Array.isArray(frontmatter?.tags) ? frontmatter.tags.join(", ") : undefined,
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Canonical + base meta */}
        <SEO title={title} description={description} url={canonicalUrl} image={image} />

        {/* Article meta + JSON-LD */}
        <Head>
          <meta property="og:type" content="article" />
          <meta property="article:published_time" content={published || ""} />
          <meta property="article:modified_time" content={modified || ""} />
          {Array.isArray(frontmatter?.tags) &&
            frontmatter.tags.map((t) => <meta key={t} property="article:tag" content={t} />)}
          <meta name="author" content={frontmatter?.author || "FinToolbox"} />
          <meta property="og:image:alt" content={title} />

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }}
          />
        </Head>

        <h1 className="mt-3 text-3xl font-bold text-gray-900">{title}</h1>

        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
          {frontmatter?.date && (
            <time dateTime={frontmatter.date} suppressHydrationWarning>
              {new Date(frontmatter.date).toLocaleDateString("en-AU", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          )}
          <ReadingTime minutes={frontmatter?.readingTime} />
          {frontmatter?.author && <span>by {frontmatter.author}</span>}
        </div>

        {Array.isArray(frontmatter?.tags) && frontmatter.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {frontmatter.tags.map((tag) => {
              const slugTag = tagToSlug(tag);
              return (
                <Link
                  key={slugTag}
                  href={`/blog/tags/${slugTag}`}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 transition hover:border-blue-200 hover:bg-blue-100"
                >
                  #{tag}
                </Link>
              );
            })}
          </div>
        )}

        {/* Cover image */}
        {frontmatter?.coverImage && (
          <div className="mt-6">
            <Image
              src={frontmatter.coverImage}
              alt={frontmatter?.coverAlt || title}
              width={1200}
              height={630}
              priority
              className="rounded-xl mb-8"
            />
          </div>
        )}

        <article className="prose prose-gray max-w-none">
          <MDXRemote
            {...source}
            components={{
              Image, // allow <Image /> inside MDX
              Tooltip, // allow <Tooltip /> inside MDX
              ...MDXComponents,
            }}
          />
        </article>

        <div className="mt-8">
          <Link href="/blog" className="text-blue-700 hover:underline">
            {"<- Back to blog"}
          </Link>
        </div>
      </div>
    </main>
  );
}

// Build-time: load a single post and serialize MDX
export async function getStaticProps({ params }) {
  const { getPostBySlug } = await import("@/lib/mdx");
  const { readingStats } = await import("@/lib/readingTime");
  const { content, frontmatter } = getPostBySlug(params.slug);

  const { words, minutes } = readingStats(content);
  frontmatter.readingTime = minutes;
  frontmatter.wordCount = words;

  const { serialize } = await import("next-mdx-remote/serialize");
  const remarkGfm = (await import("remark-gfm")).default;
  const rehypeSlug = (await import("rehype-slug")).default;
  const rehypeAutolinkHeadings = (await import("rehype-autolink-headings")).default;

  const mdxSource = await serialize(content, {
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
    },
    scope: frontmatter,
  });

  return { props: { source: mdxSource, frontmatter, slug: params.slug } };
}

// Build-time: generate paths for all posts
export async function getStaticPaths() {
  const { getPostSlugs } = await import("@/lib/mdx");
  const files = getPostSlugs();
  const slugs = files.map((f) => f.replace(/\.mdx$/, ""));
  return { paths: slugs.map((slug) => ({ params: { slug } })), fallback: false };
}
