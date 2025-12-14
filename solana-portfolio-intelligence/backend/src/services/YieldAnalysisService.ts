import { createLogger } from '../utils/logger.js';
import { AIReportService } from './AIReportService.js';
import type { YieldAnalysis, YieldPosition, TokenHolding } from '@solana-portfolio-intelligence/shared';

const logger = createLogger();

interface ProtocolYieldData {
  protocol: string;
  type: 'STAKING' | 'LENDING' | 'LP';
  baseAPY: number;
  incentiveAPY: number;
  fees: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  minAmount: number;
}

export class YieldAnalysisService {
  private protocolData: ProtocolYieldData[];
  private aiService: AIReportService;

  constructor() {
    this.aiService = new AIReportService();
    // Initialize with current Solana DeFi protocol data
    this.protocolData = [
      // Staking protocols
      {
        protocol: 'Solana Native Staking',
        type: 'STAKING',
        baseAPY: 6.5,
        incentiveAPY: 0,
        fees: 0,
        riskLevel: 'LOW',
        minAmount: 1 // 1 SOL minimum
      },
      {
        protocol: 'Marinade Finance',
        type: 'STAKING',
        baseAPY: 6.2,
        incentiveAPY: 2.1, // MNDE rewards
        fees: 0.03, // 3% management fee
        riskLevel: 'LOW',
        minAmount: 0.1
      },
      {
        protocol: 'Jito',
        type: 'STAKING',
        baseAPY: 6.8,
        incentiveAPY: 1.5, // JTO rewards
        fees: 0.04, // 4% management fee
        riskLevel: 'LOW',
        minAmount: 0.1
      },
      
      // Lending protocols
      {
        protocol: 'Solend',
        type: 'LENDING',
        baseAPY: 4.2,
        incentiveAPY: 3.8, // SLND rewards
        fees: 0,
        riskLevel: 'MEDIUM',
        minAmount: 10 // $10 minimum
      },
      {
        protocol: 'Mango Markets',
        type: 'LENDING',
        baseAPY: 3.8,
        incentiveAPY: 2.2, // MNGO rewards
        fees: 0,
        riskLevel: 'MEDIUM',
        minAmount: 10
      },
      
      // LP protocols
      {
        protocol: 'Raydium',
        type: 'LP',
        baseAPY: 12.5,
        incentiveAPY: 8.3, // RAY rewards
        fees: 0.25, // Trading fees
        riskLevel: 'HIGH',
        minAmount: 50 // $50 minimum for meaningful LP
      },
      {
        protocol: 'Orca',
        type: 'LP',
        baseAPY: 15.2,
        incentiveAPY: 6.7, // ORCA rewards
        fees: 0.3, // Trading fees
        riskLevel: 'HIGH',
        minAmount: 50
      },
      {
        protocol: 'Jupiter',
        type: 'LP',
        baseAPY: 8.9,
        incentiveAPY: 4.1, // JUP rewards
        fees: 0.1, // Lower fees for stablecoin pairs
        riskLevel: 'MEDIUM',
        minAmount: 100
      }
    ];
  }

  /**
   * Analyze yield opportunities using AI
   */
  async analyzeYield(walletAddress: string, holdings: TokenHolding[]): Promise<YieldAnalysis> {
    try {
      logger.info(`AI-powered yield analysis for wallet: ${walletAddress}`);
      
      const totalValue = holdings.reduce((sum, h) => sum + h.usdValue, 0);
      
      // Use AI for intelligent yield analysis
      const analysis = await this.aiService.generateYieldAnalysis(holdings, totalValue);
      
      logger.info(`Yield analysis complete: ${analysis.totalAPY.toFixed(2)}% APY`);
      return analysis;
    } catch (error) {
      logger.error('AI yield analysis failed, using fallback:', error);
      return this.fallbackAnalysis(walletAddress, holdings);
    }
  }

  private fallbackAnalysis(walletAddress: string, holdings: TokenHolding[]): YieldAnalysis {
    const currentPositions = this.detectYieldPositions(holdings);
    const totalAPY = this.calculatePortfolioAPY(currentPositions);
    const netReturn = this.calculateNetReturn(currentPositions);
    const gasCostRatio = this.calculateGasCostRatio(currentPositions, holdings);
    const optimizationSuggestions = this.generateOptimizationSuggestions(holdings, currentPositions, gasCostRatio);

    return { positions: currentPositions, totalAPY, netReturn, gasCostRatio, optimizationSuggestions };
  }

