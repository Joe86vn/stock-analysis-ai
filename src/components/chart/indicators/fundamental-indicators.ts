import { registerIndicator, KLineData } from 'klinecharts';

export const FUNDAMENTAL_PE_NAME = 'FUNDAMENTAL_PE';
export const FUNDAMENTAL_PB_NAME = 'FUNDAMENTAL_PB';
export const FUNDAMENTAL_CORE_EPS_NAME = 'FUNDAMENTAL_CORE_EPS';
export const FUNDAMENTAL_REVENUE_NAME = 'FUNDAMENTAL_REVENUE';

let registered = false;

export function registerFundamentalIndicators() {
  if (registered) return;
  registered = true;

  // 1. Chỉ báo P/E - TTM Band Chart (+2SD, +1SD, Mean, -1SD, -2SD)
  registerIndicator({
    name: FUNDAMENTAL_PE_NAME,
    shortName: 'P/E - TTM',
    calc: (dataList: KLineData[]) => {
      return dataList.map((d: any) => ({
        pe: d.pe ?? null,
        plus2SD: d.pePlus2SD ?? null,
        plus1SD: d.pePlus1SD ?? null,
        mean: d.peMean ?? null,
        minus1SD: d.peMinus1SD ?? null,
        minus2SD: d.peMinus2SD ?? null,
      }));
    },
    figures: [
      {
        key: 'plus2SD',
        title: '+2SD: ',
        type: 'line',
        styles: () => ({ color: '#6366f1', style: 'dashed' as any }),
      },
      {
        key: 'plus1SD',
        title: '+1SD: ',
        type: 'line',
        styles: () => ({ color: '#3b82f6', style: 'solid' as any }),
      },
      {
        key: 'mean',
        title: 'Mean: ',
        type: 'line',
        styles: () => ({ color: '#9ca3af', style: 'solid' as any }),
      },
      {
        key: 'minus1SD',
        title: '-1SD: ',
        type: 'line',
        styles: () => ({ color: '#f97316', style: 'solid' as any }),
      },
      {
        key: 'minus2SD',
        title: '-2SD: ',
        type: 'line',
        styles: () => ({ color: '#ef4444', style: 'dashed' as any }),
      },
      {
        key: 'pe',
        title: 'P/E: ',
        type: 'line',
        styles: () => ({ color: '#22c55e', style: 'solid' as any, size: 2 }),
      },
    ],
    precision: 2,
    shouldFormatBigNumber: false,
  });

  // 2. Chỉ báo P/B - TTM Band Chart (+2SD, +1SD, Mean, -1SD, -2SD)
  registerIndicator({
    name: FUNDAMENTAL_PB_NAME,
    shortName: 'P/B - TTM',
    calc: (dataList: KLineData[]) => {
      return dataList.map((d: any) => ({
        pb: d.pb ?? null,
        plus2SD: d.pbPlus2SD ?? null,
        plus1SD: d.pbPlus1SD ?? null,
        mean: d.pbMean ?? null,
        minus1SD: d.pbMinus1SD ?? null,
        minus2SD: d.pbMinus2SD ?? null,
      }));
    },
    figures: [
      {
        key: 'plus2SD',
        title: '+2SD: ',
        type: 'line',
        styles: () => ({ color: '#6366f1', style: 'dashed' as any }),
      },
      {
        key: 'plus1SD',
        title: '+1SD: ',
        type: 'line',
        styles: () => ({ color: '#3b82f6', style: 'solid' as any }),
      },
      {
        key: 'mean',
        title: 'Mean: ',
        type: 'line',
        styles: () => ({ color: '#9ca3af', style: 'solid' as any }),
      },
      {
        key: 'minus1SD',
        title: '-1SD: ',
        type: 'line',
        styles: () => ({ color: '#f97316', style: 'solid' as any }),
      },
      {
        key: 'minus2SD',
        title: '-2SD: ',
        type: 'line',
        styles: () => ({ color: '#ef4444', style: 'dashed' as any }),
      },
      {
        key: 'pb',
        title: 'P/B: ',
        type: 'line',
        styles: () => ({ color: '#22c55e', style: 'solid' as any, size: 2 }),
      },
    ],
    precision: 2,
    shouldFormatBigNumber: false,
  });

  // 3. Chỉ báo EPS Cốt lõi TTM
  registerIndicator({
    name: FUNDAMENTAL_CORE_EPS_NAME,
    shortName: 'EPS Cốt Lõi TTM',
    calc: (dataList: KLineData[]) => {
      return dataList.map((d: any) => ({
        coreEps: d.coreEps ?? null,
      }));
    },
    figures: [
      {
        key: 'coreEps',
        title: 'EPS (VND): ',
        type: 'line',
        styles: () => ({ color: '#a855f7', style: 'solid' as any, size: 2 }),
      },
    ],
    precision: 0,
    shouldFormatBigNumber: true,
  });

  // 4. Chỉ báo Doanh Thu TTM
  registerIndicator({
    name: FUNDAMENTAL_REVENUE_NAME,
    shortName: 'Doanh Thu TTM',
    calc: (dataList: KLineData[]) => {
      return dataList.map((d: any) => ({
        revenue: d.revenue ?? null,
      }));
    },
    figures: [
      {
        key: 'revenue',
        title: 'Doanh thu (Tỷ): ',
        type: 'bar',
        styles: () => ({ color: '#06b6d4' }),
      },
    ],
    precision: 0,
    shouldFormatBigNumber: true,
  });
}

