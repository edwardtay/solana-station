import { createLogger } from '../utils/logger.js';
import { AIReportService } from './AIReportService.js';
import type { ILSimulation, ILScenario, TokenHolding } from '@solana-portfolio-intelligence/shared';

const logger = createLogger();

interface LPPosition {
  protocol: string;
  tokenA: string;
  tokenB: string;
  amountA: number;
  amountB: number;
  priceA: number;
  priceB: number;
  totalValue: number;
  entryPriceRatio: number;
}

export class ImpermanentLossService {
  private aiService: AIReportService;

  constructor() {
    this.aiService = new AIReportService();
  }

  /**
   * Simulate impermanent loss using AI analysis
   */
  async simulateImpermanentLoss(walletAddress: string, holdings: TokenHolding[]): Promise<ILSimulation> {
    try {
      logger.info(`AI-powered IL simulation for wallet: ${walletAddress}`);
      
      const totalValue = holdings.reduce((sum, h) => sum + h.usdValue, 0);
      
      // Use AI for intelligent IL simulation
      const simulation = await this.aiService.generateILSimulation(holdings, totalValue);
      
      logger.info(`IL simulation complete: current IL = ${simulation.currentIL}%`);
      return simulation;
    } catch (error) {
      logger.error('AI IL simulation failed, using fallback:', error);
      return this.fallbackSimulation(walletAddress, holdings);
    }
  }

  private async fallbackSimulation(walletAddress: string, holdings: TokenHolding[]): Promise<ILSimulation> {
    const lpPositions = this.detectLPPositions(holdings);

    if (lpPositions.length === 0) {
      return {
        currentIL: 0,
        scenarios: [],
        recommendations: [
          'No liquidity provider positions detected in your portfolio.',
          'Consider providing liquidity to earn trading fees, but be aware of impermanent loss risks.',
          'Start with stablecoin pairs (USDC-USDT) to minimize IL exposure.'
        ]
      };
    }

    const currentIL = this.calculateCurrentIL(lpPositions);
    const scenarios = this.generateILScenarios(lpPositions);
    const recommendations = this.generateILRecommendations(lpPositions, currentIL, scenarios);

    return { currentIL, scenarios, recommendations };
  }

  /**
   * Detect LP positions from token holdings
   */
  private detectLPPositions(holdings: TokenHolding[]): LPPosition[] {
    const positions: LPPosition[] = [];

    // Mock LP position detection based on token symbols
    const lpTokenPatterns = [
      { pattern: /RAY-SOL/i, tokenA: 'RAY', tokenB: 'SOL', protocol: 'Raydium' },
      { pattern: /USDC-SOL/i, tokenA: 'USDC', tokenB: 'SOL', protocol: 'Raydium' },
      { pattern: /ORCA-SOL/i, tokenA: 'ORCA', tokenB: 'SOL', protocol: 'Orca' },
      { pattern: /USDC-USDT/i, tokenA: 'USDC', tokenB: 'USDT', protocol: 'Orca' },
      { pattern: /mSOL-SOL/i, tokenA: 'mSOL', tokenB: 'SOL', protocol: 'Marinade' },
      { pattern: /LP/i, tokenA: 'TOKEN', tokenB: 'SOL', protocol: 'Unknown AMM' }
    ];

    for (const holding of holdings) {
      for (const pattern of lpTokenPatterns) {
        if (pattern.pattern.test(holding.symbol) || pattern.pattern.test(holding.name)) {
          // Mock LP position data
          const position: LPPosition = {
            protocol: pattern.protocol,
            tokenA: pattern.tokenA,
            tokenB: pattern.tokenB,
            amountA: holding.amount * 0.5, // Assume 50/50 split
            amountB: holding.amount * 0.5,
            priceA: this.getMockPrice(pattern.tokenA),
            priceB: this.getMockPrice(pattern.tokenB),
            totalValue: holding.usdValue,
            entryPriceRatio: this.getMockEntryRatio(pattern.tokenA, pattern.tokenB)
          };
          positions.push(position);
          break;
        }
      }
    }

    return positions;
  }