  /**
   * Detect current yield-generating positions
   */
  private detectYieldPositions(holdings: TokenHolding[]): YieldPosition[] {
    const positions: YieldPosition[] = [];

    for (const holding of holdings) {
      // Detect staking positions
      if (holding.symbol === 'SOL' && holding.usdValue > 100) {
        const stakingData = this.protocolData.find(p => p.protocol === 'Solana Native Staking');
        if (stakingData) {
          positions.push({
            protocol: stakingData.protocol,
            type: stakingData.type,
            apy: stakingData.baseAPY + stakingData.incentiveAPY,
            tvl: holding.usdValue,
            fees: stakingData.fees,
            netYield: this.calculateNetYield(stakingData, holding.usdValue)
          });
        }
      }

      if (holding.symbol === 'mSOL') {
        const marinadeData = this.protocolData.find(p => p.protocol === 'Marinade Finance');
        if (marinadeData) {
          positions.push({
            protocol: marinadeData.protocol,
            type: marinadeData.type,
            apy: marinadeData.baseAPY + marinadeData.incentiveAPY,
            tvl: holding.usdValue,
            fees: marinadeData.fees,
            netYield: this.calculateNetYield(marinadeData, holding.usdValue)
          });
        }
      }

      // Detect LP positions
      if (holding.symbol.includes('LP') || holding.symbol.includes('RAY-') || holding.symbol.includes('ORCA-')) {
        let protocolName = 'Raydium';
        if (holding.symbol.includes('ORCA')) protocolName = 'Orca';
        
        const lpData = this.protocolData.find(p => p.protocol === protocolName);
        if (lpData) {
          positions.push({
            protocol: lpData.protocol,
            type: lpData.type,
            apy: lpData.baseAPY + lpData.incentiveAPY,
            tvl: holding.usdValue,
            fees: lpData.fees,
            netYield: this.calculateNetYield(lpData, holding.usdValue)
          });
        }
      }

      // Detect lending positions (simplified)
      if ((holding.symbol === 'USDC' || holding.symbol === 'USDT') && holding.usdValue > 100) {
        // Assume some portion is in lending (mock detection)
        const lendingPortion = Math.random() * 0.3; // 0-30% in lending
        if (lendingPortion > 0.05) {
          const lendingValue = holding.usdValue * lendingPortion;
          const solendData = this.protocolData.find(p => p.protocol === 'Solend');
          if (solendData) {
            positions.push({
              protocol: solendData.protocol,
              type: solendData.type,
              apy: solendData.baseAPY + solendData.incentiveAPY,
              tvl: lendingValue,
              fees: solendData.fees,
              netYield: this.calculateNetYield(solendData, lendingValue)
            });
          }
        }
      }
    }

    return positions;
  }

  /**
   * Calculate net yield for a position
   */
  private calculateNetYield(protocolData: ProtocolYieldData, amount: number): number {
    const grossYield = (protocolData.baseAPY + protocolData.incentiveAPY) / 100;
    const feeRate = protocolData.fees / 100;
    const netYieldRate = grossYield - feeRate;
    
    // Estimate gas costs (annual)
    const estimatedGasCosts = this.estimateAnnualGasCosts(protocolData.type, amount);
    const gasCostRate = estimatedGasCosts / amount;
    
    return Math.max(0, netYieldRate - gasCostRate);
  }

  /**
   * Estimate annual gas costs for different position types
   */
  private estimateAnnualGasCosts(type: 'STAKING' | 'LENDING' | 'LP', amount: number): number {
    const solPrice = 100; // Assume $100 SOL
    const baseTxCost = 0.000005 * solPrice; // ~$0.0005 per transaction
    
    switch (type) {
      case 'STAKING':
        // Stake + unstake + claim rewards (quarterly)
        return baseTxCost * 8; // 8 transactions per year
      
      case 'LENDING':
        // Deposit + withdraw + claim rewards (monthly)
        return baseTxCost * 24; // 24 transactions per year
      
      case 'LP':
        // Add liquidity + remove + claim rewards + compound (weekly)
        return baseTxCost * 52; // 52 transactions per year
      
      default:
        return baseTxCost * 12;
    }
  }

  /**
   * Calculate portfolio-weighted APY
   */
  private calculatePortfolioAPY(positions: YieldPosition[]): number {
    if (positions.length === 0) return 0;

    const totalValue = positions.reduce((sum, pos) => sum + pos.tvl, 0);
    if (totalValue === 0) return 0;

    const weightedAPY = positions.reduce((sum, pos) => {
      const weight = pos.tvl / totalValue;
      return sum + (pos.apy * weight);
    }, 0);

    return weightedAPY;
  }

  /**
   * Calculate net return considering all costs
   */
  private calculateNetReturn(positions: YieldPosition[]): number {
    if (positions.length === 0) return 0;

    const totalValue = positions.reduce((sum, pos) => sum + pos.tvl, 0);
    if (totalValue === 0) return 0;

    const weightedNetYield = positions.reduce((sum, pos) => {
      const weight = pos.tvl / totalValue;
      return sum + (pos.netYield * weight);
    }, 0);

    return weightedNetYield * 100; // Convert to percentage
  }

  /**
   * Calculate gas cost ratio (gas costs as % of portfolio value)
   */
  private calculateGasCostRatio(positions: YieldPosition[], holdings: TokenHolding[]): number {
    const totalPortfolioValue = holdings.reduce((sum, holding) => sum + holding.usdValue, 0);
    if (totalPortfolioValue === 0) return 0;

    const totalGasCosts = positions.reduce((sum, pos) => {
      return sum + this.estimateAnnualGasCosts(pos.type, pos.tvl);
    }, 0);

    return (totalGasCosts / totalPortfolioValue) * 100;
  }

