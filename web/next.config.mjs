/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@eclipse/crypto", "@eclipse/sdk"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Required for Barretenberg WASM + top-level await in bb.js
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
      layers: true,
    };

    // bb.js uses top-level await — must be treated as async module
    config.module.rules.push({
      test: /node_modules\/@aztec\/bb\.js/,
      resolve: {
        fullySpecified: false,
      },
    });

    // Don't bundle these WASM-heavy packages on the server
    if (isServer) {
      config.externals = [...(config.externals ?? []),
        "@aztec/bb.js",
        "@noir-lang/backend_barretenberg",
        "@noir-lang/noir_js",
        "@noir-lang/acvm_js",
        "@noir-lang/noirc_abi",
        "@eclipse/proof-gen",
      ];
    }

    return config;
  },
};

export default nextConfig;
