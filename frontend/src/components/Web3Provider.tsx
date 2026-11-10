"use client";

import React, { createContext, useContext, useMemo, useRef } from "react";
import { createAppKit, type AppKit } from "@reown/appkit/react";
import { defineChain as defineAppKitChain } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http, type Config } from "wagmi";
import {
  BOT_CHAIN_TESTNET_ID,
  BOT_CHAIN_TESTNET_RPC,
  BOT_SCAN_URL,
  botChainTestnet,
} from "@/config/chain";

interface WalletModalContextValue {
  openWalletModal: () => void;
  isAppKitReady: boolean;
}

const WalletModalContext = createContext<WalletModalContextValue>({
  openWalletModal: () => {},
  isAppKitReady: false,
});

export function useWalletModal() {
  return useContext(WalletModalContext);
}

const appKitBotChain = defineAppKitChain({
  id: BOT_CHAIN_TESTNET_ID,
  caipNetworkId: `eip155:${BOT_CHAIN_TESTNET_ID}`,
  chainNamespace: "eip155",
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

let cachedAppKit: AppKit | null = null;
let cachedWagmiConfig: Config | null = null;
let cachedProjectId = "";

function getOrCreateWeb3Config(reownId: string): {
  wagmiConfig: Config;
  appKit: AppKit | null;
} {
  const trimmedId = reownId.trim();

  if (!trimmedId) {
    if (!cachedWagmiConfig || cachedProjectId !== "") {
      cachedProjectId = "";
      cachedAppKit = null;
      cachedWagmiConfig = createConfig({
        chains: [botChainTestnet],
        transports: {
          [botChainTestnet.id]: http(BOT_CHAIN_TESTNET_RPC),
        },
        ssr: true,
      });
    }
    return { wagmiConfig: cachedWagmiConfig, appKit: null };
  }

  if (!cachedWagmiConfig || !cachedAppKit || cachedProjectId !== trimmedId) {
    const wagmiAdapter = new WagmiAdapter({
      ssr: true,
      projectId: trimmedId,
      networks: [appKitBotChain],
    });

    const metadata = {
      name: "BOT Hot Potato",
      description: "Multiplayer on-chain Hot Potato game on BOT Chain Testnet",
      url: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
      icons: [],
    };

    const appKit = createAppKit({
      adapters: [wagmiAdapter],
      networks: [appKitBotChain],
      defaultNetwork: appKitBotChain,
      projectId: trimmedId,
      metadata,
      themeMode: "dark",
      themeVariables: {
        "--w3m-accent": "#ff6a00",
        "--w3m-border-radius-master": "2px",
      },
      features: {
        analytics: false,
      },
    });

    const wagmiConfig = wagmiAdapter.wagmiConfig as unknown as Config;
    cachedAppKit = appKit;
    cachedWagmiConfig = wagmiConfig;
    cachedProjectId = trimmedId;
    return { wagmiConfig, appKit };
  }

  return { wagmiConfig: cachedWagmiConfig, appKit: cachedAppKit };
}

export function Web3Provider({
  reownId,
  children,
}: {
  reownId: string;
  children: React.ReactNode;
}) {
  const queryClientRef = useRef<QueryClient | null>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient();
  }

  const { wagmiConfig, appKit } = useMemo(
    () => getOrCreateWeb3Config(reownId),
    [reownId]
  );

  const modalCtx = useMemo<WalletModalContextValue>(
    () => ({
      isAppKitReady: Boolean(appKit),
      openWalletModal: () => {
        void appKit?.open();
      },
    }),
    [appKit]
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClientRef.current}>
        <WalletModalContext.Provider value={modalCtx}>
          {children}
        </WalletModalContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

