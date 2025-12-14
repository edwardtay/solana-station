import { SolanaService } from './SolanaService.js';
import { HeliusService } from './HeliusService.js';
import { MoralisService } from './MoralisService.js';
import { ShyftService } from './ShyftService.js';
import { SolanaTrackerService } from './SolanaTrackerService.js';
import { QuickNodeService } from './QuickNodeService.js';
import { ZerionService } from './ZerionService.js';
import { TokenMetadataService } from './TokenMetadataService.js';
import { PriceService } from './PriceService.js';
import { createLogger } from '../utils/logger.js';
import { formatUsdValue, formatTokenAmount, normalizePercentages } from '../utils/formatters.js';
import type { TokenHolding, BasicPortfolioData } from '@solana-portfolio-intelligence/shared';

const logger = createLogger();

// Spam/scam token detection patterns
const SPAM_PATTERNS = [
  /airdrop/i, /claim/i, /free/i, /\.com/i, /\.io/i, /\.xyz/i, /\.org/i,
  /visit/i, /bonus/i, /reward/i, /winner/i, /gift/i, /promo/i,
  /http/i, /www\./i, /t\.me/i, /discord/i, /telegram/i,
];

const isSpamToken = (name: string, symbol: string): boolean => {
  const combined = `${name} ${symbol}`;
  return SPAM_PATTERNS.some(pattern => pattern.test(combined));
};

interface ProviderResult {
  provider: string;
  holdings: TokenHolding[];
  success: boolean;
}

export class PortfolioService {
  private solanaService: SolanaService;
  private heliusService: HeliusService;
  private moralisService: MoralisService;
  private shyftService: ShyftService;
  private solanaTrackerService: SolanaTrackerService;
  private quickNodeService: QuickNodeService;
  private zerionService: ZerionService;
  private tokenMetadataService: TokenMetadataService;
  private priceService: PriceService;

  constructor(rpcUrl: string) {
    this.solanaService = new SolanaService(rpcUrl);
    this.heliusService = new HeliusService();
    this.moralisService = new MoralisService();
    this.shyftService = new ShyftService();
    this.solanaTrackerService = new SolanaTrackerService();
    this.quickNodeService = new QuickNodeService();
    this.zerionService = new ZerionService();
    this.tokenMetadataService = new TokenMetadataService();
    this.priceService = new PriceService();
  }

  /**
   * Validates if a wallet address is valid
   */
  validateWalletAddress(address: string): boolean {
    return this.solanaService.validateWalletAddress(address);
  }

