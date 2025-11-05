// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      {
        source: "/blog/compund-interest-explained",
        destination: "/blog/compound-interest-explained",
        permanent: true, // 301
      },
    ];
  },
};

export default nextConfig;
