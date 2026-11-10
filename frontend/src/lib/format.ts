export function shortenAddress(address?: string | null, chars = 4): string {
  if (!address) return "—";
  if (address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatTimestamp(unixSeconds: bigint | number): string {
  const ms = Number(unixSeconds) * 1000;
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(ms));
}

export function extractFriendlyError(err: unknown): string {
  if (!err) return "Transaction failed.";
  const raw =
    typeof err === "object" && err !== null && "shortMessage" in err
      ? String((err as { shortMessage?: unknown }).shortMessage)
      : err instanceof Error
      ? err.message
      : String(err);

  const lower = raw.toLowerCase();
  if (lower.includes("user rejected") || lower.includes("user denied")) {
    return "Transaction rejected in wallet.";
  }
  if (lower.includes("notcurrentholder")) {
    return "Only the current potato holder can pass the potato.";
  }
  if (lower.includes("cannotpasstoself")) {
    return "You cannot pass the potato to yourself.";
  }
  if (lower.includes("invalidrecipient")) {
    return "Recipient address cannot be the zero address.";
  }
  if (lower.includes("roundexpired")) {
    return "Too late! The round deadline has already passed.";
  }
  if (lower.includes("roundnotexpired")) {
    return "Round timer has not expired yet.";
  }
  if (lower.includes("roundalreadyactive")) {
    return "A round is already active.";
  }
  if (lower.includes("roundnotactive")) {
    return "No active round right now.";
  }
  if (lower.includes("notowner")) {
    return "Only the contract owner can start a round.";
  }
  if (lower.includes("invalidduration")) {
    return "Duration must be between 60 and 3600 seconds.";
  }
  if (lower.includes("insufficient funds")) {
    return "Insufficient BOT balance for testnet gas fee.";
  }
  return raw.length > 180 ? `${raw.slice(0, 177)}...` : raw;
}

