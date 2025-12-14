import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import type { TokenHolding } from '@solana-portfolio-intelligence/shared';

const logger = createLogger();

interface MoralisToken {
  associatedTokenAddress: string;
  mint: string;
  amount: string;
  amountRaw: string;
  decimals: number;
  name?: string;
  symbol?: string;
  logo?: string;
}

interface MoralisPortfolioResponse {
  tokens: MoralisToken[];
  nativeBalance: {
    lamports: string;
    solana: string;
  };
}

export class MoralisService {
  private apiKey: string;
  private baseUrl = 'https://solana-gateway.moralis.io';

  constructor() {
    this.apiKey = process.env.MORALIS_API_KEY || '';
  }

  async getPortfolio(walletAddress: string): Promise<TokenHolding[]> {
    if (!this.apiKey) {
      logger.warn('Moralis API key not configured');
      return [];
    }

    try {
      logger.info(`Fetching portfolio from Moralis for ${walletAddress}`);
      
      const holdings: TokenHolding[] = [];

      // Get SPL token balances
      const tokensResponse = await axios.get<MoralisToken[]>(
        `${this.baseUrl}/account/mainnet/${walletAddress}/tokens`,
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Accept': 'application/json',
          },
          timeout: 15000,
        }
      );

      // Get native SOL balance
      const balanceResponse = await axios.get(
        `${this.baseUrl}/account/mainnet/${walletAddress}/balance`,
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Accept': 'application/json',
          },
          timeout: 10000,
        }
      );

      // Add native SOL
      const solBalance = parseFloat(balanceResponse.data?.solana || '0');
      if (solBalance > 0) {
        holdings.push({
          mint: 'So11111111111111111111111111111111111111112',
          symbol: 'SOL',
          name: 'Solana',
          decimals: 9,
          amount: solBalance,
          usdValue: 0, // Will be priced later
          percentage: 0,
          logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        });
      }

      // Add SPL tokens
      if (tokensResponse.data && Array.isArray(tokensResponse.data)) {
        for (const token of tokensResponse.data) {
          const amount = parseFloat(token.amount || '0');
          if (amount > 0) {
            holdings.push({
              mint: token.mint,
              symbol: token.symbol || 'UNKNOWN',
              name: token.name || 'Unknown Token',
              decimals: token.decimals || 0,
              amount,
              usdValue: 0,
              percentage: 0,
              logoUri: token.logo,
            });
          }
        }
      }

      logger.info(`Moralis returned ${holdings.length} tokens`);
      return holdings;
    } catch (error: any) {
      logger.error('Moralis API error:', error.response?.data || error.message);
      return [];
    }
  }
}
