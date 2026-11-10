import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const rawPrivateKey = process.env.DEPLOYER_PRIVATE_KEY?.trim() ?? "";
const deployerAccounts = rawPrivateKey
  ? [rawPrivateKey.startsWith("0x") ? rawPrivateKey : `0x${rawPrivateKey}`]
  : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    botTestnet: {
      url: process.env.BOT_TESTNET_RPC || "https://rpc.bohr.life",
      chainId: 968,
      accounts: deployerAccounts,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;

