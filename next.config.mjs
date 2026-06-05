/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Force use of Babel instead of SWC
  experimental: {
    forceSwcTransforms: false,
  },
}

export default nextConfig
