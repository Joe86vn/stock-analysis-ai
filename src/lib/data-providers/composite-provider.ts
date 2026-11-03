/**
 * Composite Fallback Data Provider
 * 
 * Bộ điều phối dữ liệu đa nguồn (Multi-Source Controller):
 * - Hỗ trợ chọn đích danh nguồn ('vietcap' | 'mas')
 * - Chế độ 'auto' (Dự phòng thông minh): Thử nguồn chính trước (Vietcap), nếu gặp lỗi (403, 404, Timeout)
 *   sẽ tự động chuyển sang nguồn phụ (MASVN) ngay lập tức, trả kèm cờ `isFallback: true`.
 */

import {
  MarketDataSource,
  FinancialFetchOptions,
  PriceFetchOptions,
  ProviderResult,
} from './types';
import { ParsedVietcapQuarter, VietcapPriceHistoryItem } from '@/lib/vietcap-field-mapping';
import { vietcapProvider } from './vietcap-provider';
import { masDataProvider } from './mas-provider';

export class CompositeDataProvider {
  private defaultSource: MarketDataSource = 'auto';
  private timeoutMs = 4000; // 4 giây timeout trước khi kích hoạt fallback

  constructor() {
    const envDefault = process.env.DEFAULT_DATA_SOURCE?.toLowerCase();
    if (envDefault === 'mas' || envDefault === 'vietcap' || envDefault === 'auto') {
      this.defaultSource = envDefault as MarketDataSource;
    }
  }

  /**
   * Helper chạy một promise có giới hạn timeout
   */
  private async withTimeout<T>(promise: Promise<T>, ms: number, timeoutMsg: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(timeoutMsg)), ms);
      promise
        .then(res => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /**
   * Lấy BCTC kèm thông tin chi tiết nguồn phục vụ (metadata)
   */
  public async getFinancials(
    ticker: string,
    options: FinancialFetchOptions & { source?: MarketDataSource } = {}
  ): Promise<ProviderResult<ParsedVietcapQuarter[]>> {
    const cleanTicker = ticker.trim().toUpperCase();
    const targetSource = options.source || this.defaultSource;
    const startTime = Date.now();

    // 1. Chỉ định nguồn MASVN
    if (targetSource === 'mas') {
      try {
        const data = await masDataProvider.getFinancials(cleanTicker, options);
        return {
          data,
          sourceUsed: 'MASVN',
          isFallback: false,
          latencyMs: Date.now() - startTime,
        };
      } catch (err: any) {
        console.error(`[CompositeProvider] Lỗi khi gọi MASVN cho mã ${cleanTicker}:`, err.message);
        throw err;
      }
    }

    // 2. Chỉ định nguồn Vietcap IQ
    if (targetSource === 'vietcap') {
      try {
        const data = await vietcapProvider.getFinancials(cleanTicker, options);
        return {
          data,
          sourceUsed: 'VIETCAP',
          isFallback: false,
          latencyMs: Date.now() - startTime,
        };
      } catch (err: any) {
        console.error(`[CompositeProvider] Lỗi khi gọi Vietcap cho mã ${cleanTicker}:`, err.message);
        throw err;
      }
    }

    // 3. Chế độ 'auto' (Dự phòng thông minh)
    try {
      // Ưu tiên gọi Vietcap IQ trước (với timeout 4s)
      const vietcapData = await this.withTimeout(
        vietcapProvider.getFinancials(cleanTicker, options),
        this.timeoutMs,
        `Vietcap timeout after ${this.timeoutMs}ms`
      );

      if (Array.isArray(vietcapData) && vietcapData.length > 0) {
        return {
          data: vietcapData,
          sourceUsed: 'VIETCAP',
          isFallback: false,
          latencyMs: Date.now() - startTime,
        };
      }

      throw new Error('Vietcap returned empty data');
    } catch (primaryErr: any) {
      console.warn(
        `⚡ [CompositeProvider] Nguồn chính Vietcap thất bại (${primaryErr.message}). Tự động kích hoạt dữ liệu dự phòng từ MASVN...`
      );

      try {
        const masData = await masDataProvider.getFinancials(cleanTicker, options);
        return {
          data: masData,
          sourceUsed: 'MASVN',
          isFallback: true,
          latencyMs: Date.now() - startTime,
        };
      } catch (fallbackErr: any) {
        console.error(`❌ [CompositeProvider] Cả hai nguồn Vietcap và MASVN đều thất bại:`, fallbackErr.message);
        throw new Error(`Không thể lấy dữ liệu BCTC từ cả Vietcap (${primaryErr.message}) và MASVN (${fallbackErr.message})`);
      }
    }
  }

  /**
   * Lấy Lịch sử giá EOD kèm thông tin chi tiết nguồn phục vụ
   */
  public async getPriceHistory(
    ticker: string,
    options: PriceFetchOptions & { source?: MarketDataSource } = {}
  ): Promise<ProviderResult<VietcapPriceHistoryItem[]>> {
    const cleanTicker = ticker.trim().toUpperCase();
    const targetSource = options.source || this.defaultSource;
    const startTime = Date.now();

    // 1. Chỉ định nguồn MASVN
    if (targetSource === 'mas') {
      try {
        const data = await masDataProvider.getPriceHistory(cleanTicker, options);
        return {
          data,
          sourceUsed: 'MASVN',
          isFallback: false,
          latencyMs: Date.now() - startTime,
        };
      } catch (err: any) {
        console.error(`[CompositeProvider] Lỗi giá EOD MASVN cho mã ${cleanTicker}:`, err.message);
        throw err;
      }
    }

    // 2. Chỉ định nguồn Vietcap
    if (targetSource === 'vietcap') {
      try {
        const data = await vietcapProvider.getPriceHistory(cleanTicker, options);
        return {
          data,
          sourceUsed: 'VIETCAP',
          isFallback: false,
          latencyMs: Date.now() - startTime,
        };
      } catch (err: any) {
        console.error(`[CompositeProvider] Lỗi giá EOD Vietcap cho mã ${cleanTicker}:`, err.message);
        throw err;
      }
    }

    // 3. Chế độ 'auto' (Dự phòng thông minh)
    try {
      const vietcapData = await this.withTimeout(
        vietcapProvider.getPriceHistory(cleanTicker, options),
        this.timeoutMs,
        `Vietcap price timeout after ${this.timeoutMs}ms`
      );

      if (Array.isArray(vietcapData) && vietcapData.length > 0) {
        return {
          data: vietcapData,
          sourceUsed: 'VIETCAP',
          isFallback: false,
          latencyMs: Date.now() - startTime,
        };
      }

      throw new Error('Vietcap returned empty price history');
    } catch (primaryErr: any) {
      console.warn(
        `⚡ [CompositeProvider] Nguồn giá Vietcap lỗi (${primaryErr.message}). Tự động kích hoạt dự phòng MASVN...`
      );

      try {
        const masData = await masDataProvider.getPriceHistory(cleanTicker, options);
        return {
          data: masData,
          sourceUsed: 'MASVN',
          isFallback: true,
          latencyMs: Date.now() - startTime,
        };
      } catch (fallbackErr: any) {
        console.error(`❌ [CompositeProvider] Cả hai nguồn giá đều lỗi:`, fallbackErr.message);
        throw new Error(`Không thể lấy lịch sử giá từ cả Vietcap (${primaryErr.message}) và MASVN (${fallbackErr.message})`);
      }
    }
  }
}

export const compositeDataProvider = new CompositeDataProvider();

