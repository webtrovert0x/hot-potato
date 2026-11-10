import fs from "fs";
import path from "path";
import dotenv from "dotenv";

function loadRootEnvIfNeeded() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
  ];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
  }
}

export function getServerRuntimeConfig() {
  loadRootEnvIfNeeded();
  return {
    reownId: process.env.REOWN_ID?.trim() ?? "",
    contractAddress: process.env.CONTRACT_ADDRESS?.trim() ?? "",
  };
}

