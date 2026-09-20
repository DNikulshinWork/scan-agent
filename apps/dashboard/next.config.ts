import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
const repoName = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isProd && repoName ? repoName : '',
  assetPrefix: isProd && repoName ? `${repoName}/` : '',
  images: { unoptimized: true },
  trailingSlash: true,
  turbopack: {},
};

export default nextConfig;
