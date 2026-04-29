/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hide the dev-mode "N" indicator badge in the corner.
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.aicec.kr',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
      },
    ],
  },
};

export default nextConfig;
