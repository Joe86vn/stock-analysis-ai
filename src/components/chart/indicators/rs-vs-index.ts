import { registerIndicator, KLineData, IndicatorDrawParams } from 'klinecharts';
import { MarketStatus } from '@/lib/canslim-health-calculator';

export const RS_VS_INDEX_NAME = 'RS_VS_INDEX';

export interface RsVsIndexResult {
  rs: number | null;
  rsMax20: number | null;
  breakoutMark: number | null;
  score: number;
  breakout1M: string;
  healthScore: number | null;
  healthStatusText: string;
  marketStatus: MarketStatus | null;
}

let registered = false;

export function registerRsVsIndexIndicator() {
  if (registered) return;
  registered = true;

  registerIndicator<RsVsIndexResult>({
    name: RS_VS_INDEX_NAME,
    shortName: 'RS vs Index',
    calc: (dataList: KLineData[], indicator: any) => {
      const n = dataList.length;
      if (n === 0) return [];

      const windowSize = (indicator?.calcParams && indicator.calcParams[0]) || 20;

      const rsValues: (number | null)[] = new Array(n);
      const healthScores: (number | null)[] = new Array(n);
      const marketStatuses: (MarketStatus | null)[] = new Array(n);

      // 1. Tính chỉ số RS = (Giá đóng cửa CP / Giá đóng cửa VNINDEX) * 100 & Lấy Health Score
      for (let i = 0; i < n; i++) {
        const d = dataList[i] as any;
        const stockClose = d.close;
        const vnClose = d.vnindexClose || d.vnClose;

        healthScores[i] = typeof d.healthScore === 'number' ? d.healthScore : null;
        marketStatuses[i] = d.marketStatus || null;

        if (stockClose > 0 && vnClose > 0) {
          const normalizedStockClose = stockClose < 5000 ? stockClose * 1000 : stockClose;
          const ratio = (normalizedStockClose / vnClose) * 100;
          rsValues[i] = Number(ratio.toFixed(2));
        } else {
          rsValues[i] = null;
        }
      }

      // 2. Quét giá trị RS cao nhất windowSize phiên trước & xác định các điểm Đột phá (Chấm tròn Vàng)
      const isBreakoutArr = new Array<boolean>(n).fill(false);
      const rsMax20Arr: (number | null)[] = new Array(n).fill(null);
      const breakoutMarkArr: (number | null)[] = new Array(n).fill(null);

      for (let i = 0; i < n; i++) {
        const curRS = rsValues[i];
        if (curRS === null) continue;

        let maxVal: number | null = null;
        const start = Math.max(0, i - windowSize);
        for (let k = start; k < i; k++) {
          const prevRS = rsValues[k];
          if (prevRS !== null) {
            if (maxVal === null || prevRS > maxVal) {
              maxVal = prevRS;
            }
          }
        }

        rsMax20Arr[i] = maxVal;

        if (i >= 5 && maxVal !== null && curRS > maxVal) {
          isBreakoutArr[i] = true;
          breakoutMarkArr[i] = curRS;
        }
      }

      // 3. Tính tổng số điểm vượt đỉnh 20P trong 1 tháng gần nhất (~21 phiên) & Định dạng chuỗi hiển thị Legend
      const result: RsVsIndexResult[] = new Array(n);
      for (let i = 0; i < n; i++) {
        let monthlyCount = 0;
        const start = Math.max(0, i - 21);
        for (let k = start; k <= i; k++) {
          if (isBreakoutArr[k]) {
            monthlyCount++;
          }
        }

        const hScore = healthScores[i];
        const status = marketStatuses[i];

        let statusText = 'N/A';
        if (status === 'confirmed_uptrend') {
          statusText = 'Uptrend Confirmed';
        } else if (status === 'uptrend_under_pressure') {
          statusText = 'Uptrend Under Pressure';
        } else if (status === 'correction') {
          statusText = 'Market Correction';
        }

        const healthStatusText = hScore !== null ? `${hScore}/10 (${statusText})` : 'N/A';

        result[i] = {
          rs: rsValues[i],
          rsMax20: rsMax20Arr[i],
          breakoutMark: breakoutMarkArr[i],
          score: monthlyCount,
          breakout1M: `${monthlyCount} điểm`,
          healthScore: hScore,
          healthStatusText,
          marketStatus: status,
        };
      }

      return result;
    },
    figures: [
      {
        key: 'rs',
        title: 'RS: ',
        type: 'line',
        styles: (_data: any, indicator: any) => {
          const l = indicator?.styles?.lines?.[0];
          return {
            color: l?.show === false ? 'transparent' : (l?.color || '#2563eb'),
            size: l?.size || 2,
            style: (l?.style || 'solid') as any,
          };
        },
      },
      {
        key: 'rsMax20',
        title: 'Đỉnh RS: ',
        type: 'line',
        styles: (_data: any, indicator: any) => {
          const l = indicator?.styles?.lines?.[1];
          return {
            color: l?.show === false ? 'transparent' : (l?.color || '#9ca3af'),
            size: l?.size || 1,
            style: (l?.style || 'dashed') as any,
          };
        },
      },
      {
        key: 'breakoutMark',
        title: 'Đột phá: ',
        type: 'circle',
        styles: (_data: any, indicator: any) => {
          const l = indicator?.styles?.lines?.[2];
          return {
            color: l?.show === false ? 'transparent' : (l?.color || '#f59e0b'),
            radius: 4.5,
            style: 'fill' as any,
          };
        },
      },
      {
        key: 'breakout1M',
        title: 'Vượt đỉnh 1T: ',
        type: 'line',
        styles: () => ({ color: 'transparent', size: 0 }),
      },
      {
        key: 'healthStatusText',
        title: 'Sức khỏe VNIndex: ',
        type: 'line',
        styles: () => ({ color: 'transparent', size: 0 }),
      },
    ],
    precision: 2,
    shouldFormatBigNumber: false,

    // Custom Draw: Tô màu nền theo Trạng thái Sức khỏe VN-Index lịch sử
    draw: (params: IndicatorDrawParams<RsVsIndexResult>) => {
      const { ctx, indicator, xAxis, yAxis, visibleRange } = params;
      const results = indicator.result;
      if (!results || results.length === 0) return false;

      const yAxisObj = yAxis as any;
      const paneHeight = typeof yAxisObj?.height === 'function' ? yAxisObj.height() : yAxisObj?.height || 120;

      ctx.save();

      // ─── Step 1: Tô màu nền từng nến theo CANSLIM Market Status lịch sử ──────
      const from = visibleRange.from;
      const to = visibleRange.to;

      for (let i = from; i <= to; i++) {
        const item = results[i];
        if (!item || !item.marketStatus) continue;

        const status = item.marketStatus;
        let bgColor = '';
        if (status === 'confirmed_uptrend') {
          bgColor = 'rgba(34, 197, 94, 0.12)'; // Xanh lá - Uptrend Confirmed
        } else if (status === 'uptrend_under_pressure') {
          bgColor = 'rgba(245, 158, 11, 0.15)'; // Vàng - Uptrend Under Pressure
        } else if (status === 'correction') {
          bgColor = 'rgba(239, 68, 68, 0.15)'; // Đỏ - Correction
        }

        if (bgColor) {
          const xCurrent = xAxis.convertToPixel(i);
          let xNext = xCurrent + 10;
          if (i < results.length - 1) {
            xNext = xAxis.convertToPixel(i + 1);
          } else if (i > 0) {
            xNext = xCurrent + (xCurrent - xAxis.convertToPixel(i - 1));
          }

          const barW = Math.max(1, Math.abs(xNext - xCurrent));
          const xLeft = xCurrent - barW / 2;

          ctx.fillStyle = bgColor;
          ctx.fillRect(xLeft, 0, barW, paneHeight);
        }
      }

      ctx.restore();
      return false;
    },
  });
}
