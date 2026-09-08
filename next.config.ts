
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'export', // Enables static HTML export
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Required for static export if using next/image with non-standard loaders
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http', // Allow http for OpenWeatherMap icons
        hostname: 'openweathermap.org',
        port: '',
        pathname: '/img/wn/**',
      },
      { // Added for icon.horse service
        protocol: 'https',
        hostname: 'icon.horse',
        port: '',
        pathname: '/**',
      },
      { // Added for Google Favicon service (backup or manual entry)
        protocol: 'https',
        hostname: 'www.google.com',
        port: '',
        pathname: '/s2/favicons/**',
      }
    ],
  },
};

export default nextConfig;
