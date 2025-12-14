import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import type { 
  DeFiPosition, 
  ProtocolSummary, 
  ComprehensivePortfolio, 
  ClaimableReward,
  TokenHolding 
} from '@solana-portfolio-intelligence/shared';

const logger = createLogger();

// Extended token type with price info (uses TokenHolding as base)
export type TokenWithPrice = TokenHolding & {
  price: number;
};

// Known protocol addresses for detection
const PROTOCOL_PROGRAMS = {
  // Marinade
  marinade: 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD',
  // Jito
  jito: 'Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb',
  // Solayer
  solayer: 'sSo14endRuUbvQaJS3dq36Q829a3A6BEfoeeRGJywEh',
  // Kamino
  kamino: '6LtLpnUFNByNXLyCoK9wA2MykKAmQNZKBdY8s47dehDc',
  kaminoLending: 'KLend2g3cP87ber41GXWsSZE9x3eDFxAzcUgVpnCeQz',
  // Drift
  drift: 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH',
  // Jupiter
  jupiterStake: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  // Raydium
  raydium: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  raydiumCLMM: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  // Orca
  orca: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  // Meteora
  meteora: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  // Sanctum
  sanctum: 'SP12tWFxD9oJsVWNavTTBZvMbA6gkAmxtVgxdqvyvhY',
  // Lulo (Flexlend)
  lulo: 'FL1X1nBqg4vWFRPzNSgWEHfoc1S1BqDj4aqXU1WYKwje',
};

// LST tokens
// Token category type
type TokenCategory = 'native' | 'stablecoin' | 'lst' | 'defi' | 'defi-lp' | 'meme' | 'bridged' | 'gaming' | 'infrastructure' | 'unknown';

// Known token categories for display
const TOKEN_CATEGORIES: Record<string, TokenCategory> = {
  // Native
  'So11111111111111111111111111111111111111112': 'native',
  // Stablecoins
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'stablecoin', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'stablecoin', // USDT
  'USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX': 'stablecoin', // USDH
  'UXD8m9cvwk4RcSxnX2HZ9VudQCEeDH6fRnB4CAP57Dr': 'stablecoin', // UXD
  // LSTs
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'lst',
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': 'lst',
  'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1': 'lst',
  'jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v': 'lst',
  'he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A': 'lst',
  'vSoLxydx6akxyMD9XEcPvGYNGq6Nn66oqVb3UkGkei7': 'lst',
  'LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp': 'lst',
  'edge86g9cVz87xcpKpy3J77vbp4wYd9idEV562CCntt': 'lst',
  'Comp4ssDzXcLeu2MnLuGNNFC4cmLPMng8qWHPvzAMU1h': 'lst',
  'picobAEvs6w7QEknPce34wAE4gknZA9v5tTonnmHYdX': 'lst',
  'LAinEtNLgpmCP9Rvsf5Hn8W6EhNiKLZQti1xfWMLy6X': 'lst',
  'Dso1bDeDjCQxTrWHqUUi63oBvV7Mdm6WaobLbQ7gnPQ': 'lst',
  'strng7mqqc1MBJJV6vMzYbEqnwVGvKKGKedeCvtktWA': 'lst',
  'BonK1YhkXEGLZzwtcvRTip3gAL9nCeQD7ppZBLXhtTs': 'lst',
  'inf1JTPQR2xR8rkGR2D4dqzBDRbGcKVHnzVwKfkhDRF': 'lst',
  // DeFi LP
  '27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4': 'defi-lp', // JLP
  // DeFi Tokens
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 'defi', // RAY
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'defi', // JUP
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': 'defi', // ORCA
  'MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey': 'defi', // MNDE
  'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7': 'defi', // DRIFT
  'KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS': 'defi', // KMNO
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': 'defi', // PYTH
  'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL': 'defi', // JTO
  'TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6': 'defi', // TNSR
  'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof': 'defi', // RENDER
  // Memecoins
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'meme', // BONK
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'meme', // WIF
  'A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump': 'meme', // FARTCOIN
  'ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY': 'meme', // MOODENG
  'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82': 'meme', // BOME
  'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5': 'meme', // MEW
  'CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump': 'meme', // GOAT
  '2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump': 'meme', // PNUT
  'Grass7B4RdKfBCjTKgSqnXkqjwiGvQyFbuSCUJr3XXjs': 'meme', // GRASS
  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': 'meme', // POPCAT
  'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC': 'meme', // AI16Z
  '8x5VqbHA8D7NkD52uNuS5nnt3PwA8pLD34ymskeSo2Wn': 'meme', // ZEREBRO
  'GJAFwWjJ3vnTsrQVabjBVK2TYB1YtRCQXRDfDgUnpump': 'meme', // ACT
  'Cn5Ne1vmR9ctMGY9z5NC71A3NYFvopjXNyxYtfVYpump': 'meme', // CHILLGUY
  '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump': 'meme', // FWOG
  '2weMjPLLybRMMva1fM3U31goWWrCpF59qXkg4JG9Dkkh': 'meme', // PENGU
  'FUAfBo2jgks6gB4Z4LfZkqSZgzNucisEHqnNebaRxM1P': 'meme', // TRUMP
  'HaP8r3ksG76PhQLTqR8FYBeNiQpejcFbQmiHbg787Ut1': 'meme', // MELANIA
  // Bridged
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'bridged', // WETH
  '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh': 'bridged', // WBTC
  // Gaming
  'ATLASXmbPQxBUYbxPsV97usA3fPQYEqzQBUHgiFCUsXx': 'gaming', // ATLAS
  'poLisWXnNRwC6oBu1vHiuKQzFjGL4XDSu4g9qjz9qVk': 'gaming', // POLIS
  'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ': 'gaming', // DUST
  // Infrastructure
  'HNTkznmvRLwqSLgKMrMNfbi3mKNj9Xg8EzMCRfzJoVJi': 'infrastructure', // HNT
  'iotEVVZLEywoTn1QdwNPddxPWszn3zFhEot3MfL9fns': 'infrastructure', // IOT
  'mb1eu7TzEc71KxDpsmsKoucSSuuoGLv1drys1oP2jh6': 'infrastructure', // MOBILE
};

