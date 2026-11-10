import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "@/components/Web3Provider";
import { getServerRuntimeConfig } from "@/lib/serverEnv";

export const metadata: Metadata = {
  title: "BOT Hot Potato | BOT Chain Testnet",
  description:
    "Multiplayer on-chain Hot Potato arcade game on BOT Chain Testnet (Chain ID 968). Don't hold it when the clock hits zero.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { reownId } = getServerRuntimeConfig();

  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <Web3Provider reownId={reownId}>{children}</Web3Provider>
      </body>
    </html>
  );
}
