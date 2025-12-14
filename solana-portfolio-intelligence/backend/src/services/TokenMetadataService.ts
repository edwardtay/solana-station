import axios from 'axios';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

interface TokenMetadata {
  symbol: string;
  name: string;
  logoURI?: string;
  decimals?: number;
}

interface JupiterTokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
}

export class TokenMetadataService {
  private tokenCache = new Map<string, TokenMetadata>();
  private jupiterTokenList: JupiterTokenInfo[] = [];
  private lastFetch = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.loadJupiterTokenList();
  }

  /**
   * Load Jupiter token list for metadata resolution
   */
  private async loadJupiterTokenList(): Promise<void> {
    try {
      if (Date.now() - this.lastFetch < this.CACHE_DURATION && this.jupiterTokenList.length > 0) {
        return;
      }

      const response = await axios.get('https://token.jup.ag/all');
      this.jupiterTokenList = response.data;
      this.lastFetch = Date.now();
      
      logger.info(`Loaded ${this.jupiterTokenList.length} tokens from Jupiter token list`);
    } catch (error) {
      logger.error('Failed to load Jupiter token list:', error);
      // Continue with cached data if available
    }
  }

  /**
   * Resolve token metadata for a given mint address
   */
  async resolveTokenMetadata(mint: string): Promise<TokenMetadata> {
    // Check cache first
    if (this.tokenCache.has(mint)) {
      return this.tokenCache.get(mint)!;
    }

    // Special case for SOL
    if (mint === 'So11111111111111111111111111111111111111112') {
      const metadata: TokenMetadata = {
        symbol: 'SOL',
        name: 'Solana',
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        decimals: 9
      };
      this.tokenCache.set(mint, metadata);
      return metadata;
    }

    try {
      // Ensure Jupiter token list is loaded
      await this.loadJupiterTokenList();

      // Find token in Jupiter list
      const jupiterToken = this.jupiterTokenList.find(token => token.address === mint);
      
      if (jupiterToken) {
        const metadata: TokenMetadata = {
          symbol: jupiterToken.symbol,
          name: jupiterToken.name,
          ...(jupiterToken.logoURI && { logoURI: jupiterToken.logoURI }),
          decimals: jupiterToken.decimals
        };
        this.tokenCache.set(mint, metadata);
        return metadata;
      }

      // Fallback for unknown tokens
      const fallbackMetadata: TokenMetadata = {
        symbol: `${mint.slice(0, 4)}...${mint.slice(-4)}`,
        name: 'Unknown Token'
      };
      this.tokenCache.set(mint, fallbackMetadata);
      return fallbackMetadata;

    } catch (error) {
      logger.error(`Failed to resolve metadata for token ${mint}:`, error);
      
      // Return fallback metadata
      const fallbackMetadata: TokenMetadata = {
        symbol: `${mint.slice(0, 4)}...${mint.slice(-4)}`,
        name: 'Unknown Token'
      };
      this.tokenCache.set(mint, fallbackMetadata);
      return fallbackMetadata;
    }
  }

  /**
   * Resolve metadata for multiple tokens in batch
   */
  async resolveMultipleTokenMetadata(mints: string[]): Promise<Map<string, TokenMetadata>> {
    const results = new Map<string, TokenMetadata>();
    
    // Process in parallel with limited concurrency
    const batchSize = 10;
    for (let i = 0; i < mints.length; i += batchSize) {
      const batch = mints.slice(i, i + batchSize);
      const batchPromises = batch.map(async (mint) => {
        const metadata = await this.resolveTokenMetadata(mint);
        return { mint, metadata };
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ mint, metadata }) => {
        results.set(mint, metadata);
      });
    }
    
    return results;
  }
}