const LST_TOKENS: Record<string, { name: string; protocol: string }> = {
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { name: 'Marinade SOL', protocol: 'Marinade' },
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': { name: 'Jito SOL', protocol: 'Jito' },
  'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1': { name: 'BlazeStake SOL', protocol: 'BlazeStake' },
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': { name: 'Lido SOL', protocol: 'Lido' },
  'jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v': { name: 'Jupiter SOL', protocol: 'Jupiter' },
  'sSo14endRuUbvQaJS3dq36Q829a3A6BEfoeeRGJywEh': { name: 'Solayer SOL', protocol: 'Solayer' },
  'he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A': { name: 'Helius SOL', protocol: 'Helius' },
  'vSoLxydx6akxyMD9XEcPvGYNGq6Nn66oqVb3UkGkei7': { name: 'Validator SOL', protocol: 'Socean' },
  'edge86g9cVz87xcpKpy3J77vbp4wYd9idEV562CCntt': { name: 'Edgevana SOL', protocol: 'Edgevana' },
  'LAinEtNLgpmCP9Rvsf5Hn8W6EhNiKLZQti1xfWMLy6X': { name: 'Laine SOL', protocol: 'Laine' },
  'Comp4ssDzXcLeu2MnLuGNNFC4cmLPMng8qWHPvzAMU1h': { name: 'Compass SOL', protocol: 'Compass' },
  'picobAEvs6w7QEknPce34wAE4gknZA9v5tTonnmHYdX': { name: 'Pico SOL', protocol: 'Picasso' },
  'phaseZSfPxTDBpiVb96H4XFSD8xHeHxZre5HerehBJG': { name: 'Phase SOL', protocol: 'Phase' },
  'strng7mqqc1MBJJV6vMzYbEqnwVGvKKGKedeCvtktWA': { name: 'Stronghold SOL', protocol: 'Stronghold' },
  'LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp': { name: 'Liquid Staking', protocol: 'Sanctum' },
  'BonK1YhkXEGLZzwtcvRTip3gAL9nCeQD7ppZBLXhtTs': { name: 'bonkSOL', protocol: 'Sanctum' },
  'Dso1bDeDjCQxTrWHqUUi63oBvV7Mdm6WaobLbQ7gnPQ': { name: 'Drift SOL', protocol: 'Drift' },
  'inf8CSLZP4vZdDnSmGr2hwhGhSrg7LitYLPp1TeVVBu': { name: 'Infinity SOL', protocol: 'Sanctum' },
  'pathdXw4He1Xk3eX84pDdDZnGKEme3GivBamGCVPZ5a': { name: 'Pathfinder SOL', protocol: 'Pathfinders' },
  'pumpkinsEq8xENVZE6QgTS93EN4r9iKvNxNALS1ooyp': { name: 'Pumpkin SOL', protocol: 'Pumpkin' },
  'CgnTSoL3DgY9SFHxcLj6CgCgKKoTBr6tp4CPAEWy25DE': { name: 'Cogent SOL', protocol: 'Cogent' },
  'jucy5XJ76pHVvtPZb5TKRcGQExkwit2P5s4vY8UzmpC': { name: 'Juicy SOL', protocol: 'Juicystake' },
  'GRJQtWwdJmp5LLpy8JWjPgn5FnLyqSJGNhn5ZnCTFUwM': { name: 'GRIN SOL', protocol: 'GRIN' },
  'st8QujHLPsX3d6HG9uQg9kJ91jFxUgruwsb1hyYXSNd': { name: 'Step SOL', protocol: 'Step' },
  'HUBsveNpjo5pWqNkH57QzxjQASdTVXcSK7bVKTSZtcSX': { name: 'Hub SOL', protocol: 'SolanaHub' },
  'suPer8CPwxoJPQ7zksGMwFvjBQhjAHwUMmPV4FVatBw': { name: 'SuperSOL', protocol: 'Superfast' },
  'fpSoL8EJ7UA5yJxFKWk1MFiWi35w8CbH36G5B9d7DsV': { name: 'FP SOL', protocol: 'FP' },
  'rSoLp8HSy63S4Ar9vGqZvPGqBqNQY1qPM7JJ7xfMvMV': { name: 'Rise SOL', protocol: 'Rise' },
};

