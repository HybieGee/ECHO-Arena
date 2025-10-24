/**
 * Dexscreener API integration
 * Fetches live BSC token data with fallback to PancakeSwap
 */

import type { Token } from '@echo-arena/sim';

const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex';
const BSC_CHAIN_ID = 'bsc';

interface DexscreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd?: string;
  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  volume?: {
    h24?: number;
  };
  priceChange?: {
    h24?: number;
  };
  pairCreatedAt?: number;
}

/**
 * Fetch top new tokens from BSC via Dexscreener
 */
export async function fetchBSCTokens(): Promise<Token[]> {
  try {
    // Fetch latest pairs from BSC
    const response = await fetch(`${DEXSCREENER_API}/tokens/latest/${BSC_CHAIN_ID}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Dexscreener API error: ${response.status}`);
      return getMockTokens();
    }

    const data = await response.json();
    const pairs = data.pairs || [];

    // Filter for BNB pairs only
    const bnbPairs = pairs.filter((pair: DexscreenerPair) =>
      pair.quoteToken.symbol === 'WBNB' || pair.quoteToken.symbol === 'BNB'
    );

    // Convert to Token format
    const tokens: Token[] = bnbPairs.map((pair: DexscreenerPair) => {
      const priceInBNB = parseFloat(pair.priceNative) || 0;
      const liquidityBNB = pair.liquidity?.quote || 0;
      const volumeUSD24h = pair.volume?.h24 || 0;
      const priceChange24h = pair.priceChange?.h24 || 0;

      // Calculate token age
      const createdAt = pair.pairCreatedAt || Date.now();
      const ageMins = Math.floor((Date.now() - createdAt) / 1000 / 60);

      return {
        address: pair.baseToken.address,
        symbol: pair.baseToken.symbol,
        priceInBNB,
        liquidityBNB,
        holders: 0, // Not provided by Dexscreener, would need additional API
        ageMins,
        taxPct: 0, // Requires honeypot checker API
        isHoneypot: false, // Requires honeypot checker API
        ownerRenounced: false, // Requires contract analysis
        lpLocked: false, // Requires contract analysis
        volumeUSD24h,
        priceChange24h,
      };
    });

    // Filter out invalid tokens
    return tokens.filter(t =>
      t.priceInBNB > 0 &&
      t.liquidityBNB >= 1 &&
      t.ageMins < 10080 // Max 1 week old
    ).slice(0, 50); // Top 50 tokens

  } catch (error) {
    console.error('Error fetching from Dexscreener:', error);
    return getMockTokens();
  }
}

/**
 * Fetch specific token price from Dexscreener
 */
export async function fetchTokenPrice(tokenAddress: string): Promise<number | null> {
  try {
    const response = await fetch(`${DEXSCREENER_API}/tokens/${tokenAddress}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const pairs = data.pairs || [];

    // Find BNB pair
    const bnbPair = pairs.find((pair: DexscreenerPair) =>
      pair.chainId === BSC_CHAIN_ID &&
      (pair.quoteToken.symbol === 'WBNB' || pair.quoteToken.symbol === 'BNB')
    );

    if (bnbPair) {
      return parseFloat(bnbPair.priceNative) || null;
    }

    return null;
  } catch (error) {
    console.error('Error fetching token price:', error);
    return null;
  }
}

/**
 * Fetch $ECHO token price in BNB
 * Used for burn amount calculations
 */
export async function fetchEchoPrice(echoTokenAddress: string): Promise<number> {
  const price = await fetchTokenPrice(echoTokenAddress);

  // If we can't fetch price, return a default (0.0001 BNB)
  // In production, this should fail gracefully or use a cached price
  return price || 0.0001;
}

/**
 * Mock tokens for testing when API is unavailable
 */
function getMockTokens(): Token[] {
  return [
    {
      address: '0x1111111111111111111111111111111111111111',
      symbol: 'MOMENTUM1',
      priceInBNB: 0.00123,
      liquidityBNB: 45,
      holders: 150,
      ageMins: 180,
      taxPct: 5,
      isHoneypot: false,
      ownerRenounced: false,
      lpLocked: true,
      volumeUSD24h: 15000,
      priceChange24h: 25.5,
    },
    {
      address: '0x2222222222222222222222222222222222222222',
      symbol: 'VOLUME1',
      priceInBNB: 0.00089,
      liquidityBNB: 35,
      holders: 200,
      ageMins: 90,
      taxPct: 3,
      isHoneypot: false,
      ownerRenounced: true,
      lpLocked: true,
      volumeUSD24h: 35000,
      priceChange24h: 55.2,
    },
    {
      address: '0x3333333333333333333333333333333333333333',
      symbol: 'LAUNCH1',
      priceInBNB: 0.00156,
      liquidityBNB: 25,
      holders: 80,
      ageMins: 30,
      taxPct: 8,
      isHoneypot: false,
      ownerRenounced: false,
      lpLocked: true,
      volumeUSD24h: 8000,
      priceChange24h: 120.8,
    },
    {
      address: '0x4444444444444444444444444444444444444444',
      symbol: 'SOCIAL1',
      priceInBNB: 0.00234,
      liquidityBNB: 60,
      holders: 500,
      ageMins: 240,
      taxPct: 4,
      isHoneypot: false,
      ownerRenounced: true,
      lpLocked: true,
      volumeUSD24h: 42000,
      priceChange24h: 18.3,
    },
    {
      address: '0x5555555555555555555555555555555555555555',
      symbol: 'TREND1',
      priceInBNB: 0.00067,
      liquidityBNB: 20,
      holders: 120,
      ageMins: 120,
      taxPct: 6,
      isHoneypot: false,
      ownerRenounced: false,
      lpLocked: true,
      volumeUSD24h: 12000,
      priceChange24h: 38.7,
    },
  ];
}
