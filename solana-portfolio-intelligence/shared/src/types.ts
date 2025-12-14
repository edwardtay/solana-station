// Shared types for Solana Portfolio Intelligence

export interface TokenHolding {
  mint: string
  symbol: string
  name: string
  amount: number
  decimals: number
  usdValue: number
  percentage: number
  logoUri: string | undefined
  price?: number
  priceChange24h?: number
  isVerified?: boolean
  category?: 'native' | 'stablecoin' | 'lst' | 'defi' | 'defi-lp' | 'meme' | 'bridged' | 'gaming' | 'infrastructure' | 'unknown'
}

export interface BasicPortfolioData {
  walletAddress: string
  totalValue: number
  tokenCount: number
  holdings: TokenHolding[]
  lastUpdated: number
}

// Comprehensive Portfolio Types
export interface DeFiPosition {
  protocol: string
  protocolLogo?: string | undefined
  type: 'staking' | 'lending' | 'lp' | 'vault' | 'perp' | 'borrow'
  asset: string
  assetSymbol: string
  assetLogo?: string | undefined
  amount: number
  usdValue: number
  apy?: number | undefined
  rewards?: { token: string; amount: number; usdValue: number }[] | undefined
  healthFactor?: number | undefined
  liquidationPrice?: number | undefined
  pnl?: number | undefined
  pnlPercentage?: number | undefined
}

export interface ProtocolSummary {
  protocol: string
  logo?: string
  totalValue: number
  positions: DeFiPosition[]
}

export interface ClaimableReward {
  protocol: string
  token: string
  tokenSymbol: string
  amount: number
  usdValue: number
}

export interface ComprehensivePortfolio {
  walletAddress: string
  netWorth: number
  solBalance: number
  holdings: {
    totalValue: number
    tokens: TokenHolding[]
  }
  defiPositions: ProtocolSummary[]
  totalStaked: number
  totalLending: number
  totalLP: number
  totalBorrowed: number
  claimableRewards: {
    totalValue: number
    rewards: ClaimableReward[]
  }
  yieldEstimate: {
    dailyYield: number
    weeklyYield: number
    monthlyYield: number
    yearlyAPR: number
  }
  lastUpdated: number
}

export interface RiskAnalysis {
  overallRiskScore: number
  protocolExposure: ProtocolRisk[]
  concentrationRisk: ConcentrationRisk
  recommendations: string[]
}

export interface ProtocolRisk {
  protocol: string
  exposure: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  tvl: number
  auditStatus: string
}

export interface ConcentrationRisk {
  topTokenPercentage: number
  topThreeTokensPercentage: number
  diversificationScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface UnclaimedReward {
  protocol: string
  tokenSymbol: string
  amount: number
  usdValue: number
  claimInstructions: string
  estimatedGasCost: number
}

export interface RewardsReport {
  totalUnclaimedValue: number
  rewards: UnclaimedReward[]
  optimizationSuggestions: string[]
}

export interface ILSimulation {
  currentIL: number
  scenarios: ILScenario[]
  recommendations: string[]
}

export interface ILScenario {
  priceChange: number
  timeHorizon: string
  projectedIL: number
  breakEvenPoint: number
}

export interface YieldAnalysis {
  positions: YieldPosition[]
  totalAPY: number
  netReturn: number
  gasCostRatio: number
  optimizationSuggestions: string[]
}

export interface YieldPosition {
  protocol: string
  type: 'STAKING' | 'LENDING' | 'LP'
  apy: number
  tvl: number
  fees: number
  netYield: number
}

export interface ReportPayment {
  reportType: 'RISK' | 'REWARDS' | 'IL' | 'YIELD'
  price: number // in lamports
  walletAddress: string
  description: string
}

export interface x402Response {
  error: string
  payment: {
    amount: number
    token: 'SOL'
    recipient: string
    description: string
    network: 'devnet' | 'mainnet-beta'
  }
  reportType: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export type ReportType = 'RISK' | 'REWARDS' | 'IL' | 'YIELD'

export const REPORT_PRICES: Record<ReportType, number> = {
  RISK: 1000000, // 0.001 SOL in lamports
  REWARDS: 500000, // 0.0005 SOL in lamports
  IL: 2000000, // 0.002 SOL in lamports
  YIELD: 1500000, // 0.0015 SOL in lamports
}

export const REPORT_DESCRIPTIONS: Record<ReportType, string> = {
  RISK: 'Risk exposure analysis by protocol',
  REWARDS: 'Unclaimed rewards detection across protocols',
  IL: 'Impermanent loss simulation for LP positions',
  YIELD: 'Net yield analysis vs gas costs',
}