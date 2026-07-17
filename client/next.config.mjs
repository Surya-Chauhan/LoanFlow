/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
// Backend origin = API URL without the "/api" suffix.
const backendOrigin = apiUrl.replace(/\/api\/?$/, "");

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
  },
  // Proxy /uploads to the backend so document/image URLs work in production.
  // Only added when a real backend origin is configured (skips the localhost dev default
  // harmlessly — the client also builds absolute URLs via getFileUrl()).
  async rewrites() {
    if (!backendOrigin || backendOrigin.includes("localhost")) {
      return [];
    }
    return [
      {
        source: "/uploads/:path*",
        destination: `${backendOrigin}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