export class DeFiPositionsService {
  private heliusApiKey: string;
  private heliusUrl: string;
  private shyftApiKey: string;

  constructor() {
    this.heliusApiKey = process.env.HELIUS_API_KEY || '';
    this.heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${this.heliusApiKey}`;
    this.shyftApiKey = process.env.SHYFT_API_KEY || '';
  }

  async getComprehensivePortfolio(walletAddress: string): Promise<ComprehensivePortfolio> {
    logger.info(`Fetching comprehensive portfolio for ${walletAddress}`);
    
    const [holdings, solBalance, defiPositions] = await Promise.all([
      this.getEnhancedHoldings(walletAddress),
      this.getSolBalance(walletAddress),
      this.getAllDeFiPositions(walletAddress),
    ]);

    // Separate LST tokens as staking positions
    const { walletTokens, lstPositions } = this.separateLSTTokens(holdings.tokens);
    
    // Add LST positions to defi
    if (lstPositions.length > 0) {
      const lstProtocols = this.groupLSTByProtocol(lstPositions);
      defiPositions.push(...lstProtocols);
    }

    // Calculate totals
    const totalStaked = defiPositions
      .filter(p => p.positions.some(pos => pos.type === 'staking'))
      .reduce((sum, p) => sum + p.totalValue, 0);
    
    const totalLending = defiPositions
      .filter(p => p.positions.some(pos => pos.type === 'lending'))
      .reduce((sum, p) => sum + p.totalValue, 0);
    
    const totalLP = defiPositions
      .filter(p => p.positions.some(pos => pos.type === 'lp'))
      .reduce((sum, p) => sum + p.totalValue, 0);

    const totalBorrowed = defiPositions
      .filter(p => p.positions.some(pos => pos.type === 'borrow'))
      .reduce((sum, p) => sum + p.totalValue, 0);

    // Calculate claimable rewards
    const claimableRewards = this.aggregateClaimableRewards(defiPositions);
    
    // Calculate yield estimate
    const yieldEstimate = this.calculateYieldEstimate(defiPositions);

    const holdingsValue = walletTokens.reduce((sum, t) => sum + t.usdValue, 0);
    const defiValue = defiPositions.reduce((sum, p) => sum + p.totalValue, 0);
    const netWorth = holdingsValue + defiValue - totalBorrowed;

    return {
      walletAddress,
      netWorth,
      solBalance,
      holdings: {
        totalValue: holdingsValue,
        tokens: walletTokens,
      },
      defiPositions,
      totalStaked,
      totalLending,
      totalLP,
      totalBorrowed,
      claimableRewards,
      yieldEstimate,
      lastUpdated: Date.now(),
    };
  }


  private async getSolBalance(walletAddress: string): Promise<number> {
    try {
      const response = await axios.post(this.heliusUrl, {
        jsonrpc: '2.0',
        id: 'balance',
        method: 'getBalance',
        params: [walletAddress],
      }, { timeout: 10000 });
      
      return (response.data?.result?.value || 0) / 1e9;
    } catch (error) {
      logger.error('Error fetching SOL balance:', error);
      return 0;
    }
  }

  private async getEnhancedHoldings(walletAddress: string): Promise<{ tokens: TokenWithPrice[] }> {
    try {
      // Get all tokens with Helius
      const response = await axios.post(this.heliusUrl, {
        jsonrpc: '2.0',
        id: 'portfolio',
        method: 'searchAssets',
        params: {
          ownerAddress: walletAddress,
          tokenType: 'fungible',
          displayOptions: { showFungible: true },
        },
      }, { timeout: 15000 });

      const items = response.data?.result?.items || [];
      const tokens: TokenWithPrice[] = [];

      // Get SOL balance and price
      const [solBalance, solPrice] = await Promise.all([
        this.getSolBalance(walletAddress),
        this.getSolPrice(),
      ]);

      if (solBalance > 0) {
        tokens.push({
          mint: 'So11111111111111111111111111111111111111112',
          symbol: 'SOL',
          name: 'Solana',
          amount: solBalance,
          decimals: 9,
          usdValue: solBalance * solPrice,
          percentage: 0,
          price: solPrice,
          priceChange24h: 0,
          logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
          isVerified: true,
          category: 'native',
        });
      }

      // Get prices for all tokens
      const mints = items.map((i: any) => i.id).filter(Boolean);
      const prices = await this.getTokenPrices(mints);

      for (const item of items) {
        const tokenInfo = item.token_info || {};
        const decimals = tokenInfo.decimals || 0;
        const balance = tokenInfo.balance || 0;
        const amount = balance / Math.pow(10, decimals);
        
        if (amount <= 0) continue;

        const price = prices.get(item.id) || tokenInfo.price_info?.price_per_token || 0;
        const usdValue = amount * price;

        tokens.push({
          mint: item.id,
          symbol: item.content?.metadata?.symbol || 'UNKNOWN',
          name: item.content?.metadata?.name || 'Unknown Token',
          amount,
          decimals,
          usdValue,
          percentage: 0,
          price,
          priceChange24h: 0,
          logoUri: item.content?.links?.image,
          isVerified: !!item.content?.metadata?.symbol,
          category: TOKEN_CATEGORIES[item.id] || 'unknown',
        });
      }

      // Sort by value and calculate percentages
      tokens.sort((a, b) => b.usdValue - a.usdValue);
      const totalValue = tokens.reduce((sum, t) => sum + t.usdValue, 0);
      if (totalValue > 0) {
        tokens.forEach(t => { t.percentage = (t.usdValue / totalValue) * 100; });
      }

      return { tokens };
    } catch (error) {
      logger.error('Error fetching enhanced holdings:', error);
      return { tokens: [] };
    }
  }

  private async getSolPrice(): Promise<number> {
    try {
      const response = await axios.get(
        'https://price.jup.ag/v4/price?ids=So11111111111111111111111111111111111111112',
        { timeout: 5000 }
      );
      return response.data?.data?.['So11111111111111111111111111111111111111112']?.price || 230;
    } catch {
      return 230; // Fallback
    }
  }

  private async getTokenPrices(mints: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();
    if (mints.length === 0) return prices;

    try {
      // Jupiter price API
      const ids = mints.slice(0, 100).join(',');
      const response = await axios.get(`https://price.jup.ag/v4/price?ids=${ids}`, { timeout: 10000 });
      
      for (const [mint, data] of Object.entries(response.data?.data || {})) {
        prices.set(mint, (data as any).price || 0);
      }
    } catch (error) {
      logger.warn('Error fetching token prices from Jupiter');
    }

