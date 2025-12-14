import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import type { TokenHolding } from '@solana-portfolio-intelligence/shared';

const logger = createLogger();

interface HeliusFungibleToken {
  id: string;
  content: {
    metadata: {
      name: string;
      symbol: string;
    };
    links?: {
      image?: string;
    };
  };
  token_info?: {
    balance: number;
    decimals: number;
    price_info?: {
      price_per_token: number;
      total_price: number;
    };
  };
}

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

export class HeliusService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.HELIUS_API_KEY || '';
    this.baseUrl = `https://mainnet.helius-rpc.com/?api-key=${this.apiKey}`;
  }

  async getPortfolio(walletAddress: string): Promise<TokenHolding[]> {
    try {
      logger.info(`Fetching portfolio from Helius for ${walletAddress}`);
      
      const holdings: TokenHolding[] = [];

      // Step 1: Get native SOL balance directly via getBalance RPC
      const balanceResponse = await axios.post(
        this.baseUrl,
        {
          jsonrpc: '2.0',
          id: 'balance',
          method: 'getBalance',
          params: [walletAddress],
        },
        { timeout: 10000 }
      );
      
      const lamports = balanceResponse.data?.result?.value || 0;
      logger.info(`Raw SOL balance: ${lamports} lamports`);
      
      if (lamports > 0) {
        const solAmount = lamports / 1e9;
        // Get SOL price from Jupiter
        let solPrice = 230; // fallback
        try {
          const priceRes = await axios.get('https://price.jup.ag/v4/price?ids=So11111111111111111111111111111111111111112', { timeout: 5000 });
          solPrice = priceRes.data?.data?.['So11111111111111111111111111111111111111112']?.price || 230;
          logger.info(`SOL price from Jupiter: $${solPrice}`);
        } catch (e) {
          logger.warn('Failed to get SOL price from Jupiter, using fallback');
        }
        
        holdings.push({
          mint: 'So11111111111111111111111111111111111111112',
          symbol: 'SOL',
          name: 'Solana',
          decimals: 9,
          amount: solAmount,
          usdValue: solAmount * solPrice,
          percentage: 0,
          logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        });
        logger.info(`SOL balance: ${solAmount.toFixed(4)} SOL ($${(solAmount * solPrice).toFixed(2)})`);
      }

      // Step 2: Get SPL tokens via searchAssets
      const response = await axios.post(
        this.baseUrl,
        {
          jsonrpc: '2.0',
          id: 'portfolio',
          method: 'searchAssets',
          params: {
            ownerAddress: walletAddress,
            tokenType: 'fungible',
            displayOptions: {
              showFungible: true,
            },
            limit: 1000, // Get all tokens like Jupiter
          },
        },
        { timeout: 15000 }
      );

      const data = response.data?.result;

      // Add fungible tokens (filter spam)
      if (data?.items) {
        for (const item of data.items as HeliusFungibleToken[]) {
          if (item.token_info?.balance && item.token_info.balance > 0) {
            const decimals = item.token_info.decimals || 0;
            const amount = item.token_info.balance / Math.pow(10, decimals);
            const price = item.token_info.price_info?.price_per_token || 0;
            const symbol = item.content?.metadata?.symbol || 'UNKNOWN';
            const name = item.content?.metadata?.name || 'Unknown Token';
            
            // Filter spam tokens
            if (isSpamToken(name, symbol)) {
              logger.debug(`Filtered spam token: ${symbol} (${name})`);
              continue;
            }
            
            // Filter tokens with no value and no price (likely spam)
            const usdValue = amount * price;
            if (usdValue === 0 && price === 0 && symbol === 'UNKNOWN') {
              continue;
            }
            
            holdings.push({
              mint: item.id,
              symbol,
              name,
              decimals,
              amount,
              usdValue,
              percentage: 0,
              logoUri: item.content?.links?.image,
            });
          }
        }
      }

      // Calculate percentages
      const totalValue = holdings.reduce((sum, h) => sum + h.usdValue, 0);
      if (totalValue > 0) {
        holdings.forEach(h => {
          h.percentage = (h.usdValue / totalValue) * 100;
        });
      }

      // Sort by value
      holdings.sort((a, b) => b.usdValue - a.usdValue);

      logger.info(`Helius returned ${holdings.length} tokens, total value: $${totalValue.toFixed(2)}`);
      return holdings;
    } catch (error) {
      logger.error('Helius API error:', error);
      return [];
    }
  }

  async getTokenBalances(walletAddress: string): Promise<TokenHolding[]> {
    try {
      const response = await axios.post(
        this.baseUrl,
        {
          jsonrpc: '2.0',
          id: 'balances',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: walletAddress,
            page: 1,
            limit: 100,
            displayOptions: { showFungible: true, showNativeBalance: true },
          },
        },
        { timeout: 15000 }
      );

      return this.parseHeliusResponse(response.data?.result);
    } catch (error) {
      logger.error('Helius getAssetsByOwner error:', error);
      return [];
    }
  }

  private parseHeliusResponse(result: any): TokenHolding[] {
    if (!result?.items) return [];
    
    const holdings: TokenHolding[] = [];
    
    for (const item of result.items) {
      if (item.interface === 'FungibleToken' || item.interface === 'FungibleAsset') {
        const tokenInfo = item.token_info || {};
        const decimals = tokenInfo.decimals || 0;
        const balance = tokenInfo.balance || 0;
        const amount = balance / Math.pow(10, decimals);
        const price = tokenInfo.price_info?.price_per_token || 0;

        if (amount > 0) {
          holdings.push({
            mint: item.id,
            symbol: item.content?.metadata?.symbol || 'UNKNOWN',
            name: item.content?.metadata?.name || 'Unknown',
            decimals,
            amount,
            usdValue: amount * price,
            percentage: 0,
            logoUri: item.content?.links?.image,
          });
        }
      }
    }

    return holdings;
  }
}
