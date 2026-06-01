import type { NextConfig } from "next";
import path from "path";

const asyncStorageStub = path.join(
  process.cwd(),
  "src/lib/webpack/async-storage-stub.js"
);

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  webpack: (config, { isServer }) => {
    // MetaMask SDK (via RainbowKit/wagmi) references React Native storage — stub for web.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": asyncStorageStub,
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "@react-native-async-storage/async-storage": asyncStorageStub,
      };
    }

    return config;
  },
};

export default nextConfig;
