# BOT Hot Potato

An arcade-style, multiplayer on-chain **Hot Potato** mini-game built for **BOT Chain Testnet (Chain ID 968)**.

> *"Don't hold it when the clock hits zero."*

See the [Technical Whitepaper](./WHITEPAPER.md) for the full protocol specification, state machine, and security model.

Every contract interaction uses **BOT network gas fees only** — there are no platform fees, no payable functions, and no extra token transfers.

---

## Network Configuration (BOT Chain Testnet)

| Parameter | Value |
| --- | --- |
| Network Name | BOT Chain Testnet |
| Chain ID | `968` |
| RPC URL | `https://rpc.bohr.life` |
| Explorer | `https://scan.bohr.life/` |
| Native Currency | `BOT` |
| Solidity Version | `0.8.20` |

---

## Project Structure

```text
.
├── contracts/
│   └── BOTHOTPotato.sol          # Solidity 0.8.20 gas-only game contract
├── scripts/
│   └── deploy.ts                 # Deployment script + ABI sync to frontend
├── test/
│   └── BOTHOTPotato.test.ts      # Hardhat automated contract test suite
├── frontend/
│   ├── src/
│   │   ├── abi/                  # Contract ABI JSON
│   │   ├── app/                  # Next.js App Router pages & layout
│   │   ├── components/           # Web3Provider, GameArena, PotatoIllustration
│   │   ├── config/               # BOT Chain Testnet & contract configuration
│   │   ├── hooks/                # Contract reads, event sync, gas-only writes
│   │   └── lib/                  # Formatting & server env helpers
│   └── package.json
├── hardhat.config.ts
├── .env.example
└── package.json
```

---

## Setup & Installation

### 1. Install Dependencies

From the project root:

```bash
npm install
npm --prefix frontend install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` (already created at the root and gitignored) and fill in your values:

```env
# BOT Chain Testnet deployer private key (funded with testnet BOT for gas)
DEPLOYER_PRIVATE_KEY=your_private_key_here

# Reown (WalletConnect) Project ID (read server-side via REOWN_ID, no public env prefix)
REOWN_ID=your_reown_project_id_here

# BOT Chain Testnet RPC
BOT_TESTNET_RPC=https://rpc.bohr.life

# Set after deploying BOTHOTPotato.sol
CONTRACT_ADDRESS=
```

---

## Smart Contract Compilation & Testing

Compile `BOTHOTPotato.sol`:

```bash
npm run compile
```

Run the automated Hardhat test suite:

```bash
npm run test:contracts
```

The test suite verifies:
- Starting a round by the owner with valid initial holder and duration (60s–3600s)
- Rejecting unauthorized round creation from non-owners
- Rejecting zero-address initial holders and out-of-bounds durations
- Preventing a second round while one is active
- Passing the potato successfully from the current holder
- Rejecting passes from non-holders, self-passes, zero-address recipients, and post-expiry passes
- Ending an expired round (callable by anyone) and recording the final holder as loser
- Rejecting premature round endings

---

## Deploy to BOT Chain Testnet (Chain ID 968)

1. Ensure `DEPLOYER_PRIVATE_KEY` in `.env` holds testnet `BOT` for gas.
2. Run:

```bash
npm run deploy:testnet
```

3. Copy the deployed contract address printed by the script into `.env`:

```env
CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

*(Alternatively, you can hardcode it in `frontend/src/config/contract.ts` via `DEFAULT_CONTRACT_ADDRESS`.)*

---

## Run the Frontend

Development server:

```bash
npm run dev
```

Production build & start:

```bash
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000) in your browser, connect your wallet with Reown AppKit, switch to **BOT Chain Testnet (968)** if prompted, and start passing the potato!

