/**
 * Core types for the simulation engine
 */

export interface Token {
  address: string;
  symbol: string;
  priceInBNB: number;
  liquidityBNB: number;
  holders: number;
  ageMins: number;
  taxPct: number;
  isHoneypot: boolean;
  ownerRenounced: boolean;
  lpLocked: boolean;
  volumeUSD24h?: number;
  priceChange24h?: number;
}

export interface Position {
  symbol: string;
  tokenAddress: string;
  qty: number;
  avgPrice: number;
  entryTime: number;
  unrealizedPnL: number;
}

export interface Order {
  id: number;
  botId: number;
  ts: number;
  symbol: string;
  side: 'buy' | 'sell';
  qty: number;
  fillPrice: number;
  fee: number;
  slippageBps: number;
}

export interface BotState {
  id: number;
  bnbBalance: number;
  positions: Position[];
  orders: Order[];
  lastOrderTime: number;
  orderCount: number;
  scanCount: number; // Number of strategy evaluations performed
  pnlRealized: number;
  pnlUnrealized: number;
}

export interface TradeIntent {
  side: 'buy' | 'sell';
  symbol: string;
  tokenAddress: string;
  amountBNB: number;
  reason: string;
}

export interface TradeResult {
  success: boolean;
  order?: Order;
  error?: string;
}

export interface SimulationSnapshot {
  timestamp: number;
  botId: number;
  bnbBalance: number;
  positions: Position[];
  pnlRealized: number;
  pnlUnrealized: number;
  totalValue: number;
}
