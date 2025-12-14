import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import { AIReportService } from './AIReportService.js';
import type { 
  RiskAnalysis, 
  ProtocolRisk, 
  ConcentrationRisk, 
  TokenHolding 
} from '@solana-portfolio-intelligence/shared';

const logger = createLogger();

export class RiskAnalysisService {
  private defiLlamaUrl: string;
  private aiService: AIReportService;

  constructor() {
    this.defiLlamaUrl = process.env.DEFI_LLAMA_API_URL || 'https://api.llama.fi';
    this.aiService = new AIReportService();
  }

  /**
   * Generate comprehensive risk analysis for a portfolio using AI
   */
  async analyzeRisk(walletAddress: string, holdings: TokenHolding[]): Promise<RiskAnalysis> {
    try {
      logger.info(`Generating AI-powered risk analysis for wallet: ${walletAddress}`);
      
      const totalValue = holdings.reduce((sum, h) => sum + h.usdValue, 0);
      
      // Use AI service for intelligent analysis
      const analysis = await this.aiService.generateRiskAnalysis(holdings, totalValue);
      
      logger.info(`Risk analysis complete: score=${analysis.overallRiskScore}`);
      return analysis;
    } catch (error) {
      logger.error('AI risk analysis failed, using fallback:', error);
      return this.fallbackAnalysis(walletAddress, holdings);
    }
  }

  private async fallbackAnalysis(walletAddress: string, holdings: TokenHolding[]): Promise<RiskAnalysis> {
    // Calculate concentration risk
    const concentrationRisk = this.calculateConcentrationRisk(holdings);

    // Analyze protocol exposure
    const protocolExposure = await this.analyzeProtocolExposure(holdings);

    // Calculate overall risk score
    const overallRiskScore = this.calculateOverallRiskScore(concentrationRisk, protocolExposure);

    // Generate recommendations
    const recommendations = this.generateRiskRecommendations(concentrationRisk, protocolExposure);

    return {
      overallRiskScore,
      protocolExposure,
      concentrationRisk,
      recommendations
    };
  }

  /**
   * Calculate concentration risk based on token allocation
   */
  private calculateConcentrationRisk(holdings: TokenHolding[]): ConcentrationRisk {
    if (holdings.length === 0) {
      return {
        topTokenPercentage: 0,
        topThreeTokensPercentage: 0,
        diversificationScore: 0,
        riskLevel: 'LOW'
      };
    }

    // Sort holdings by percentage (descending)
    const sortedHoldings = [...holdings].sort((a, b) => b.percentage - a.percentage);

    const topTokenPercentage = sortedHoldings[0]?.percentage || 0;
    const topThreeTokensPercentage = sortedHoldings
      .slice(0, 3)
      .reduce((sum, holding) => sum + holding.percentage, 0);

    // Calculate diversification score (0-100, higher is better)
    const diversificationScore = this.calculateDiversificationScore(holdings);

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (topTokenPercentage > 70 || topThreeTokensPercentage > 90) {
      riskLevel = 'HIGH';
    } else if (topTokenPercentage > 50 || topThreeTokensPercentage > 80) {
      riskLevel = 'MEDIUM';
    }

    return {
      topTokenPercentage,
      topThreeTokensPercentage,
      diversificationScore,
      riskLevel
    };
  }

  /**
   * Calculate diversification score using Herfindahl-Hirschman Index
   */
  private calculateDiversificationScore(holdings: TokenHolding[]): number {
    if (holdings.length === 0) return 0;

    // Calculate HHI (sum of squared percentages)
    const hhi = holdings.reduce((sum, holding) => {
      const percentage = holding.percentage / 100; // Convert to decimal
      return sum + (percentage * percentage);
    }, 0);

    // Convert HHI to diversification score (0-100, higher is better)
    // Perfect diversification (equal weights) would have HHI = 1/n
    const maxHHI = 1; // Maximum concentration (100% in one asset)
    const minHHI = 1 / holdings.length; // Perfect diversification
    
    const normalizedHHI = (hhi - minHHI) / (maxHHI - minHHI);
    return Math.max(0, Math.min(100, (1 - normalizedHHI) * 100));
  }

