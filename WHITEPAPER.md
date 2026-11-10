# BOT Hot Potato — Technical Whitepaper

**Version 1.0 · BOT Chain Testnet (Chain ID 968)**  
*"Don’t hold it when the clock hits zero."*

---

## 1. Executive Summary

**BOT Hot Potato** is a lightweight, multiplayer, real-time on-chain arcade game deployed on **BOT Chain Testnet**. Players race against an on-chain countdown timer to pass a virtual "hot potato" from one wallet to another. Whoever holds the potato when the blockchain timestamp reaches the round deadline loses the round.

The protocol is deliberately **gas-fee only**:
- No betting pools or wagering
- No token transfers or ERC-20/ERC-721 dependencies
- No platform fees, rake, or `payable` contract entrypoints

Every action is a transparent, verifiable state transition on BOT Chain Testnet.

---

## 2. Network & Execution Environment

| Property | Specification |
| --- | --- |
| Network | BOT Chain Testnet |
| Chain ID | `968` |
| JSON-RPC Endpoint | `https://rpc.bohr.life` |
| Block Explorer | `https://scan.bohr.life/` |
| Native Gas Currency | `BOT` |
| Smart Contract Language | Solidity `0.8.20` (`paris` EVM target) |
| Contract Name | `BOTHOTPotato` |

---

## 3. Core Game Mechanics & State Machine

Each game round progresses through three deterministic states derived directly from contract storage:

1. **Waiting** (`roundId == 0`): Contract deployed; no round has started yet.
2. **Active** (`roundActive == true`): Potato is live and can be passed between wallets while `block.timestamp < roundDeadline`.
3. **Finished** (`roundActive == false && roundId > 0`): Round has expired and been finalized on-chain; `lastLosingHolder` is permanently recorded.

### 3.1 Contract State Variables

`BOTHOTPotato.sol` maintains the following storage state:

- `owner` (`address`): Address authorized to start new rounds.
- `roundId` (`uint256`): Monotonically increasing round counter (starts at `0`).
- `roundActive` (`bool`): Mutex flag indicating whether a round is currently in progress.
- `currentHolder` (`address`): Wallet currently holding the hot potato.
- `roundStartTimestamp` (`uint256`): Block timestamp when the active/latest round began.
- `roundDuration` (`uint256`): Configured duration in seconds for the active/latest round.
- `roundDeadline` (`uint256`): Exact expiration timestamp (`roundStartTimestamp + roundDuration`).
- `lastLosingHolder` (`address`): Final holder recorded when the most recent round ended.

### 3.2 State Transitions

#### Starting a Round — `startRound(address initialHolder, uint256 duration)`
- **Access**: `onlyOwner` (reverts with `NotOwner()` otherwise).
- **Preconditions**:
  - `!roundActive` (reverts with `RoundAlreadyActive()`).
  - `initialHolder != address(0)` (reverts with `InvalidInitialHolder()`).
  - `MIN_DURATION <= duration <= MAX_DURATION`, where `MIN_DURATION = 60` seconds and `MAX_DURATION = 3600` seconds (reverts with `InvalidDuration(duration)`).
- **Effect**: Increments `roundId`, sets `currentHolder = initialHolder`, records `roundStartTimestamp = block.timestamp`, `roundDuration = duration`, `roundDeadline = block.timestamp + duration`, sets `roundActive = true`, and emits `RoundStarted`.

#### Passing the Potato — `passPotato(address recipient)`
- **Access**: Any wallet, strictly enforced to `msg.sender == currentHolder` (`NotCurrentHolder()`).
- **Preconditions**:
  - `roundActive` must be `true` (`RoundNotActive()`).
  - `recipient != address(0)` (`InvalidRecipient()`).
  - `recipient != msg.sender` (`CannotPassToSelf()`).
  - `block.timestamp < roundDeadline` (`RoundExpired()`).
- **Effect**: Updates `currentHolder = recipient` and emits `PotatoPassed(roundId, previousHolder, recipient, block.timestamp)`.

#### Ending an Expired Round — `endRound()`
- **Access**: Permissionless — anyone may finalize an expired round once the clock reaches zero.
- **Preconditions**:
  - `roundActive` must be `true` (`RoundNotActive()`).
  - `block.timestamp >= roundDeadline` (`RoundNotExpired()`).
