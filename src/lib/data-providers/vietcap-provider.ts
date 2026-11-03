import { IDataProvider, FinancialFetchOptions, PriceFetchOptions } from './types';
import {
  ParsedVietcapQuarter,
  VietcapPriceHistoryItem,
  fetchFullVietcapData,
  fetchVietcapPriceHistory,
} from '@/lib/vietcap-field-mapping';

export class VietcapProvider implements IDataProvider {
  public readonly id = 'vietcap' as const;
  public readonly name = 'Vietcap IQ';
  public readonly description = 'Nguồn dữ liệu chuyên sâu từ iq.vietcap.com.vn';

  public async getFinancials(
    ticker: string,
    options: FinancialFetchOptions = {}
  ): Promise<ParsedVietcapQuarter[]> {
    return fetchFullVietcapData(ticker, {
      maxQuarters: options.maxQuarters,
      forceRefresh: options.forceRefresh,
    });
  }

  public async getPriceHistory(
    ticker: string,
    options: PriceFetchOptions = {}
  ): Promise<VietcapPriceHistoryItem[]> {
    // Format YYYY-MM-DD sang YYYYMMDD nếu cần
    const formatToCompact = (d?: string) => {
      if (!d) return undefined;
      return d.replace(/-/g, '').replace(/\//g, '');
    };

    return fetchVietcapPriceHistory(ticker, {
      fromDate: formatToCompact(options.fromDate),
      toDate: formatToCompact(options.toDate),
      size: options.countBack,
    });
  }
}

export const vietcapProvider = new VietcapProvider();
