import {
  registerIndicator,
  KLineData,
  IndicatorSeries,
  IndicatorDrawParams,
} from 'klinecharts';

export interface SwingResult {
  isPeak: boolean;
  isTrough: boolean;
  confirmedType: 'PEAK' | 'TROUGH';
  price: number;
  peakPrice?: number;
  troughPrice?: number;
}

export const SWING_HL_INDICATOR_NAME = 'SWING_HL';

/**
 * Thuật toán tính toán Đỉnh - Đáy cá nhân:
 * 1. Đỉnh (Peak): Nến i có High cao hơn windowSize nến trước và windowSize nến sau.
 * 2. Đáy (Trough): Nến i có Low thấp hơn windowSize nến trước và windowSize nến sau.
 * 3. Quy tắc đan xen (Alternating):
 *    Không được có 2 đỉnh liên tục mà không có đáy ở giữa.
 *    Nếu đã xác nhận 1 đỉnh thì mọi đỉnh sau đó bị bỏ qua cho tới khi có đáy mới và ngược lại.
 */
export function calculateSwingHighLow(
  dataList: KLineData[],
  windowSize: number = 9
): (SwingResult | null)[] {
  const n = dataList.length;
  const result: (SwingResult | null)[] = new Array(n).fill(null);
  const win = Math.max(1, Math.floor(windowSize));
  if (n < win * 2 + 1) return result;

  // Bước 1: Tìm ứng viên đạt chuẩn win nến trái & win nến phải
  const isPeakCandidate: boolean[] = new Array(n).fill(false);
  const isTroughCandidate: boolean[] = new Array(n).fill(false);

  for (let i = win; i < n - win; i++) {
    const curHigh = dataList[i].high;
    const curLow = dataList[i].low;

    let peak = true;
    for (let k = 1; k <= win; k++) {
      if (dataList[i - k].high >= curHigh || dataList[i + k].high >= curHigh) {
        peak = false;
        break;
      }
    }
    isPeakCandidate[i] = peak;

    let trough = true;
    for (let k = 1; k <= win; k++) {
      if (dataList[i - k].low <= curLow || dataList[i + k].low <= curLow) {
        trough = false;
        break;
      }
    }
    isTroughCandidate[i] = trough;
  }

  // Bước 2: Áp dụng quy tắc đan xen tuần tự từ quá khứ đến hiện tại
  let lastConfirmed: 'PEAK' | 'TROUGH' | null = null;

  for (let i = win; i < n - win; i++) {
    const peak = isPeakCandidate[i];
    const trough = isTroughCandidate[i];

    if (lastConfirmed === null) {
      if (peak) {
        result[i] = {
          isPeak: true,
          isTrough: false,
          confirmedType: 'PEAK',
          price: dataList[i].high,
          peakPrice: dataList[i].high,
        };
        lastConfirmed = 'PEAK';
      } else if (trough) {
        result[i] = {
          isPeak: false,
          isTrough: true,
          confirmedType: 'TROUGH',
          price: dataList[i].low,
          troughPrice: dataList[i].low,
        };
        lastConfirmed = 'TROUGH';
      }
    } else if (lastConfirmed === 'PEAK') {
      // Đang chờ ĐÁY: Bỏ qua mọi đỉnh mới, chỉ nhận đáy hợp lệ đầu tiên
      if (trough) {
        result[i] = {
          isPeak: false,
          isTrough: true,
          confirmedType: 'TROUGH',
          price: dataList[i].low,
          troughPrice: dataList[i].low,
        };
        lastConfirmed = 'TROUGH';
      }
    } else if (lastConfirmed === 'TROUGH') {
      // Đang chờ ĐỈNH: Bỏ qua mọi đáy mới, chỉ nhận đỉnh hợp lệ đầu tiên
      if (peak) {
        result[i] = {
          isPeak: true,
          isTrough: false,
          confirmedType: 'PEAK',
          price: dataList[i].high,
          peakPrice: dataList[i].high,
        };
        lastConfirmed = 'PEAK';
      }
    }
  }

  return result;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

let isIndicatorRegistered = false;

/**
 * Đăng ký chỉ báo SWING_HL vào KLineCharts
 */
export function registerSwingHighLowIndicator(): void {
  if (isIndicatorRegistered) return;

  try {
    registerIndicator<SwingResult | null>({
      name: SWING_HL_INDICATOR_NAME,
      shortName: 'Đỉnh Đáy',
      calcParams: [9, 1],
      series: IndicatorSeries.Price,
      precision: 0,
      shouldOhlc: true,
      calc: (dataList: KLineData[], indicator: any) => {
        const windowSize = indicator?.calcParams?.[0] ? Number(indicator.calcParams[0]) : 9;
        return calculateSwingHighLow(dataList, windowSize);
      },
      draw: (params: IndicatorDrawParams<SwingResult | null>) => {
        const { ctx, indicator, visibleRange, xAxis, yAxis } = params;
        const results = indicator.result;
        if (!results || results.length === 0) return false;

        const showLine = indicator?.calcParams?.[1] !== undefined ? Boolean(indicator.calcParams[1]) : true;

        // 1. Vẽ đường Zigzag nét đứt màu vàng hổ phách nối các đỉnh - đáy (nếu được bật)
        if (showLine) {
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = '#eab308'; // Amber-500
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);

          let hasFirst = false;
          for (let i = 0; i < results.length; i++) {
            const item = results[i];
            if (item && item.confirmedType) {
              const x = xAxis.convertToPixel(i);
              const y = yAxis.convertToPixel(item.price);
              if (!hasFirst) {
                ctx.moveTo(x, y);
                hasFirst = true;
              } else {
                ctx.lineTo(x, y);
              }
            }
          }
          if (hasFirst) {
            ctx.stroke();
          }
          ctx.restore();
        }

        // 2. Vẽ nhãn giá và huy hiệu cho từng đỉnh/đáy trong khung nhìn
        const from = Math.max(0, visibleRange.from - 2);
        const to = Math.min(results.length, visibleRange.to + 2);

        for (let i = from; i < to; i++) {
          const item = results[i];
          if (!item || !item.confirmedType) continue;

          const x = xAxis.convertToPixel(i);
          const y = yAxis.convertToPixel(item.price);

          // Định dạng số nguyên chuẩn VNĐ (ví dụ 142,000)
          const priceStr = Math.round(item.price).toLocaleString('en-US');

          ctx.save();
          ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

          if (item.confirmedType === 'PEAK') {
            // ĐỈNH: Giá cao nhất dạng chữ màu đỏ đơn giản ngay trên đỉnh nến
            ctx.fillStyle = '#ef4444'; // Red-500
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(priceStr, x, y - 4);
          } else if (item.confirmedType === 'TROUGH') {
            // ĐÁY: Giá thấp nhất dạng chữ màu xanh lá đơn giản ngay dưới nến
            ctx.fillStyle = '#10b981'; // Emerald-500
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(priceStr, x, y + 4);
          }

          ctx.restore();
        }

        return false;
      },
    });

    isIndicatorRegistered = true;
  } catch (err) {
    console.error('Failed to register SWING_HL indicator:', err);
  }
}
