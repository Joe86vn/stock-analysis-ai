import { registerIndicator, KLineData, IndicatorDrawParams } from 'klinecharts';
import { MarketStatus } from '@/lib/canslim-health-calculator';

export const RS_VS_INDEX_NAME = 'RS_VS_INDEX';

export interface RsVsIndexResult {
  rs: number | null;
  rsMax20: number | null;
  breakoutMark: number | null;
  score: number;
  healthScore: number | null;
  marketStatus: MarketStatus | null;
}

let registered = false;

export function registerRsVsIndexIndicator() {
  if (registered) return;
  registered = true;

  registerIndicator<RsVsIndexResult>({
    name: RS_VS_INDEX_NAME,
    shortName: 'RS vs Index',
    calc: (dataList: KLineData[]) => {
      const n = dataList.length;
      if (n === 0) return [];

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

      // 2. Quét giá trị RS cao nhất 20 phiên trước & xác định các điểm Đột phá (Chấm tròn Vàng)
      const isBreakoutArr = new Array<boolean>(n).fill(false);
      const rsMax20Arr: (number | null)[] = new Array(n).fill(null);
      const breakoutMarkArr: (number | null)[] = new Array(n).fill(null);

      for (let i = 0; i < n; i++) {
        const curRS = rsValues[i];
        if (curRS === null) continue;

        let max20: number | null = null;
        const start = Math.max(0, i - 20);
        for (let k = start; k < i; k++) {
          const prevRS = rsValues[k];
          if (prevRS !== null) {
            if (max20 === null || prevRS > max20) {
              max20 = prevRS;
            }
          }
        }

        rsMax20Arr[i] = max20;

        if (i >= 5 && max20 !== null && curRS > max20) {
          isBreakoutArr[i] = true;
          breakoutMarkArr[i] = curRS;
        }
      }

      // 3. Tính tổng số điểm vượt đỉnh 20P trong 1 tháng gần nhất (~21 phiên)
      const result: RsVsIndexResult[] = new Array(n);
      for (let i = 0; i < n; i++) {
        let monthlyCount = 0;
        const start = Math.max(0, i - 21);
        for (let k = start; k <= i; k++) {
          if (isBreakoutArr[k]) {
            monthlyCount++;
          }
        }

        result[i] = {
          rs: rsValues[i],
          rsMax20: rsMax20Arr[i],
          breakoutMark: breakoutMarkArr[i],
          score: monthlyCount,
          healthScore: healthScores[i],
          marketStatus: marketStatuses[i],
        };
      }

      return result;
    },
    figures: [
      {
        key: 'rs',
        title: 'RS: ',
        type: 'line',
        styles: () => ({ color: '#2563eb', size: 2 }),
      },
      {
        key: 'rsMax20',
        title: 'Đỉnh 20P: ',
        type: 'line',
        styles: () => ({ color: '#9ca3af', style: 'dashed' as any, size: 1 }),
      },
      {
        key: 'breakoutMark',
        title: 'Đột phá 20P: ',
        type: 'circle',
        styles: () => ({ color: '#f59e0b', radius: 4.5, style: 'fill' as any }),
      },
    ],
    precision: 2,
    shouldFormatBigNumber: false,

    // Custom Draw: Tô màu nền theo Trạng thái Sức khỏe VN-Index lịch sử & Vẽ Badges góc phải
    draw: (params: IndicatorDrawParams<RsVsIndexResult>) => {
      const { ctx, indicator, xAxis, yAxis, visibleRange } = params;
      const results = indicator.result;
      if (!results || results.length === 0) return false;

      const axisObj = xAxis as any;
      const yAxisObj = yAxis as any;
      const width = typeof axisObj?.width === 'function' ? axisObj.width() : axisObj?.width || 300;
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

      // ─── Step 2: Vẽ Badges Thông tin ở góc trên bên phải ────────────────────
      const lastItem = results[results.length - 1];
      if (lastItem) {
        const score = lastItem.score || 0;
        const healthScore = lastItem.healthScore !== null ? `${lastItem.healthScore}/10` : 'N/A';
        const status = lastItem.marketStatus;

        let statusText = 'N/A';
        let statusBg = 'rgba(100, 116, 139, 0.85)';
        if (status === 'confirmed_uptrend') {
          statusText = 'Uptrend Confirmed';
          statusBg = 'rgba(16, 185, 129, 0.9)';
        } else if (status === 'uptrend_under_pressure') {
          statusText = 'Uptrend Under Pressure';
          statusBg = 'rgba(245, 158, 11, 0.9)';
        } else if (status === 'correction') {
          statusText = 'Market Correction';
          statusBg = 'rgba(239, 68, 68, 0.9)';
        }

        const badge1Text = `Sức khỏe VNIndex: ${healthScore} (${statusText})`;
        const badge2Text = `★ Vượt đỉnh 1T: ${score} điểm`;

        const paddingX = 8;
        const paddingY = 4;
        ctx.font = 'bold 11px sans-serif';

        // Badge 1: Health Score Status
        const w1 = ctx.measureText(badge1Text).width + paddingX * 2;
        const h1 = 20;
        const x1 = Math.max(10, width - w1 - 12);
        const y1 = 6;

        ctx.fillStyle = statusBg;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x1, y1, w1, h1, 10);
        } else {
          ctx.rect(x1, y1, w1, h1);
        }
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badge1Text, x1 + w1 / 2, y1 + h1 / 2);

        // Badge 2: Breakout 1T Score
        const w2 = ctx.measureText(badge2Text).width + paddingX * 2;
        const h2 = 20;
        const x2 = Math.max(10, x1 - w2 - 8);
        const y2 = 6;

        ctx.fillStyle = score > 0 ? 'rgba(16, 185, 129, 0.9)' : 'rgba(100, 116, 139, 0.85)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x2, y2, w2, h2, 10);
        } else {
          ctx.rect(x2, y2, w2, h2);
        }
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badge2Text, x2 + w2 / 2, y2 + h2 / 2);
      }

      ctx.restore();
      return false;
    },
  });
}