  /**
   * Get mock price for tokens
   */
  private getMockPrice(token: string): number {
    const mockPrices: Record<string, number> = {
      'SOL': 100,
      'USDC': 1,
      'USDT': 1,
      'RAY': 0.5,
      'ORCA': 1.2,
      'mSOL': 105,
      'TOKEN': 0.1
    };
    return mockPrices[token] || 1;
  }

  /**
   * Get mock entry price ratio for LP positions
   */
  private getMockEntryRatio(tokenA: string, tokenB: string): number {
    const priceA = this.getMockPrice(tokenA);
    const priceB = this.getMockPrice(tokenB);
    
    // Simulate entry at slightly different ratio (±10%)
    const currentRatio = priceA / priceB;
    const variation = (Math.random() - 0.5) * 0.2; // ±10%
    return currentRatio * (1 + variation);
  }

  /**
   * Calculate current impermanent loss for all positions
   */
  private calculateCurrentIL(positions: LPPosition[]): number {
    if (positions.length === 0) return 0;

    let totalIL = 0;
    let totalValue = 0;

    for (const position of positions) {
      const currentRatio = position.priceA / position.priceB;
      const entryRatio = position.entryPriceRatio;
      const priceChange = currentRatio / entryRatio;

      // IL formula: IL = 2 * sqrt(priceChange) / (1 + priceChange) - 1
      const il = 2 * Math.sqrt(priceChange) / (1 + priceChange) - 1;
      const ilValue = Math.abs(il) * position.totalValue;

      totalIL += ilValue;
      totalValue += position.totalValue;
    }

    return totalValue > 0 ? (totalIL / totalValue) * 100 : 0;
  }

  /**
   * Generate IL scenarios for different price movements
   */
  private generateILScenarios(positions: LPPosition[]): ILScenario[] {
    const scenarios: ILScenario[] = [];
    
    // Price change scenarios (percentage change of token A relative to token B)
    const priceChanges = [-50, -25, -10, 10, 25, 50, 100, 200];
    const timeHorizons = ['1 week', '1 month', '3 months', '1 year'];

    for (const priceChange of priceChanges) {
      for (const timeHorizon of timeHorizons) {
        const projectedIL = this.calculateILForPriceChange(positions, priceChange);
        const breakEvenPoint = this.calculateBreakEvenPoint(positions, priceChange, timeHorizon);

        scenarios.push({
          priceChange,
          timeHorizon,
          projectedIL,
          breakEvenPoint
        });
      }
    }

    // Sort by time horizon and price change
    return scenarios.sort((a, b) => {
      const timeOrder = ['1 week', '1 month', '3 months', '1 year'];
      const aTime = timeOrder.indexOf(a.timeHorizon);
      const bTime = timeOrder.indexOf(b.timeHorizon);
      
      if (aTime !== bTime) return aTime - bTime;
      return a.priceChange - b.priceChange;
    });
  }

  /**
   * Calculate IL for a specific price change
   */
  private calculateILForPriceChange(positions: LPPosition[], priceChangePercent: number): number {
    if (positions.length === 0) return 0;

    let totalIL = 0;
    let totalValue = 0;

    for (const position of positions) {
      const priceMultiplier = 1 + (priceChangePercent / 100);
      
      // IL formula for price change
      const il = 2 * Math.sqrt(priceMultiplier) / (1 + priceMultiplier) - 1;
      const ilValue = Math.abs(il) * position.totalValue;

      totalIL += ilValue;
      totalValue += position.totalValue;
    }

    return totalValue > 0 ? (totalIL / totalValue) * 100 : 0;
  }

