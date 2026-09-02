/**
 * Vietcap Screener Client (Tầng 1 - Sàng lọc toàn thị trường)
 * Kết nối trực tiếp với Vietcap IQ Screener Execution Engine (POST v1/screening/filter)
 */

export interface ScreenerFilterCriteria {
  exchanges?: ('HSX' | 'HNX' | 'UPCOM')[];
  rsMin?: number;           // Sức mạnh giá RS tối thiểu (ví dụ: 70, 80, 90)
  adtvMinBillion?: number;  // Thanh khoản GTGD 20 ngày tối thiểu (Tỷ VNĐ)
  epsGrowthMinYoY?: number; // Tăng trưởng EPS Q0 YoY tối thiểu (%)
  revenueGrowthMinYoY?: number; // Tăng trưởng Doanh thu tối thiểu (%)
  netProfitGrowthMinYoY?: number; // Tăng trưởng LNST tối thiểu (%)
  rsiMin?: number;          // RSI tối thiểu (ví dụ: 50)
  rsiMax?: number;          // RSI tối đa (ví dụ: 80)
  priceAboveEma?: 'ema20' | 'ema50' | 'ema200';
  icbCodeLv2?: string;      // Nhóm ngành ICB (ví dụ: '5300', '9500', '1700'...)
}

export interface VietcapScreenerMatchedStock {
  ticker: string;
  exchange: string;
  marketPrice: number;
  marketCap: number;
  adtv20Days: number; // Đơn vị VND
  adtv20Billion: number; // Đơn vị Tỷ VND
  rs1Month: number;
  stockStrength?: number;
  rsi?: number;
  ema20?: number;
  ema50?: number;
  companyNameVi: string;
  companyNameEn?: string;
  icbCodeLv2?: string;
  sectorVi?: string;
  sectorEn?: string;
}

export interface VietcapMetricCondition {
  name: string;
  category: string;
  conditionOptions: {
    type?: string;
    value?: string;
    from?: number;
    to?: number;
  }[];
  extraName?: string;
}

/**
 * Xây dựng payload mảng điều kiện lọc chuẩn của Vietcap IQ
 */
export function buildVietcapScreenerPayload(criteria: ScreenerFilterCriteria): VietcapMetricCondition[] {
  const payload: VietcapMetricCondition[] = [];

  // 1. Điều kiện Sàn giao dịch (Exchange)
  const exchanges = criteria.exchanges && criteria.exchanges.length > 0
    ? criteria.exchanges
    : ['HSX', 'HNX', 'UPCOM'];

  payload.push({
    name: 'exchange',
    category: 'general',
    conditionOptions: exchanges.map((ex) => ({
      type: 'value',
      value: ex.toLowerCase() === 'hsx' ? 'hsx' : ex.toLowerCase(),
    })),
  });

  // 2. Điều kiện Thanh khoản (ADTV 20 ngày)
  if (typeof criteria.adtvMinBillion === 'number' && criteria.adtvMinBillion > 0) {
    const minVnd = criteria.adtvMinBillion * 1_000_000_000;
    payload.push({
      name: 'adtv',
      category: 'general',
      conditionOptions: [
        {
          from: minVnd,
          to: 2_000_000_000_000, // 2000 Tỷ tối đa
        },
      ],
      extraName: '20Days',
    });
  }

  // 3. Điều kiện Sức mạnh giá (RS Rating)
  if (typeof criteria.rsMin === 'number' && criteria.rsMin > 0) {
    payload.push({
      name: 'rs',
      category: 'technical',
      conditionOptions: [
        {
          from: criteria.rsMin,
          to: 100,
        },
      ],
      extraName: '1Month',
    });
  }

  // 4. Điều kiện Tăng trưởng EPS
  if (typeof criteria.epsGrowthMinYoY === 'number' && criteria.epsGrowthMinYoY > 0) {
    payload.push({
      name: 'npatmiGrowth',
      category: 'growth',
      conditionOptions: [
        {
          from: criteria.epsGrowthMinYoY,
          to: 10000,
        },
      ],
      extraName: 'MRQ_YoY',
    });
  }

  // 5. Điều kiện Tăng trưởng Doanh thu
  if (typeof criteria.revenueGrowthMinYoY === 'number' && criteria.revenueGrowthMinYoY > 0) {
    payload.push({
      name: 'revenueGrowth',
      category: 'growth',
      conditionOptions: [
        {
          from: criteria.revenueGrowthMinYoY,
          to: 10000,
        },
      ],
      extraName: 'MRQ_YoY',
    });
  }

  // 6. Điều kiện RSI
  if (typeof criteria.rsiMin === 'number' || typeof criteria.rsiMax === 'number') {
    payload.push({
      name: 'rsi',
      category: 'technical',
      conditionOptions: [
        {
          from: criteria.rsiMin ?? 30,
          to: criteria.rsiMax ?? 100,
        },
      ],
      extraName: '',
    });
  }

  // 7. Điều kiện Giá nằm trên đường EMA
  if (criteria.priceAboveEma) {
    payload.push({
      name: 'priceEma',
      category: 'technical',
      conditionOptions: [
        {
          from: 0,
          to: 50,
        },
      ],
      extraName: criteria.priceAboveEma,
    });
  }

  return payload;
}

/**
 * Gọi API Vietcap IQ thực thi sàng lọc toàn thị trường
 */
export async function executeVietcapScreener(
  criteria: ScreenerFilterCriteria = {}
): Promise<VietcapScreenerMatchedStock[]> {
  const payload = buildVietcapScreenerPayload(criteria);
  const url = 'https://iq.vietcap.com.vn/api/iq-insight-service/v1/screening/filter';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.warn(`[Vietcap Screener] POST failed with status ${res.status}`);
      return [];
    }

    const json = await res.json();
    const dataList = Array.isArray(json?.data) ? json.data : [];

    return dataList.map((item: any) => {
      const adtvVnd = item.adtv20Days || item.accumulatedValue || 0;
      const adtvBillion = Math.round((adtvVnd / 1_000_000_000) * 10) / 10;
      let ex = (item.exchange || 'HSX').toUpperCase();
      if (ex === 'HOSE') ex = 'HSX';

      return {
        ticker: (item.ticker || '').trim().toUpperCase(),
        exchange: ex,
        marketPrice: item.marketPrice || item.refPrice || 0,
        marketCap: item.marketCap || 0,
        adtv20Days: adtvVnd,
        adtv20Billion: adtvBillion,
        rs1Month: typeof item.rs1Month === 'number' ? item.rs1Month : (item.stockStrength || 75),
        stockStrength: item.stockStrength,
        rsi: item.rsi,
        ema20: item.ema20,
        ema50: item.ema50,
        companyNameVi: item.viOrganName || `Công ty Cổ phần ${item.ticker}`,
        companyNameEn: item.enOrganName,
        icbCodeLv2: item.icbCodeLv2,
        sectorVi: item.viSector || 'Chung',
        sectorEn: item.enSector,
      };
    });
  } catch (error) {
    console.error('[Vietcap Screener] Execution error:', error);
    return [];
  }
}
