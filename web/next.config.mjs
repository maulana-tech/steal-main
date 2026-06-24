/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@eclipse/crypto", "@eclipse/proof-gen", "@eclipse/sdk"],
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
};

export default nextConfig;
