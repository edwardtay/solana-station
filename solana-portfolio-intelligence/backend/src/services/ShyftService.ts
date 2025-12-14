import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import type { TokenHolding } from '@solana-portfolio-intelligence/shared';

const logger = createLogger();

interface ShyftToken {
  address: string;
  balance: number;
  info: {
    name: string;
    symbol: string;
    decimals: number;
    image?: string;
  };
}

interface ShyftPortfolioResponse {
  success: boolean;
  message: string;
  result: {
    sol_balance: number;
    tokens: ShyftToken[];
  };
}

export class ShyftService {
  private apiKey: string;
  private baseUrl = 'https://api.shyft.to/sol/v1';

  constructor() {
    this.apiKey = process.env.SHYFT_API_KEY || '';
  }

  async getPortfolio(walletAddress: string): Promise<TokenHolding[]> {
    if (!this.apiKey) {
      logger.warn('Shyft API key not configured');
      return [];
    }

    try {
      logger.info(`Fetching portfolio from Shyft for ${walletAddress}`);
      
      const holdings: TokenHolding[] = [];

      // Get all token balances including SOL
      const response = await axios.get<ShyftPortfolioResponse>(
        `${this.baseUrl}/wallet/all_tokens`,
        {
          params: {
            network: 'mainnet-beta',
            wallet: walletAddress,
          },
          headers: {
            'x-api-key': this.apiKey,
          },
          timeout: 15000,
        }
      );

      if (!response.data?.success || !response.data?.result) {
        logger.warn('Shyft returned unsuccessful response');
        return [];
      }

      const { sol_balance, tokens } = response.data.result;

      // Add native SOL
      if (sol_balance > 0) {
        holdings.push({
          mint: 'So11111111111111111111111111111111111111112',
          symbol: 'SOL',
          name: 'Solana',
          decimals: 9,
          amount: sol_balance,
          usdValue: 0,
          percentage: 0,
          logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        });
      }

      // Add SPL tokens
      if (tokens && Array.isArray(tokens)) {
        for (const token of tokens) {
          if (token.balance > 0) {
            holdings.push({
              mint: token.address,
              symbol: token.info?.symbol || 'UNKNOWN',
              name: token.info?.name || 'Unknown Token',
              decimals: token.info?.decimals || 0,
              amount: token.balance,
              usdValue: 0,
              percentage: 0,
              logoUri: token.info?.image,
            });
          }
        }
      }

      logger.info(`Shyft returned ${holdings.length} tokens`);
      return holdings;
    } catch (error: any) {
      logger.error('Shyft API error:', error.response?.data || error.message);
      return [];
    }
  }
}
