import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env so server components can read REOWN_ID and CONTRACT_ADDRESS
dotenv.config({ path: path.resolve(__dirname, "../.env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@x402/core": false,
      "@x402/core/client": false,
      "@x402/evm": false,
      "@x402/evm/exact/client": false,
      "@x402/evm/upto/client": false,
      "@x402/svm": false,
      "@x402/svm/exact/client": false,
      mppx: false,
      "mppx/client": false,
      "@metamask/connect-evm": false,
      accounts: false,
    };
    return config;
  },
};

export default nextConfig;

