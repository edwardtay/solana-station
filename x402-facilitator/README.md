# x402 Facilitator

External payment verification service for x402 protocol on Solana.

## Architecture

```
Browser → Facilitator (port 3005) → Content Backend (port 3004)
              ↓
         Solana Devnet
```

This is a **PayAI-like** external facilitator that:
- Receives x402 payment proofs from clients
- Verifies Solana transactions on-chain
- Settles (submits) transactions
- Proxies to content backend after payment

## Why External Facilitator?

Separating payment verification from content serving:
- **Clear separation of concerns**: Payment logic ≠ Business logic
- **Reusable**: Same facilitator can serve multiple backends
- **Auditable**: Payment verification is isolated and testable
- **Spec-compliant**: Matches x402 reference architecture

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /x402` | Protocol info |
| `ALL /x402/proxy/*` | Main proxy endpoint |

## Flow

1. Client requests `/x402/proxy/api/reports/risk/WALLET`
2. Facilitator checks if resource is protected
3. If no `X-Payment` header → returns `402` with payment requirements
4. Client signs transaction, sends `X-Payment` header
5. Facilitator:
   - Decodes payment payload
   - Verifies transaction instructions
   - Simulates transaction
   - Settles (submits) to Solana
   - Stores receipt (replay protection)
6. Facilitator proxies to backend with `X-Facilitator-Verified` header
7. Backend serves content

## Setup

```bash
cd x402-facilitator
npm install
npm run dev
```

## Configuration

```env
PORT=3005
SOLANA_RPC_URL=https://api.devnet.solana.com
NETWORK=solana-devnet
PAYMENT_RECIPIENT=<your-wallet>
BACKEND_URL=http://localhost:3004
CORS_ORIGIN=http://localhost:5173
```

## Protected Resources

| Resource | Price |
|----------|-------|
| `/api/reports/risk/*` | 0.001 SOL |
| `/api/reports/rewards/*` | 0.0005 SOL |
| `/api/reports/il/*` | 0.002 SOL |
| `/api/reports/yield/*` | 0.0015 SOL |

## Architecture Note

This architecture demonstrates proper x402 implementation with clear role separation between payment verification and content serving.
