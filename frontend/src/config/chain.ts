import { defineChain } from "viem";

export const BOT_CHAIN_TESTNET_ID = 968;
export const BOT_CHAIN_TESTNET_RPC = "https://rpc.bohr.life";
export const BOT_SCAN_URL = "https://scan.bohr.life";

export const botChainTestnet = defineChain({
  id: BOT_CHAIN_TESTNET_ID,
  name: "BOT Chain Testnet",
  nativeCurrency: {
    name: "BOT",
    symbol: "BOT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [BOT_CHAIN_TESTNET_RPC],
    },
  },
  blockExplorers: {
    default: {
      name: "BOTScan",
      url: BOT_SCAN_URL,
    },
  },
  testnet: true,
});

export function getTxExplorerUrl(txHash: string): string {
  return `${BOT_SCAN_URL}/tx/${txHash}`;
}

export function getAddressExplorerUrl(address: string): string {
  return `${BOT_SCAN_URL}/address/${address}`;
}

