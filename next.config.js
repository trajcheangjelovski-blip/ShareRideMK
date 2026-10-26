/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // The app renders plain <img> tags and never uses next/image. Keeping the
    // optimizer off (and without remotePatterns) removes the image-optimization
    // endpoint's remote attack surface on Next 14.
    unoptimized: true,
  },
};

module.exports = nextConfig;