  /**
   * Calculate break-even point considering trading fees
   */
  private calculateBreakEvenPoint(positions: LPPosition[], priceChangePercent: number, timeHorizon: string): number {
    // Mock trading fee calculation
    const avgTradingFeeAPR = 0.15; // 15% APR from trading fees
    
    const timeMultipliers: Record<string, number> = {
      '1 week': 1/52,
      '1 month': 1/12,
      '3 months': 1/4,
      '1 year': 1
    };

    const timeMultiplier = timeMultipliers[timeHorizon] || 1;
    const expectedFees = avgTradingFeeAPR * timeMultiplier;
    
    const il = this.calculateILForPriceChange(positions, priceChangePercent);
    
    // Break-even when trading fees offset IL
    return Math.max(0, il - expectedFees);
  }

  /**
   * Generate IL management recommendations
   */
  private generateILRecommendations(
    positions: LPPosition[],
    currentIL: number,
    scenarios: ILScenario[]
  ): string[] {
    const recommendations: string[] = [];

    if (positions.length === 0) {
      return [
        'No LP positions detected. Consider the following before providing liquidity:',
        '• Start with stablecoin pairs (USDC-USDT) to minimize IL risk',
        '• Understand that IL increases with price divergence between paired tokens',
        '• Factor in trading fees when calculating potential returns'
      ];
    }

    // Current IL assessment
    if (currentIL > 10) {
      recommendations.push(
        `High impermanent loss detected (${currentIL.toFixed(2)}%). Consider exiting positions if trading fees don\'t compensate for losses.`
      );
    } else if (currentIL > 5) {
      recommendations.push(
        `Moderate impermanent loss (${currentIL.toFixed(2)}%). Monitor closely and consider rebalancing if trend continues.`
      );
    } else {
      recommendations.push(
        `Low impermanent loss (${currentIL.toFixed(2)}%). Your LP positions are performing well relative to holding tokens separately.`
      );
    }

    // Protocol-specific recommendations
    const protocolCounts = new Map<string, number>();
    for (const position of positions) {
      protocolCounts.set(position.protocol, (protocolCounts.get(position.protocol) || 0) + 1);
    }

    if (protocolCounts.size > 1) {
      recommendations.push(
        `You have LP positions across ${protocolCounts.size} protocols. Diversification helps reduce protocol-specific risks.`
      );
    }

    // Stablecoin pair recommendations
    const stablePairs = positions.filter(p => 
      (p.tokenA === 'USDC' || p.tokenA === 'USDT') && 
      (p.tokenB === 'USDC' || p.tokenB === 'USDT')
    );
    
    if (stablePairs.length > 0) {
      recommendations.push(
        'Stablecoin LP positions detected. These have minimal IL risk but may offer lower trading fees.'
      );
    }

    // Volatile pair recommendations
    const volatilePairs = positions.filter(p => 
      p.tokenA !== 'USDC' && p.tokenA !== 'USDT' && 
      p.tokenB !== 'USDC' && p.tokenB !== 'USDT'
    );

    if (volatilePairs.length > 0) {
      recommendations.push(
        'Volatile token pairs detected. These offer higher fee potential but increased IL risk during price divergence.'
      );
    }

    // Scenario-based recommendations
    const worstCaseScenario = scenarios.reduce((worst, scenario) => 
      scenario.projectedIL > worst.projectedIL ? scenario : worst
    );

    if (worstCaseScenario.projectedIL > 20) {
      recommendations.push(
        `Worst-case scenario shows ${worstCaseScenario.projectedIL.toFixed(1)}% IL with ${worstCaseScenario.priceChange}% price change. Consider position sizing accordingly.`
      );
    }

    // General recommendations
    recommendations.push(
      'Monitor your positions regularly and consider automated rebalancing tools to minimize IL.'
    );

    recommendations.push(
      'Factor in trading fees, protocol incentives, and token rewards when evaluating LP profitability.'
    );

    recommendations.push(
      'Consider impermanent loss protection products offered by some protocols for high-risk pairs.'
    );

    return recommendations;
  }
}