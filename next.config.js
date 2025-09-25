/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  webpack: (config) => {
    // Optimize bundle splitting
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        default: false,
        vendors: false,
        vendor: {
          name: 'vendor',
          chunks: 'all',
          test: /node_modules/,
          priority: 20
        },
        common: {
          minChunks: 2,
          priority: 10,
          reuseExistingChunk: true
        }
      }
    };
    
    // Worker files are currently not used with worker-loader
    // Keeping this commented in case we want to enable it later
    // config.module.rules.push({
    //   test: /\.worker\.(js|ts)$/,
    //   use: { loader: 'worker-loader' }
    // });
    
    return config;
  }
};

module.exports = nextConfig;