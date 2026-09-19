import { registerIndicator, KLineData, IndicatorDrawParams } from 'klinecharts';

export const RS_VS_INDEX_NAME = 'RS_VS_INDEX';

export interface RsVsIndexResult {
  rs: number | null;
  rsMax20: number | null;
  breakoutMark: number | null;
  score: number;
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

      // 1. Tính chỉ số RS = (Giá đóng cửa CP / Giá đóng cửa VNINDEX) * 100
      for (let i = 0; i < n; i++) {
        const d = dataList[i] as any;
        const stockClose = d.close;
        const vnClose = d.vnindexClose || d.vnClose;

        if (stockClose > 0 && vnClose > 0) {
          // Chuẩn hóa giá CP về VNĐ nếu đang ở dạng ngàn (VD: 25.5 -> 25500)
          const normalizedStockClose = stockClose < 5000 ? stockClose * 1000 : stockClose;
          const ratio = (normalizedStockClose / vnClose) * 100;
          rsValues[i] = Number(ratio.toFixed(2));
        } else {
          rsValues[i] = null;
        }
      }

      // 2. Tìm giá trị RS cao nhất 20 phiên trước & xác định các điểm Đột phá (Chấm tròn)
      const isBreakoutArr = new Array<boolean>(n).fill(false);
      const rsMax20Arr: (number | null)[] = new Array(n).fill(null);
      const breakoutMarkArr: (number | null)[] = new Array(n).fill(null);

      for (let i = 0; i < n; i++) {
        const curRS = rsValues[i];
        if (curRS === null) continue;

        // Quét 20 phiên trước đó: [max(0, i-20) ... i-1]
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

        // Nếu vượt đỉnh 20 phiên trước đó -> Đánh dấu chấm tròn tại giá trị RS hiện tại
        if (i >= 5 && max20 !== null && curRS > max20) {
          isBreakoutArr[i] = true;
          breakoutMarkArr[i] = curRS;
        }
      }

      // 3. Tính tổng số chấm tròn (số lần vượt đỉnh 20P) trong 1 tháng gần nhất (~21 phiên)
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

    // Hiển thị Badge điểm tổng số chấm tròn 1 tháng ở góc phải / trục bên phải sub-pane
    draw: (params: IndicatorDrawParams<RsVsIndexResult>) => {
      const { ctx, indicator, xAxis } = params;
      const results = indicator.result;
      if (!results || results.length === 0) return false;

      const lastItem = results[results.length - 1];
      if (!lastItem) return false;

      const score = lastItem.score || 0;
      const scoreText = `★ Vượt đỉnh 1T: ${score} điểm`;

      ctx.save();
      const paddingX = 8;
      const paddingY = 4;
      ctx.font = 'bold 11px sans-serif';
      const textWidth = ctx.measureText(scoreText).width;
      const badgeW = textWidth + paddingX * 2;
      const badgeH = 20;
      const axisObj = xAxis as any;
      const width = typeof axisObj?.width === 'function' ? axisObj.width() : axisObj?.width || 300;
      const badgeX = Math.max(10, width - badgeW - 12);
      const badgeY = 6;

      // Nền Badge đổi màu theo số điểm (Xanh lá nếu > 0, Xám nếu = 0)
      ctx.fillStyle = score > 0 ? 'rgba(16, 185, 129, 0.9)' : 'rgba(100, 116, 139, 0.8)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 10);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fill();

      // Chữ trắng nổi bật
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(scoreText, badgeX + badgeW / 2, badgeY + badgeH / 2);

      ctx.restore();
      return false;
    },
  });
}
