import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import type { TokenHolding } from '@solana-portfolio-intelligence/shared';

const logger = createLogger();

interface ZerionFungiblePosition {
  type: string;
  id: string;
  attributes: {
    quantity: {
      int: string;
      decimals: number;
      float: number;
      numeric: string;
    };
    value: number | null;
    price: number;
    fungible_info: {
      name: string;
      symbol: string;
      icon?: {
        url: string;
      };
      implementations: {
        chain_id: string;
        address: string;
        decimals: number;
      }[];
    };
  };
}

interface ZerionResponse {
  data: ZerionFungiblePosition[];
}

export class ZerionService {
  private apiKey: string;
  private baseUrl = 'https://api.zerion.io/v1';

  constructor() {
    this.apiKey = process.env.ZERION_API_KEY || '';
  }

  async getPortfolio(walletAddress: string): Promise<TokenHolding[]> {
    if (!this.apiKey) {
      logger.warn('Zerion API key not configured');
      return [];
    }

    try {
      logger.info(`Fetching portfolio from Zerion for ${walletAddress}`);
      
      const holdings: TokenHolding[] = [];

      // Zerion uses Basic auth with API key
      const authHeader = `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`;

      const response = await axios.get<ZerionResponse>(
        `${this.baseUrl}/wallets/${walletAddress}/positions`,
        {
          params: {
            'filter[chain_ids]': 'solana',
            'filter[position_types]': 'wallet',
            currency: 'usd',
          },
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json',
          },
          timeout: 15000,
        }
      );

      if (!response.data?.data) {
        logger.warn('Zerion returned empty response');
        return [];
      }

      for (const position of response.data.data) {
        const attrs = position.attributes;
        if (!attrs || attrs.quantity.float <= 0) continue;

        // Find Solana implementation
        const solanaImpl = attrs.fungible_info.implementations?.find(
          impl => impl.chain_id === 'solana'
        );

        const mint = solanaImpl?.address || position.id;
        const decimals = solanaImpl?.decimals || attrs.quantity.decimals;

        holdings.push({
          mint,
          symbol: attrs.fungible_info.symbol || 'UNKNOWN',
          name: attrs.fungible_info.name || 'Unknown Token',
          decimals,
          amount: attrs.quantity.float,
          usdValue: attrs.value || 0,
          percentage: 0,
          logoUri: attrs.fungible_info.icon?.url,
        });
      }

      logger.info(`Zerion returned ${holdings.length} tokens`);
      return holdings;
    } catch (error: any) {
      logger.error('Zerion API error:', error.response?.data || error.message);
      return [];
    }
  }
}
