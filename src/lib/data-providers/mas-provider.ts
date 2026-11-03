/**
 * MAS Data Provider (Mirae Asset Securities MCP)
 * 
 * Ánh xạ dữ liệu từ MAS-MCP sang chuẩn dữ liệu chung của ValueX:
 * - ParsedVietcapQuarter (Báo cáo tài chính, Bảng cân đối, Chỉ số)
 * - VietcapPriceHistoryItem (Lịch sử giá EOD lên đến 26 năm)
 */

import fs from 'fs';
import path from 'path';
import { IDataProvider, FinancialFetchOptions, PriceFetchOptions } from './types';
import { ParsedVietcapQuarter, VietcapPriceHistoryItem } from '@/lib/vietcap-field-mapping';
import { masMcpClient } from '@/lib/mas-mcp-client';
import { getPriceHistoryFromR2, getFinancialsFromStorage } from '@/lib/r2-storage';

export class MasDataProvider implements IDataProvider {
  public readonly id = 'mas' as const;
  public readonly name = 'MASVN (Mirae Asset)';
  public readonly description = 'Nguồn dữ liệu chuyên sâu từ Chứng khoán Mirae Asset Việt Nam (26 năm EOD, 21 năm BCTC)';

  /**
   * Helper: Chuyển đổi định dạng ngày sang DD/MM/YYYY cho MAS-MCP
   */
  private formatDateForMas(d?: string): string {
    if (!d) return '';
    // Nếu là YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${y}`;
    }
    // Nếu là YYYYMMDD
    if (/^\d{8}$/.test(d)) {
      return `${d.substring(6, 8)}/${d.substring(4, 6)}/${d.substring(0, 4)}`;
    }
    return d; // Đã là DD/MM/YYYY
  }

  /**
   * Helper: Sinh danh sách kỳ quý (VD: ['Q3/2026', 'Q2/2026', 'Q1/2026', ...])
   */
  private generateQuarterPeriods(count: number = 12): string[] {
    const now = new Date();
    let currentYear = now.getFullYear();
    let currentQuarter = Math.floor(now.getMonth() / 3) + 1;

    const periods: string[] = [];
    for (let i = 0; i < count; i++) {
      periods.push(`Q${currentQuarter}/${currentYear}`);
      currentQuarter--;
      if (currentQuarter < 1) {
        currentQuarter = 4;
        currentYear--;
      }
    }
    return periods;
  }

  /**
   * Lấy lịch sử giá EOD - Tự động trượt cửa sổ 3 năm (Windowing) để lấy trọn vẹn dữ liệu
   */
  public async getPriceHistory(
    ticker: string,
    options: PriceFetchOptions = {}
  ): Promise<VietcapPriceHistoryItem[]> {
    const cleanTicker = ticker.trim().toUpperCase();

    // 0. Kiểm tra kho nến sâu đã cào sẵn trên đĩa (trả về tức thì < 5ms)
    try {
      const localDeepFile = path.resolve(process.cwd(), 'data', 'deep-history', `${cleanTicker}.json`);
      if (fs.existsSync(localDeepFile)) {
        const raw = fs.readFileSync(localDeepFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.priceHistory) && parsed.priceHistory.length > 0) {
          return options.countBack && options.countBack > 0
            ? parsed.priceHistory.slice(0, options.countBack)
            : parsed.priceHistory;
        }
      }
    } catch {}

    // 0.1 Kiểm tra kho Cloudflare R2 (cho môi trường VPS)
    try {
      const r2Data = await getPriceHistoryFromR2(cleanTicker, 7200);
      if (r2Data && Array.isArray(r2Data.history) && r2Data.history.length > 0) {
        const reversed = [...r2Data.history].reverse();
        const mapped: VietcapPriceHistoryItem[] = reversed.map(b => ({
          id: `${cleanTicker}_${(b.fullDate || '').replace(/-/g, '')}`,
          ticker: cleanTicker,
          tradingDate: b.fullDate,
          marketCap: 0,
          totalShares: 0,
          openPrice: b.openPrice,
          closePrice: b.closePrice,
          matchPrice: b.closePrice,
          highestPrice: b.highestPrice,
          lowestPrice: b.lowestPrice,
          averagePrice: (b.openPrice + b.closePrice) / 2,
          priceChange: 0,
          percentPriceChange: 0,
          totalMatchVolume: b.volume,
          totalMatchValue: 0,
          totalDealVolume: 0,
          totalDealValue: 0,
          totalVolume: b.volume,
          totalValue: 0,
          foreignBuyValueMatched: 0,
          foreignSellValueMatched: 0,
          foreignOwnedPercentage: 0,
        }));
        return options.countBack && options.countBack > 0
          ? mapped.slice(0, options.countBack)
          : mapped;
      }
    } catch {}

    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    // Mặc định lấy từ 28/07/2000 (ngày mở sàn đầu tiên của TTCK VN)
    const startDateStr = this.formatDateForMas(options.fromDate) || '28/07/2000';
    const endDateStr = this.formatDateForMas(options.toDate) || todayStr;

    // Phân tích năm bắt đầu và năm kết thúc
    const startYear = parseInt(startDateStr.split('/')[2] || '2000', 10);
    const endYear = parseInt(endDateStr.split('/')[2] || String(today.getFullYear()), 10);

    // Nếu khoảng thời gian > 3 năm, chia thành các cửa sổ 3 năm
    const windows: { start: string; end: string }[] = [];
    if (endYear - startYear > 3) {
      let curStartYear = startYear;
      while (curStartYear <= endYear) {
        const curEndYear = Math.min(curStartYear + 2, endYear);
        const wStart = curStartYear === startYear ? startDateStr : `01/01/${curStartYear}`;
        const wEnd = curEndYear === endYear ? endDateStr : `31/12/${curEndYear}`;
        windows.push({ start: wStart, end: wEnd });
        curStartYear += 3;
      }
    } else {
      windows.push({ start: startDateStr, end: endDateStr });
    }

    const allBarsMap = new Map<string, any>();

    // Chạy tuần tự qua các cửa sổ
    for (const w of windows) {
      try {
        const res = await masMcpClient.getPriceHistory(cleanTicker, w.start, w.end);
        const series = res?.data?.series?.[cleanTicker] || res?.series?.[cleanTicker];
        if (Array.isArray(series)) {
          for (const bar of series) {
            if (bar.d && !allBarsMap.has(bar.d)) {
              allBarsMap.set(bar.d, bar);
            }
          }
        }
      } catch (err: any) {
        console.warn(`[MasDataProvider] Lỗi lấy cửa sổ giá ${w.start} - ${w.end}:`, err.message);
      }
    }

    // Sắp xếp giảm dần theo ngày (mới nhất trước)
    const sortedDates = Array.from(allBarsMap.keys()).sort((a, b) => b.localeCompare(a));

    const result: VietcapPriceHistoryItem[] = sortedDates.map(dateStr => {
      const b = allBarsMap.get(dateStr);
      const open = b.o ?? 0;
      const high = b.h ?? open;
      const low = b.l ?? open;
      const close = b.c ?? open;
      const volume = b.v ?? 0;

      return {
        id: `${cleanTicker}_${dateStr.replace(/-/g, '')}`,
        ticker: cleanTicker,
        tradingDate: dateStr,
        marketCap: 0,
        totalShares: 0,
        openPrice: open,
        closePrice: close,
        matchPrice: close,
        highestPrice: high,
        lowestPrice: low,
        averagePrice: (open + close) / 2,
        priceChange: 0,
        percentPriceChange: 0,
        totalMatchVolume: volume,
        totalMatchValue: 0,
        totalDealVolume: 0,
        totalDealValue: 0,
        totalVolume: volume,
        totalValue: 0,
        foreignBuyValueMatched: 0,
        foreignSellValueMatched: 0,
        foreignOwnedPercentage: 0,
      };
    });

    if (options.countBack && options.countBack > 0) {
      return result.slice(0, options.countBack);
    }

    return result;
  }

  /**
   * Lấy Báo cáo tài chính & Chỉ số chuẩn hóa
   */
  public async getFinancials(
    ticker: string,
    options: FinancialFetchOptions = {}
  ): Promise<ParsedVietcapQuarter[]> {
    const cleanTicker = ticker.trim().toUpperCase();

    // 0. Kiểm tra kho BCTC sâu đã cào sẵn trên đĩa (trả về tức thì < 5ms)
    try {
      const localDeepFile = path.resolve(process.cwd(), 'data', 'deep-history', `${cleanTicker}.json`);
      if (fs.existsSync(localDeepFile)) {
        const raw = fs.readFileSync(localDeepFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.financials) && parsed.financials.length > 0) {
          return options.maxQuarters && options.maxQuarters > 0
            ? parsed.financials.slice(0, options.maxQuarters)
            : parsed.financials;
        }
      }
    } catch {}

    // 0.1 Kiểm tra kho Cloudflare R2 (cho môi trường VPS)
    try {
      const r2Financials = await getFinancialsFromStorage(cleanTicker, 7200);
      if (Array.isArray(r2Financials) && r2Financials.length > 0) {
        return options.maxQuarters && options.maxQuarters > 0
          ? r2Financials.slice(0, options.maxQuarters)
          : r2Financials;
      }
    } catch {}

    // Mặc định lấy tối đa 84 quý (~21 năm BCTC từ 2005 đến nay)
    const quarterCount = options.maxQuarters || 84;
    const periods = options.periods || this.generateQuarterPeriods(quarterCount);

    // Chia periods thành các chunk nhỏ (tối đa 8 kỳ / mẻ để không timeout)
    const chunkArray = <T>(arr: T[], size: number): T[][] => {
      const res: T[][] = [];
      for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
      return res;
    };

    const periodChunks = chunkArray(periods, 8);

    const rawIncomeItems: any[] = [];
    const rawBalanceItems: any[] = [];
    const rawCashFlowItems: any[] = [];
    const rawIndicatorItems: any[] = [];

    for (const chunk of periodChunks) {
      const [incRes, bsRes, cfRes, fiRes] = await Promise.allSettled([
        masMcpClient.getIncomeStatement(cleanTicker, chunk),
        masMcpClient.getBalanceSheet(cleanTicker, chunk),
        masMcpClient.getCashFlow(cleanTicker, chunk),
        masMcpClient.getFinancialIndicators(cleanTicker, chunk),
      ]);

      const extractItems = (settled: PromiseSettledResult<any>) => {
        if (settled.status !== 'fulfilled') return [];
        const val = settled.value;
        if (Array.isArray(val?.items)) return val.items;
        if (typeof val?.content === 'string') {
          try {
            const p = JSON.parse(val.content);
            return Array.isArray(p.items) ? p.items : [];
          } catch {
            return [];
          }
        }
        return [];
      };

      rawIncomeItems.push(...extractItems(incRes));
      rawBalanceItems.push(...extractItems(bsRes));
      rawCashFlowItems.push(...extractItems(cfRes));
      rawIndicatorItems.push(...extractItems(fiRes));
    }

    // Nhóm số liệu theo period
    const periodMap = new Map<string, {
      income: Map<string, number>;
      balance: Map<string, number>;
      cashflow: Map<string, number>;
      indicator: Map<string, number>;
    }>();

    const getPeriodRecord = (period: string) => {
      if (!periodMap.has(period)) {
        periodMap.set(period, {
          income: new Map(),
          balance: new Map(),
          cashflow: new Map(),
          indicator: new Map(),
        });
      }
      return periodMap.get(period)!;
    };

    // Chuẩn hóa tên chỉ tiêu (loại bỏ số thứ tự "1. ", khoảng trắng thừa, viết thường)
    const normalizeName = (n: string) => n.replace(/^\s*[A-Z0-9IVX]+\.\s*/i, '').trim().toLowerCase();

    for (const item of rawIncomeItems) {
      if (item.period && item.name) {
        getPeriodRecord(item.period).income.set(normalizeName(item.name), Number(item.value) || 0);
      }
    }
    for (const item of rawBalanceItems) {
      if (item.period && item.name) {
        getPeriodRecord(item.period).balance.set(normalizeName(item.name), Number(item.value) || 0);
      }
    }
    for (const item of rawCashFlowItems) {
      if (item.period && item.name) {
        getPeriodRecord(item.period).cashflow.set(normalizeName(item.name), Number(item.value) || 0);
      }
    }
    for (const item of rawIndicatorItems) {
      if (item.period && item.name) {
        getPeriodRecord(item.period).indicator.set(normalizeName(item.name), Number(item.value) || 0);
      }
    }

    // Helper tra cứu giá trị theo từ khóa (khớp substring)
    const findVal = (map: Map<string, number>, keywords: string[], toBillion: boolean = true): number => {
      for (const [key, val] of map.entries()) {
        for (const kw of keywords) {
          if (key.includes(kw.toLowerCase())) {
            return toBillion ? val / 1e9 : val;
          }
        }
      }
      return 0;
    };

    const quarters: ParsedVietcapQuarter[] = [];

    for (const period of periods) {
      const record = periodMap.get(period);
      if (!record || (record.income.size === 0 && record.balance.size === 0)) {
        continue;
      }

      // Tách year và quarter từ chuỗi 'Q2/2026' hoặc '2026'
      let year = 0;
      let quarter = 0;
      const qMatch = period.match(/Q([1-4])\/(\d{4})/i);
      if (qMatch) {
        quarter = parseInt(qMatch[1], 10);
        year = parseInt(qMatch[2], 10);
      } else {
        const yMatch = period.match(/(\d{4})/);
        year = yMatch ? parseInt(yMatch[1], 10) : 0;
      }

      const inc = record.income;
      const bs = record.balance;
      const cf = record.cashflow;
      const ind = record.indicator;

      // 1. KQKD (Tỷ VNĐ)
      const revenue = findVal(inc, ['doanh thu thuần', 'doanh thu bán hàng và cung cấp dịch vụ']);
      const cogs = findVal(inc, ['giá vốn hàng bán']);
      const grossProfit = findVal(inc, ['lợi nhuận gộp']);
      const financialIncome = findVal(inc, ['doanh thu hoạt động tài chính']);
      const financialExpenses = findVal(inc, ['chi phí tài chính']);
      const interestExpenses = findVal(inc, ['chi phí lãi vay']);
      const sellingExpenses = findVal(inc, ['chi phí bán hàng']);
      const adminExpenses = findVal(inc, ['chi phí quản lý doanh nghiệp']);
      const operatingProfit = findVal(inc, ['lợi nhuận thuần từ hoạt động kinh doanh']);
      const profitBeforeTax = findVal(inc, ['tổng lợi nhuận kế toán trước thuế', 'lợi nhuận trước thuế']);
      const netProfit = findVal(inc, ['lợi nhuận sau thuế của cổ đông công ty mẹ', 'lợi nhuận sau thuế']);
      const totalTax = findVal(inc, ['chi phí thuế tndn']);

      // 2. Cân đối kế toán (Tỷ VNĐ)
      const totalAssets = findVal(bs, ['tổng cộng tài sản', 'tổng tài sản']);
      const currentAssets = findVal(bs, ['tài sản ngắn hạn']);
      const cash = findVal(bs, ['tiền và các khoản tương đương tiền']);
      const shortInvest = findVal(bs, ['đầu tư tài chính ngắn hạn']);
      const receivables = findVal(bs, ['các khoản phải thu ngắn hạn']);
      const inventories = findVal(bs, ['hàng tồn kho']);
      const nonCurrentAssets = findVal(bs, ['tài sản dài hạn']);
      const fixedAssets = findVal(bs, ['tài sản cố định']);
      const construction = findVal(bs, ['chi phí xây dựng cơ bản dở dang']);
      const totalLiabilities = findVal(bs, ['nợ phải trả']);
      const currentLiabilities = findVal(bs, ['nợ ngắn hạn']);
      const nonCurrentLiabilities = findVal(bs, ['nợ dài hạn']);
      const shortLoans = findVal(bs, ['vay và nợ thuê tài chính ngắn hạn']);
      const longLoans = findVal(bs, ['vay và nợ thuê tài chính dài hạn']);
      const ownerEquity = findVal(bs, ['vốn chủ sở hữu']);
      const charterCapital = findVal(bs, ['vốn góp của chủ sở hữu', 'vốn điều lệ']);
      const retainedEarnings = findVal(bs, ['lợi nhuận sau thuế chưa phân phối']);

      // 3. Lưu chuyển tiền tệ (Tỷ VNĐ)
      const cfo = findVal(cf, ['lưu chuyển tiền thuần từ hoạt động kinh doanh']);
      const cfi = findVal(cf, ['lưu chuyển tiền thuần từ hoạt động đầu tư']);
      const capex = Math.abs(findVal(cf, ['mua sắm, xây dựng tscđ']));
      const cff = findVal(cf, ['lưu chuyển tiền thuần từ hoạt động tài chính']);
      const cashEnd = findVal(cf, ['tiền và tương đương tiền cuối kỳ']);

      // 4. Chỉ số tài chính
      const eps = findVal(ind, ['eps'], false);
      const pe = findVal(ind, ['p/e'], false);
      const pb = findVal(ind, ['p/b'], false);
      const roe = findVal(ind, ['roe'], false);
      const roa = findVal(ind, ['roa'], false);
      const grossMargin = findVal(ind, ['biên lợi nhuận gộp'], false) || (revenue > 0 ? (grossProfit / revenue) * 100 : 0);
      const netMargin = findVal(ind, ['biên lợi nhuận ròng'], false) || (revenue > 0 ? (netProfit / revenue) * 100 : 0);
      const debtToEquity = findVal(ind, ['d/e'], false) || (ownerEquity > 0 ? (totalLiabilities / ownerEquity) * 100 : 0);
      const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;

      quarters.push({
        period,
        year,
        quarter,

        // 1. Chỉ số thị trường
        sharesOutstandingMillions: charterCapital > 0 ? charterCapital * 100 : 0,
        marketCapBillion: 0,
        eps,
        bvps: ownerEquity > 0 && charterCapital > 0 ? (ownerEquity * 1e9) / (charterCapital * 100 * 1e6) : 0,
        pe,
        pb,
        ps: 0,
        evEbitda: 0,
        priceToCashFlow: 0,
        dividendYield: 0,

        // 2. KQKD (Tỷ VNĐ)
        revenue,
        grossRevenue: revenue,
        revenueDeductions: 0,
        costOfGoodsSold: cogs,
        grossProfit,
        operatingProfit,
        profitBeforeTax,
        netProfit,
        consolidatedNetProfit: netProfit,
        nonControllingInterests: 0,
        financialIncome,
        financialExpenses,
        interestExpenses,
        sellingExpenses,
        adminExpenses,
        otherProfit: 0,
        totalTax,

        // 3. CĐKT (Tỷ VNĐ)
        totalAssets,
        currentAssets,
        cashAndEquivalents: cash,
        shortTermInvestments: shortInvest,
        receivables,
        tradeReceivables: receivables,
        inventories,
        nonCurrentAssets,
        fixedAssets,
        tangibleFixedAssets: fixedAssets,
        constructionInProgress: construction,
        longTermInvestments: 0,
        totalLiabilities,
        currentLiabilities,
        tradePayables: 0,
        customerAdvances: 0,
        nonCurrentLiabilities,
        shortTermLoans: shortLoans,
        longTermLoans: longLoans,
        totalDebt: shortLoans + longLoans,
        ownerEquity,
        charterCapital,
        retainedEarnings,

        // 4. LCTT (Tỷ VNĐ)
        netOperatingCashFlow: cfo,
        cfo,
        netInvestingCashFlow: cfi,
        capex,
        netFinancingCashFlow: cff,
        dividendsPaid: 0,
        netCashFlowPeriod: cfo + cfi + cff,
        cashAtEndOfPeriod: cashEnd,

        // 5. Ratios
        grossMargin,
        ebitMargin: revenue > 0 ? (operatingProfit / revenue) * 100 : 0,
        preTaxMargin: revenue > 0 ? (profitBeforeTax / revenue) * 100 : 0,
        netMargin,
        roe,
        roa,
        roic: 0,
        assetTurnover: totalAssets > 0 ? revenue / totalAssets : 0,
        fixedAssetTurnover: fixedAssets > 0 ? revenue / fixedAssets : 0,
        receivableDays: 0,
        inventoryDays: 0,
        payableDays: 0,
        cashCycle: 0,
        debtToEquity,
        netDebtToEquity: 0,
        financialLeverage: ownerEquity > 0 ? totalAssets / ownerEquity : 0,
        currentRatio,
        quickRatio: currentLiabilities > 0 ? (currentAssets - inventories) / currentLiabilities : 0,
        cashRatio: currentLiabilities > 0 ? cash / currentLiabilities : 0,
        ebitBillion: operatingProfit,
        ebitdaBillion: operatingProfit + (fixedAssets * 0.05), // Ước tính khấu hao 5% TSCĐ nếu không có bóc tách
      });
    }

    return quarters;
  }
}

export const masDataProvider = new MasDataProvider();
