# AutoTrust Paymesh — MNEE Escrow Settlement System

> **Track:** Best AI / Agent Payments  
> *Proves programmable money (conditional settlement) with clean on-chain audit trails.

A production-minded reference build for **programmable money** using the **MNEE ERC-20 stablecoin** on Ethereum.

## What It Demonstrates

- ✅ MNEE-funded **escrow** with deterministic **release/refund** rules
- ✅ Wallet-based checkout (Approve → Create Escrow → Release/Refund)
- ✅ **Backend indexer** that ingests on-chain events and serves an **Ops Log API**
- ✅ Clean UI that shows balances, allowance status, escrows, and event audit trail
- ✅ **100% free local development** on Hardhat chain

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              AUTOTRUST PAYMESH                                       │
│                         MNEE Escrow Settlement System                                │
└─────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
    │    PAYER     │         │    PAYEE     │         │   ARBITER    │
    │  (Customer)  │         │  (Service)   │         │   (Judge)    │
    └──────┬───────┘         └──────┬───────┘         └──────┬───────┘
           │                        │                        │
           │ 1. Approve MNEE        │                        │
           │ 2. Create Escrow       │                        │
           ▼                        │                        │
    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                   │
    │                     🌐 NEXT.JS FRONTEND                          │
    │                        (wagmi/viem)                               │
    │                                                                   │
    │   ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐     │
    │   │   Wallet    │    │   Escrow    │    │     Ops Log     │     │
    │   │   Connect   │───▶│   Console   │───▶│   (Events UI)   │     │
    │   └─────────────┘    └─────────────┘    └─────────────────┘     │
    │                                                                   │
    └────────────────────────────┬─────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
    ┌───────────────────────────┐   ┌───────────────────────────┐
    │                           │   │                           │
    │   ⛓️ ETHEREUM BLOCKCHAIN   │   │   📊 NODE.JS BACKEND      │
    │                           │   │      (Event Indexer)      │
    │  ┌─────────────────────┐  │   │                           │
    │  │   MNEEEscrow.sol    │  │   │  ┌─────────────────────┐  │
    │  │   ───────────────   │  │◀──│  │  Event Listeners    │  │
    │  │                     │  │   │  │  • EscrowCreated    │  │
    │  │  • createEscrow()   │  │   │  │  • EscrowReleased   │  │
    │  │  • release()        │──┼───│  │  • EscrowRefunded   │  │
    │  │  • refund()         │  │   │  └─────────────────────┘  │
    │  │                     │  │   │                           │
    │  └─────────────────────┘  │   │  ┌─────────────────────┐  │
    │                           │   │  │   REST API          │  │
    │  ┌─────────────────────┐  │   │  │   • GET /events     │  │
    │  │   MNEE Token        │  │   │  │   • GET /escrow/:id │  │
    │  │   (ERC-20)          │  │   │  │   • GET /health     │  │
    │  └─────────────────────┘  │   │  └─────────────────────┘  │
    │                           │   │                           │
    └───────────────────────────┘   └───────────────────────────┘


                              💰 ESCROW FLOW
    ┌─────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   PAYER                    ESCROW                    PAYEE       │
    │     │                        │                         │        │
    │     │  ──── approve() ────▶  │                         │        │
    │     │                        │                         │        │
    │     │  ── createEscrow() ──▶ │                         │        │
    │     │      (MNEE locked)     │                         │        │
    │     │                        │                         │        │
    │     │                        │ ◀── release() ────      │        │
    │     │                        │     (by Arbiter)        │        │
    │     │                        │                         │        │
    │     │                        │ ──── MNEE ────────────▶ │        │
    │     │                        │                         │        │
    │     │  ◀──── refund() ────── │                         │        │
    │     │   (by Arbiter or       │                         │        │
    │     │    Payer after         │                         │        │
    │     │    deadline)           │                         │        │
    │                                                                  │
    └─────────────────────────────────────────────────────────────────┘


                           📋 STATE MACHINE
    ┌─────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │        ┌────────┐                                               │
    │        │  NONE  │                                               │
    │        └───┬────┘                                               │
    │            │                                                     │
    │            │ createEscrow()                                      │
    │            ▼                                                     │
    │        ┌────────┐                                               │
    │        │ FUNDED │ ◀─── MNEE locked in contract                  │
    │        └───┬────┘                                               │
    │            │                                                     │
    │      ┌─────┴─────┐                                              │
    │      │           │                                              │
    │      ▼           ▼                                              │
    │  ┌────────┐  ┌──────────┐                                       │
    │  │RELEASED│  │ REFUNDED │                                       │
    │  └────────┘  └──────────┘                                       │
    │      │           │                                              │
    │      ▼           ▼                                              │
    │   MNEE →      MNEE →                                            │
    │   Payee       Payer                                             │
    │                                                                  │
    └─────────────────────────────────────────────────────────────────┘


                           🔧 TECH STACK
    ┌─────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   FRONTEND          SMART CONTRACTS       BACKEND               │
    │   ─────────         ───────────────       ───────               │
    │   • Next.js 14      • Solidity 0.8.24     • Node.js             │
    │   • wagmi v2        • OpenZeppelin        • Express             │
    │   • viem            • Hardhat             • ethers.js v6        │
    │   • TanStack Query  • ReentrancyGuard     • Event listeners     │
    │   • TypeScript      • Pausable            • REST API            │
    │                                                                  │
    └─────────────────────────────────────────────────────────────────┘
