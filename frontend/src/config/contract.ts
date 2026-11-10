import { isAddress, zeroAddress, type Address } from "viem";
import BOTHOTPotatoAbi from "@/abi/BOTHOTPotato.json";

/**
 * Fallback deployed contract address on BOT Chain Testnet (Chain ID 968).
 * You can either update this constant after deploying or set CONTRACT_ADDRESS in the root .env file.
 */
export const DEFAULT_CONTRACT_ADDRESS =
  "0xf53aE405B0CbAe24427b709Dff73fcE317019a6B";

export const BOT_HOT_POTATO_ABI = BOTHOTPotatoAbi;

export function resolveContractAddress(runtimeAddress?: string): Address | null {
  const candidate = (runtimeAddress || DEFAULT_CONTRACT_ADDRESS).trim();
  if (!candidate || !isAddress(candidate) || candidate.toLowerCase() === zeroAddress) {
    return null;
  }
  return candidate as Address;
}

