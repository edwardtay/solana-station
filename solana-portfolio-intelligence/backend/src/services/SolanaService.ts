import { Connection, PublicKey, ParsedAccountData } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { createLogger } from '../utils/logger.js';
import type { TokenHolding } from '@solana-portfolio-intelligence/shared';

const logger = createLogger();

// Token category type
type TokenCategory = 'native' | 'stablecoin' | 'lst' | 'defi' | 'defi-lp' | 'meme' | 'bridged' | 'gaming' | 'infrastructure' | 'unknown';

// Comprehensive known token mints for immediate identification
const KNOWN_MINTS: Record<string, { symbol: string; name: string; logoUri?: string; category?: TokenCategory }> = {
  // Native & Wrapped SOL
  'So11111111111111111111111111111111111111112': { symbol: 'SOL', name: 'Wrapped SOL', logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png', category: 'native' },
  
  // Stablecoins
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin', logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png', category: 'stablecoin' },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether USD', logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png', category: 'stablecoin' },
  'USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX': { symbol: 'USDH', name: 'USDH Hubble Stablecoin', category: 'stablecoin' },
  'UXD8m9cvwk4RcSxnX2HZ9VudQCEeDH6fRnB4CAP57Dr': { symbol: 'UXD', name: 'UXD Stablecoin', category: 'stablecoin' },
  
  // Liquid Staking Tokens (LSTs)
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { symbol: 'mSOL', name: 'Marinade Staked SOL', logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png', category: 'lst' },
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': { symbol: 'JitoSOL', name: 'Jito Staked SOL', logoUri: 'https://storage.googleapis.com/token-metadata/JitoSOL-256.png', category: 'lst' },
  'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1': { symbol: 'bSOL', name: 'BlazeStake Staked SOL', logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1/logo.png', category: 'lst' },
  'jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v': { symbol: 'jupSOL', name: 'Jupiter Staked SOL', category: 'lst' },
  'he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A': { symbol: 'hSOL', name: 'Helius Staked SOL', category: 'lst' },
  'vSoLxydx6akxyMD9XEcPvGYNGq6Nn66oqVb3UkGkei7': { symbol: 'vSOL', name: 'The Vault Staked SOL', category: 'lst' },
  'LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp': { symbol: 'LST', name: 'Liquid Staking Token', category: 'lst' },
  'edge86g9cVz87xcpKpy3J77vbp4wYd9idEV562CCntt': { symbol: 'edgeSOL', name: 'Edgevana Staked SOL', category: 'lst' },
  'Comp4ssDzXcLeu2MnLuGNNFC4cmLPMng8qWHPvzAMU1h': { symbol: 'compassSOL', name: 'Compass Staked SOL', category: 'lst' },
  'picobAEvs6w7QEknPce34wAE4gknZA9v5tTonnmHYdX': { symbol: 'picoSOL', name: 'Pico Staked SOL', category: 'lst' },
  'LAinEtNLgpmCP9Rvsf5Hn8W6EhNiKLZQti1xfWMLy6X': { symbol: 'laineSOL', name: 'Laine Staked SOL', category: 'lst' },
  'Dso1bDeDjCQxTrWHqUUi63oBvV7Mdm6WaobLbQ7gnPQ': { symbol: 'dSOL', name: 'Drift Staked SOL', category: 'lst' },
  'strng7mqqc1MBJJV6vMzYbEqnwVGvKKGKedeCvtktWA': { symbol: 'strongSOL', name: 'Stronghold Staked SOL', category: 'lst' },
  'BonK1YhkXEGLZzwtcvRTip3gAL9nCeQD7ppZBLXhtTs': { symbol: 'bonkSOL', name: 'Bonk Staked SOL', category: 'lst' },
  'inf1JTPQR2xR8rkGR2D4dqzBDRbGcKVHnzVwKfkhDRF': { symbol: 'INF', name: 'Infinity Staked SOL', category: 'lst' },
  
  // DeFi Protocol Tokens
  '27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4': { symbol: 'JLP', name: 'Jupiter Liquidity Provider', category: 'defi-lp' },
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY', name: 'Raydium', logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png', category: 'defi' },
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { symbol: 'JUP', name: 'Jupiter', category: 'defi' },
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': { symbol: 'ORCA', name: 'Orca', logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE/logo.png', category: 'defi' },
  'MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey': { symbol: 'MNDE', name: 'Marinade', logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey/logo.png', category: 'defi' },
  'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7': { symbol: 'DRIFT', name: 'Drift Protocol', category: 'defi' },
  'KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS': { symbol: 'KMNO', name: 'Kamino', category: 'defi' },
  'METAewgxyPbgwsseH8T16a39CQ5VyVxZi9zXiDPY18m': { symbol: 'MPLX', name: 'Metaplex', category: 'defi' },
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': { symbol: 'PYTH', name: 'Pyth Network', category: 'defi' },
  'SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y': { symbol: 'SHDW', name: 'Shadow Token', category: 'defi' },
  'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL': { symbol: 'JTO', name: 'Jito Governance', category: 'defi' },
  'TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6': { symbol: 'TNSR', name: 'Tensor', category: 'defi' },
  'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk': { symbol: 'WEN', name: 'Wen', category: 'defi' },
  'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof': { symbol: 'RENDER', name: 'Render Token', category: 'defi' },
  
  // Memecoins
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', name: 'Bonk', logoUri: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I', category: 'meme' },
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': { symbol: 'WIF', name: 'dogwifhat', category: 'meme' },
  'A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump': { symbol: 'FARTCOIN', name: 'Fartcoin', category: 'meme' },
  'ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY': { symbol: 'MOODENG', name: 'Moo Deng', category: 'meme' },
  'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82': { symbol: 'BOME', name: 'Book of Meme', category: 'meme' },
  'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5': { symbol: 'MEW', name: 'cat in a dogs world', category: 'meme' },
  'CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump': { symbol: 'GOAT', name: 'Goatseus Maximus', category: 'meme' },
  '2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump': { symbol: 'PNUT', name: 'Peanut the Squirrel', category: 'meme' },
  'Grass7B4RdKfBCjTKgSqnXkqjwiGvQyFbuSCUJr3XXjs': { symbol: 'GRASS', name: 'Grass', category: 'meme' },
  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': { symbol: 'POPCAT', name: 'Popcat', category: 'meme' },
  'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC': { symbol: 'AI16Z', name: 'ai16z', category: 'meme' },
  '8x5VqbHA8D7NkD52uNuS5nnt3PwA8pLD34ymskeSo2Wn': { symbol: 'ZEREBRO', name: 'Zerebro', category: 'meme' },
  'GJAFwWjJ3vnTsrQVabjBVK2TYB1YtRCQXRDfDgUnpump': { symbol: 'ACT', name: 'Act I: The AI Prophecy', category: 'meme' },
  'Cn5Ne1vmR9ctMGY9z5NC71A3NYFvopjXNyxYtfVYpump': { symbol: 'CHILLGUY', name: 'Just a chill guy', category: 'meme' },
  '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump': { symbol: 'FWOG', name: 'Fwog', category: 'meme' },
  '2weMjPLLybRMMva1fM3U31goWWrCpF59qXkg4JG9Dkkh': { symbol: 'PENGU', name: 'Pudgy Penguins', category: 'meme' },
  'FUAfBo2jgks6gB4Z4LfZkqSZgzNucisEHqnNebaRxM1P': { symbol: 'TRUMP', name: 'Official Trump', category: 'meme' },
  'HaP8r3ksG76PhQLTqR8FYBeNiQpejcFbQmiHbg787Ut1': { symbol: 'MELANIA', name: 'Official Melania', category: 'meme' },
  
  // Bridged Assets
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': { symbol: 'WETH', name: 'Wrapped Ether (Wormhole)', category: 'bridged' },
  '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh': { symbol: 'WBTC', name: 'Wrapped BTC (Wormhole)', category: 'bridged' },
  'A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM': { symbol: 'USDCet', name: 'USD Coin (Wormhole from Ethereum)', category: 'bridged' },
  
  // Gaming & NFT Tokens
  'ATLASXmbPQxBUYbxPsV97usA3fPQYEqzQBUHgiFCUsXx': { symbol: 'ATLAS', name: 'Star Atlas', category: 'gaming' },
  'poLisWXnNRwC6oBu1vHiuKQzFjGL4XDSu4g9qjz9qVk': { symbol: 'POLIS', name: 'Star Atlas DAO', category: 'gaming' },
  'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ': { symbol: 'DUST', name: 'DUST Protocol', category: 'gaming' },
  'FoXyMu5xwXre7zEoSvzViRk3nGawHUp9kUh97y2NDhcq': { symbol: 'FOXY', name: 'Famous Fox Federation', category: 'gaming' },
  
  // Infrastructure
  'HNTkznmvRLwqSLgKMrMNfbi3mKNj9Xg8EzMCRfzJoVJi': { symbol: 'HNT', name: 'Helium', category: 'infrastructure' },
  'iotEVVZLEywoTn1QdwNPddxPWszn3zFhEot3MfL9fns': { symbol: 'IOT', name: 'Helium IOT', category: 'infrastructure' },
  'mb1eu7TzEc71KxDpsmsKoucSSuuoGLv1drys1oP2jh6': { symbol: 'MOBILE', name: 'Helium Mobile', category: 'infrastructure' },
};

