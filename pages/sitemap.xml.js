// pages/sitemap.xml.js
export async function getServerSideProps({ res }) {
  const siteUrl = 'https://fintoolbox.com.au';

  // Import on the server (so fs stays server-side)
  const { getAllPosts } = await import('../lib/mdx'); // adjust path if needed
  const posts = getAllPosts(); // this internally uses fs

  // Add any static pages you want indexed
  const staticPaths = [
    '',
    '/calculators/mortgage',
    '/blog',
  ];

  const urls = [
    ...staticPaths.map((p) => `${siteUrl}${p}`),
    ...posts.map((p) => `${siteUrl}/blog/${p.slug}`),
  ];

  const lastmod = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls
      .map(
        (u) => `<url>
      <loc>${u}</loc>
      <lastmod>${lastmod}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.7</priority>
    </url>`
      )
      .join('')}
  </urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.write(xml);
  res.end();

  return { props: {} };
}

// This page renders nothing because we stream the XML in getServerSideProps
export default function SiteMap() {
  return null;
}
