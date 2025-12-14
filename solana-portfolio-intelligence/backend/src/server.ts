import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { createLogger } from './utils/logger.js';
import { portfolioRoutes } from './controllers/portfolioController.js';
import { reportsRoutes } from './controllers/reportsController.js';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3004; // Updated
const logger = createLogger();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Routes
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/reports', reportsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    network: process.env.NETWORK || 'devnet'
  });
});

// API info
app.get('/', (req, res) => {
  res.json({
    name: 'Solana Portfolio Intelligence API',
    description: 'Content backend - payment verification handled by external x402 facilitator',
    version: '1.0.0',
    architecture: 'external-facilitator',
    note: 'Protected endpoints require X-Facilitator-Verified header from facilitator',
    endpoints: {
      'GET /api/portfolio/:address': 'Get basic portfolio data (free)',
      'GET /api/reports/risk/:address': 'Risk analysis (via facilitator)',
      'GET /api/reports/rewards/:address': 'Unclaimed rewards (via facilitator)',
      'GET /api/reports/il/:address': 'IL simulation (via facilitator)',
      'GET /api/reports/yield/:address': 'Yield analysis (via facilitator)'
    },
    network: process.env.NETWORK || 'devnet',
    facilitatorUrl: 'http://localhost:3005'
  });
});

// x402 Architecture Info
app.get('/x402', (req, res) => {
  res.json({
    protocol: 'x402',
    version: 1,
    architecture: 'external-facilitator',
    description: 'This is the CONTENT backend. Payment verification is handled by external facilitator.',
    flow: [
      '1. Frontend requests paid content from Facilitator (port 3005)',
      '2. Facilitator returns 402 with payment requirements',
      '3. Frontend signs transaction, sends to Facilitator',
      '4. Facilitator verifies & settles on Solana',
      '5. Facilitator proxies to this backend with X-Facilitator-Verified header',
      '6. Backend serves content (trusts facilitator)'
    ],
    facilitator: {
      url: 'http://localhost:3005',
      proxyEndpoint: '/x402/proxy/*'
    },
    protectedEndpoints: [
      '/api/reports/risk/:address',
      '/api/reports/rewards/:address',
      '/api/reports/il/:address',
      '/api/reports/yield/:address'
    ],
    note: 'Direct access to protected endpoints returns 403. Use facilitator.'
  });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

app.listen(PORT, () => {
  logger.info(`🚀 Solana Portfolio Intelligence API running on port ${PORT}`);
  logger.info(`📡 Network: ${process.env.NETWORK || 'devnet'}`);
  logger.info(`💰 Payment Recipient: ${process.env.PAYMENT_RECIPIENT}`);
});