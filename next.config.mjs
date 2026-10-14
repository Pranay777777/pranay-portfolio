/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ['192.168.29.116'],
  devIndicators: false,
  images: {
    qualities: [75, 80, 85, 95, 100],
  },
};

export default nextConfig;