// DeFi Protocol Program IDs for position detection
const DEFI_PROGRAMS = {
  // Lending Protocols
  MARGINFI: 'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA',
  KAMINO_LENDING: 'KLend2g3cP87ber41GJZPt4qPJZ4bJJhpX2xVXwDoYb',
  SOLEND: 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo',
  SAVE: 'SoLendXoBNPCqz8Hg8TVjGj36zAqn2hnssH8YsqMp9a', // formerly Solend v2
  
  // DEX & AMM
  RAYDIUM_AMM: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  RAYDIUM_CLMM: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  ORCA_WHIRLPOOL: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  METEORA_DLMM: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  METEORA_POOLS: 'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB',
  LIFINITY: 'EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S',
  
  // Perpetuals & Derivatives
  DRIFT: 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH',
  JUPITER_PERPS: 'PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu',
  FLASH: 'F1aShdFvv7mSQkjEQo4gJ4hKvbiPMBV3iKWnBnWbWxnB',
  
  // Yield & Vaults
  TULIP: 'TuLipcqtGVXP9XR62wM8WWCm6a9vhLs7T1uoWBk6FDs',
  FRANCIUM: 'FC81tbGt6JWRXidaWYFXxGnTk4VgobhJHATvTRVMqgWj',
  
  // Staking
  MARINADE: 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD',
  JITO_STAKE: 'Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb',
  SANCTUM: 'SP12tWFxD9oJsVWNavTTBZvMbA6gkAmxtVgxdqvyvhY',
};

