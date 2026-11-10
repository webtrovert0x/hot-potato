import { GameArena } from "@/components/GameArena";
import { getServerRuntimeConfig } from "@/lib/serverEnv";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const { reownId, contractAddress } = getServerRuntimeConfig();

  return (
    <main>
      <GameArena
        hasReownId={reownId.length > 0}
        runtimeContractAddress={contractAddress}
      />
    </main>
  );
}