  /**
   * Analyze protocol exposure (simplified version with mock data)
   */
  private async analyzeProtocolExposure(holdings: TokenHolding[]): Promise<ProtocolRisk[]> {
    // Mock protocol mapping for major Solana tokens
    const protocolMapping: Record<string, { protocol: string; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'; tvl: number; auditStatus: string }> = {
      'SOL': { protocol: 'Solana Native', riskLevel: 'LOW', tvl: 50000000000, auditStatus: 'Audited' },
      'USDC': { protocol: 'Centre/Circle', riskLevel: 'LOW', tvl: 25000000000, auditStatus: 'Audited' },
      'USDT': { protocol: 'Tether', riskLevel: 'MEDIUM', tvl: 20000000000, auditStatus: 'Audited' },
      'RAY': { protocol: 'Raydium', riskLevel: 'MEDIUM', tvl: 500000000, auditStatus: 'Audited' },
      'SRM': { protocol: 'Serum', riskLevel: 'HIGH', tvl: 100000000, auditStatus: 'Partial' },
      'ORCA': { protocol: 'Orca', riskLevel: 'MEDIUM', tvl: 300000000, auditStatus: 'Audited' },
      'MNDE': { protocol: 'Marinade', riskLevel: 'MEDIUM', tvl: 800000000, auditStatus: 'Audited' },
      'mSOL': { protocol: 'Marinade', riskLevel: 'MEDIUM', tvl: 800000000, auditStatus: 'Audited' }
    };

    const protocolExposure: ProtocolRisk[] = [];
    const protocolTotals = new Map<string, { exposure: number; info: any }>();

    // Aggregate exposure by protocol
    for (const holding of holdings) {
      const protocolInfo = protocolMapping[holding.symbol] || {
        protocol: 'Unknown Protocol',
        riskLevel: 'HIGH' as const,
        tvl: 0,
        auditStatus: 'Unknown'
      };

      const existing = protocolTotals.get(protocolInfo.protocol);
      if (existing) {
        existing.exposure += holding.percentage;
      } else {
        protocolTotals.set(protocolInfo.protocol, {
          exposure: holding.percentage,
          info: protocolInfo
        });
      }
    }

    // Convert to protocol risk array
    for (const [protocol, data] of protocolTotals) {
      protocolExposure.push({
        protocol,
        exposure: data.exposure,
        riskLevel: data.info.riskLevel,
        tvl: data.info.tvl,
        auditStatus: data.info.auditStatus
      });
    }

    // Sort by exposure (descending)
    return protocolExposure.sort((a, b) => b.exposure - a.exposure);
  }

  /**
   * Calculate overall risk score (0-100, higher is riskier)
   */
  private calculateOverallRiskScore(
    concentrationRisk: ConcentrationRisk,
    protocolExposure: ProtocolRisk[]
  ): number {
    // Concentration risk component (0-40 points)
    let concentrationScore = 0;
    if (concentrationRisk.riskLevel === 'HIGH') concentrationScore = 40;
    else if (concentrationRisk.riskLevel === 'MEDIUM') concentrationScore = 25;
    else concentrationScore = 10;

    // Protocol risk component (0-40 points)
    const protocolScore = protocolExposure.reduce((score, protocol) => {
      let protocolRisk = 0;
      if (protocol.riskLevel === 'HIGH') protocolRisk = 3;
      else if (protocol.riskLevel === 'MEDIUM') protocolRisk = 2;
      else protocolRisk = 1;

      return score + (protocolRisk * protocol.exposure / 100 * 40);
    }, 0);

    // Diversification bonus (0-20 points reduction)
    const diversificationBonus = Math.min(20, concentrationRisk.diversificationScore / 5);

    const totalScore = Math.max(0, Math.min(100, concentrationScore + protocolScore - diversificationBonus));
    return Math.round(totalScore);
  }

  /**
   * Generate risk mitigation recommendations
   */
  private generateRiskRecommendations(
    concentrationRisk: ConcentrationRisk,
    protocolExposure: ProtocolRisk[]
  ): string[] {
    const recommendations: string[] = [];

    // Concentration risk recommendations
    if (concentrationRisk.riskLevel === 'HIGH') {
      recommendations.push(
        `High concentration risk detected. Consider reducing your largest position (${concentrationRisk.topTokenPercentage.toFixed(1)}% of portfolio) to below 50%.`
      );
    }

    if (concentrationRisk.topThreeTokensPercentage > 80) {
      recommendations.push(
        `Your top 3 positions represent ${concentrationRisk.topThreeTokensPercentage.toFixed(1)}% of your portfolio. Consider diversifying into additional assets.`
      );
    }

    // Protocol risk recommendations
    const highRiskProtocols = protocolExposure.filter(p => p.riskLevel === 'HIGH');
    if (highRiskProtocols.length > 0) {
      recommendations.push(
        `High-risk protocol exposure detected: ${highRiskProtocols.map(p => p.protocol).join(', ')}. Consider reducing exposure or researching recent security audits.`
      );
    }

    const unauditedProtocols = protocolExposure.filter(p => p.auditStatus === 'Unknown' || p.auditStatus === 'Partial');
    if (unauditedProtocols.length > 0) {
      recommendations.push(
        `Exposure to protocols with incomplete audits: ${unauditedProtocols.map(p => p.protocol).join(', ')}. Verify security status before increasing positions.`
      );
    }

    // Diversification recommendations
    if (concentrationRisk.diversificationScore < 50) {
      recommendations.push(
        `Low diversification score (${concentrationRisk.diversificationScore.toFixed(0)}/100). Consider spreading investments across more assets and protocols.`
      );
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push(
        'Your portfolio shows good risk management. Continue monitoring protocol developments and maintain diversification.'
      );
    }

    recommendations.push(
      'Always conduct your own research (DYOR) and never invest more than you can afford to lose.'
    );

    return recommendations;
  }
}