export interface DeFiPosition {
  protocol: string;
  type: 'lending' | 'borrowing' | 'liquidity' | 'staking' | 'farming' | 'perps';
  tokenSymbol?: string;
  tokenMint?: string;
  amount: number;
  usdValue: number;
  apy?: number;
  healthFactor?: number;
  details?: Record<string, any>;
}

export class SolanaService {
  private connection: Connection;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Validates if a string is a valid Solana wallet address
   */
  validateWalletAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets token holdings for a wallet address using direct RPC with known mints
   */
  async getTokenHoldings(walletAddress: string): Promise<TokenHolding[]> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const holdings: TokenHolding[] = [];
      const unknownTokens: { mint: string; amount: number; decimals: number }[] = [];
      
      // Get SOL balance
      const solBalance = await this.connection.getBalance(publicKey);
      logger.info(`Raw SOL balance: ${solBalance} lamports`);

      // Add SOL holding
      if (solBalance > 0) {
        const solAmount = solBalance / 1e9;
        holdings.push({
          mint: 'So11111111111111111111111111111111111111112',
          symbol: 'SOL',
          name: 'Solana',
          amount: solAmount,
          decimals: 9,
          usdValue: 0,
          percentage: 0,
          logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
          category: 'native'
        });
        logger.info(`SOL balance: ${solAmount.toFixed(6)} SOL`);
      }

