import { Router, Request, Response } from 'express';
import { createLogger } from '../utils/logger.js';
import { RiskAnalysisService } from '../services/RiskAnalysisService.js';
import { RewardsDetectionService } from '../services/RewardsDetectionService.js';
import { ImpermanentLossService } from '../services/ImpermanentLossService.js';
import { YieldAnalysisService } from '../services/YieldAnalysisService.js';
import { PortfolioService } from '../services/PortfolioService.js';
import type { ApiResponse, ReportType } from '@solana-portfolio-intelligence/shared';

const logger = createLogger();

const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';

// Initialize analytics services (NO payment logic here)
const riskAnalysisService = new RiskAnalysisService();
const rewardsDetectionService = new RewardsDetectionService(rpcUrl);
const impermanentLossService = new ImpermanentLossService();
const yieldAnalysisService = new YieldAnalysisService();
const portfolioService = new PortfolioService(rpcUrl);

export const reportsRoutes = Router();

/**
 * Middleware: Verify request came from facilitator
 * In production, use signed headers or IP whitelist
 */
function verifyFacilitatorRequest(req: Request, res: Response, next: Function) {
  const facilitatorHeader = req.header('X-Facilitator-Verified');
  const paymentSettled = req.header('X-Payment-Settled');

  // Allow if facilitator verified OR if payment was settled
  if (facilitatorHeader === 'true' || paymentSettled) {
    return next();
  }

  // No facilitator auth - reject
  logger.warn(`Direct access attempt to protected resource: ${req.path}`);
  return res.status(403).json({
    success: false,
    error: 'Access denied. Use x402 facilitator for paid content.',
    code: 'FACILITATOR_REQUIRED',
  } as ApiResponse);
}

/**
 * Parse payment details from facilitator header
 */
function getPaymentDetails(req: Request): { signature?: string; payer?: string } | null {
  const paymentSettled = req.header('X-Payment-Settled');
  if (!paymentSettled) return null;

  try {
    const decoded = Buffer.from(paymentSettled, 'base64').toString('utf-8');
    const data = JSON.parse(decoded);
    return {
      signature: data.transaction,
      payer: data.payer,
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/reports/risk/:address
 * Risk analysis report - PROTECTED (payment via facilitator)
 */
reportsRoutes.get('/risk/:address', verifyFacilitatorRequest, async (req: Request, res: Response) => {
  const { address } = req.params;
  const reportType: ReportType = 'RISK';
  const paymentDetails = getPaymentDetails(req);

  if (!address) {
    return res.status(400).json({
      success: false,
      error: 'Wallet address is required',
      code: 'MISSING_ADDRESS',
    } as ApiResponse);
  }

  logger.info(`Generating risk analysis for ${address}`);

  try {
    const portfolioData = await portfolioService.getBasicPortfolio(address);
    const riskAnalysis = await riskAnalysisService.analyzeRisk(address, portfolioData.holdings);

    res.json({
      success: true,
      data: {
        reportType,
        walletAddress: address,
        paymentVerified: !!paymentDetails,
        paymentDetails: paymentDetails ? {
          signature: paymentDetails.signature,
          payer: paymentDetails.payer,
          explorerUrl: `https://explorer.solana.com/tx/${paymentDetails.signature}?cluster=devnet`,
        } : undefined,
        analysis: riskAnalysis,
        generatedAt: Date.now(),
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Risk analysis generation failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate risk analysis report',
      code: 'ANALYSIS_ERROR',
    } as ApiResponse);
  }
});

/**
 * GET /api/reports/rewards/:address
 * Unclaimed rewards report - PROTECTED
 */
reportsRoutes.get('/rewards/:address', verifyFacilitatorRequest, async (req: Request, res: Response) => {
  const { address } = req.params;
  const reportType: ReportType = 'REWARDS';
  const paymentDetails = getPaymentDetails(req);

  if (!address) {
    return res.status(400).json({
      success: false,
      error: 'Wallet address is required',
      code: 'MISSING_ADDRESS',
    } as ApiResponse);
  }

  logger.info(`Generating rewards detection for ${address}`);

  try {
    const portfolioData = await portfolioService.getBasicPortfolio(address);
    const rewardsReport = await rewardsDetectionService.detectUnclaimedRewards(address, portfolioData.holdings);

    res.json({
      success: true,
      data: {
        reportType,
        walletAddress: address,
        paymentVerified: !!paymentDetails,
        paymentDetails: paymentDetails ? {
          signature: paymentDetails.signature,
          payer: paymentDetails.payer,
          explorerUrl: `https://explorer.solana.com/tx/${paymentDetails.signature}?cluster=devnet`,
        } : undefined,
        report: rewardsReport,
        generatedAt: Date.now(),
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Rewards detection failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate rewards detection report',
      code: 'ANALYSIS_ERROR',
    } as ApiResponse);
  }
});

/**
 * GET /api/reports/il/:address
 * Impermanent loss simulation - PROTECTED
 */
reportsRoutes.get('/il/:address', verifyFacilitatorRequest, async (req: Request, res: Response) => {
  const { address } = req.params;
  const reportType: ReportType = 'IL';
  const paymentDetails = getPaymentDetails(req);

  if (!address) {
    return res.status(400).json({
      success: false,
      error: 'Wallet address is required',
      code: 'MISSING_ADDRESS',
    } as ApiResponse);
  }

  logger.info(`Generating IL simulation for ${address}`);

  try {
    const portfolioData = await portfolioService.getBasicPortfolio(address);
    const ilSimulation = await impermanentLossService.simulateImpermanentLoss(address, portfolioData.holdings);

    res.json({
      success: true,
      data: {
        reportType,
        walletAddress: address,
        paymentVerified: !!paymentDetails,
        paymentDetails: paymentDetails ? {
          signature: paymentDetails.signature,
          payer: paymentDetails.payer,
          explorerUrl: `https://explorer.solana.com/tx/${paymentDetails.signature}?cluster=devnet`,
        } : undefined,
        simulation: ilSimulation,
        generatedAt: Date.now(),
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('IL simulation failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate IL simulation report',
      code: 'ANALYSIS_ERROR',
    } as ApiResponse);
  }
});

/**
 * GET /api/reports/yield/:address
 * Yield analysis report - PROTECTED
 */
reportsRoutes.get('/yield/:address', verifyFacilitatorRequest, async (req: Request, res: Response) => {
  const { address } = req.params;
  const reportType: ReportType = 'YIELD';
  const paymentDetails = getPaymentDetails(req);

  if (!address) {
    return res.status(400).json({
      success: false,
      error: 'Wallet address is required',
      code: 'MISSING_ADDRESS',
    } as ApiResponse);
  }

  logger.info(`Generating yield analysis for ${address}`);

  try {
    const portfolioData = await portfolioService.getBasicPortfolio(address);
    const yieldAnalysis = await yieldAnalysisService.analyzeYield(address, portfolioData.holdings);

    res.json({
      success: true,
      data: {
        reportType,
        walletAddress: address,
        paymentVerified: !!paymentDetails,
        paymentDetails: paymentDetails ? {
          signature: paymentDetails.signature,
          payer: paymentDetails.payer,
          explorerUrl: `https://explorer.solana.com/tx/${paymentDetails.signature}?cluster=devnet`,
        } : undefined,
        analysis: yieldAnalysis,
        generatedAt: Date.now(),
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Yield analysis failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate yield analysis report',
      code: 'ANALYSIS_ERROR',
    } as ApiResponse);
  }
});
