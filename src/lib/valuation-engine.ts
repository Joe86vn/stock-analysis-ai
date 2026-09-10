import {
  ValuationMethod,
  ValuationRole,
  ValuationMethodConfig,
  ValuationScenario,
  ValuationHubState,
  PeerData,
} from '@/types/analysis';
import { calculateDCFFairValue } from './dcf-engine';

/**
 * 7 Nhóm ngành chính của ValueX Framework
 */
export type ValueXSector =
  | 'TIÊU DÙNG_BÁN LẺ'
  | 'CÔNG NGHIỆP_SẢN XUẤT'
  | 'TÀI NGUYÊN_CHU KỲ'
  | 'BẤT ĐỘNG SẢN'
  | 'TẬP ĐOÀN ĐA NGÀNH'
  | 'NGÂN HÀNG_TÀI CHÍNH'
  | 'TIỆN ÍCH_HẠ TẦNG';

export interface SectorPreset {
  label: string;
  description: string;
  defaultMethods: {
    method: ValuationMethod;
    name: string;
    role: ValuationRole;
    weight: number;
    defaultTargetBase: number;
  }[];
}

export const SECTOR_PRESETS: Record<ValueXSector, SectorPreset> = {
  'TIÊU DÙNG_BÁN LẺ': {
    label: 'Tiêu Dùng / Bán Lẻ / Sản Xuất Ổn Định',
    description: 'Dòng tiền ổn định, ưu tiên P/E kết hợp kiểm tra chéo bằng EV/EBITDA',
    defaultMethods: [
      { method: 'P_E', name: 'P/E', role: 'MAIN_1', weight: 50, defaultTargetBase: 14.0 },
      { method: 'EV_EBITDA', name: 'EV/EBITDA', role: 'CROSS_CHECK', weight: 50, defaultTargetBase: 9.0 },
      { method: 'P_B', name: 'P/B', role: 'DISABLED', weight: 0, defaultTargetBase: 2.0 },
      { method: 'DCF', name: 'DCF', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
      { method: 'RNAV', name: 'RNAV', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
      { method: 'SOTP', name: 'SOTP', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
    ],
  },
  'CÔNG NGHIỆP_SẢN XUẤT': {
    label: 'Công Nghiệp / Sản Xuất / Logistics',
    description: 'Đầu tư tài sản cố định lớn, ưu tiên EV/EBITDA loại trừ đòn bẩy và khấu hao',
    defaultMethods: [
      { method: 'EV_EBITDA', name: 'EV/EBITDA', role: 'MAIN_1', weight: 40, defaultTargetBase: 8.0 },
      { method: 'P_E', name: 'P/E', role: 'MAIN_2', weight: 40, defaultTargetBase: 12.0 },
      { method: 'DCF', name: 'DCF', role: 'CROSS_CHECK', weight: 20, defaultTargetBase: 0 },
      { method: 'P_B', name: 'P/B', role: 'DISABLED', weight: 0, defaultTargetBase: 1.5 },
      { method: 'RNAV', name: 'RNAV', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
      { method: 'SOTP', name: 'SOTP', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
    ],
  },
  'TÀI NGUYÊN_CHU KỲ': {
    label: 'Tài Nguyên / Thép / Hóa Chất / Chu Kỳ',
    description: 'Biến động mạnh theo chu kỳ hàng hóa, định giá EV/EBITDA giữa chu kỳ',
    defaultMethods: [
      { method: 'EV_EBITDA', name: 'EV/EBITDA', role: 'MAIN_1', weight: 50, defaultTargetBase: 7.5 },
      { method: 'P_B', name: 'P/B (Tài sản ròng)', role: 'MAIN_2', weight: 30, defaultTargetBase: 1.4 },
      { method: 'P_E', name: 'P/E Chu Kỳ', role: 'CROSS_CHECK', weight: 20, defaultTargetBase: 10.0 },
      { method: 'DCF', name: 'DCF', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
      { method: 'RNAV', name: 'RNAV', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
      { method: 'SOTP', name: 'SOTP', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
    ],
  },
  'BẤT ĐỘNG SẢN': {
    label: 'Bất Động Sản Dân Dụng / KCN',
    description: 'Giá trị nằm ở quỹ đất và tiến độ bàn giao, ưu tiên RNAV chiết khấu dòng tiền dự án',
    defaultMethods: [
      { method: 'RNAV', name: 'RNAV Quỹ Đất', role: 'MAIN_1', weight: 60, defaultTargetBase: 1.0 },
      { method: 'P_B', name: 'P/B', role: 'MAIN_2', weight: 20, defaultTargetBase: 1.6 },
      { method: 'P_E', name: 'P/E Từng Dự Án', role: 'CROSS_CHECK', weight: 20, defaultTargetBase: 11.0 },
      { method: 'EV_EBITDA', name: 'EV/EBITDA', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
      { method: 'DCF', name: 'DCF', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
      { method: 'SOTP', name: 'SOTP', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
    ],
  },
  'TẬP ĐOÀN ĐA NGÀNH': {
    label: 'Tập Đoàn Đa Ngành (Conglomerate)',
    description: 'Nhiều mảng kinh doanh khác biệt, bắt buộc phân tách SOTP từng mảng',
    defaultMethods: [
      { method: 'SOTP', name: 'SOTP (Tổng Từng Phần)', role: 'MAIN_1', weight: 80, defaultTargetBase: 1.0 },
      { method: 'P_E', name: 'P/E Tham Chiếu', role: 'CROSS_CHECK', weight: 20, defaultTargetBase: 13.0 },
      { method: 'EV_EBITDA', name: 'EV/EBITDA', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
      { method: 'P_B', name: 'P/B', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
      { method: 'DCF', name: 'DCF', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
      { method: 'RNAV', name: 'RNAV', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
    ],
  },
  'NGÂN HÀNG_TÀI CHÍNH': {
    label: 'Ngân Hàng / Chứng Khoán / Tài Chính',
    description: 'Bảng cân đối là sản phẩm cốt lõi, không có EBITDA. Bắt buộc P/B neo theo ROE ÷ CoE',
    defaultMethods: [
      { method: 'P_B', name: 'P/B (Neo ROE/CoE)', role: 'MAIN_1', weight: 60, defaultTargetBase: 1.6 },
      { method: 'P_E', name: 'P/E', role: 'MAIN_2', weight: 40, defaultTargetBase: 9.5 },
      { method: 'EV_EBITDA', name: 'EV/EBITDA', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
      { method: 'DCF', name: 'DCF', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
      { method: 'RNAV', name: 'RNAV', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
      { method: 'SOTP', name: 'SOTP', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
    ],
  },
  'TIỆN ÍCH_HẠ TẦNG': {
    label: 'Tiện Ích / Năng Lượng / Hạ Tầng / Cảng Biển',
    description: 'Hợp đồng dài hạn PPA/BOT, dòng tiền dự báo chính xác cao, ưu tiên DCF',
    defaultMethods: [
      { method: 'DCF', name: 'DCF (Dòng Tiền Chiết Khấu)', role: 'MAIN_1', weight: 50, defaultTargetBase: 0 },
      { method: 'EV_EBITDA', name: 'EV/EBITDA', role: 'MAIN_2', weight: 30, defaultTargetBase: 8.5 },
      { method: 'P_E', name: 'P/E', role: 'CROSS_CHECK', weight: 20, defaultTargetBase: 12.0 },
      { method: 'P_B', name: 'P/B', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
      { method: 'RNAV', name: 'RNAV', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
      { method: 'SOTP', name: 'SOTP', role: 'DISABLED', weight: 0, defaultTargetBase: 0 },
    ],
  },
};

/**
 * Ánh xạ từ ICB code hoặc text sector sang ValueXSector
 */
export function detectValueXSector(icbCode?: string, sectorName?: string): ValueXSector {
  const code = (icbCode || '').trim();
  const name = (sectorName || '').toLowerCase();

  // 1. Kiểm tra theo mã ICB (hỗ trợ cả cấp 2 và cấp 4 qua 2 số đầu)
  if (code.startsWith('83') || code.startsWith('87') || code.startsWith('85') || code === '8300' || code === '8700' || code === '8500') {
    return 'NGÂN HÀNG_TÀI CHÍNH';
  }
  if (code.startsWith('86') || code === '8600') {
    return 'BẤT ĐỘNG SẢN';
  }
  if (code.startsWith('17') || code.startsWith('13') || code === '1700' || code === '1300') {
    return 'TÀI NGUYÊN_CHU KỲ';
  }
  if (code.startsWith('75') || code.startsWith('05') || code === '7500' || code === '0500') {
    return 'TIỆN ÍCH_HẠ TẦNG';
  }
  if (
    code.startsWith('53') ||
    code.startsWith('35') ||
    code.startsWith('37') ||
    code.startsWith('33') ||
    code === '5300' ||
    code === '3500' ||
    code === '3700' ||
    code === '3300'
  ) {
    return 'TIÊU DÙNG_BÁN LẺ';
  }
  if (code.startsWith('27') || code.startsWith('23') || code === '2700' || code === '2300' || code.startsWith('95')) {
    return 'CÔNG NGHIỆP_SẢN XUẤT';
  }

  // 2. Kiểm tra theo tên ngành / sectorType
  if (name.includes('ngân hàng') || name.includes('tài chính') || name.includes('chứng khoán') || name === 'finance') {
    return 'NGÂN HÀNG_TÀI CHÍNH';
  }
  if (name.includes('bất động sản') || name.includes('địa ốc') || name.includes('real estate')) {
    return 'BẤT ĐỘNG SẢN';
  }
  if (name.includes('thép') || name.includes('tài nguyên') || name.includes('hóa chất') || name.includes('khoáng sản')) {
    return 'TÀI NGUYÊN_CHU KỲ';
  }
  if (name.includes('điện') || name.includes('nước') || name.includes('tiện ích') || name.includes('năng lượng') || name.includes('cảng') || name === 'energy' || name === 'logistics_port') {
    return 'TIỆN ÍCH_HẠ TẦNG';
  }
  if (name.includes('bán lẻ') || name.includes('tiêu dùng') || name.includes('thực phẩm') || name === 'retail' || name === 'consumer_goods') {
    return 'TIÊU DÙNG_BÁN LẺ';
  }
  if (name.includes('tập đoàn') || name.includes('đa ngành')) {
    return 'TẬP ĐOÀN ĐA NGÀNH';
  }

  // Mặc định cho Công nghiệp, Sản xuất, Công nghệ
  return 'CÔNG NGHIỆP_SẢN XUẤT';
}

/**
 * Tính toán mốc Multiple mục tiêu cho 3 kịch bản dựa trên phân phối lịch sử và điều chỉnh Growth Quality
 */
export function computeTargetMultiples(params: {
  median: number;
  std: number;
  growthTier?: string; // 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D'
  peerMax?: number | null;
  customAdjustment?: number;
}): { bear: number; base: number; bull: number } {
  const { median, std, growthTier = 'B+', peerMax, customAdjustment = 0 } = params;

  if (median <= 0) {
    return { bear: 8, base: 12, bull: 16 };
  }

  // 1. Điều chỉnh Base theo Growth Quality Tier (Tab D)
  let tierAdjustment = 0;
  switch (growthTier) {
    case 'A+':
      tierAdjustment = 0.75 * std;
      break;
    case 'A':
      tierAdjustment = 0.25 * std;
      break;
    case 'B+':
      tierAdjustment = 0;
      break;
    case 'B':
      tierAdjustment = -0.25 * std;
      break;
    case 'C':
      tierAdjustment = -0.75 * std;
      break;
    case 'D':
      tierAdjustment = -1.0 * std;
      break;
  }

  const baseMultiple = Math.max(0.5, Number((median + tierAdjustment + customAdjustment).toFixed(2)));

  // 2. Kịch bản Thận trọng (Bear) = μ - 1σ
  const bearMultiple = Math.max(0.1, Number((median - std).toFixed(2)));

  // 3. Kịch bản Tích cực (Bull) = μ + 1σ, nhưng bị chặn trần bởi peer max nếu có
  let bullMultiple = Number((median + std).toFixed(2));
  if (peerMax && peerMax > 0 && bullMultiple > peerMax) {
    bullMultiple = Number(peerMax.toFixed(2));
  }
  bullMultiple = Math.max(baseMultiple, bullMultiple);

  return {
    bear: bearMultiple,
    base: baseMultiple,
    bull: bullMultiple,
  };
}

/**
 * Tính toán Giá trị Hợp lý cho từng phương pháp trong 3 kịch bản
 */
export function computeMethodFairValue(
  config: ValuationMethodConfig,
  inputs: {
    epsForward: number;
    ebitdaForward: number;
    netDebt: number;
    sharesOutstanding: number;
    bvpsForward: number;
    currentPrice: number;
    cfoForward?: number;
    capexForward?: number;
    netProfitForward?: number;
    revenueGrowthForecast?: number;
  }
): { bear: number; base: number; bull: number } {
  const { method, targetBear, targetBase, targetBull } = config;
  const {
    epsForward = 0,
    ebitdaForward = 0,
    netDebt = 0,
    sharesOutstanding = 1,
    bvpsForward = 0,
    currentPrice = 0,
  } = inputs;

  const shares = sharesOutstanding > 0 ? sharesOutstanding : 1;

  switch (method) {
    case 'P_E': {
      // Bear: EPS giảm 15% (hoặc giả định thận trọng)
      const epsBear = Math.max(0, epsForward * 0.85);
      const epsBase = Math.max(0, epsForward);
      // Bull: EPS tăng 15%
      const epsBull = Math.max(0, epsForward * 1.15);

      return {
        bear: Math.round(epsBear * targetBear),
        base: Math.round(epsBase * targetBase),
        bull: Math.round(epsBull * targetBull),
      };
    }

    case 'EV_EBITDA': {
      // Công thức: EV = EBITDA * Target
      // Equity Value = EV - Nợ ròng (NetDebt)
      // Giá/cp = (Equity Value / Shares) * 1000 (đổi tỷ VND sang VND/cp)
      const ebitdaBear = Math.max(0, ebitdaForward * 0.85);
      const ebitdaBase = Math.max(0, ebitdaForward);
      const ebitdaBull = Math.max(0, ebitdaForward * 1.15);

      const calcPrice = (ebitda: number, target: number) => {
        const ev = ebitda * target;
        const equity = ev - netDebt;
        return Math.max(0, Math.round((equity / shares) * 1000));
      };

      return {
        bear: calcPrice(ebitdaBear, targetBear),
        base: calcPrice(ebitdaBase, targetBase),
        bull: calcPrice(ebitdaBull, targetBull),
      };
    }

    case 'P_B': {
      const bvps = bvpsForward > 0 ? bvpsForward : currentPrice > 0 ? currentPrice / 1.5 : 20000;
      return {
        bear: Math.round(bvps * 0.95 * targetBear),
        base: Math.round(bvps * targetBase),
        bull: Math.round(bvps * 1.05 * targetBull),
      };
    }

    case 'DCF': {
      // Nếu người dùng đã chọn một ô cụ thể trong ma trận hoặc nhập tay Base (> 500 đ)
      if (config.fairValueBase > 500) {
        return {
          bear:
            config.fairValueBear > 0 && config.fairValueBear !== config.fairValueBase
              ? config.fairValueBear
              : Math.round(config.fairValueBase * 0.81),
          base: config.fairValueBase,
          bull:
            config.fairValueBull > 0 && config.fairValueBull !== config.fairValueBase
              ? config.fairValueBull
              : Math.round(config.fairValueBase * 1.26),
        };
      }

      // Ngược lại, tính toán tự động chuẩn xác từ Động cơ FCFF/DCF
      const np = inputs.netProfitForward || Math.round((epsForward * shares) / 1000);
      const cfo = inputs.cfoForward || Math.round(np * 0.8);
      const capex = inputs.capexForward || Math.max(50, Math.round(cfo * 0.22));

      const dcfRes = calculateDCFFairValue({
        cfoForward: cfo,
        capexForward: capex,
        netProfitForward: np,
        netDebt,
        sharesOutstanding: shares,
        currentPrice,
        revenueGrowthForecast: inputs.revenueGrowthForecast || 12,
        wacc: 12.0,
        terminalGrowth: 4.0,
      });

      const bearVal = dcfRes.sensitivityMatrix[2]?.columns[0]?.fairValue || Math.round(dcfRes.fairValuePerShare * 0.81);
      const bullVal = dcfRes.sensitivityMatrix[0]?.columns[2]?.fairValue || Math.round(dcfRes.fairValuePerShare * 1.26);

      return {
        bear: bearVal,
        base: dcfRes.fairValuePerShare,
        bull: bullVal,
      };
    }

    case 'RNAV':
    case 'SOTP': {
      const baseNavPrice =
        config.fairValueBase > 0
          ? config.fairValueBase
          : config.targetBase > 500
          ? config.targetBase
          : currentPrice > 0
          ? currentPrice
          : 30000;
      return {
        bear: Math.round(baseNavPrice * (config.targetBear > 0 && config.targetBear < 5 ? config.targetBear : 0.85)),
        base: Math.round(baseNavPrice * (config.targetBase > 0 && config.targetBase < 5 ? config.targetBase : 1.2)),
        bull: Math.round(baseNavPrice * (config.targetBull > 0 && config.targetBull < 5 ? config.targetBull : 1.5)),
      };
    }

    default:
      return { bear: 0, base: 0, bull: 0 };
  }
}

/**
 * Tự động tính toán và điền hệ số mục tiêu cho các phương pháp định giá
 * dựa trên 20 quý lịch sử thực tế, Top Peers và Hạng Tăng Trưởng (Tab D).
 */
export function applyAutoMultiplesToMethods(
  methods: ValuationMethodConfig[],
  params: {
    historicalStats?: any;
    growthTier?: string;
    peerMedians?: any;
    currentPrice?: number;
    cfoForward?: number;
    capexForward?: number;
    netProfitForward?: number;
    netDebt?: number;
    sharesOutstanding?: number;
  }
): ValuationMethodConfig[] {
  const { historicalStats, growthTier = 'B+', peerMedians, currentPrice = 0 } = params;

  return methods.map((m) => {
    let targetBear = m.targetBear;
    let targetBase = m.targetBase;
    let targetBull = m.targetBull;
    let fairValueBear = m.fairValueBear;
    let fairValueBase = m.fairValueBase;
    let fairValueBull = m.fairValueBull;

    if (m.method === 'P_E' && historicalStats?.peMedian) {
      const calc = computeTargetMultiples({
        median: historicalStats.peMedian,
        std: historicalStats.peStd || 2.0,
        growthTier,
        peerMax: peerMedians?.maxPe,
      });
      targetBear = calc.bear;
      targetBase = calc.base;
      targetBull = calc.bull;
    } else if (m.method === 'P_B' && historicalStats?.pbMedian) {
      const calc = computeTargetMultiples({
        median: historicalStats.pbMedian,
        std: historicalStats.pbStd || 0.3,
        growthTier,
      });
      targetBear = calc.bear;
      targetBase = calc.base;
      targetBull = calc.bull;
    } else if (m.method === 'EV_EBITDA') {
      const baseMedian =
        peerMedians?.evEbitda && peerMedians.evEbitda > 0
          ? peerMedians.evEbitda
          : targetBase > 0
          ? targetBase
          : 8.5;

      // Điều chỉnh theo Hạng tăng trưởng Tab D:
      let mult = 1.0;
      if (growthTier === 'A+') mult = 1.15;
      else if (growthTier === 'A') mult = 1.075;
      else if (growthTier === 'B') mult = 0.925;
      else if (growthTier === 'C') mult = 0.85;
      else if (growthTier === 'D') mult = 0.75;

      targetBase = Number((baseMedian * mult).toFixed(1));
      targetBear = Number((targetBase * 0.82).toFixed(1));
      targetBull = Number((targetBase * 1.22).toFixed(1));
    } else if (m.method === 'DCF') {
      const cfo = params.cfoForward || (params.netProfitForward ? Math.round(params.netProfitForward * 0.8) : (currentPrice > 0 ? Math.round((currentPrice * 0.08 * (params.sharesOutstanding || 100)) / 1000) : 500));
      const capex = params.capexForward || Math.max(50, Math.round(cfo * 0.22));
      const np = params.netProfitForward || cfo;
      const dcfRes = calculateDCFFairValue({
        cfoForward: cfo,
        capexForward: capex,
        netProfitForward: np,
        netDebt: params.netDebt || 0,
        sharesOutstanding: params.sharesOutstanding || 100,
        currentPrice,
        revenueGrowthForecast: 12,
        wacc: 12.0,
        terminalGrowth: 4.0,
      });

      if (!fairValueBase || fairValueBase <= 500) {
        fairValueBase = dcfRes.fairValuePerShare;
        fairValueBear = dcfRes.sensitivityMatrix[2]?.columns[0]?.fairValue || Math.round(fairValueBase * 0.81);
        fairValueBull = dcfRes.sensitivityMatrix[0]?.columns[2]?.fairValue || Math.round(fairValueBase * 1.26);
        targetBase = fairValueBase;
      }
    }

    return {
      ...m,
      targetBear,
      targetBase,
      targetBull,
      fairValueBear,
      fairValueBase,
      fairValueBull,
    };
  });
}

/**
 * Tổng hợp 3 Kịch bản định giá từ các phương pháp có trọng số
 */
export function aggregateScenarios(
  methods: ValuationMethodConfig[],
  currentPrice: number,
  probabilities: { bear: number; base: number; bull: number } = { bear: 20, base: 55, bull: 25 }
): {
  bear: ValuationScenario;
  base: ValuationScenario;
  bull: ValuationScenario;
  rrRatio: number;
  dispersion: number;
  expectedValue: number;
} {
  const activeMethods = methods.filter((m) => m.role !== 'DISABLED' && m.weight > 0);

  if (activeMethods.length === 0) {
    const defaultVal = currentPrice > 0 ? currentPrice : 10000;
    return {
      bear: { name: 'THẬN TRỌNG', fairValue: defaultVal * 0.8, updownPct: -20, probability: 20, narrative: '' },
      base: { name: 'CƠ SỞ', fairValue: defaultVal, updownPct: 0, probability: 55, narrative: '' },
      bull: { name: 'TÍCH CỰC', fairValue: defaultVal * 1.3, updownPct: 30, probability: 25, narrative: '' },
      rrRatio: 0,
      dispersion: 0,
      expectedValue: 0,
    };
  }

  const totalWeight = activeMethods.reduce((sum, m) => sum + m.weight, 0);
  const normalizedWeights = activeMethods.map((m) => ({
    ...m,
    normWeight: totalWeight > 0 ? m.weight / totalWeight : 1 / activeMethods.length,
  }));

  // Tính giá trị hợp lý bình quân có trọng số
  const fairValueBear = Math.round(
    normalizedWeights.reduce((sum, m) => sum + m.fairValueBear * m.normWeight, 0)
  );
  const fairValueBase = Math.round(
    normalizedWeights.reduce((sum, m) => sum + m.fairValueBase * m.normWeight, 0)
  );
  const fairValueBull = Math.round(
    normalizedWeights.reduce((sum, m) => sum + m.fairValueBull * m.normWeight, 0)
  );

  const p = currentPrice > 0 ? currentPrice : fairValueBase;

  const updownBear = Number((((fairValueBear - p) / p) * 100).toFixed(1));
  const updownBase = Number((((fairValueBase - p) / p) * 100).toFixed(1));
  const updownBull = Number((((fairValueBull - p) / p) * 100).toFixed(1));

  // Tính Risk/Reward Ratio
  const upside = Math.max(0, fairValueBase - p);
  const downside = Math.max(0, p - fairValueBear);
  const rrRatio =
    downside === 0
      ? 99.0
      : Number((upside / downside).toFixed(2));

  // Tính Độ phân tán giữa các phương pháp
  const basePrices = activeMethods.map((m) => m.fairValueBase);
  const minBase = Math.min(...basePrices);
  const maxBase = Math.max(...basePrices);
  const dispersion =
    fairValueBase > 0
      ? Number((((maxBase - minBase) / fairValueBase) * 100).toFixed(1))
      : 0;

  // Tính Lợi Kỳ Vọng (Expected Value Return)
  const probSum = (probabilities.bear + probabilities.base + probabilities.bull) || 100;
  const pBear = probabilities.bear / probSum;
  const pBase = probabilities.base / probSum;
  const pBull = probabilities.bull / probSum;

  const expectedValue = Number(
    (pBear * updownBear + pBase * updownBase + pBull * updownBull).toFixed(1)
  );

  return {
    bear: {
      name: 'THẬN TRỌNG',
      fairValue: fairValueBear,
      updownPct: updownBear,
      probability: probabilities.bear,
      narrative: '',
    },
    base: {
      name: 'CƠ SỞ',
      fairValue: fairValueBase,
      updownPct: updownBase,
      probability: probabilities.base,
      narrative: '',
    },
    bull: {
      name: 'TÍCH CỰC',
      fairValue: fairValueBull,
      updownPct: updownBull,
      probability: probabilities.bull,
      narrative: '',
    },
    rrRatio,
    dispersion,
    expectedValue,
  };
}

/**
 * Sinh narrative phân tích định giá tự động có cấu trúc theo ValueX
 */
export function generateScenarioNarrative(params: {
  scenario: 'BEAR' | 'BASE' | 'BULL';
  ticker: string;
  fairValue: number;
  updownPct: number;
  methods: ValuationMethodConfig[];
  inputs: {
    epsForward: number;
    growthTier?: string;
  };
}): string {
  const { scenario, ticker, fairValue, updownPct, methods, inputs } = params;
  const main1 = methods.find((m) => m.role === 'MAIN_1') || methods[0];
  const main2 = methods.find((m) => m.role === 'MAIN_2');

  const formattedPrice = fairValue.toLocaleString('vi-VN');

  if (scenario === 'BEAR') {
    const targetVal = main1?.targetBear || 0;
    return `Giả định KQKD suy giảm ~15% do áp lực thị trường, biên lợi nhuận thu hẹp; Hệ số ${main1?.name} chiết khấu về vùng cận dưới thống kê (μ - 1σ = ${targetVal}x) khi kỳ vọng của thị trường suy giảm. Giá trị hợp lý thận trọng ước đạt ${formattedPrice} đ/cp (${updownPct > 0 ? '+' : ''}${updownPct}% so với giá hiện tại).`;
  }

  if (scenario === 'BASE') {
    const targetVal = main1?.targetBase || 0;
    return `Kịch bản cơ sở bám sát TTM Forward chuẩn hóa từ tab Dự phóng (EPS đạt ${inputs.epsForward.toLocaleString('vi-VN')} đ/cp). Hệ số ${main1?.name} neo ở mức ${targetVal}x (trung vị lịch sử 20 quý điều chỉnh theo Hạng Tăng Trưởng ${inputs.growthTier || 'B+'}). Giá trị hợp lý mục tiêu đạt ${formattedPrice} đ/cp (${updownPct > 0 ? '+' : ''}${updownPct}%).`;
  }

  // BULL
  const targetVal = main1?.targetBull || 0;
  return `Kịch bản tích cực khi các chất xúc tác 6–12 tháng được xác nhận và thị trường tái định giá (re-rating). ${main1?.name} tiệm cận vùng biên trên (+1σ = ${targetVal}x, không vượt trần đối thủ cùng ngành). Giá trị hợp lý kỳ vọng đạt ${formattedPrice} đ/cp (${updownPct > 0 ? '+' : ''}${updownPct}%).`;
}
