# 💰⛓️ Solana Station

A comprehensive Solana portfolio dashboard with DeFi position tracking, token categorization, and premium analytics powered by **x402 micropayments**.

## Why x402 + Solana?

**x402** is a protocol for HTTP-native micropayments. Combined with Solana's unique capabilities, it enables a new paradigm for monetizing APIs and content:

| Challenge | How x402 + Solana Solves It |
|-----------|----------------------------|
| **High gas fees kill micropayments** | Solana's ~$0.00025 transaction fees make sub-cent payments viable |
| **Slow confirmations break UX** | Solana's 400ms finality = instant payment verification |
| **Complex payment integrations** | x402 uses standard HTTP 402 status codes - works with any client |
| **Subscription fatigue** | Pay only for what you use, per-request pricing |

### x402 Flow in Solana Station

```
1. User requests premium report
2. Server returns HTTP 402 with payment requirements
3. User signs Solana transaction in wallet
4. x402 Facilitator verifies & settles on-chain
5. Content unlocked instantly (~400ms)
```

**Result**: Frictionless micropayments that feel like clicking a button, not a checkout flow.

## Features

### Free Tier
- **Portfolio Overview**: All token holdings with USD values
- **Token Categorization**: Auto-tagged as LST, DeFi, Meme, Stablecoin, etc.
- **DeFi Positions**: Staking, lending, LP positions across protocols
- **70+ Known Tokens**: Instant recognition without API lookups

### Premium Reports (via x402)
| Report | Price | What You Get |
|--------|-------|--------------|
| 🛡️ Risk Analysis | 0.001 SOL | Protocol exposure, concentration risk, recommendations |
| 🎁 Unclaimed Rewards | 0.0005 SOL | Detect claimable rewards across DeFi protocols |
| 📊 IL Simulation | 0.002 SOL | Impermanent loss scenarios for LP positions |
| 💰 Yield Analysis | 0.0015 SOL | Net yield vs gas costs, optimization suggestions |

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│  x402 Facilitator │────▶│  Backend API    │
│  React + Vite   │     │  Payment Verify   │     │  Express + TS   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ Solana Devnet │
                        │  (Payments)   │
                        └──────────────┘
```

**Key Design**: Payment verification is separated from content serving. The x402 Facilitator:
- Receives payment proofs from clients
- Verifies transactions on Solana
- Only proxies to backend after successful payment
- Provides replay protection

## Quick Start

### Prerequisites
- Node.js 18+
- Solana wallet (Phantom, Solflare, etc.)

### Setup

```bash
# Clone
git clone https://github.com/edwardtay/solana-station.git
cd solana-station

# Install
cd solana-portfolio-intelligence
npm install

# Configure
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Add your Helius API key to backend/.env

# Build shared types
cd shared && npm run build && cd ..

# Run
cd backend && npm run dev    # Terminal 1
cd frontend && npm run dev   # Terminal 2
```

### For Premium Reports (x402)
```bash
cd x402-facilitator
cp .env.example .env
npm install && npm run dev   # Terminal 3
```

## API Keys

**Required:**
- `HELIUS_API_KEY` - Get free at [helius.dev](https://helius.dev)

**Optional (enhanced data):**
- Shyft, Moralis, QuickNode, CoinGecko

## Supported Tokens

70+ tokens with automatic categorization:

| Category | Examples |
|----------|----------|
| Native | SOL |
| Stablecoins | USDC, USDT, USDH |
| LSTs | mSOL, JitoSOL, bSOL, jupSOL + 15 more |
| DeFi | JUP, RAY, ORCA, DRIFT, KMNO, PYTH |
| Memecoins | BONK, WIF, POPCAT, PENGU, TRUMP |
| Gaming | ATLAS, POLIS, DUST |
| Infrastructure | HNT, IOT, MOBILE |

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, TypeScript
- **Blockchain**: Solana Web3.js, SPL Token
- **Payments**: x402 Protocol on Solana Devnet

## Why This Matters

x402 + Solana enables **API monetization without friction**:

- No API keys to manage
- No subscription tiers to choose
- No credit card forms
- Just sign a transaction and get your data

This is the future of pay-per-use APIs, and Solana's speed + low fees make it practical today.

## License

MIT
