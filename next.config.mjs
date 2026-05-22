/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source:      '/partners',
        destination: '/partners.html',
        permanent:   false,
      },
    ];
  },
};

export default nextConfig;
