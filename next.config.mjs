/** @type {import('next').NextConfig} */
const nextConfig = {
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