    return prices;
  }

  private separateLSTTokens(tokens: TokenWithPrice[]): { walletTokens: TokenWithPrice[]; lstPositions: TokenWithPrice[] } {
    const walletTokens: TokenWithPrice[] = [];
    const lstPositions: TokenWithPrice[] = [];

    for (const token of tokens) {
      if (LST_TOKENS[token.mint]) {
        lstPositions.push(token);
      } else {
        walletTokens.push(token);
      }
    }

    return { walletTokens, lstPositions };
  }

  private groupLSTByProtocol(lstTokens: TokenWithPrice[]): ProtocolSummary[] {
    const protocolMap = new Map<string, ProtocolSummary>();

    for (const token of lstTokens) {
      const lstInfo = LST_TOKENS[token.mint];
      if (!lstInfo) continue;

      const protocol = lstInfo.protocol;
      
      if (!protocolMap.has(protocol)) {
        protocolMap.set(protocol, {
          protocol,
          logo: this.getProtocolLogo(protocol),
          totalValue: 0,
          positions: [],
        });
      }

      const summary = protocolMap.get(protocol)!;
      summary.totalValue += token.usdValue;
      summary.positions.push({
        protocol,
        type: 'staking',
        asset: token.mint,
        assetSymbol: token.symbol,
        assetLogo: token.logoUri || undefined,
        amount: token.amount,
        usdValue: token.usdValue,
        apy: this.getEstimatedLSTApy(protocol),
      });
    }

    return Array.from(protocolMap.values());
  }

  private getProtocolLogo(protocol: string): string {
    const logos: Record<string, string> = {
      'Marinade': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
      'Jito': 'https://storage.googleapis.com/token-metadata/JitoSOL-256.png',
      'Jupiter': 'https://static.jup.ag/jup/icon.png',
      'Drift': 'https://drift-public.s3.eu-central-1.amazonaws.com/assets/icons/markets/drift.svg',
      'Kamino': 'https://app.kamino.finance/favicon.ico',
      'Solayer': 'https://solayer.org/favicon.ico',
      'Sanctum': 'https://app.sanctum.so/favicon.ico',
      'Raydium': 'https://raydium.io/favicon.ico',
      'Orca': 'https://www.orca.so/favicon.ico',
      'Meteora': 'https://app.meteora.ag/favicon.ico',
    };
    return logos[protocol] || '';
  }

  private getEstimatedLSTApy(protocol: string): number {
    // Estimated APYs for LST protocols
    const apys: Record<string, number> = {
      'Marinade': 7.2,
      'Jito': 7.8,
      'Jupiter': 7.5,
      'BlazeStake': 7.0,
      'Sanctum': 7.3,
      'Solayer': 8.5,
      'Drift': 7.4,
    };
    return apys[protocol] || 7.0;
  }

  private async getAllDeFiPositions(walletAddress: string): Promise<ProtocolSummary[]> {
    const positions: ProtocolSummary[] = [];

    // Try to get positions from various sources
    const [
      kaminoPositions,
      driftPositions,
      validatorStakes,
    ] = await Promise.allSettled([
      this.getKaminoPositions(walletAddress),
      this.getDriftPositions(walletAddress),
      this.getValidatorStakes(walletAddress),
    ]);

    if (kaminoPositions.status === 'fulfilled' && kaminoPositions.value) {
      positions.push(kaminoPositions.value);
    }
    if (driftPositions.status === 'fulfilled' && driftPositions.value) {
      positions.push(driftPositions.value);
    }
    if (validatorStakes.status === 'fulfilled' && validatorStakes.value) {
      positions.push(validatorStakes.value);
    }

    return positions.filter(p => p.totalValue > 0);
  }

  private async getKaminoPositions(walletAddress: string): Promise<ProtocolSummary | null> {
    // Kamino positions would require parsing their specific account structures
    // For now, return null - would need Kamino SDK integration
    return null;
  }

  private async getDriftPositions(walletAddress: string): Promise<ProtocolSummary | null> {
    // Drift positions would require their SDK
    // For now, return null
    return null;
  }

  private async getValidatorStakes(walletAddress: string): Promise<ProtocolSummary | null> {
    try {
      // Get stake accounts
      const response = await axios.post(this.heliusUrl, {
        jsonrpc: '2.0',
        id: 'stakes',
        method: 'getProgramAccounts',
        params: [
          'Stake11111111111111111111111111111111111111',
          {
            encoding: 'jsonParsed',
            filters: [
              { memcmp: { offset: 12, bytes: walletAddress } },
            ],
          },
        ],
      }, { timeout: 15000 });

      const stakes = response.data?.result || [];
      if (stakes.length === 0) return null;

      const solPrice = await this.getSolPrice();
      let totalStaked = 0;
      const positions: DeFiPosition[] = [];

      for (const stake of stakes) {
        const info = stake.account?.data?.parsed?.info;
        if (!info?.stake?.delegation) continue;

        const lamports = parseInt(info.stake.delegation.stake || '0');
        const amount = lamports / 1e9;
        totalStaked += amount;

        positions.push({
          protocol: 'Validators',
          type: 'staking',
          asset: 'SOL',
          assetSymbol: 'SOL',
          amount,
          usdValue: amount * solPrice,
          apy: 7.0, // Average validator APY
        });
      }

      if (totalStaked === 0) return null;

      return {
        protocol: 'Validators',
        logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        totalValue: totalStaked * solPrice,
        positions,
      };
    } catch (error) {
      logger.error('Error fetching validator stakes:', error);
      return null;
    }
  }

  private aggregateClaimableRewards(positions: ProtocolSummary[]): { totalValue: number; rewards: ClaimableReward[] } {
    const rewards: ClaimableReward[] = [];
    let totalValue = 0;

    for (const protocol of positions) {
      for (const pos of protocol.positions) {
        if (pos.rewards) {
          for (const reward of pos.rewards) {
            rewards.push({
              protocol: protocol.protocol,
              token: reward.token,
              tokenSymbol: reward.token,
              amount: reward.amount,
              usdValue: reward.usdValue,
            });
            totalValue += reward.usdValue;
          }
        }
      }
    }

    return { totalValue, rewards };
  }

  private calculateYieldEstimate(positions: ProtocolSummary[]): {
    dailyYield: number;
    weeklyYield: number;
    monthlyYield: number;
    yearlyAPR: number;
  } {
    let totalValue = 0;
    let weightedApy = 0;

    for (const protocol of positions) {
      for (const pos of protocol.positions) {
        if (pos.apy && pos.usdValue > 0) {
          totalValue += pos.usdValue;
          weightedApy += pos.apy * pos.usdValue;
        }
      }
    }

    const yearlyAPR = totalValue > 0 ? weightedApy / totalValue : 0;
    const yearlyYield = totalValue * (yearlyAPR / 100);

    return {
      dailyYield: yearlyYield / 365,
      weeklyYield: yearlyYield / 52,
      monthlyYield: yearlyYield / 12,
      yearlyAPR,
    };
  }
}
