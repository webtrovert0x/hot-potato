"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  History,
  Loader2,
  Play,
  RefreshCw,
  ShieldAlert,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { isAddress, zeroAddress } from "viem";
import {
  BOT_CHAIN_TESTNET_ID,
  getAddressExplorerUrl,
  getTxExplorerUrl,
} from "@/config/chain";
import { resolveContractAddress } from "@/config/contract";
import { useHotPotatoGame } from "@/hooks/useHotPotatoGame";
import { formatCountdown, formatTimestamp, shortenAddress } from "@/lib/format";
import { PotatoIllustration } from "./PotatoIllustration";
import { useWalletModal } from "./Web3Provider";

interface GameArenaProps {
  hasReownId: boolean;
  runtimeContractAddress?: string;
}

export function GameArena({ hasReownId, runtimeContractAddress }: GameArenaProps) {
  const contractAddress = useMemo(
    () => resolveContractAddress(runtimeContractAddress),
    [runtimeContractAddress]
  );

  const game = useHotPotatoGame(contractAddress);
  const { openWalletModal } = useWalletModal();

  const [recipientInput, setRecipientInput] = useState("");
  const [initialHolderInput, setInitialHolderInput] = useState("");
  const [durationInput, setDurationInput] = useState("120");
  const [activeTab, setActiveTab] = useState<"history" | "activity">("history");

  // Validate pass recipient address before enabling submission
  const recipientValidation = useMemo(() => {
    const trimmed = recipientInput.trim();
    if (!trimmed) {
      return { valid: false, message: "Enter a recipient wallet address (0x...)" };
    }
    if (!isAddress(trimmed)) {
      return { valid: false, message: "Invalid EVM wallet address format." };
    }
    if (trimmed.toLowerCase() === zeroAddress) {
      return { valid: false, message: "Cannot pass the potato to the zero address." };
    }
    if (
      game.connectedAddress &&
      trimmed.toLowerCase() === game.connectedAddress.toLowerCase()
    ) {
      return { valid: false, message: "Cannot pass the potato to yourself!" };
    }
    return { valid: true, message: null };
  }, [recipientInput, game.connectedAddress]);

  const isWriting = game.txPhase === "signing" || game.txPhase === "confirming";

  const canPassPotato =
    Boolean(contractAddress) &&
    game.isConnected &&
    !game.isWrongNetwork &&
    game.gameStatus === "Active" &&
    !game.isExpiredPendingEnd &&
    game.isCurrentUserHolder &&
    recipientValidation.valid &&
    !isWriting;

  const startHolderEffective =
    initialHolderInput.trim() || game.connectedAddress || "";

  const startValidation = useMemo(() => {
    if (!startHolderEffective) {
      return { valid: false, message: "Enter an initial holder wallet address." };
    }
    if (!isAddress(startHolderEffective) || startHolderEffective.toLowerCase() === zeroAddress) {
      return { valid: false, message: "Enter a valid non-zero EVM address." };
    }
    const sec = Number(durationInput);
    if (!Number.isInteger(sec) || sec < 60 || sec > 3600) {
      return { valid: false, message: "Duration must be 60 to 3600 seconds." };
    }
    return { valid: true, message: null };
  }, [startHolderEffective, durationInput]);

  async function handlePassSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canPassPotato) return;
    const ok = await game.passPotato(recipientInput.trim());
    if (ok) {
      setRecipientInput("");
    }
  }

  async function handleStartRound(e: React.FormEvent) {
    e.preventDefault();
    if (!startValidation.valid || isWriting) return;
    await game.startRound(startHolderEffective, Number(durationInput));
  }

  const statusBadgeStyles =
    game.gameStatus === "Active"
      ? game.isExpiredPendingEnd
        ? "border-red-500/60 bg-red-500/20 text-red-300"
        : "border-emerald-400/50 bg-emerald-500/15 text-emerald-300"
      : game.gameStatus === "Finished"
      ? "border-amber-400/50 bg-amber-500/15 text-amber-300"
      : "border-zinc-600 bg-zinc-800/70 text-zinc-300";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      {/* Top Network Bar */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-arcade-border bg-arcade-surface/85 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-arcade-orange shadow-[0_0_10px_#ff6a00]" />
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-amber-200">
            BOT Chain Testnet · Chain ID {BOT_CHAIN_TESTNET_ID}
          </span>
          <span className="hidden rounded-md border border-arcade-border bg-arcade-bg px-2 py-0.5 font-mono text-[11px] text-amber-300/80 sm:inline-block">
            Gas-Only · 0 Fees
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {game.isWrongNetwork && (
            <button
              type="button"
              onClick={() => void game.switchToBotTestnet()}
              disabled={game.isSwitchingChain}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/70 bg-red-600/25 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-600/40"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {game.isSwitchingChain ? "Switching..." : "Switch to BOT Testnet (968)"}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (hasReownId) {
                void openWalletModal();
              }
            }}
            disabled={!hasReownId}
            className="arcade-btn inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-arcade-orange to-arcade-amber px-4 py-2 text-sm font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Wallet className="h-4 w-4" />
            {game.isConnected && game.connectedAddress
              ? shortenAddress(game.connectedAddress, 4)
              : hasReownId
              ? "Connect Wallet"
              : "Set REOWN_ID in .env"}
          </button>
        </div>
      </header>

      {/* Configuration Alerts (only shown when env/deployment missing) */}
      {(!hasReownId || !contractAddress) && (
        <div className="mb-6 space-y-2">
          {!hasReownId && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-arcade-yellow" />
              <div>
                <span className="font-bold">Reown AppKit Project ID missing:</span> Add{" "}
                <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs text-arcade-yellow">
                  REOWN_ID=your_project_id
                </code>{" "}
                to your root <code className="font-mono text-xs">.env</code> file and restart the server to enable wallet connections.
              </div>
            </div>
          )}
          {!contractAddress && (
            <div className="flex items-start gap-3 rounded-xl border border-orange-500/40 bg-orange-950/30 px-4 py-3 text-sm text-orange-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-arcade-orange" />
              <div>
                <span className="font-bold">Contract not deployed yet:</span> Deploy{" "}
                <code className="font-mono text-xs text-arcade-yellow">BOTHOTPotato.sol</code> to BOT Chain Testnet (Chain ID 968) using{" "}
                <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs">
                  npm run deploy:testnet
                </code>{" "}
                and set <code className="font-mono text-xs">CONTRACT_ADDRESS</code> in{" "}
                <code className="font-mono text-xs">.env</code>.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hero Section */}
      <section className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-arcade-orange/40 bg-arcade-orange/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-arcade-yellow">
          <Zap className="h-3.5 w-3.5 text-arcade-orange" />
          On-Chain Multiplayer Arcade
        </div>
        <h1 className="font-display text-4xl font-black tracking-tight text-white drop-shadow-[0_4px_24px_rgba(255,106,0,0.45)] sm:text-6xl">
          BOT{" "}
          <span className="bg-gradient-to-r from-arcade-orange via-arcade-amber to-arcade-yellow bg-clip-text text-transparent">
            HOT POTATO
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base font-medium text-amber-100/80 sm:text-lg">
          “Don’t hold it when the clock hits zero.”
        </p>
      </section>

      {/* Game Status HUD */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="arcade-card rounded-2xl p-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-amber-200/55">
            Current Round
          </div>
          <div className="mt-1 font-display text-2xl font-black text-white">
            {game.roundInfo.roundId > 0n ? `#${game.roundInfo.roundId.toString()}` : "—"}
          </div>
        </div>

        <div className="arcade-card rounded-2xl p-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-amber-200/55">
            Round Status
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider ${statusBadgeStyles}`}
            >
              {game.gameStatus}
            </span>
          </div>
        </div>

        <div className="arcade-card rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-200/55">
            <Clock className="h-3.5 w-3.5 text-arcade-amber" />
            Countdown
          </div>
          <div
            className={`mt-1 font-mono text-2xl font-black tabular-nums ${
              game.gameStatus === "Active" && game.secondsRemaining <= 15
                ? "animate-pulse text-red-400"
                : "text-arcade-yellow"
            }`}
          >
            {game.gameStatus === "Active"
              ? formatCountdown(game.secondsRemaining)
              : "00:00"}
          </div>
        </div>

        <div className="arcade-card rounded-2xl p-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-amber-200/55">
            Last Loser
          </div>
          <div className="mt-1.5 font-mono text-sm font-bold text-amber-100">
            {game.roundInfo.lastLosingHolder !== zeroAddress ? (
              <a
                href={getAddressExplorerUrl(game.roundInfo.lastLosingHolder)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-arcade-yellow"
              >
                {shortenAddress(game.roundInfo.lastLosingHolder, 5)}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            ) : (
              <span className="text-amber-200/40">None yet</span>
            )}
          </div>
        </div>
      </section>

      {/* Main Arena: Potato Stage + Action Controls */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Potato Stage */}
        <section className="arcade-card relative flex flex-col items-center justify-between rounded-3xl p-6 lg:col-span-6">
          <div className="flex w-full items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300/75">
              <Flame className="h-4 w-4 text-arcade-orange" />
              Live Arena State
            </span>
            <button
              type="button"
              onClick={() => void game.refreshAll()}
              disabled={!contractAddress || game.isLoadingState}
              className="inline-flex items-center gap-1 rounded-lg border border-arcade-border bg-arcade-bg/80 px-2.5 py-1 text-xs font-semibold text-amber-200/80 transition hover:border-arcade-orange/60 hover:text-white disabled:opacity-40"
            >
              <RefreshCw
                className={`h-3 w-3 ${game.isLoadingState ? "animate-spin" : ""}`}
              />
              Sync
            </button>
          </div>

          <PotatoIllustration
            status={game.gameStatus}
            secondsRemaining={game.secondsRemaining}
            currentHolder={game.roundInfo.currentHolder}
            isCurrentUserHolder={game.isCurrentUserHolder}
            isExpiredPendingEnd={game.isExpiredPendingEnd}
            passCount={game.passPulseCount}
          />

          {game.stateError && (
            <div className="mt-2 w-full rounded-xl border border-red-500/40 bg-red-950/30 px-3 py-2 text-center text-xs text-red-200">
              {game.stateError}
            </div>
          )}

          {contractAddress && (
            <div className="mt-4 flex w-full items-center justify-between border-t border-arcade-border/70 pt-3 text-xs text-amber-200/60">
              <span>Contract:</span>
              <a
                href={getAddressExplorerUrl(contractAddress)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-amber-200 hover:text-arcade-yellow"
              >
                {shortenAddress(contractAddress, 6)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </section>

        {/* Right: Pass Potato & Round Controls */}
        <section className="flex flex-col gap-5 lg:col-span-6">
          {/* Pass Potato Card */}
          <div className="arcade-card rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-xl font-black text-white">
                <ArrowRightLeft className="h-5 w-5 text-arcade-orange" />
                Pass the Potato
              </h2>
              <span className="rounded-lg border border-arcade-border bg-arcade-bg px-2.5 py-1 font-mono text-[11px] text-amber-200/70">
                Gas Fee Only
              </span>
            </div>

            <form onSubmit={handlePassSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="recipient-address"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-amber-200/70"
                >
                  Recipient Wallet Address
                </label>
                <input
                  id="recipient-address"
                  type="text"
                  value={recipientInput}
                  onChange={(e) => {
                    setRecipientInput(e.target.value);
                    if (game.txPhase === "error" || game.txPhase === "confirmed") {
                      game.resetTxStatus();
                    }
                  }}
                  placeholder="0x..."
                  spellCheck={false}
                  autoComplete="off"
                  className="w-full rounded-xl border border-arcade-border bg-arcade-bg px-4 py-3 font-mono text-sm text-white placeholder-amber-200/25 outline-none transition focus:border-arcade-orange"
                />
                {recipientInput.trim().length > 0 && recipientValidation.message && (
                  <p className="mt-1.5 text-xs font-medium text-red-400">
                    {recipientValidation.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!canPassPotato}
                className="arcade-btn flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-arcade-orange via-arcade-amber to-arcade-yellow px-5 py-3.5 text-base font-black uppercase tracking-wide text-black disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {isWriting && game.txAction === "pass" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {game.txPhase === "signing"
                      ? "Confirm in Wallet..."
                      : "Waiting for Confirmation..."}
                  </>
                ) : (
                  <>
                    <Flame className="h-5 w-5" />
                    Pass Potato Now
                  </>
                )}
              </button>

              {/* Contextual helper message */}
              <p className="text-center text-xs text-amber-200/60">
                {!game.isConnected
                  ? "Connect your wallet to play."
                  : game.isWrongNetwork
                  ? "Switch to BOT Chain Testnet (Chain ID 968) to pass."
                  : game.gameStatus !== "Active"
                  ? "No active round right now."
                  : game.isExpiredPendingEnd
                  ? "Time expired! Finalize the round below."
                  : game.isCurrentUserHolder
                  ? "You are holding the hot potato! Pass it before 00:00."
                  : `Only the current holder (${shortenAddress(
                      game.roundInfo.currentHolder,
                      4
                    )}) can pass the potato.`}
              </p>
            </form>

            {/* End Round CTA when timer has hit 0 */}
            {game.isExpiredPendingEnd && (
              <div className="mt-5 rounded-2xl border border-red-500/50 bg-red-950/35 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-black uppercase text-red-300">
                      Clock Hit Zero!
                    </div>
                    <p className="text-xs text-red-200/80">
                      Anyone can finalize this round on-chain and lock in the losing wallet.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void game.endRound()}
                  disabled={isWriting || !game.isConnected || game.isWrongNetwork}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/60 bg-red-600 px-4 py-2.5 text-sm font-black uppercase text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isWriting && game.txAction === "end" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Finalizing Round...
                    </>
                  ) : (
                    "Finalize Expired Round (endRound)"
                  )}
                </button>
              </div>
            )}

            {/* Transaction Status Banner — success ONLY shown after on-chain confirmation */}
            {game.txPhase !== "idle" && (
              <div
                className={`mt-4 rounded-xl border px-4 py-3 text-xs ${
                  game.txPhase === "confirmed"
                    ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-200"
                    : game.txPhase === "error"
                    ? "border-red-500/50 bg-red-950/40 text-red-200"
                    : "border-amber-500/50 bg-amber-950/40 text-amber-100"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold">
                    {game.txPhase === "signing" && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-arcade-yellow" />
                        <span>Approve transaction in your wallet...</span>
                      </>
                    )}
                    {game.txPhase === "confirming" && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-arcade-orange" />
                        <span>Transaction submitted. Waiting for BOT Chain confirmation...</span>
                      </>
                    )}
                    {game.txPhase === "confirmed" && (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>
                          {game.txAction === "pass"
                            ? "Potato passed & confirmed on-chain!"
                            : game.txAction === "end"
                            ? "Round finalized & confirmed on-chain!"
                            : "New round started & confirmed on-chain!"}
                        </span>
                      </>
                    )}
                    {game.txPhase === "error" && (
                      <>
                        <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                        <span>{game.txError || "Transaction failed."}</span>
                      </>
                    )}
                  </div>

                  {game.txHash && (
                    <a
                      href={getTxExplorerUrl(game.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 font-mono font-bold text-arcade-yellow underline"
                    >
                      BOTScan
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Owner-Only Start Round Panel */}
          {game.isOwner && !game.roundInfo.roundActive && (
            <div className="arcade-card rounded-3xl border-arcade-orange/40 p-6">
              <h3 className="mb-1 flex items-center gap-2 font-display text-base font-black text-arcade-yellow">
                <Play className="h-4 w-4" />
                Owner Controls: Start Round
              </h3>
              <p className="mb-4 text-xs text-amber-200/65">
                Only the contract owner can initiate a new round (60s – 3600s).
              </p>

              <form onSubmit={handleStartRound} className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-bold uppercase text-amber-200/60">
                    Initial Holder
                  </label>
                  <input
                    type="text"
                    value={initialHolderInput}
                    onChange={(e) => setInitialHolderInput(e.target.value)}
                    placeholder={game.connectedAddress || "0x..."}
                    className="w-full rounded-xl border border-arcade-border bg-arcade-bg px-3 py-2 font-mono text-xs text-white outline-none focus:border-arcade-orange"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-amber-200/60">
                    Duration (sec)
                  </label>
                  <input
                    type="number"
                    min={60}
                    max={3600}
                    value={durationInput}
                    onChange={(e) => setDurationInput(e.target.value)}
                    className="w-full rounded-xl border border-arcade-border bg-arcade-bg px-3 py-2 font-mono text-xs text-white outline-none focus:border-arcade-orange"
                  />
                </div>
                <div className="sm:col-span-3">
                  {startValidation.message && (
                    <p className="mb-2 text-xs text-red-400">{startValidation.message}</p>
                  )}
                  <button
                    type="submit"
                    disabled={!startValidation.valid || isWriting || game.isWrongNetwork}
                    className="arcade-btn flex w-full items-center justify-center gap-2 rounded-xl bg-arcade-orange px-4 py-2.5 text-sm font-black uppercase text-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isWriting && game.txAction === "start" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Starting Round...
                      </>
                    ) : (
                      "Start Round"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>

      {/* Round History & On-Chain Events */}
      <section className="arcade-card mt-8 rounded-3xl p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold transition ${
                activeTab === "history"
                  ? "bg-arcade-orange text-black"
                  : "border border-arcade-border bg-arcade-bg text-amber-200/75 hover:text-white"
              }`}
            >
              <Trophy className="h-4 w-4" />
              Round History ({game.roundHistory.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("activity")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold transition ${
                activeTab === "activity"
                  ? "bg-arcade-orange text-black"
                  : "border border-arcade-border bg-arcade-bg text-amber-200/75 hover:text-white"
              }`}
            >
              <History className="h-4 w-4" />
              Contract Events ({game.activityLog.length})
            </button>
          </div>

          {game.isLoadingEvents && (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-200/60">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Syncing logs from BOT Chain...
            </span>
          )}
        </div>

        {activeTab === "history" ? (
          game.roundHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-arcade-border bg-arcade-bg/50 py-10 text-center text-sm text-amber-200/55">
              No completed rounds recorded on-chain yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-arcade-border text-xs uppercase tracking-wider text-amber-200/55">
                    <th className="pb-3 pr-4">Round</th>
                    <th className="pb-3 pr-4">Losing Wallet</th>
                    <th className="pb-3 pr-4">Completed At</th>
                    <th className="pb-3 text-right">Transaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-arcade-border/60">
                  {game.roundHistory.map((item) => (
                    <tr key={`${item.txHash}-${item.roundId.toString()}`}>
                      <td className="py-3 pr-4 font-display font-bold text-arcade-yellow">
                        #{item.roundId.toString()}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-red-300 sm:text-sm">
                        <a
                          href={getAddressExplorerUrl(item.losingHolder)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          {shortenAddress(item.losingHolder, 6)}
                          <ExternalLink className="h-3 w-3 opacity-70" />
                        </a>
                      </td>
                      <td className="py-3 pr-4 text-xs text-amber-100/75">
                        {formatTimestamp(item.endTimestamp)}
                      </td>
                      <td className="py-3 text-right font-mono text-xs">
                        <a
                          href={getTxExplorerUrl(item.txHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-arcade-amber hover:text-arcade-yellow"
                        >
                          {shortenAddress(item.txHash, 5)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : game.activityLog.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-arcade-border bg-arcade-bg/50 py-10 text-center text-sm text-amber-200/55">
            No contract events emitted yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {game.activityLog.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-arcade-border/80 bg-arcade-bg/70 px-4 py-3 text-xs sm:text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${
                      ev.type === "RoundStarted"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : ev.type === "PotatoPassed"
                        ? "bg-arcade-orange/25 text-arcade-yellow"
                        : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {ev.type}
                  </span>
                  <span className="font-mono font-bold text-amber-200">
                    Round #{ev.roundId.toString()}
                  </span>
                  <span className="font-mono text-amber-100/80">
                    {ev.type === "RoundStarted" &&
                      `Initial holder ${shortenAddress(ev.actor, 5)}`}
                    {ev.type === "PotatoPassed" &&
                      `${shortenAddress(ev.actor, 5)} → ${shortenAddress(ev.target, 5)}`}
                    {ev.type === "RoundEnded" &&
                      `Lost by ${shortenAddress(ev.actor, 5)}`}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-amber-200/60">
                  <span>{formatTimestamp(ev.timestamp)}</span>
                  <a
                    href={getTxExplorerUrl(ev.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-arcade-amber hover:text-arcade-yellow"
                  >
                    BOTScan
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
