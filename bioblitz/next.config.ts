/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      // Redirect bare domain → www so Google only indexes one canonical version
      {
        source: "/:path*",
        has: [{ type: "host", value: "bioblitz.net" }],
        destination: "https://www.bioblitz.net/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;