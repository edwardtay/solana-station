import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import type { TokenHolding } from '@solana-portfolio-intelligence/shared';

const logger = createLogger();

interface SolanaTrackerToken {
  token: {
    mint: string;
    name: string;
    symbol: string;
    decimals: number;
    image?: string;
  };
  balance: number;
  value?: number;
  price?: number;
}

interface SolanaTrackerResponse {
  tokens: SolanaTrackerToken[];
  sol: number;
  totalValue?: number;
}

export class SolanaTrackerService {
  private apiKey: string;
  private baseUrl = 'https://data.solanatracker.io';

  constructor() {
    this.apiKey = process.env.SOLANA_TRACKER_API_KEY || '';
  }

  async getPortfolio(walletAddress: string): Promise<TokenHolding[]> {
    if (!this.apiKey) {
      logger.warn('Solana Tracker API key not configured');
      return [];
    }

    try {
      logger.info(`Fetching portfolio from Solana Tracker for ${walletAddress}`);
      
      const holdings: TokenHolding[] = [];

      const response = await axios.get<SolanaTrackerResponse>(
        `${this.baseUrl}/wallet/${walletAddress}`,
        {
          headers: {
            'x-api-key': this.apiKey,
            'Accept': 'application/json',
          },
          timeout: 15000,
        }
      );

      const data = response.data;

      // Add native SOL
      if (data.sol && data.sol > 0) {
        holdings.push({
          mint: 'So11111111111111111111111111111111111111112',
          symbol: 'SOL',
          name: 'Solana',
          decimals: 9,
          amount: data.sol,
          usdValue: 0,
          percentage: 0,
          logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        });
      }

      // Add SPL tokens
      if (data.tokens && Array.isArray(data.tokens)) {
        for (const item of data.tokens) {
          if (item.balance > 0) {
            holdings.push({
              mint: item.token.mint,
              symbol: item.token.symbol || 'UNKNOWN',
              name: item.token.name || 'Unknown Token',
              decimals: item.token.decimals || 0,
              amount: item.balance,
              usdValue: item.value || 0,
              percentage: 0,
              logoUri: item.token.image,
            });
          }
        }
      }

      logger.info(`Solana Tracker returned ${holdings.length} tokens`);
      return holdings;
    } catch (error: any) {
      logger.error('Solana Tracker API error:', error.response?.data || error.message);
      return [];
    }
  }
}
