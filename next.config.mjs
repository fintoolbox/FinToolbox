// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      // 1) Force www → apex (avoids duplicate host versions in GSC)
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.fintoolbox.com.au" }],
        destination: "https://fintoolbox.com.au/:path*",
        permanent: true, // 301
      },

      // 2) Guard against accidental literal dynamic route being linked
      {
        source: "/blog/[slug]",
        destination: "/blog",
        permanent: true, // 301 to the blog index
      },

      // 3) Known typo → correct slug (keep adding more here as needed)
      {
        source: "/blog/compund-interest-explained",
        destination: "/blog/compound-interest-explained",
        permanent: true, // 301
      },
    ];
  },
};

export default nextConfig;