  /**
   * Generate yield optimization suggestions
   */
  private generateOptimizationSuggestions(
    holdings: TokenHolding[],
    currentPositions: YieldPosition[],
    gasCostRatio: number
  ): string[] {
    const suggestions: string[] = [];
    const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.usdValue, 0);

    // No yield positions
    if (currentPositions.length === 0) {
      suggestions.push('No yield-generating positions detected. Consider the following opportunities:');
      
      const solHolding = holdings.find(h => h.symbol === 'SOL');
      if (solHolding && solHolding.usdValue > 100) {
        suggestions.push(`• Stake your ${solHolding.amount.toFixed(2)} SOL for ~6.5% APY through native staking or liquid staking protocols`);
      }

      const stablecoinHoldings = holdings.filter(h => h.symbol === 'USDC' || h.symbol === 'USDT');
      const stablecoinValue = stablecoinHoldings.reduce((sum, h) => sum + h.usdValue, 0);
      if (stablecoinValue > 50) {
        suggestions.push(`• Lend your $${stablecoinValue.toFixed(0)} in stablecoins for 4-8% APY on Solend or Mango`);
      }

      return suggestions;
    }

    // Gas cost analysis
    if (gasCostRatio > 2) {
      suggestions.push(`High gas cost ratio (${gasCostRatio.toFixed(2)}% of portfolio). Consider consolidating positions or increasing position sizes.`);
    } else if (gasCostRatio < 0.1) {
      suggestions.push(`Very low gas costs (${gasCostRatio.toFixed(3)}%). You can afford to be more active with yield strategies.`);
    }

    // Position-specific suggestions
    const stakingPositions = currentPositions.filter(p => p.type === 'STAKING');
    const lendingPositions = currentPositions.filter(p => p.type === 'LENDING');
    const lpPositions = currentPositions.filter(p => p.type === 'LP');

    // Staking optimization
    if (stakingPositions.length > 0) {
      const avgStakingAPY = stakingPositions.reduce((sum, p) => sum + p.apy, 0) / stakingPositions.length;
      if (avgStakingAPY < 7) {
        suggestions.push('Consider switching to higher-yield liquid staking protocols like Jito (6.8% + JTO rewards) for better returns.');
      }
    }

    // Lending optimization
    if (lendingPositions.length > 0) {
      const avgLendingAPY = lendingPositions.reduce((sum, p) => sum + p.apy, 0) / lendingPositions.length;
      if (avgLendingAPY < 6) {
        suggestions.push('Your lending APY is below market average. Consider protocols with higher incentive rewards.');
      }
    }

    // LP optimization
    if (lpPositions.length > 0) {
      const avgLPAPY = lpPositions.reduce((sum, p) => sum + p.apy, 0) / lpPositions.length;
      if (avgLPAPY > 20) {
        suggestions.push('High LP yields detected. Monitor for impermanent loss and consider taking profits periodically.');
      }
      
      suggestions.push('LP positions carry impermanent loss risk. Ensure trading fees and rewards compensate for potential IL.');
    }

    // Diversification suggestions
    const positionTypes = new Set(currentPositions.map(p => p.type));
    if (positionTypes.size === 1) {
      if (positionTypes.has('STAKING')) {
        suggestions.push('Consider diversifying into lending or LP positions for potentially higher yields.');
      } else if (positionTypes.has('LP')) {
        suggestions.push('Consider adding some lower-risk staking positions to balance your yield strategy.');
      }
    }

    // Portfolio size suggestions
    if (totalPortfolioValue < 500) {
      suggestions.push('Small portfolio detected. Focus on low-fee strategies like native SOL staking to maximize net returns.');
    } else if (totalPortfolioValue > 10000) {
      suggestions.push('Large portfolio detected. Consider advanced strategies like automated yield farming and protocol governance participation.');
    }

    // Idle asset suggestions
    const idleAssets = holdings.filter(h => {
      const hasYieldPosition = currentPositions.some(p => 
        (h.symbol === 'SOL' && p.type === 'STAKING') ||
        ((h.symbol === 'USDC' || h.symbol === 'USDT') && p.type === 'LENDING') ||
        (h.symbol.includes('LP') && p.type === 'LP')
      );
      return !hasYieldPosition && h.usdValue > 20;
    });

    if (idleAssets.length > 0) {
      const idleValue = idleAssets.reduce((sum, h) => sum + h.usdValue, 0);
      suggestions.push(`$${idleValue.toFixed(0)} in idle assets detected. Consider putting these to work in yield-generating strategies.`);
    }

    // Risk management
    const highRiskValue = currentPositions
      .filter(p => p.type === 'LP')
      .reduce((sum, p) => sum + p.tvl, 0);
    
    if (highRiskValue > totalPortfolioValue * 0.5) {
      suggestions.push('Over 50% of portfolio in high-risk LP positions. Consider rebalancing to include safer staking strategies.');
    }

    // General recommendations
    suggestions.push('Monitor protocol health and TVL changes regularly to ensure sustainable yields.');
    suggestions.push('Consider automated compounding tools to maximize returns from protocol rewards.');
    suggestions.push('Factor in token price volatility when evaluating real returns from incentive programs.');

    return suggestions;
  }
}