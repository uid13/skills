export type MarketType = 'sh' | 'sz' | 'bj' | 'hk' | 'gb' | 'futures' | 'index';
export type AssetType = 'stock' | 'fund' | 'futures' | 'index';

export interface Symbol {
  symbol: string;
  market: MarketType;
  type: AssetType;
  code: string;
}

export interface Quote {
  code: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  high: string;
  low: string;
}

export interface QueryResults {
  stock: Quote[];
  fund: Quote[];
  futures: Quote[];
  index: Quote[];
}
