/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdfkit'],
  images: {
    unoptimized: true,
  },
  // Edge Runtime対応
  async headers() {
    return [
      {
        source: '/api/evaluate',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
