# 🚉 Solana Station

A comprehensive Solana portfolio dashboard with DeFi position tracking, token categorization, and premium analytics via x402 micropayments.

## Features

- **Portfolio Overview**: View all token holdings with USD values and percentages
- **Token Categorization**: Automatic categorization (LST, DeFi, Meme, Stablecoin, etc.)
- **DeFi Positions**: Track staking, lending, and LP positions across protocols
- **Premium Reports**: Pay-per-insight analytics via x402 protocol
  - Risk Analysis
  - Unclaimed Rewards Detection
  - Impermanent Loss Simulation
  - Yield Analysis

## Architecture

```
solana-station/
├── solana-portfolio-intelligence/
│   ├── frontend/          # React + Vite + TailwindCSS
│   ├── backend/           # Express API server
│   └── shared/            # Shared TypeScript types
└── x402-facilitator/      # x402 payment facilitator service
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/edwardtay/solana-station.git
cd solana-station
```

2. Install dependencies:
```bash
cd solana-portfolio-intelligence
npm install
```

3. Configure environment:
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# Frontend
cp frontend/.env.example frontend/.env
```

4. Build shared types:
```bash
cd shared && npm run build && cd ..
```

5. Start development servers:
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

6. (Optional) Start x402 facilitator for premium reports:
```bash
cd ../x402-facilitator
cp .env.example .env
npm install
npm run dev
```

## API Keys Required

The backend requires at minimum a Helius API key for Solana RPC access:

- **HELIUS_API_KEY**: Get from [helius.dev](https://helius.dev)

Optional APIs for enhanced data:
- Shyft, Moralis, QuickNode, CoinGecko, etc.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, TypeScript
- **Blockchain**: Solana Web3.js, SPL Token
- **Payments**: x402 Protocol (Solana Devnet)

## Supported Tokens

70+ known tokens with automatic categorization:
- Native: SOL
- Stablecoins: USDC, USDT, USDH
- LSTs: mSOL, JitoSOL, bSOL, jupSOL, and 15+ more
- DeFi: JUP, RAY, ORCA, DRIFT, KMNO, PYTH
- Memecoins: BONK, WIF, POPCAT, PENGU, and more
- Gaming: ATLAS, POLIS, DUST
- Infrastructure: HNT, IOT, MOBILE

## License

MIT
