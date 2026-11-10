"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWatchContractEvent,
  useWriteContract,
} from "wagmi";
import { isAddress, parseAbiItem, zeroAddress, type AbiEvent, type Address, type Hex } from "viem";
import { botChainTestnet } from "@/config/chain";
import { BOT_HOT_POTATO_ABI } from "@/config/contract";
import { extractFriendlyError } from "@/lib/format";

export interface RoundInfoState {
  roundId: bigint;
  currentHolder: Address;
  roundStartTimestamp: bigint;
  roundDeadline: bigint;
  roundDuration: bigint;
  roundActive: boolean;
  lastLosingHolder: Address;
}

export interface RoundHistoryItem {
  roundId: bigint;
  losingHolder: Address;
  endTimestamp: bigint;
  txHash: Hex;
  blockNumber: bigint;
}

export interface ActivityEventItem {
  id: string;
  type: "RoundStarted" | "PotatoPassed" | "RoundEnded";
  roundId: bigint;
  actor: Address;
  target?: Address;
  timestamp: bigint;
  txHash: Hex;
  blockNumber: bigint;
  logIndex: number;
}

export type TxPhase = "idle" | "signing" | "confirming" | "confirmed" | "error";

const ROUND_STARTED_EVENT = parseAbiItem(
  "event RoundStarted(uint256 indexed roundId, address indexed initialHolder, uint256 startTimestamp, uint256 deadline, uint256 duration)"
);
const POTATO_PASSED_EVENT = parseAbiItem(
  "event PotatoPassed(uint256 indexed roundId, address indexed from, address indexed to, uint256 timestamp)"
);
const ROUND_ENDED_EVENT = parseAbiItem(
  "event RoundEnded(uint256 indexed roundId, address indexed losingHolder, uint256 endTimestamp)"
);

const DEFAULT_ROUND_INFO: RoundInfoState = {
  roundId: 0n,
  currentHolder: zeroAddress,
  roundStartTimestamp: 0n,
  roundDeadline: 0n,
  roundDuration: 0n,
  roundActive: false,
  lastLosingHolder: zeroAddress,
};