- **Effect**: Sets `roundActive = false`, records `lastLosingHolder = currentHolder`, emits `RoundEnded(roundId, currentHolder, block.timestamp)`, and unlocks the contract for the next `startRound` call.

#### Read-Only Queries
- `getRoundInfo()` returns the complete `RoundInfo` struct (`roundId`, `currentHolder`, `roundStartTimestamp`, `roundDeadline`, `roundDuration`, `roundActive`, `lastLosingHolder`).
- `getCurrentHolder()` returns `currentHolder`.

---

## 4. Security Architecture & Invariants

### 4.1 Strictly Gas-Only Design
None of the functions in `BOTHOTPotato` carry the `payable` modifier, and the contract intentionally omits `receive()` and `fallback()` functions. Attempting to attach `BOT` value to any call reverts at the EVM level. Players only ever pay standard BOT Chain Testnet gas fees.

### 4.2 Exact Deadline Partitioning
Time comparisons use a strict non-overlapping boundary:
- Passing requires `block.timestamp < roundDeadline`
- Finalizing requires `block.timestamp >= roundDeadline`

There is no timestamp at which both passing and ending are valid, and no dead-zone timestamp at which neither is valid.

### 4.3 Concurrency & Self-Pass Prevention
- **Single-Round Mutex**: `roundActive` guarantees no second round can overwrite an active round's holder or deadline.
- **Anti-Stall Validation**: Passing to `address(0)` or `msg.sender` is rejected on-chain so the potato cannot be burned or artificially bounced to the same address.
- **Custom Errors**: Explicit Solidity custom errors (`NotOwner`, `RoundAlreadyActive`, `RoundNotActive`, `InvalidInitialHolder`, `InvalidDuration`, `NotCurrentHolder`, `InvalidRecipient`, `CannotPassToSelf`, `RoundExpired`, `RoundNotExpired`) provide deterministic failure reasons with minimal gas overhead.

---

## 5. Frontend & Blockchain Synchronization Model

The web interface is built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Reown AppKit**, **Wagmi v2**, and **Viem**:

1. **Blockchain-Synchronized Countdown**: Rather than trusting the user's local system clock alone, the client reads `getRoundInfo()` alongside the latest block (`getBlock({ blockTag: "latest" })`) and computes a chain clock offset (`latestBlock.timestamp - localTimestamp`). The displayed countdown tracks `roundDeadline - estimatedChainNow`.
2. **Event-Sourced History & Activity**: All round history rows and activity feed entries are reconstructed exclusively from on-chain `RoundStarted`, `PotatoPassed`, and `RoundEnded` event logs (with automatic block-window fallback for RPC log limits and live `useWatchContractEvent` subscriptions). No off-chain or fabricated activity is ever injected.
3. **Strict Confirmation Semantics**: Transactions move explicitly through `signing` -> `confirming` (with a live BOTScan link) -> `confirmed` only after `waitForTransactionReceipt` returns `status === "success"`.
4. **Private Server Environment Loading**: `REOWN_ID` and `CONTRACT_ADDRESS` are loaded from root `.env` in Next.js server components without `NEXT_PUBLIC_` or `VITE_` environment variable prefixes.

---

## 6. Automated Verification

The Hardhat test suite (`test/BOTHOTPotato.test.ts`) verifies 15 scenarios across deployment, round lifecycle, access control, and edge conditions:

- Initial owner and inactive round state on deployment
- Valid owner-initiated round start and `RoundStarted` emission
- Rejection of non-owner `startRound`, zero-address initial holder, and out-of-range durations (`< 60s` or `> 3600s`)
- Prevention of concurrent active rounds
- Multi-hop potato passing and `PotatoPassed` events
- Rejection of passes when inactive, from non-holders, to self, to zero address, and at/after deadline expiry
- Rejection of premature `endRound` calls
- Permissionless `endRound` after expiry, `RoundEnded` emission, loser recording, and starting subsequent rounds

---

## 7. Deployment & Future Directions

`BOTHOTPotato.sol` is ready for deployment to BOT Chain Testnet (`968`) via `scripts/deploy.ts`. Potential future enhancements include:
- Multi-arena factory support for simultaneous public and private rooms
- On-chain survival streak and pass-count statistics
- Automated round-scheduler contracts or community-triggered round restarts with configurable cooldowns

All potential extensions retain the core principle of **BOT Hot Potato**: pure on-chain arcade chaos powered solely by standard network gas fees.
