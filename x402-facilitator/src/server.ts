/**
 * x402 Facilitator Server
 * 
 * External payment verification service (PayAI-like)
 * - Receives x402 payment proofs
 * - Verifies Solana transactions
 * - Settles on-chain
 * - Proxies to content backend after payment
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { Transaction } from '@solana/web3.js';
import { SolanaVerifier } from './solana.js';
import { ReceiptCache } from './receipts.js';
import type { X402Response, PaymentRequirements, PaymentPayload, SettleResponse, ProtectedResource } from './types.js';

config();

const app = express();
const PORT = process.env.PORT || 3005;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3004';
const NETWORK = process.env.NETWORK || 'solana-devnet';

// Initialize services
const solanaVerifier = new SolanaVerifier(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  process.env.PAYMENT_RECIPIENT || ''
);
const receiptCache = new ReceiptCache();

// Protected resources configuration
const PROTECTED_RESOURCES: ProtectedResource[] = [
  { pattern: /\/api\/reports\/risk\//, price: 1000000, description: 'Risk Analysis (0.001 SOL)' },
  { pattern: /\/api\/reports\/rewards\//, price: 500000, description: 'Rewards Detection (0.0005 SOL)' },
  { pattern: /\/api\/reports\/il\//, price: 2000000, description: 'IL Simulation (0.002 SOL)' },
  { pattern: /\/api\/reports\/yield\//, price: 1500000, description: 'Yield Analysis (0.0015 SOL)' },
];

app.use(helmet());

// CORS - support multiple origins for dev/prod
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Trust proxy for Cloudflare
app.set('trust proxy', true);

// Logging
app.use((req, res, next) => {
  console.log(`[Facilitator] ${req.method} ${req.path}`);
  next();
});

/**
 * Find protected resource config by path
 */
function findProtectedResource(path: string): ProtectedResource | undefined {
  return PROTECTED_RESOURCES.find(r => r.pattern.test(path));
}

/**
 * Create x402 Payment Required response
 */
function createX402Response(resource: ProtectedResource, resourceUrl: string): X402Response {
  const requirements: PaymentRequirements = {
    scheme: 'exact',
    network: NETWORK,
    maxAmountRequired: resource.price.toString(),
    resource: resourceUrl,
    description: resource.description,
    mimeType: 'application/json',
    payTo: solanaVerifier.getRecipient(),
    maxTimeoutSeconds: 300,
    asset: 'So11111111111111111111111111111111111111112',
  };

  return {
    x402Version: 1,
    error: 'Payment Required',
    accepts: [requirements],
  };
}

/**
 * Decode X-Payment header
 */
function decodePaymentHeader(header: string): PaymentPayload {
  const decoded = Buffer.from(header, 'base64').toString('utf-8');
  const payload = JSON.parse(decoded) as PaymentPayload;

  if (payload.x402Version !== 1) throw new Error('Invalid x402Version');
  if (payload.scheme !== 'exact') throw new Error('Invalid scheme');
  if (!payload.network) throw new Error('Missing network');

  const txData = payload.payload?.transaction || payload.payload?.serializedTransaction;
  if (!txData) throw new Error('Missing transaction data');

  if (!payload.payload.transaction && payload.payload.serializedTransaction) {
    payload.payload.transaction = payload.payload.serializedTransaction;
  }

  return payload;
}

/**
 * Encode response headers
 */
function encodeHeader(data: object): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}


/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'x402-facilitator',
    network: NETWORK,
    recipient: solanaVerifier.getRecipient(),
    backendUrl: BACKEND_URL,
  });
});

/**
 * x402 Protocol info
 */
app.get('/x402', (req, res) => {
  res.json({
    protocol: 'x402',
    version: 1,
    type: 'external-facilitator',
    description: 'Verifies Solana payments and proxies to content backend',
    network: NETWORK,
    recipient: solanaVerifier.getRecipient(),
    protectedResources: PROTECTED_RESOURCES.map(r => ({
      pattern: r.pattern.toString(),
      price: r.price,
      description: r.description,
    })),
  });
});

/**
 * Main x402 proxy endpoint
 * 
 * Flow:
 * 1. Check if resource is protected
 * 2. If no payment header → return 402
 * 3. Verify payment → settle on-chain
 * 4. Proxy to backend with facilitator auth
 */
