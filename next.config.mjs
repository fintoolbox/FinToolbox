// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      // Keep your existing slug fix
      {
        source: "/blog/compund-interest-explained",
        destination: "/blog/compound-interest-explained",
        permanent: true,
      },

      // OPTIONAL: host canonicalisation (www -> apex)
      // Vercel's "Redirect traffic to primary domain" already handles this at the edge,
      // but this keeps things consistent if a request reaches Next.js.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.fintoolbox.com.au" }],
        destination: "https://fintoolbox.com.au/:path*",
        permanent: true, // sends a 308 on Vercel
      },
    ];
  },
};

export default nextConfig;
