import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import type { TokenHolding } from '@solana-portfolio-intelligence/shared';

const logger = createLogger();

interface TokenAccountInfo {
  pubkey: string;
  account: {
    data: {
      parsed: {
        info: {
          mint: string;
          owner: string;
          tokenAmount: {
            amount: string;
            decimals: number;
            uiAmount: number;
            uiAmountString: string;
          };
        };
        type: string;
      };
      program: string;
      space: number;
    };
    executable: boolean;
    lamports: number;
    owner: string;
    rentEpoch: number;
  };
}

export class QuickNodeService {
  private rpcUrl: string;

  constructor() {
    this.rpcUrl = process.env.QUICKNODE_RPC_URL || '';
  }

  async getPortfolio(walletAddress: string): Promise<TokenHolding[]> {
    if (!this.rpcUrl) {
      logger.warn('QuickNode RPC URL not configured');
      return [];
    }

    try {
      logger.info(`Fetching portfolio from QuickNode for ${walletAddress}`);
      
      const holdings: TokenHolding[] = [];

      // Get native SOL balance
      const balanceResponse = await axios.post(
        this.rpcUrl,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [walletAddress],
        },
        { timeout: 10000 }
      );

      const lamports = balanceResponse.data?.result?.value || 0;
      if (lamports > 0) {
        const solAmount = lamports / 1e9;
        holdings.push({
          mint: 'So11111111111111111111111111111111111111112',
          symbol: 'SOL',
          name: 'Solana',
          decimals: 9,
          amount: solAmount,
          usdValue: 0,
          percentage: 0,
          logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        });
      }

      // Get SPL token accounts
      const tokenResponse = await axios.post(
        this.rpcUrl,
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'getTokenAccountsByOwner',
          params: [
            walletAddress,
            { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
            { encoding: 'jsonParsed' },
          ],
        },
        { timeout: 15000 }
      );

      const tokenAccounts: TokenAccountInfo[] = tokenResponse.data?.result?.value || [];

      for (const account of tokenAccounts) {
        const info = account.account?.data?.parsed?.info;
        if (!info) continue;

        const amount = info.tokenAmount?.uiAmount || 0;
        if (amount > 0) {
          holdings.push({
            mint: info.mint,
            symbol: 'UNKNOWN', // QuickNode RPC doesn't provide metadata
            name: 'Unknown Token',
            decimals: info.tokenAmount?.decimals || 0,
            amount,
            usdValue: 0,
            percentage: 0,
            logoUri: undefined,
          });
        }
      }

      logger.info(`QuickNode returned ${holdings.length} tokens`);
      return holdings;
    } catch (error: any) {
      logger.error('QuickNode RPC error:', error.response?.data || error.message);
      return [];
    }
  }
}
