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
        styles: (_data: any, indicator: any) => {
          const l = indicator?.styles?.lines?.[0];
          return {
            color: l?.show === false ? 'transparent' : (l?.color || '#6366f1'),
            size: l?.size || 1,
            style: (l?.style || 'dashed') as any,
          };
        },
      },
      {
        key: 'plus1SD',
        title: '+1SD: ',
        type: 'line',
        styles: (_data: any, indicator: any) => {
          const l = indicator?.styles?.lines?.[1];
          return {
            color: l?.show === false ? 'transparent' : (l?.color || '#3b82f6'),
            size: l?.size || 1,
            style: (l?.style || 'solid') as any,
          };
        },
      },
      {
        key: 'mean',
        title: 'Mean: ',
        type: 'line',
        styles: (_data: any, indicator: any) => {
          const l = indicator?.styles?.lines?.[2];
          return {
            color: l?.show === false ? 'transparent' : (l?.color || '#9ca3af'),
            size: l?.size || 1,
            style: (l?.style || 'solid') as any,
          };
        },
      },
      {
        key: 'minus1SD',
        title: '-1SD: ',
        type: 'line',
        styles: (_data: any, indicator: any) => {
          const l = indicator?.styles?.lines?.[3];
          return {
            color: l?.show === false ? 'transparent' : (l?.color || '#f97316'),
            size: l?.size || 1,
            style: (l?.style || 'solid') as any,
          };
        },
      },
      {
        key: 'minus2SD',
        title: '-2SD: ',
        type: 'line',
        styles: (_data: any, indicator: any) => {
          const l = indicator?.styles?.lines?.[4];
          return {
            color: l?.show === false ? 'transparent' : (l?.color || '#ef4444'),
            size: l?.size || 1,
            style: (l?.style || 'dashed') as any,
          };
        },
      },
      {
        key: 'pe',
        title: 'P/E: ',
        type: 'line',
        styles: (_data: any, indicator: any) => {
          const l = indicator?.styles?.lines?.[5];
          return {
            color: l?.show === false ? 'transparent' : (l?.color || '#22c55e'),
            size: l?.size || 2,
            style: (l?.style || 'solid') as any,
          };
        },
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
        styles: (_data: any, indicator: any) => {
          const l = indicator?.styles?.lines?.[0];
          return {
            color: l?.show === false ? 'transparent' : (l?.color || '#6366f1'),
            size: l?.size || 1,
            style: (l?.style || 'dashed') as any,
          };
        },
      },
      {
        key: 'plus1SD',
        title: '+1SD: ',
        type: 'line',
        styles: (_data: any, indicator: any) => {
          const l = indicator?.styles?.lines?.[1];
          return {
            color: l?.show === false ? 'transparent' : (l?.color || '#3b82f6'),
            size: l?.size || 1,
            style: (l?.style || 'solid') as any,
          };
        },
      },
      {
        key: 'mean',
        title: 'Mean: ',
        type: 'line',
        styles: (_data: any, indicator: any) => {
          const l = indicator?.styles?.lines?.[2];
          return {
            color: l?.show === false ? 'transparent' : (l?.color || '#9ca3af'),
            size: l?.size || 1,
            style: (l?.style || 'solid') as any,
          };
        },
      },
      {
        key: 'minus1SD',
        title: '-1SD: ',
        type: 'line',
        styles: (_data: any, indicator: any) => {
          const l = indicator?.styles?.lines?.[3];
          return {
            color: l?.show === false ? 'transparent' : (l?.color || '#f97316'),
            size: l?.size || 1,
            style: (l?.style || 'solid') as any,
          };
        },
      },
      {
        key: 'minus2SD',
        title: '-2SD: ',
        type: 'line',
        styles: (_data: any, indicator: any) => {
          const l = indicator?.styles?.lines?.[4];
          return {
            color: l?.show === false ? 'transparent' : (l?.color || '#ef4444'),
            size: l?.size || 1,
            style: (l?.style || 'dashed') as any,
          };
        },
      },
      {
        key: 'pb',
        title: 'P/B: ',
        type: 'line',
        styles: (_data: any, indicator: any) => {
          const l = indicator?.styles?.lines?.[5];
          return {
            color: l?.show === false ? 'transparent' : (l?.color || '#22c55e'),
            size: l?.size || 2,
            style: (l?.style || 'solid') as any,
          };
        },
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
        styles: (_data: any, indicator: any) => {
          const l = indicator?.styles?.lines?.[0];
          return {
            color: l?.show === false ? 'transparent' : (l?.color || '#a855f7'),
            size: l?.size || 2,
            style: (l?.style || 'solid') as any,
          };
        },
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
        styles: (_data: any, indicator: any) => {
          const b = indicator?.styles?.bars?.[0];
          return {
            color: b?.show === false ? 'transparent' : (b?.color || '#06b6d4'),
          };
        },
      },
    ],
    precision: 0,
    shouldFormatBigNumber: true,
  });
}

