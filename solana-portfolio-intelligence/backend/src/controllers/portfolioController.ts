import { Router, Request, Response } from 'express';
import { PortfolioService } from '../services/PortfolioService.js';
import { DeFiPositionsService } from '../services/DeFiPositionsService.js';
import { createLogger } from '../utils/logger.js';
import type { ApiResponse, BasicPortfolioData, ComprehensivePortfolio } from '@solana-portfolio-intelligence/shared';

const logger = createLogger();
const rpcUrl = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const portfolioService = new PortfolioService(rpcUrl);
const defiService = new DeFiPositionsService();

export const portfolioRoutes = Router();

/**
 * GET /api/portfolio/:address
 * Get basic portfolio data (free tier)
 */
portfolioRoutes.get('/:address', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
        code: 'MISSING_ADDRESS'
      } as ApiResponse);
    }

    // Validate wallet address format
    if (!portfolioService.validateWalletAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format',
        code: 'INVALID_ADDRESS'
      } as ApiResponse);
    }

    // Get portfolio data
    const portfolio = await portfolioService.getBasicPortfolio(address);
    
    const responseTime = Date.now() - startTime;
    logger.info(`Portfolio request completed in ${responseTime}ms for ${address}`);

    // Check if response time exceeds 3 seconds (requirement 1.4)
    if (responseTime > 3000) {
      logger.warn(`Portfolio request took ${responseTime}ms, exceeding 3s requirement`);
    }

    res.json({
      success: true,
      data: portfolio
    } as ApiResponse<BasicPortfolioData>);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error(`Portfolio request failed after ${responseTime}ms:`, error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Invalid wallet address')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid wallet address format',
          code: 'INVALID_ADDRESS'
        } as ApiResponse);
      }
      
      if (error.message.includes('Failed to fetch')) {
        return res.status(503).json({
          success: false,
          error: 'Unable to fetch portfolio data. Please try again later.',
          code: 'SERVICE_UNAVAILABLE'
        } as ApiResponse);
      }
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio data',
      code: 'INTERNAL_ERROR'
    } as ApiResponse);
  }
});

/**
 * GET /api/portfolio/:address/comprehensive
 * Get comprehensive portfolio with DeFi positions (free tier)
 */
portfolioRoutes.get('/:address/comprehensive', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
        code: 'MISSING_ADDRESS'
      } as ApiResponse);
    }

    if (!portfolioService.validateWalletAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format',
        code: 'INVALID_ADDRESS'
      } as ApiResponse);
    }

    const portfolio = await defiService.getComprehensivePortfolio(address);
    
    const responseTime = Date.now() - startTime;
    logger.info(`Comprehensive portfolio request completed in ${responseTime}ms for ${address}`);

    res.json({
      success: true,
      data: portfolio
    } as ApiResponse<ComprehensivePortfolio>);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error(`Comprehensive portfolio request failed after ${responseTime}ms:`, error);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch comprehensive portfolio data',
      code: 'INTERNAL_ERROR'
    } as ApiResponse);
  }
});

/**
 * GET /api/portfolio/:address/validate
 * Validate wallet address format
 */
portfolioRoutes.get('/:address/validate', (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
        code: 'MISSING_ADDRESS'
      } as ApiResponse);
    }

    const isValid = portfolioService.validateWalletAddress(address);
    
    return res.json({
      success: true,
      data: {
        address,
        isValid,
        message: isValid ? 'Valid Solana wallet address' : 'Invalid wallet address format'
      }
    } as ApiResponse);

  } catch (error) {
    logger.error('Address validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Address validation failed',
      code: 'VALIDATION_ERROR'
    } as ApiResponse);
  }
});


/**
 * GET /api/portfolio/health
 * Health check endpoint
 */
portfolioRoutes.get('/health', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    }
  } as ApiResponse);
});
