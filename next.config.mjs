/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.aicec.kr',
      },
    ],
  },
};

export default nextConfig;
