import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import type { 
  TokenHolding, 
  RiskAnalysis, 
  RewardsReport, 
  ILSimulation, 
  YieldAnalysis,
  ProtocolRisk,
  UnclaimedReward,
  ILScenario,
  YieldPosition
} from '@solana-portfolio-intelligence/shared';

const logger = createLogger();

interface PortfolioContext {
  walletAddress: string;
  totalValue: number;
  holdings: TokenHolding[];
  topHoldings: string; // formatted string for AI
}

export class AIReportService {
  private openaiKey: string;
  private perplexityKey: string;

  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY || '';
    this.perplexityKey = process.env.PERPLEXITY_API_KEY || '';
  }

  private formatPortfolioForAI(holdings: TokenHolding[], totalValue: number): string {
    const top10 = holdings.slice(0, 10);
    return top10.map(h => 
      `${h.symbol}: ${h.amount.toFixed(4)} ($${h.usdValue.toFixed(2)}, ${h.percentage.toFixed(1)}%)`
    ).join('\n');
  }

  private async callOpenAI(prompt: string, systemPrompt: string): Promise<string> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      return response.data.choices[0]?.message?.content || '';
    } catch (error) {
      logger.error('OpenAI API error:', error);
      throw error;
    }
  }

  async generateRiskAnalysis(holdings: TokenHolding[], totalValue: number): Promise<RiskAnalysis> {
    const portfolioStr = this.formatPortfolioForAI(holdings, totalValue);
    
    const systemPrompt = `You are a DeFi risk analyst specializing in Solana. Analyze portfolios and provide risk assessments. 
    Return ONLY valid JSON matching this exact structure (no markdown, no explanation):
    {
      "overallRiskScore": <number 0-100>,
      "protocolExposure": [{"protocol": "<name>", "exposure": <percentage>, "riskLevel": "LOW|MEDIUM|HIGH", "tvl": <number>, "auditStatus": "<status>"}],
      "concentrationRisk": {"topTokenPercentage": <number>, "topThreeTokensPercentage": <number>, "diversificationScore": <number 0-100>, "riskLevel": "LOW|MEDIUM|HIGH"},
      "recommendations": ["<recommendation1>", "<recommendation2>"]
    }`;

    const prompt = `Analyze this Solana portfolio for risk:
    
Total Value: $${totalValue.toFixed(2)}
Holdings:
${portfolioStr}

Consider:
1. Concentration risk (single token dominance)
2. Protocol exposure (DeFi protocols, LSTs, memecoins)
3. Liquidity risk
4. Smart contract risk for DeFi tokens
5. Market volatility exposure

Provide specific, actionable recommendations.`;

    try {
      const response = await this.callOpenAI(prompt, systemPrompt);
      const parsed = JSON.parse(response);
      return this.validateRiskAnalysis(parsed, holdings);
    } catch (error) {
      logger.warn('AI risk analysis failed, using fallback');
      return this.fallbackRiskAnalysis(holdings, totalValue);
    }
  }

  async generateRewardsReport(holdings: TokenHolding[], totalValue: number): Promise<RewardsReport> {
    const portfolioStr = this.formatPortfolioForAI(holdings, totalValue);
    
    // Identify staking/LP tokens
    const stakingTokens = holdings.filter(h => 
      ['mSOL', 'jitoSOL', 'bSOL', 'stSOL', 'jupSOL', 'INF', 'LST'].some(s => h.symbol.includes(s)) ||
      h.name.toLowerCase().includes('staked') ||
      h.name.toLowerCase().includes('liquid')
    );

    const systemPrompt = `You are a Solana DeFi rewards specialist. Identify unclaimed rewards and staking opportunities.
    Return ONLY valid JSON matching this exact structure:
    {
      "totalUnclaimedValue": <number>,
      "rewards": [{"protocol": "<name>", "tokenSymbol": "<symbol>", "amount": <number>, "usdValue": <number>, "claimInstructions": "<instructions>", "estimatedGasCost": <number>}],
      "optimizationSuggestions": ["<suggestion1>", "<suggestion2>"]
    }`;

    const prompt = `Analyze this Solana portfolio for unclaimed rewards and staking opportunities:

Total Value: $${totalValue.toFixed(2)}
Holdings:
${portfolioStr}

Staking/LST tokens detected: ${stakingTokens.map(t => t.symbol).join(', ') || 'None'}

Identify:
1. Potential unclaimed staking rewards from LSTs
2. Airdrop eligibility based on holdings
3. LP rewards that may be claimable
4. Governance token rewards
5. Referral/bonus rewards from protocols

Be realistic - estimate based on typical APYs and holding periods.`;

    try {
      const response = await this.callOpenAI(prompt, systemPrompt);
      const parsed = JSON.parse(response);
      return this.validateRewardsReport(parsed);
    } catch (error) {
      logger.warn('AI rewards analysis failed, using fallback');
      return this.fallbackRewardsReport(holdings);
    }
  }

  async generateILSimulation(holdings: TokenHolding[], totalValue: number): Promise<ILSimulation> {
    const portfolioStr = this.formatPortfolioForAI(holdings, totalValue);
    
    // Identify LP-like positions
    const lpTokens = holdings.filter(h => 
      h.symbol.includes('LP') || 
      h.symbol.includes('-') ||
      h.name.toLowerCase().includes('pool') ||
      h.name.toLowerCase().includes('liquidity')
    );

    const systemPrompt = `You are a DeFi impermanent loss specialist. Analyze LP positions and simulate IL scenarios.
    Return ONLY valid JSON matching this exact structure:
    {
      "currentIL": <number percentage>,
      "scenarios": [{"priceChange": <number>, "timeHorizon": "<1d|7d|30d|90d>", "projectedIL": <number>, "breakEvenPoint": <number>}],
      "recommendations": ["<recommendation1>", "<recommendation2>"]
    }`;

    const prompt = `Analyze this Solana portfolio for impermanent loss risk:

Total Value: $${totalValue.toFixed(2)}
Holdings:
${portfolioStr}

LP/Pool tokens detected: ${lpTokens.map(t => t.symbol).join(', ') || 'None'}

Simulate IL scenarios for:
1. SOL price changes: -50%, -25%, +25%, +50%, +100%
2. Different time horizons: 1d, 7d, 30d, 90d
3. Consider correlation between assets
4. Factor in trading fees earned

Provide realistic IL estimates based on typical Solana DEX dynamics.`;

    try {
      const response = await this.callOpenAI(prompt, systemPrompt);
      const parsed = JSON.parse(response);
      return this.validateILSimulation(parsed);
    } catch (error) {
      logger.warn('AI IL simulation failed, using fallback');
      return this.fallbackILSimulation(holdings);
    }
  }

  async generateYieldAnalysis(holdings: TokenHolding[], totalValue: number): Promise<YieldAnalysis> {
    const portfolioStr = this.formatPortfolioForAI(holdings, totalValue);
    
    const yieldTokens = holdings.filter(h => 
      ['mSOL', 'jitoSOL', 'bSOL', 'stSOL', 'jupSOL', 'USDC', 'USDT', 'UXD'].some(s => h.symbol.includes(s))
    );

    const systemPrompt = `You are a Solana yield optimization specialist. Analyze portfolios for yield opportunities.
    Return ONLY valid JSON matching this exact structure:
    {
      "positions": [{"protocol": "<name>", "type": "STAKING|LENDING|LP", "apy": <number>, "tvl": <number>, "fees": <number>, "netYield": <number>}],
      "totalAPY": <number>,
      "netReturn": <number>,
      "gasCostRatio": <number>,
      "optimizationSuggestions": ["<suggestion1>", "<suggestion2>"]
    }`;

    const prompt = `Analyze this Solana portfolio for yield optimization:

Total Value: $${totalValue.toFixed(2)}
Holdings:
${portfolioStr}

Yield-bearing tokens: ${yieldTokens.map(t => `${t.symbol} ($${t.usdValue.toFixed(2)})`).join(', ') || 'None'}

Analyze:
1. Current yield from LSTs (mSOL ~7.2%, jitoSOL ~7.8%, etc.)
2. Lending opportunities on Kamino, MarginFi, Solend
3. LP opportunities on Raydium, Orca, Meteora
4. Stablecoin yields
5. Gas costs vs yield earned

Use current Solana DeFi rates (Dec 2024). Be specific about protocols and realistic APYs.`;

    try {
      const response = await this.callOpenAI(prompt, systemPrompt);
      const parsed = JSON.parse(response);
      return this.validateYieldAnalysis(parsed);
    } catch (error) {
      logger.warn('AI yield analysis failed, using fallback');
      return this.fallbackYieldAnalysis(holdings, totalValue);
    }
  }


  // Validation and fallback methods
  private validateRiskAnalysis(data: any, holdings: TokenHolding[]): RiskAnalysis {
    const topToken = holdings[0];
    const topThree = holdings.slice(0, 3);
    
    return {
      overallRiskScore: Math.min(100, Math.max(0, data.overallRiskScore || 50)),
      protocolExposure: (data.protocolExposure || []).slice(0, 5).map((p: any) => ({
        protocol: p.protocol || 'Unknown',
        exposure: Math.min(100, Math.max(0, p.exposure || 0)),
        riskLevel: ['LOW', 'MEDIUM', 'HIGH'].includes(p.riskLevel) ? p.riskLevel : 'MEDIUM',
        tvl: p.tvl || 0,
        auditStatus: p.auditStatus || 'Unknown'
      })) as ProtocolRisk[],
      concentrationRisk: {
        topTokenPercentage: data.concentrationRisk?.topTokenPercentage || topToken?.percentage || 0,
        topThreeTokensPercentage: data.concentrationRisk?.topThreeTokensPercentage || 
          topThree.reduce((sum, h) => sum + h.percentage, 0),
        diversificationScore: Math.min(100, Math.max(0, data.concentrationRisk?.diversificationScore || 50)),
        riskLevel: ['LOW', 'MEDIUM', 'HIGH'].includes(data.concentrationRisk?.riskLevel) 
          ? data.concentrationRisk.riskLevel : 'MEDIUM'
      },
      recommendations: (data.recommendations || []).slice(0, 3)
    };
  }

  private validateRewardsReport(data: any): RewardsReport {
    return {
      totalUnclaimedValue: Math.max(0, data.totalUnclaimedValue || 0),
      rewards: (data.rewards || []).slice(0, 5).map((r: any) => ({
        protocol: r.protocol || 'Unknown',
        tokenSymbol: r.tokenSymbol || 'UNKNOWN',
        amount: Math.max(0, r.amount || 0),
        usdValue: Math.max(0, r.usdValue || 0),
        claimInstructions: r.claimInstructions || 'Visit protocol website',
        estimatedGasCost: Math.max(0, r.estimatedGasCost || 0.001)
      })) as UnclaimedReward[],
      optimizationSuggestions: (data.optimizationSuggestions || []).slice(0, 3)
    };
  }

  private validateILSimulation(data: any): ILSimulation {
    return {
      currentIL: Math.max(0, data.currentIL || 0),
      scenarios: (data.scenarios || []).slice(0, 8).map((s: any) => ({
        priceChange: s.priceChange || 0,
        timeHorizon: s.timeHorizon || '30d',
        projectedIL: Math.max(0, s.projectedIL || 0),
        breakEvenPoint: Math.max(0, s.breakEvenPoint || 0)
      })) as ILScenario[],
      recommendations: (data.recommendations || []).slice(0, 3)
    };
  }

  private validateYieldAnalysis(data: any): YieldAnalysis {
    return {
      positions: (data.positions || []).slice(0, 5).map((p: any) => ({
        protocol: p.protocol || 'Unknown',
        type: ['STAKING', 'LENDING', 'LP'].includes(p.type) ? p.type : 'STAKING',
        apy: Math.max(0, p.apy || 0),
        tvl: Math.max(0, p.tvl || 0),
        fees: Math.max(0, p.fees || 0),
        netYield: Math.max(0, p.netYield || 0)
      })) as YieldPosition[],
      totalAPY: Math.max(0, data.totalAPY || 0),
      netReturn: Math.max(0, data.netReturn || 0),
      gasCostRatio: Math.max(0, Math.min(100, data.gasCostRatio || 0)),
      optimizationSuggestions: (data.optimizationSuggestions || []).slice(0, 3)
    };
  }

  // Fallback methods when AI fails
  private fallbackRiskAnalysis(holdings: TokenHolding[], totalValue: number): RiskAnalysis {
    const topToken = holdings[0];
    const topThree = holdings.slice(0, 3);
    const topTokenPct = topToken?.percentage || 0;
    const topThreePct = topThree.reduce((sum, h) => sum + h.percentage, 0);
    
    // Calculate risk score based on concentration
    let riskScore = 30;
    if (topTokenPct > 50) riskScore += 30;
    else if (topTokenPct > 30) riskScore += 15;
    if (topThreePct > 80) riskScore += 20;
    if (holdings.length < 5) riskScore += 10;

    const protocols: ProtocolRisk[] = [];
    
    // Detect protocols from holdings
    const hasSOL = holdings.some(h => h.symbol === 'SOL');
    const hasMSOL = holdings.some(h => h.symbol === 'mSOL');
    const hasJitoSOL = holdings.some(h => h.symbol.includes('jito'));
    const hasUSDC = holdings.some(h => h.symbol === 'USDC');
    
    if (hasSOL) protocols.push({ protocol: 'Native SOL', exposure: holdings.find(h => h.symbol === 'SOL')?.percentage || 0, riskLevel: 'LOW', tvl: 50000000000, auditStatus: 'Native Asset' });
    if (hasMSOL) protocols.push({ protocol: 'Marinade', exposure: holdings.find(h => h.symbol === 'mSOL')?.percentage || 0, riskLevel: 'LOW', tvl: 1500000000, auditStatus: 'Audited by Kudelski' });
    if (hasJitoSOL) protocols.push({ protocol: 'Jito', exposure: holdings.find(h => h.symbol.includes('jito'))?.percentage || 0, riskLevel: 'LOW', tvl: 2000000000, auditStatus: 'Audited by OtterSec' });
    if (hasUSDC) protocols.push({ protocol: 'Circle USDC', exposure: holdings.find(h => h.symbol === 'USDC')?.percentage || 0, riskLevel: 'LOW', tvl: 30000000000, auditStatus: 'Regulated Stablecoin' });

    const recommendations: string[] = [];
    if (topTokenPct > 40) recommendations.push(`Consider reducing ${topToken?.symbol} position from ${topTokenPct.toFixed(1)}% to improve diversification`);
    if (holdings.length < 5) recommendations.push('Portfolio is concentrated in few assets. Consider diversifying across more tokens');
    if (!hasMSOL && !hasJitoSOL && hasSOL) recommendations.push('Consider staking SOL via Marinade or Jito for ~7-8% APY');
    if (recommendations.length === 0) recommendations.push('Portfolio appears well-balanced. Continue monitoring market conditions');

    return {
      overallRiskScore: Math.min(100, riskScore),
      protocolExposure: protocols,
      concentrationRisk: {
        topTokenPercentage: topTokenPct,
        topThreeTokensPercentage: topThreePct,
        diversificationScore: Math.max(0, 100 - topTokenPct),
        riskLevel: topTokenPct > 50 ? 'HIGH' : topTokenPct > 30 ? 'MEDIUM' : 'LOW'
      },
      recommendations
    };
  }

  private fallbackRewardsReport(holdings: TokenHolding[]): RewardsReport {
    const rewards: UnclaimedReward[] = [];
    let totalUnclaimed = 0;

    // Check for LST tokens that generate rewards
    const mSOL = holdings.find(h => h.symbol === 'mSOL');
    if (mSOL && mSOL.usdValue > 0) {
      const estimatedReward = mSOL.usdValue * 0.072 / 365 * 7; // ~1 week of rewards
      rewards.push({
        protocol: 'Marinade Finance',
        tokenSymbol: 'mSOL',
        amount: estimatedReward / 230, // Convert to SOL
        usdValue: estimatedReward,
        claimInstructions: 'mSOL rewards auto-compound. Value accrues in token price.',
        estimatedGasCost: 0
      });
      totalUnclaimed += estimatedReward;
    }

    const jitoSOL = holdings.find(h => h.symbol.toLowerCase().includes('jito'));
    if (jitoSOL && jitoSOL.usdValue > 0) {
      const estimatedReward = jitoSOL.usdValue * 0.078 / 365 * 7;
      rewards.push({
        protocol: 'Jito',
        tokenSymbol: 'JTO',
        amount: estimatedReward / 3, // Approximate JTO price
        usdValue: estimatedReward,
        claimInstructions: 'Check jito.network for MEV rewards distribution',
        estimatedGasCost: 0.001
      });
      totalUnclaimed += estimatedReward;
    }

    const suggestions: string[] = [];
    if (rewards.length === 0) {
      suggestions.push('No staking positions detected. Consider staking SOL for passive yield');
    }
    suggestions.push('Check Jupiter for potential airdrop eligibility based on trading volume');
    suggestions.push('Monitor protocol governance for voting rewards');

    return {
      totalUnclaimedValue: totalUnclaimed,
      rewards,
      optimizationSuggestions: suggestions
    };
  }

  private fallbackILSimulation(holdings: TokenHolding[]): ILSimulation {
    const scenarios: ILScenario[] = [
      { priceChange: -50, timeHorizon: '30d', projectedIL: 5.72, breakEvenPoint: 12.5 },
      { priceChange: -25, timeHorizon: '30d', projectedIL: 1.34, breakEvenPoint: 6.2 },
      { priceChange: 25, timeHorizon: '30d', projectedIL: 1.18, breakEvenPoint: 5.8 },
      { priceChange: 50, timeHorizon: '30d', projectedIL: 2.02, breakEvenPoint: 8.4 },
      { priceChange: 100, timeHorizon: '30d', projectedIL: 5.72, breakEvenPoint: 15.2 },
      { priceChange: -25, timeHorizon: '7d', projectedIL: 0.45, breakEvenPoint: 2.1 },
      { priceChange: 25, timeHorizon: '7d', projectedIL: 0.39, breakEvenPoint: 1.9 },
      { priceChange: 50, timeHorizon: '90d', projectedIL: 2.02, breakEvenPoint: 25.1 },
    ];

    return {
      currentIL: 0.5,
      scenarios,
      recommendations: [
        'IL is minimal for correlated assets like SOL/mSOL pairs',
        'Consider concentrated liquidity positions for higher fee capture',
        'Monitor price divergence between paired assets'
      ]
    };
  }

  private fallbackYieldAnalysis(holdings: TokenHolding[], totalValue: number): YieldAnalysis {
    const positions: YieldPosition[] = [];
    let totalWeightedAPY = 0;
    let yieldBearingValue = 0;

    const mSOL = holdings.find(h => h.symbol === 'mSOL');
    if (mSOL) {
      positions.push({ protocol: 'Marinade', type: 'STAKING', apy: 7.2, tvl: mSOL.usdValue, fees: 0, netYield: mSOL.usdValue * 0.072 });
      totalWeightedAPY += 7.2 * mSOL.usdValue;
      yieldBearingValue += mSOL.usdValue;
    }

    const jitoSOL = holdings.find(h => h.symbol.toLowerCase().includes('jito'));
    if (jitoSOL) {
      positions.push({ protocol: 'Jito', type: 'STAKING', apy: 7.8, tvl: jitoSOL.usdValue, fees: 0, netYield: jitoSOL.usdValue * 0.078 });
      totalWeightedAPY += 7.8 * jitoSOL.usdValue;
      yieldBearingValue += jitoSOL.usdValue;
    }

    const usdc = holdings.find(h => h.symbol === 'USDC');
    if (usdc) {
      positions.push({ protocol: 'Kamino (potential)', type: 'LENDING', apy: 8.5, tvl: usdc.usdValue, fees: 0.1, netYield: usdc.usdValue * 0.084 });
    }

    const avgAPY = yieldBearingValue > 0 ? totalWeightedAPY / yieldBearingValue : 0;
    const netReturn = positions.reduce((sum, p) => sum + p.netYield, 0);

    return {
      positions,
      totalAPY: avgAPY,
      netReturn,
      gasCostRatio: totalValue > 0 ? (0.01 / totalValue) * 100 : 0,
      optimizationSuggestions: [
        'Stake idle SOL in Marinade or Jito for 7-8% APY',
        'Lend USDC on Kamino for ~8.5% APY',
        'Consider JLP (Jupiter LP) for higher yields with managed IL'
      ]
    };
  }
}
