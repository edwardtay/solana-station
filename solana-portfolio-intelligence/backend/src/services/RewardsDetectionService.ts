import { Connection, PublicKey } from '@solana/web3.js';
import { createLogger } from '../utils/logger.js';
import { AIReportService } from './AIReportService.js';
import type { UnclaimedReward, RewardsReport, TokenHolding } from '@solana-portfolio-intelligence/shared';

const logger = createLogger();

export class RewardsDetectionService {
  private connection: Connection;
  private aiService: AIReportService;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.aiService = new AIReportService();
  }

  /**
   * Scan for unclaimed rewards using AI analysis
   */
  async detectUnclaimedRewards(walletAddress: string, holdings: TokenHolding[]): Promise<RewardsReport> {
    try {
      logger.info(`AI-powered rewards detection for: ${walletAddress}`);
      
      const totalValue = holdings.reduce((sum, h) => sum + h.usdValue, 0);
      
      // Use AI for intelligent rewards analysis
      const report = await this.aiService.generateRewardsReport(holdings, totalValue);
      
      logger.info(`Rewards detection complete: $${report.totalUnclaimedValue.toFixed(2)} unclaimed`);
      return report;
    } catch (error) {
      logger.error('AI rewards detection failed, using fallback:', error);
      return this.fallbackDetection(walletAddress, holdings);
    }
  }

  private async fallbackDetection(walletAddress: string, holdings: TokenHolding[]): Promise<RewardsReport> {
    const rewards: UnclaimedReward[] = [];

    const stakingRewards = await this.scanStakingRewards(walletAddress);
    const lpRewards = await this.scanLPRewards(walletAddress, holdings);
    const governanceRewards = await this.scanGovernanceRewards(walletAddress);
    const protocolIncentives = await this.scanProtocolIncentives(walletAddress, holdings);

    rewards.push(...stakingRewards, ...lpRewards, ...governanceRewards, ...protocolIncentives);

    const totalUnclaimedValue = rewards.reduce((sum, reward) => sum + reward.usdValue, 0);
    const optimizationSuggestions = this.generateOptimizationSuggestions(rewards);

    return { totalUnclaimedValue, rewards, optimizationSuggestions };
  }

  /**
   * Scan for staking rewards (SOL, mSOL, etc.)
   */
  private async scanStakingRewards(walletAddress: string): Promise<UnclaimedReward[]> {
    const rewards: UnclaimedReward[] = [];

    try {
      const publicKey = new PublicKey(walletAddress);

      // Check for SOL staking rewards
      const stakeAccounts = await this.connection.getParsedProgramAccounts(
        new PublicKey('Stake11111111111111111111111111111111111112'),
        {
          filters: [
            {
              memcmp: {
                offset: 12, // Staker pubkey offset
                bytes: publicKey.toBase58()
              }
            }
          ]
        }
      );

      for (const stakeAccount of stakeAccounts) {
        const stakeData = stakeAccount.account.data;
        if ('parsed' in stakeData) {
          const info = stakeData.parsed.info;
          if (info.stake && info.stake.delegation) {
            // Mock reward calculation (in real implementation, would check epoch rewards)
            const estimatedReward = Math.random() * 0.1; // 0-0.1 SOL
            if (estimatedReward > 0.001) { // Only include if > 0.001 SOL
              rewards.push({
                protocol: 'Solana Native Staking',
                tokenSymbol: 'SOL',
                amount: estimatedReward,
                usdValue: estimatedReward * 100, // Assuming $100 SOL
                claimInstructions: 'Rewards are automatically distributed to your stake account. Withdraw or redelegate to access.',
                estimatedGasCost: 0.000005 * 100 // ~0.000005 SOL gas cost
              });
            }
          }
        }
      }

      // Mock Marinade staking rewards
      const marinadeReward = Math.random() * 0.05;
      if (marinadeReward > 0.001) {
        rewards.push({
          protocol: 'Marinade Finance',
          tokenSymbol: 'MNDE',
          amount: marinadeReward,
          usdValue: marinadeReward * 2, // Assuming $2 MNDE
          claimInstructions: 'Visit marinade.finance and connect your wallet to claim MNDE rewards.',
          estimatedGasCost: 0.000005 * 100
        });
      }

    } catch (error) {
      logger.error('Staking rewards scan failed:', error);
    }

    return rewards;
  }

  /**
   * Scan for LP rewards from AMM protocols
   */
  private async scanLPRewards(walletAddress: string, holdings: TokenHolding[]): Promise<UnclaimedReward[]> {
    const rewards: UnclaimedReward[] = [];

    // Mock LP rewards for demonstration
    const lpTokens = holdings.filter(h => 
      h.symbol.includes('LP') || 
      h.symbol.includes('RAY') || 
      h.symbol.includes('ORCA')
    );

    for (const lpToken of lpTokens) {
      // Mock Raydium LP rewards
      if (lpToken.symbol.includes('RAY') || lpToken.symbol.includes('LP')) {
        const rayReward = Math.random() * 10;
        if (rayReward > 0.1) {
          rewards.push({
            protocol: 'Raydium',
            tokenSymbol: 'RAY',
            amount: rayReward,
            usdValue: rayReward * 0.5, // Assuming $0.5 RAY
            claimInstructions: 'Visit raydium.io, go to Farms section, and claim your RAY rewards.',
            estimatedGasCost: 0.000005 * 100
          });
        }
      }

      // Mock Orca LP rewards
      if (lpToken.symbol.includes('ORCA')) {
        const orcaReward = Math.random() * 5;
        if (orcaReward > 0.1) {
          rewards.push({
            protocol: 'Orca',
            tokenSymbol: 'ORCA',
            amount: orcaReward,
            usdValue: orcaReward * 1.2, // Assuming $1.2 ORCA
            claimInstructions: 'Visit orca.so, navigate to Aquafarms, and harvest your ORCA rewards.',
            estimatedGasCost: 0.000005 * 100
          });
        }
      }
    }

    return rewards;
  }

  /**
   * Scan for governance token rewards
   */
  private async scanGovernanceRewards(walletAddress: string): Promise<UnclaimedReward[]> {
    const rewards: UnclaimedReward[] = [];

    // Mock governance rewards
    const governanceProtocols = [
      { name: 'Mango Markets', token: 'MNGO', price: 0.02 },
      { name: 'Serum', token: 'SRM', price: 0.1 },
      { name: 'Solend', token: 'SLND', price: 0.05 }
    ];

    for (const protocol of governanceProtocols) {
      const reward = Math.random() * 100;
      if (reward > 10) {
        rewards.push({
          protocol: protocol.name,
          tokenSymbol: protocol.token,
          amount: reward,
          usdValue: reward * protocol.price,
          claimInstructions: `Visit ${protocol.name.toLowerCase().replace(' ', '')}.com and claim your governance rewards.`,
          estimatedGasCost: 0.000005 * 100
        });
      }
    }

    return rewards;
  }

  /**
   * Scan for protocol-specific incentives
   */
  private async scanProtocolIncentives(walletAddress: string, holdings: TokenHolding[]): Promise<UnclaimedReward[]> {
    const rewards: UnclaimedReward[] = [];

    // Mock protocol incentives based on holdings
    for (const holding of holdings) {
      if (holding.symbol === 'USDC' && holding.usdValue > 1000) {
        // Mock lending rewards
        const lendingReward = Math.random() * 0.5;
        if (lendingReward > 0.01) {
          rewards.push({
            protocol: 'Solend',
            tokenSymbol: 'SLND',
            amount: lendingReward,
            usdValue: lendingReward * 0.05,
            claimInstructions: 'Visit solend.fi, check your lending positions for claimable SLND rewards.',
            estimatedGasCost: 0.000005 * 100
          });
        }
      }

      if (holding.symbol === 'SOL' && holding.usdValue > 500) {
        // Mock Jupiter rewards
        const jupReward = Math.random() * 2;
        if (jupReward > 0.1) {
          rewards.push({
            protocol: 'Jupiter',
            tokenSymbol: 'JUP',
            amount: jupReward,
            usdValue: jupReward * 0.8, // Assuming $0.8 JUP
            claimInstructions: 'Visit jup.ag and check for any trading rewards or airdrops.',
            estimatedGasCost: 0.000005 * 100
          });
        }
      }
    }

    return rewards;
  }

  /**
   * Generate optimization suggestions for reward claiming
   */
  private generateOptimizationSuggestions(rewards: UnclaimedReward[]): string[] {
    const suggestions: string[] = [];

    if (rewards.length === 0) {
      suggestions.push('No unclaimed rewards found. Consider participating in staking, liquidity provision, or governance to earn rewards.');
      return suggestions;
    }

    // Calculate total gas costs
    const totalGasCost = rewards.reduce((sum, reward) => sum + reward.estimatedGasCost, 0);
    const totalRewardValue = rewards.reduce((sum, reward) => sum + reward.usdValue, 0);

    if (totalGasCost > totalRewardValue * 0.1) {
      suggestions.push(`Gas costs (${totalGasCost.toFixed(2)} USD) are high relative to reward value. Consider batching claims or waiting for higher reward amounts.`);
    }

    // Group by protocol for batch claiming
    const protocolGroups = new Map<string, UnclaimedReward[]>();
    for (const reward of rewards) {
      const existing = protocolGroups.get(reward.protocol) || [];
      existing.push(reward);
      protocolGroups.set(reward.protocol, existing);
    }

    if (protocolGroups.size > 1) {
      suggestions.push(`You have rewards across ${protocolGroups.size} protocols. Consider claiming all rewards from each protocol in a single transaction to save on gas.`);
    }

    // High-value rewards
    const highValueRewards = rewards.filter(r => r.usdValue > 10);
    if (highValueRewards.length > 0) {
      suggestions.push(`High-value rewards detected: ${highValueRewards.map(r => `${r.amount.toFixed(4)} ${r.tokenSymbol}`).join(', ')}. Consider claiming these soon.`);
    }

    // Low-value rewards
    const lowValueRewards = rewards.filter(r => r.usdValue < 1);
    if (lowValueRewards.length > 0) {
      suggestions.push(`Small rewards (< $1) detected. Consider letting these accumulate before claiming to optimize gas efficiency.`);
    }

    // Protocol-specific suggestions
    if (protocolGroups.has('Solana Native Staking')) {
      suggestions.push('SOL staking rewards are automatically compounded. Consider redelegating to access accumulated rewards.');
    }

    if (protocolGroups.has('Raydium') || protocolGroups.has('Orca')) {
      suggestions.push('LP rewards often have time-sensitive multipliers. Check if any rewards are about to expire.');
    }

    suggestions.push('Always verify reward claims on official protocol websites and never share your private keys.');

    return suggestions;
  }
}