export function useHotPotatoGame(contractAddress: Address | null) {
  const { address: connectedAddress, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: botChainTestnet.id });
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();

  const [roundInfo, setRoundInfo] = useState<RoundInfoState>(DEFAULT_ROUND_INFO);
  const [ownerAddress, setOwnerAddress] = useState<Address | null>(null);
  const [chainTimeOffset, setChainTimeOffset] = useState<number>(0);
  const [nowLocalSec, setNowLocalSec] = useState<number>(() => Math.floor(Date.now() / 1000));
  const [isLoadingState, setIsLoadingState] = useState<boolean>(false);
  const [stateError, setStateError] = useState<string | null>(null);

  const [roundHistory, setRoundHistory] = useState<RoundHistoryItem[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityEventItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);

  const [txPhase, setTxPhase] = useState<TxPhase>("idle");
  const [txAction, setTxAction] = useState<"pass" | "end" | "start" | null>(null);
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Track confirmed pass count in the current round to trigger potato pass animation
  const [passPulseCount, setPassPulseCount] = useState<number>(0);
  const previousHolderRef = useRef<string>("");

  const isWrongNetwork = isConnected && chainId !== botChainTestnet.id;

  // Tick every 500ms so countdown transitions feel crisp, always derived from blockchain deadline + chain offset
  useEffect(() => {
    const timer = setInterval(() => {
      setNowLocalSec(Math.floor(Date.now() / 1000));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const fetchEvents = useCallback(async () => {
    if (!publicClient || !contractAddress) {
      setRoundHistory([]);
      setActivityLog([]);
      return;
    }

    setIsLoadingEvents(true);
    try {
      const latestBlock = await publicClient.getBlockNumber();
      // Query in safe chunks if RPC rejects wide block ranges
      const maxWindow = 50000n;
      const startBlock = latestBlock > maxWindow ? latestBlock - maxWindow : 0n;

      const fetchLogsWithFallback = async <TAbiEvent extends AbiEvent>(
        eventItem: TAbiEvent
      ) => {
        try {
          return await publicClient.getLogs({
            address: contractAddress,
            event: eventItem,
            fromBlock: startBlock,
            toBlock: latestBlock,
          });
        } catch {
          // Fallback to a smaller 5,000-block window if RPC caps eth_getLogs range
          const recentFrom = latestBlock > 5000n ? latestBlock - 5000n : 0n;
          return await publicClient.getLogs({
            address: contractAddress,
            event: eventItem,
            fromBlock: recentFrom,
            toBlock: latestBlock,
          });
        }
      };

      const [startedLogs, passedLogs, endedLogs] = await Promise.all([
        fetchLogsWithFallback(ROUND_STARTED_EVENT),
        fetchLogsWithFallback(POTATO_PASSED_EVENT),
        fetchLogsWithFallback(ROUND_ENDED_EVENT),
      ]);

      const historyItems: RoundHistoryItem[] = endedLogs
        .map((log) => ({
          roundId: log.args.roundId ?? 0n,
          losingHolder: (log.args.losingHolder ?? zeroAddress) as Address,
          endTimestamp: log.args.endTimestamp ?? 0n,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
        }))
        .sort((a, b) => Number(b.roundId - a.roundId));

      const combinedActivity: ActivityEventItem[] = [
        ...startedLogs.map((log) => ({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: "RoundStarted" as const,
          roundId: log.args.roundId ?? 0n,
          actor: (log.args.initialHolder ?? zeroAddress) as Address,
          timestamp: log.args.startTimestamp ?? 0n,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
        })),
        ...passedLogs.map((log) => ({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: "PotatoPassed" as const,
          roundId: log.args.roundId ?? 0n,
          actor: (log.args.from ?? zeroAddress) as Address,
          target: (log.args.to ?? zeroAddress) as Address,
          timestamp: log.args.timestamp ?? 0n,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
        })),
        ...endedLogs.map((log) => ({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: "RoundEnded" as const,
          roundId: log.args.roundId ?? 0n,
          actor: (log.args.losingHolder ?? zeroAddress) as Address,
          timestamp: log.args.endTimestamp ?? 0n,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
        })),
      ].sort((a, b) => {
        if (b.blockNumber !== a.blockNumber) {
          return b.blockNumber > a.blockNumber ? 1 : -1;
        }
        return b.logIndex - a.logIndex;
      });

      setRoundHistory(historyItems);
      setActivityLog(combinedActivity);
    } catch {
      // Keep existing events if a transient RPC hiccup occurs
    } finally {
      setIsLoadingEvents(false);
    }
  }, [publicClient, contractAddress]);

  const refreshGameState = useCallback(async () => {
    if (!publicClient || !contractAddress) return;

    setIsLoadingState(true);
    try {
      const [rawInfo, owner, latestBlock] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: BOT_HOT_POTATO_ABI,
          functionName: "getRoundInfo",
        }) as Promise<RoundInfoState>,
        publicClient.readContract({
          address: contractAddress,
          abi: BOT_HOT_POTATO_ABI,
          functionName: "owner",
        }) as Promise<Address>,
        publicClient.getBlock({ blockTag: "latest" }),
      ]);

      const localNow = Math.floor(Date.now() / 1000);
      const offset = Number(latestBlock.timestamp) - localNow;
      setChainTimeOffset(offset);
      setOwnerAddress(owner);

      const nextHolder = rawInfo.currentHolder.toLowerCase();
      if (
        previousHolderRef.current &&
        previousHolderRef.current !== nextHolder &&
        rawInfo.roundActive
      ) {
        setPassPulseCount((c) => c + 1);
      }
      previousHolderRef.current = nextHolder;

      setRoundInfo(rawInfo);
      setStateError(null);
    } catch (err) {
      setStateError(extractFriendlyError(err));
    } finally {
      setIsLoadingState(false);
    }
  }, [publicClient, contractAddress]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshGameState(), fetchEvents()]);
  }, [refreshGameState, fetchEvents]);

  // Initial load + periodic blockchain state sync every 4 seconds
  useEffect(() => {
    if (!contractAddress) return;
    void refreshAll();
    const interval = setInterval(() => {
      void refreshGameState();
    }, 4000);
    return () => clearInterval(interval);
  }, [contractAddress, refreshAll, refreshGameState]);

  // Live contract event listeners
  useWatchContractEvent({
    address: contractAddress ?? undefined,
    abi: BOT_HOT_POTATO_ABI,
    eventName: "RoundStarted",
    chainId: botChainTestnet.id,
    enabled: Boolean(contractAddress),
    onLogs: () => {
      setPassPulseCount(0);
      void refreshAll();
    },
  });

  useWatchContractEvent({
    address: contractAddress ?? undefined,
    abi: BOT_HOT_POTATO_ABI,
    eventName: "PotatoPassed",
    chainId: botChainTestnet.id,
    enabled: Boolean(contractAddress),
    onLogs: () => {
      setPassPulseCount((c) => c + 1);
      void refreshAll();
    },
  });

  useWatchContractEvent({
    address: contractAddress ?? undefined,
    abi: BOT_HOT_POTATO_ABI,
    eventName: "RoundEnded",
    chainId: botChainTestnet.id,
    enabled: Boolean(contractAddress),
    onLogs: () => {
      void refreshAll();
    },
  });

  const estimatedChainNowSec = nowLocalSec + chainTimeOffset;

  const secondsRemaining = useMemo(() => {
    if (!roundInfo.roundActive || roundInfo.roundDeadline === 0n) return 0;
    return Math.max(0, Number(roundInfo.roundDeadline) - estimatedChainNowSec);
  }, [roundInfo.roundActive, roundInfo.roundDeadline, estimatedChainNowSec]);

  const gameStatus: "Waiting" | "Active" | "Finished" = useMemo(() => {
    if (roundInfo.roundId === 0n) return "Waiting";
    if (roundInfo.roundActive) return "Active";
    return "Finished";
  }, [roundInfo.roundId, roundInfo.roundActive]);

  const isExpiredPendingEnd = roundInfo.roundActive && secondsRemaining === 0;

  const isCurrentUserHolder = Boolean(
    connectedAddress &&
      roundInfo.currentHolder &&
      connectedAddress.toLowerCase() === roundInfo.currentHolder.toLowerCase() &&
      roundInfo.currentHolder.toLowerCase() !== zeroAddress
  );

  const isOwner = Boolean(
    connectedAddress &&
      ownerAddress &&
      connectedAddress.toLowerCase() === ownerAddress.toLowerCase()
  );

  const switchToBotTestnet = useCallback(async () => {
    await switchChainAsync({ chainId: botChainTestnet.id });
  }, [switchChainAsync]);

  const resetTxStatus = useCallback(() => {
    setTxPhase("idle");
    setTxAction(null);
    setTxHash(null);
    setTxError(null);
  }, []);

  const executeGasOnlyWrite = useCallback(
    async (
      action: "pass" | "end" | "start",
      functionName: "passPotato" | "endRound" | "startRound",
      args: readonly unknown[]
    ) => {
      if (!contractAddress || !publicClient) {
        setTxPhase("error");
        setTxError("Contract address is not configured.");
        return false;
      }
      if (!isConnected) {
        setTxPhase("error");
        setTxError("Connect your wallet first.");
        return false;
      }
      if (isWrongNetwork) {
        setTxPhase("error");
        setTxError("Switch your wallet to BOT Chain Testnet (Chain ID 968).");
        return false;
      }

      setTxAction(action);
      setTxPhase("signing");
      setTxHash(null);
      setTxError(null);

      try {
        // Strictly gas-only: no value, no fee transfers
        const hash = await writeContractAsync({
          address: contractAddress,
          abi: BOT_HOT_POTATO_ABI,
          functionName,
          args: args as never,
          chainId: botChainTestnet.id,
        });

        setTxHash(hash);
        setTxPhase("confirming");

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
          throw new Error("Transaction reverted on BOT Chain Testnet.");
        }

        setTxPhase("confirmed");
        await refreshAll();
        return true;
      } catch (err) {
        setTxPhase("error");
        setTxError(extractFriendlyError(err));
        return false;
      }
    },
    [contractAddress, publicClient, isConnected, isWrongNetwork, writeContractAsync, refreshAll]
  );

  const passPotato = useCallback(
    async (recipient: string) => {
      if (!isAddress(recipient)) {
        setTxPhase("error");
        setTxError("Enter a valid EVM wallet address.");
        return false;
      }
      return executeGasOnlyWrite("pass", "passPotato", [recipient as Address]);
    },
    [executeGasOnlyWrite]
  );

  const endRound = useCallback(async () => {
    return executeGasOnlyWrite("end", "endRound", []);
  }, [executeGasOnlyWrite]);

  const startRound = useCallback(
    async (initialHolder: string, durationSec: number) => {
      if (!isAddress(initialHolder)) {
        setTxPhase("error");
        setTxError("Enter a valid initial holder address.");
        return false;
      }
      return executeGasOnlyWrite("start", "startRound", [
        initialHolder as Address,
        BigInt(durationSec),
      ]);
    },
    [executeGasOnlyWrite]
  );

  return {
    connectedAddress,
    isConnected,
    isWrongNetwork,
    isSwitchingChain,
    switchToBotTestnet,
    roundInfo,
    ownerAddress,
    isOwner,
    secondsRemaining,
    gameStatus,
    isExpiredPendingEnd,
    isCurrentUserHolder,
    passPulseCount,
    roundHistory,
    activityLog,
    isLoadingState,
    isLoadingEvents,
    stateError,
    txPhase,
    txAction,
    txHash,
    txError,
    resetTxStatus,
    passPotato,
    endRound,
    startRound,
    refreshAll,
  };
}