      // Get SPL token accounts (original Token Program)
      logger.info('Fetching SPL Token Program accounts...');
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );
      logger.info(`Found ${tokenAccounts.value.length} Token Program accounts`);

      // Get Token-2022 accounts (newer tokens like USDC use this)
      logger.info('Fetching Token-2022 Program accounts...');
      const token2022Accounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_2022_PROGRAM_ID }
      );
      logger.info(`Found ${token2022Accounts.value.length} Token-2022 accounts`);

      // Combine all token accounts
      const allTokenAccounts = [...tokenAccounts.value, ...token2022Accounts.value];

      for (const tokenAccount of allTokenAccounts) {
        const accountData = tokenAccount.account.data as ParsedAccountData;
        const tokenInfo = accountData.parsed.info;
        const mint = tokenInfo.mint;
        const amount = parseFloat(tokenInfo.tokenAmount.uiAmount || '0');
        const decimals = tokenInfo.tokenAmount.decimals;
        
        // Filter dust: must be > 0.000001 to be relevant
        if (amount > 0.000001) {
          const knownToken = KNOWN_MINTS[mint];
          
          if (knownToken) {
            // Known token - use our metadata
            holdings.push({
              mint,
              symbol: knownToken.symbol,
              name: knownToken.name,
              amount,
              decimals,
              usdValue: 0,
              percentage: 0,
              logoUri: knownToken.logoUri,
              category: knownToken.category || 'unknown'
            });
            logger.debug(`Known token: ${knownToken.symbol} = ${amount.toFixed(6)}`);
          } else {
            // Unknown token - will need metadata resolution
            unknownTokens.push({ mint, amount, decimals });
            holdings.push({
              mint,
              symbol: 'UNKNOWN',
              name: 'Unknown Token',
              amount,
              decimals,
              usdValue: 0,
              percentage: 0,
              logoUri: undefined
            });
          }
        }
      }

      // Log summary
      const knownCount = holdings.filter(h => h.symbol !== 'UNKNOWN').length;
      logger.info(`Found ${holdings.length} total tokens: ${knownCount} known, ${unknownTokens.length} unknown`);
      
      if (unknownTokens.length > 0) {
        logger.info('Unknown tokens (need metadata resolution):');
        unknownTokens.slice(0, 10).forEach(t => {
          logger.info(`  Mint: ${t.mint} | Balance: ${t.amount.toFixed(6)}`);
        });
        if (unknownTokens.length > 10) {
          logger.info(`  ... and ${unknownTokens.length - 10} more`);
        }
      }

      return holdings;
    } catch (error) {
      logger.error(`Error fetching token holdings for ${walletAddress}:`, error);
      throw new Error(`Failed to fetch token holdings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets DeFi positions for a wallet (lending, borrowing, LP positions, etc.)
   */
  async getDeFiPositions(walletAddress: string): Promise<DeFiPosition[]> {
    const positions: DeFiPosition[] = [];
    const publicKey = new PublicKey(walletAddress);

    try {
      logger.info(`Scanning DeFi positions for ${walletAddress}...`);

      // Check for program accounts owned by the wallet
      // This is a simplified approach - full implementation would decode each protocol's accounts
      
      // For now, detect positions based on token holdings that represent DeFi positions
      const holdings = await this.getTokenHoldings(walletAddress);
      
      for (const holding of holdings) {
        const knownToken = KNOWN_MINTS[holding.mint];
        
        if (knownToken?.category === 'lst') {
          // Liquid staking position
          positions.push({
            protocol: this.getLstProtocol(knownToken.symbol),
            type: 'staking',
            tokenSymbol: knownToken.symbol,
            tokenMint: holding.mint,
            amount: holding.amount,
            usdValue: holding.usdValue,
            details: { tokenName: knownToken.name }
          });
        } else if (knownToken?.category === 'defi-lp') {
          // LP token position
          positions.push({
            protocol: this.getLpProtocol(knownToken.symbol),
            type: 'liquidity',
            tokenSymbol: knownToken.symbol,
            tokenMint: holding.mint,
            amount: holding.amount,
            usdValue: holding.usdValue,
            details: { tokenName: knownToken.name }
          });
        }
      }

      logger.info(`Found ${positions.length} DeFi positions`);
      return positions;
    } catch (error) {
      logger.error(`Error fetching DeFi positions for ${walletAddress}:`, error);
      return positions;
    }
  }

  private getLstProtocol(symbol: string): string {
    const protocols: Record<string, string> = {
      'mSOL': 'Marinade Finance',
      'JitoSOL': 'Jito',
      'bSOL': 'BlazeStake',
      'jupSOL': 'Jupiter',
      'hSOL': 'Helius',
      'vSOL': 'The Vault',
      'LST': 'Sanctum',
      'edgeSOL': 'Edgevana',
      'compassSOL': 'Compass',
      'picoSOL': 'Pico',
      'laineSOL': 'Laine',
      'dSOL': 'Drift',
      'strongSOL': 'Stronghold',
      'bonkSOL': 'Bonk',
      'INF': 'Sanctum Infinity',
    };
    return protocols[symbol] || 'Unknown LST Protocol';
  }

  private getLpProtocol(symbol: string): string {
    const protocols: Record<string, string> = {
      'JLP': 'Jupiter Perpetuals',
    };
    return protocols[symbol] || 'Unknown LP Protocol';
  }

  /**
   * Gets the connection instance for other services to use
   */
  getConnection(): Connection {
    return this.connection;
  }
}