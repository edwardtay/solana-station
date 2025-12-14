import axios from 'axios';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

interface JupiterPriceResponse {
  data: Record<string, {
    id: string;
    mintSymbol: string;
    vsToken: string;
    vsTokenSymbol: string;
    price: number;
  }>;
  timeTaken: number;
}

export class PriceService {
  private priceCache = new Map<string, { price: number; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly JUPITER_PRICE_API = process.env.JUPITER_API_URL || 'https://price.jup.ag/v4';

  /**
   * Get USD price for a single token
   */
  async getTokenPrice(mint: string): Promise<number> {
    // Check cache first
    const cached = this.priceCache.get(mint);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.price;
    }

    try {
      const response = await axios.get(`${this.JUPITER_PRICE_API}/price`, {
        params: { ids: mint },
        timeout: 5000
      });

      const priceData = response.data as JupiterPriceResponse;
      const price = priceData.data[mint]?.price || 0;
      
      // Cache the result
      this.priceCache.set(mint, { price, timestamp: Date.now() });
      
      return price;
    } catch (error) {
      logger.error(`Failed to fetch price for token ${mint}:`, error);
      
      // Return cached price if available, otherwise 0
      return cached?.price || 0;
    }
  }

  /**
   * Get USD prices for multiple tokens in batch
   */
  async getTokenPrices(mints: string[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    const uncachedMints: string[] = [];
    
    // Check cache for each mint
    for (const mint of mints) {
      const cached = this.priceCache.get(mint);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        results.set(mint, cached.price);
      } else {
        uncachedMints.push(mint);
      }
    }

    // Fetch uncached prices in batches
    if (uncachedMints.length > 0) {
      try {
        // Jupiter API supports up to 100 tokens per request
        const batchSize = 100;
        for (let i = 0; i < uncachedMints.length; i += batchSize) {
          const batch = uncachedMints.slice(i, i + batchSize);
          const idsParam = batch.join(',');
          
          const response = await axios.get(`${this.JUPITER_PRICE_API}/price`, {
            params: { ids: idsParam },
            timeout: 10000
          });

          const priceData = response.data as JupiterPriceResponse;
          
          // Process batch results
          for (const mint of batch) {
            const price = priceData.data[mint]?.price || 0;
            results.set(mint, price);
            
            // Cache the result
            this.priceCache.set(mint, { price, timestamp: Date.now() });
          }
        }
      } catch (error) {
        logger.error('Failed to fetch batch token prices:', error);
        
        // Set remaining uncached tokens to 0
        for (const mint of uncachedMints) {
          if (!results.has(mint)) {
            results.set(mint, 0);
          }
        }
      }
    }

    return results;
  }

  /**
   * Get SOL price specifically (commonly needed)
   */
  async getSolPrice(): Promise<number> {
    return this.getTokenPrice('So11111111111111111111111111111111111111112');
  }

  /**
   * Clear price cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.priceCache.clear();
    logger.info('Price cache cleared');
  }
}