import { ParsedVietcapQuarter, VietcapPriceHistoryItem } from '@/lib/vietcap-field-mapping';

export type MarketDataSource = 'auto' | 'vietcap' | 'mas';

export interface FinancialFetchOptions {
  maxQuarters?: number;
  forceRefresh?: boolean;
  periods?: string[];
}

export interface PriceFetchOptions {
  fromDate?: string; // DD/MM/YYYY hoặc YYYY-MM-DD
  toDate?: string;   // DD/MM/YYYY hoặc YYYY-MM-DD
  countBack?: number;
  forceRefresh?: boolean;
}

export interface ProviderResult<T> {
  data: T;
  sourceUsed: 'VIETCAP' | 'MASVN';
  isFallback: boolean;
  latencyMs: number;
  error?: string;
}

export interface IDataProvider {
  readonly id: 'vietcap' | 'mas';
  readonly name: string;
  readonly description: string;
  
  getFinancials(ticker: string, options?: FinancialFetchOptions): Promise<ParsedVietcapQuarter[]>;
  getPriceHistory(ticker: string, options?: PriceFetchOptions): Promise<VietcapPriceHistoryItem[]>;
  getStockQuote?(ticker: string): Promise<any>;
}