  /**
   * Fetches portfolio data from all providers in parallel
   */
  private async fetchFromAllProviders(walletAddress: string): Promise<ProviderResult[]> {
    const providers = [
      { name: 'Helius', fetch: () => this.heliusService.getPortfolio(walletAddress) },
      { name: 'Moralis', fetch: () => this.moralisService.getPortfolio(walletAddress) },
      { name: 'Shyft', fetch: () => this.shyftService.getPortfolio(walletAddress) },
      { name: 'SolanaTracker', fetch: () => this.solanaTrackerService.getPortfolio(walletAddress) },
      { name: 'QuickNode', fetch: () => this.quickNodeService.getPortfolio(walletAddress) },
      { name: 'Zerion', fetch: () => this.zerionService.getPortfolio(walletAddress) },
    ];

    const results = await Promise.allSettled(
      providers.map(async (provider) => {
        try {
          const holdings = await provider.fetch();
          return { provider: provider.name, holdings, success: true };
        } catch (error) {
          logger.warn(`${provider.name} failed:`, error);
          return { provider: provider.name, holdings: [], success: false };
        }
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      const providerName = providers[index]?.name || 'Unknown';
      return { provider: providerName, holdings: [], success: false };
    });
  }

  /**
   * Merges holdings from multiple providers, deduplicating by mint address
   * and selecting the best data for each token
   */
  private mergeHoldings(providerResults: ProviderResult[]): TokenHolding[] {
    const holdingsMap = new Map<string, TokenHolding & { sources: string[] }>();

    for (const result of providerResults) {
      if (!result.success || result.holdings.length === 0) continue;

      for (const holding of result.holdings) {
        const existing = holdingsMap.get(holding.mint);

        if (!existing) {
          // First time seeing this token
          holdingsMap.set(holding.mint, {
            ...holding,
            sources: [result.provider],
          });
        } else {
          // Merge data - prefer non-empty values and higher USD values
          existing.sources.push(result.provider);
          
          // Use better metadata
          if (existing.symbol === 'UNKNOWN' && holding.symbol !== 'UNKNOWN') {
            existing.symbol = holding.symbol;
          }
          if (existing.name === 'Unknown Token' && holding.name !== 'Unknown Token') {
            existing.name = holding.name;
          }
          if (!existing.logoUri && holding.logoUri) {
            existing.logoUri = holding.logoUri;
          }
          
          // Use higher amount (more accurate balance)
          if (holding.amount > existing.amount) {
            existing.amount = holding.amount;
          }
          
          // Use higher USD value if available
          if (holding.usdValue > existing.usdValue) {
            existing.usdValue = holding.usdValue;
          }
        }
      }
    }

    // Convert map to array and remove source tracking
    return Array.from(holdingsMap.values()).map(({ sources, ...holding }) => {
      logger.debug(`Token ${holding.symbol} found in ${sources.length} providers: ${sources.join(', ')}`);
      return holding;
    });
  }

  /**
   * Merges RPC holdings (source of truth) with provider data for metadata/prices
   */
  private mergeRpcWithProviders(rpcHoldings: TokenHolding[], providerResults: ProviderResult[]): TokenHolding[] {
    // Build a map of provider data by mint for quick lookup
    const providerDataMap = new Map<string, TokenHolding>();
    
    for (const result of providerResults) {
      if (!result.success || result.holdings.length === 0) continue;
      
      for (const holding of result.holdings) {
        const existing = providerDataMap.get(holding.mint);
        if (!existing) {
          providerDataMap.set(holding.mint, holding);
        } else {
          // Merge provider data - prefer better metadata
          if (existing.symbol === 'UNKNOWN' && holding.symbol !== 'UNKNOWN') {
            existing.symbol = holding.symbol;
          }
          if (existing.name === 'Unknown Token' && holding.name !== 'Unknown Token') {
            existing.name = holding.name;
          }
          if (!existing.logoUri && holding.logoUri) {
            existing.logoUri = holding.logoUri;
          }
          if (holding.usdValue > existing.usdValue) {
            existing.usdValue = holding.usdValue;
          }
        }
      }
    }

    // Enrich RPC holdings with provider metadata
    const enrichedHoldings = rpcHoldings.map(rpcHolding => {
      const providerData = providerDataMap.get(rpcHolding.mint);
      
      if (providerData) {
        return {
          ...rpcHolding,
          // Keep RPC amount (most accurate)
          // Enrich with provider metadata
          symbol: rpcHolding.symbol === 'UNKNOWN' ? providerData.symbol : rpcHolding.symbol,
          name: rpcHolding.name === 'Unknown Token' ? providerData.name : rpcHolding.name,
          logoUri: rpcHolding.logoUri || providerData.logoUri,
          usdValue: providerData.usdValue || rpcHolding.usdValue,
        };
      }
      
      return rpcHolding;
    });

    // Also add any tokens from providers that RPC might have missed (rare but possible)
    const rpcMints = new Set(rpcHoldings.map(h => h.mint));
    for (const [mint, providerHolding] of providerDataMap) {
      if (!rpcMints.has(mint) && providerHolding.amount > 0) {
        logger.debug(`Adding provider-only token: ${providerHolding.symbol}`);
        enrichedHoldings.push(providerHolding);
      }
    }

    logger.info(`Merged ${rpcHoldings.length} RPC tokens with provider data, total: ${enrichedHoldings.length}`);
    return enrichedHoldings;
  }

  /**
   * Gets complete portfolio data for a wallet address using multiple providers
   */
  async getBasicPortfolio(walletAddress: string): Promise<BasicPortfolioData> {
    try {
      logger.info(`Fetching portfolio for wallet: ${walletAddress}`);

      // Validate wallet address
      if (!this.validateWalletAddress(walletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      // PRIMARY: Use direct Solana RPC to get ALL token accounts (most reliable)
      logger.info('Fetching all tokens via Solana RPC (getParsedTokenAccountsByOwner)...');
      const rpcHoldings = await this.solanaService.getTokenHoldings(walletAddress);
      logger.info(`RPC returned ${rpcHoldings.length} tokens`);

      // SECONDARY: Fetch from providers in parallel for metadata/prices
      logger.info('Fetching from providers for metadata enrichment...');
      const providerResults = await this.fetchFromAllProviders(walletAddress);
      
      // Log provider results
      const successfulProviders = providerResults.filter(r => r.success && r.holdings.length > 0);
      logger.info(`Successful providers: ${successfulProviders.map(r => `${r.provider}(${r.holdings.length})`).join(', ')}`);

      // Merge provider data into RPC holdings (RPC is source of truth for balances)
      let mergedHoldings = this.mergeRpcWithProviders(rpcHoldings, providerResults);

      // Filter out zero balance and spam holdings
      let validHoldings = mergedHoldings.filter(holding => {
        if (holding.amount <= 0) return false;
        if (isSpamToken(holding.name, holding.symbol)) return false;
        return true;
      });
      
      if (validHoldings.length === 0) {
        logger.info(`No valid token holdings found for wallet: ${walletAddress}`);
        return {
          walletAddress,
          totalValue: 0,
          tokenCount: 0,
          holdings: [],
          lastUpdated: Date.now()
        };
      }

      // Get token metadata for holdings with missing info
      const mintsNeedingMetadata = validHoldings
        .filter(h => h.symbol === 'UNKNOWN' || h.name === 'Unknown Token')
        .map(h => h.mint);
      
      if (mintsNeedingMetadata.length > 0) {
        logger.info(`Fetching metadata for ${mintsNeedingMetadata.length} tokens...`);
        const metadataMap = await this.tokenMetadataService.resolveMultipleTokenMetadata(mintsNeedingMetadata);
        
        validHoldings = validHoldings.map(holding => {
          const metadata = metadataMap.get(holding.mint);
          if (metadata) {
            return {
              ...holding,
              symbol: holding.symbol === 'UNKNOWN' ? (metadata.symbol || holding.symbol) : holding.symbol,
              name: holding.name === 'Unknown Token' ? (metadata.name || holding.name) : holding.name,
              logoUri: holding.logoUri || metadata.logoURI,
            };
          }
          return holding;
        });
      }

      // Check if we need to fetch prices
      const totalValueFromProviders = validHoldings.reduce((sum, h) => sum + h.usdValue, 0);
      const holdingsNeedingPrices = validHoldings.filter(h => h.usdValue === 0);
      
      if (holdingsNeedingPrices.length > 0) {
        logger.info(`Fetching prices for ${holdingsNeedingPrices.length} tokens...`);
        const mintsNeedingPrices = holdingsNeedingPrices.map(h => h.mint);
        const pricesMap = await this.priceService.getTokenPrices(mintsNeedingPrices);
        
        validHoldings = validHoldings.map(holding => {
          if (holding.usdValue === 0) {
            const price = pricesMap.get(holding.mint) || 0;
            return {
              ...holding,
              usdValue: formatUsdValue(holding.amount * price),
            };
          }
          return holding;
        });
      }

      // Format holdings
      const holdings: TokenHolding[] = validHoldings.map(holding => ({
        ...holding,
        amount: formatTokenAmount(holding.amount, holding.decimals),
        usdValue: formatUsdValue(holding.usdValue),
        percentage: 0,
      }));

      // Calculate total portfolio value
      const totalValue = formatUsdValue(holdings.reduce((sum, holding) => sum + holding.usdValue, 0));

      // Calculate and normalize percentages
      if (totalValue > 0) {
        const rawPercentages = holdings.map(holding => (holding.usdValue / totalValue) * 100);
        const normalizedPercentages = normalizePercentages(rawPercentages);
        
        holdings.forEach((holding, index) => {
          holding.percentage = normalizedPercentages[index] || 0;
        });
      }

      // Sort by USD value (descending)
      holdings.sort((a, b) => b.usdValue - a.usdValue);

      const portfolio: BasicPortfolioData = {
        walletAddress,
        totalValue,
        tokenCount: holdings.length,
        holdings,
        lastUpdated: Date.now()
      };

      logger.info(`Portfolio fetched: ${holdings.length} tokens, $${totalValue.toFixed(2)} total from ${successfulProviders.length} providers`);
      return portfolio;

    } catch (error) {
      logger.error(`Error fetching portfolio for ${walletAddress}:`, error);
      throw error;
    }
  }

  /**
   * Gets token holdings without price data (faster for internal use)
   */
  async getTokenHoldings(walletAddress: string): Promise<TokenHolding[]> {
    return this.solanaService.getTokenHoldings(walletAddress);
  }

  /**
   * Gets token prices for given mints
   */
  async getTokenPrices(tokenMints: string[]): Promise<Map<string, number>> {
    return this.priceService.getTokenPrices(tokenMints);
  }

  /**
   * Gets the Solana connection for other services
   */
  getSolanaConnection() {
    return this.solanaService.getConnection();
  }
}