```

---

## Core References

| Resource | Value |
|----------|-------|
| MNEE Token (Mainnet) | `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF` |
| Token Decimals | 18 |
| Swap & Bridge | https://swap-user.mnee.net/ |
| Etherscan | https://etherscan.io/token/0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF |

---

## Monorepo Layout

```
autotrust-paymesh/
  contracts/   # Hardhat + Solidity (OpenZeppelin)
  backend/     # Node/Express indexer + REST API (ethers.js)
  app/         # Next.js UI (wagmi/viem)
```

---

## 🚀 Quick Start (100% Free Local Development)

### Step 1: Start Hardhat Local Node

```bash
cd contracts
npm install

# Terminal 1: Start local chain (keep running)
npm run node
```

This prints funded accounts with private keys. **Copy one private key for MetaMask.**

### Step 2: Deploy Contracts Locally

```bash
# Terminal 2: Deploy (separate terminal)
npm run deploy:local
```

Output will show:
```
MockERC20 deployed to: 0x5FbDB2...
MNEEEscrow deployed to: 0xe7f1725...

Add these to your .env files:
NEXT_PUBLIC_MNEE_TOKEN=0x5FbDB2...
NEXT_PUBLIC_ESCROW_ADDRESS=0xe7f1725...
```

**Save these addresses!**

### Step 3: Configure Backend

```bash
cd ../backend
npm install
```

Create `backend/.env`:
```bash
RPC_URL=http://127.0.0.1:8545
ESCROW_ADDRESS=0x... # paste your escrow address from Step 2
PORT=8787
```

Start backend:
```bash
npm run dev
```

### Step 4: Configure Frontend

```bash
cd ../app
npm install
```

Create `app/.env.local`:
```bash
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_MNEE_TOKEN=0x... # paste mock token address from Step 2
NEXT_PUBLIC_ESCROW_ADDRESS=0x... # paste escrow address from Step 2
NEXT_PUBLIC_BACKEND_URL=http://localhost:8787
```

Start frontend:
```bash
npm run dev
```

### Step 5: Configure MetaMask

1. **Add Network:**
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

2. **Import Account:**
   - Copy a private key from the Hardhat node output (Step 1)
   - MetaMask → Import Account → Paste private key
   - This account has 10,000 ETH + 100,000 MNEE (Local)

### Step 6: Open the App

- **UI:** http://localhost:3000
- **Backend Health:** http://localhost:8787/health
- **Events API:** http://localhost:8787/events

---

## 🎬 Demo Flow (5 minutes)

1. **Connect wallet** (MetaMask on Hardhat Local)
2. See MNEE (Local) balance (100,000 pre-minted)
3. **Open Escrow Console**
4. Enter payee and arbiter addresses (use another Hardhat account)
5. **Approve** MNEE allowance
6. **Create Escrow** → funds move to contract
7. **Release** (as arbiter) or **Refund** (after deadline)
8. Watch **Ops Log** update with event details

---

## Mainnet Deployment (Costs ETH Gas)

### 1. Configure Environment

Create `contracts/.env`:
```bash
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
MNEE_TOKEN=0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
ETHERSCAN_API_KEY=YOUR_KEY  # optional, for verification
```

### 2. Deploy

```bash
cd contracts
npm run deploy:mainnet
```

### 3. Verify on Etherscan (Optional)

```bash
npx hardhat verify --network mainnet <ESCROW_ADDRESS> 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
```

### 4. Update Frontend/Backend

Update `app/.env.local`:
```bash
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_MNEE_TOKEN=0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
NEXT_PUBLIC_ESCROW_ADDRESS=0x...  # your deployed address
```

Update `backend/.env`:
```bash
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ESCROW_ADDRESS=0x...  # your deployed address
```

---

## Smart Contract Design

### MNEEEscrow.sol

**Entities:**
- `payer` — funds the escrow
- `payee` — receives on successful release
- `arbiter` — can release or refund (judge-friendly role)
- `deadline` — enables timeout refund

**State Machine:**
```
None → Funded → Released
                → Refunded
```

**Core Functions:**
- `createEscrow(escrowId, payee, amount, arbiter, deadline)`
- `release(escrowId)` — arbiter only
- `refund(escrowId)` — arbiter anytime, payer after deadline

**Events (for Ops Log):**
- `EscrowCreated(escrowId, payer, payee, amount, arbiter, deadline)`
- `EscrowReleased(escrowId, to, amount)`
- `EscrowRefunded(escrowId, to, amount)`

**Security:**
- OpenZeppelin `ReentrancyGuard`
- OpenZeppelin `Pausable` + `Ownable`
- Unique escrow IDs (reverts if already exists)
- State validation (can't release after refund)

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health + contract address |
| `/events` | GET | All indexed events (most recent first) |
| `/escrow/:id` | GET | On-chain escrow state by ID |

---

## Run Tests

```bash
cd contracts
npm test
```

Tests cover:
- Create escrow + transfer verification
- Unique escrowId enforcement
- Arbiter-only release
- Payer refund after deadline
- State transition guards

---

## Security Notes

- ✅ ReentrancyGuard on all state-changing functions
- ✅ Pausable for emergency stops
- ✅ Strict escrow state machine (one-way transitions)
- ✅ Explicit roles with access control
- ✅ No ETH custody (ERC-20 only)

---

## License

MIT