app.all('/x402/proxy/*', async (req, res) => {
  const targetPath = req.path.replace('/x402/proxy', '');
  const resourceUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  // Check if protected
  const protectedResource = findProtectedResource(targetPath);
  if (!protectedResource) {
    // Not protected - proxy directly
    return proxyToBackend(req, res, targetPath);
  }

  // Get payment header
  const paymentHeader = req.header('X-Payment') || req.header('x-payment');

  if (!paymentHeader) {
    // No payment - return 402
    const x402Response = createX402Response(protectedResource, resourceUrl);
    res.setHeader('PAYMENT-REQUIRED', encodeHeader(x402Response));
    return res.status(402).json(x402Response);
  }

  // Verify and settle payment
  try {
    const paymentPayload = decodePaymentHeader(paymentHeader);

    if (paymentPayload.network !== NETWORK) {
      return res.status(402).json({
        x402Version: 1,
        error: `Network mismatch: expected ${NETWORK}`,
      });
    }

    // Deserialize transaction
    const txData = paymentPayload.payload.transaction || paymentPayload.payload.serializedTransaction;
    if (!txData) {
      return res.status(402).json({ x402Version: 1, error: 'Missing transaction' });
    }

    const txBuffer = Buffer.from(txData, 'base64');
    const transaction = Transaction.from(txBuffer);

    // Verify transaction
    const verifyResult = solanaVerifier.verifyTransaction(transaction, protectedResource.price);
    if (!verifyResult.isValid) {
      console.log(`[Facilitator] Verification failed: ${verifyResult.invalidReason}`);
      return res.status(402).json({ x402Version: 1, error: verifyResult.invalidReason });
    }

    // Simulate
    const simResult = await solanaVerifier.simulateTransaction(transaction);
    if (!simResult.success) {
      console.log(`[Facilitator] Simulation failed: ${simResult.error}`);
      return res.status(402).json({ x402Version: 1, error: `simulation_failed: ${simResult.error}` });
    }

    // Settle (submit to chain)
    const settleResult = await solanaVerifier.settleTransaction(txBuffer);
    if (!settleResult.success) {
      console.log(`[Facilitator] Settlement failed: ${settleResult.error}`);
      return res.status(402).json({ x402Version: 1, error: `settlement_failed: ${settleResult.error}` });
    }

    console.log(`[Facilitator] Payment settled: ${settleResult.signature}`);

    // Store receipt (replay protection)
    receiptCache.store(settleResult.signature!, verifyResult.payer!, verifyResult.amount!, targetPath);

    // Create settle response
    const settleResponse: SettleResponse = {
      success: true,
      payer: verifyResult.payer,
      transaction: settleResult.signature!,
      network: NETWORK,
    };

    // Proxy to backend with payment proof
    return proxyToBackend(req, res, targetPath, settleResponse);

  } catch (error) {
    console.error('[Facilitator] Payment error:', error);
    return res.status(402).json({
      x402Version: 1,
      error: error instanceof Error ? error.message : 'payment_error',
    });
  }
});

/**
 * Proxy request to content backend
 */
async function proxyToBackend(
  req: express.Request,
  res: express.Response,
  targetPath: string,
  settleResponse?: SettleResponse
) {
  try {
    const backendUrl = `${BACKEND_URL}${targetPath}`;
    console.log(`[Facilitator] Proxying to: ${backendUrl}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Facilitator-Verified': 'true',
    };

    if (settleResponse) {
      headers['X-Payment-Settled'] = encodeHeader(settleResponse);
    }

    const response = await fetch(backendUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();

    // Add payment response header if we settled
    if (settleResponse) {
      res.setHeader('PAYMENT-RESPONSE', encodeHeader(settleResponse));
    }

    // Inject payment details into response
    if (settleResponse && data.success && data.data) {
      data.data.paymentVerified = true;
      data.data.paymentDetails = {
        signature: settleResponse.transaction,
        payer: settleResponse.payer,
        explorerUrl: `https://explorer.solana.com/tx/${settleResponse.transaction}?cluster=devnet`,
      };
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('[Facilitator] Proxy error:', error);
    res.status(502).json({ success: false, error: 'Backend unavailable' });
  }
}

app.listen(PORT, () => {
  console.log(`🔐 x402 Facilitator running on port ${PORT}`);
  console.log(`📡 Network: ${NETWORK}`);
  console.log(`💰 Recipient: ${solanaVerifier.getRecipient()}`);
  console.log(`🔗 Backend: ${BACKEND_URL}`);
});
