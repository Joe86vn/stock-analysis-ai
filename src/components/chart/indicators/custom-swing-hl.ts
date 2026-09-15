import {
  registerIndicator,
  KLineData,
  IndicatorSeries,
  IndicatorDrawParams,
} from 'klinecharts';

export type StructureLabel = 'HH' | 'LH' | 'HL' | 'LL';

export interface StructureBreak {
  type: 'CHOCH' | 'BOS';
  direction: 'BULLISH' | 'BEARISH';
  startIndex: number;
  breakIndex: number;
  price: number;
  label: string;
}

export interface SwingResult {
  isPeak: boolean;
  isTrough: boolean;
  confirmedType?: 'PEAK' | 'TROUGH';
  price: number;
  peakPrice?: number;
  troughPrice?: number;
  structureLabel?: StructureLabel;
  structureBreaks?: StructureBreak[];
}

export const SWING_HL_INDICATOR_NAME = 'SWING_HL';

/**
 * Thuật toán tính toán Đỉnh - Đáy cá nhân & Cấu trúc thị trường SMC (CHoCH / BOS):
 *
 * 1. Đỉnh (Peak) / Đáy (Trough):
 *    - Đỉnh: Nến i có High cao nhất trong windowSize nến trước và sau.
 *    - Đáy: Nến i có Low thấp nhất trong windowSize nến trước và sau.
 *    - Quy tắc đan xen (Alternating): Không có 2 đỉnh liên tiếp không có đáy ở giữa.
 *
 * 2. Cấu trúc xu hướng:
 *    - Đỉnh cao hơn (HH), Đỉnh thấp hơn (LH).
 *    - Đáy cao hơn (HL), Đáy thấp hơn (LL).
 *    - Xu hướng Giảm (Downtrend): Có ít nhất 1 LH và 1 LL.
 *    - Xu hướng Tăng (Uptrend): Có ít nhất 1 HH và 1 HL.
 *
 * 3. CHoCH (Change of Character):
 *    - Đang trong xu hướng GIẢM: Giá lần đầu phá vỡ đỉnh gần nhất và duy trì đóng cửa trên ít nhất confirmBars (3 nến) -> BULLISH CHOCH (Xanh). Xu hướng chuyển sang TĂNG.
 *    - Đang trong xu hướng TĂNG: Giá lần đầu phá vỡ đáy gần nhất và duy trì đóng cửa dưới ít nhất confirmBars (3 nến) -> BEARISH CHOCH (Đỏ). Xu hướng chuyển sang GIẢM.
 *
 * 4. BOS (Break of Structure):
 *    - Đang trong xu hướng TĂNG: Giá tiếp tục phá vỡ đỉnh cao hơn gần nhất -> BULLISH BOS (Xanh).
 *    - Đang trong xu hướng GIẢM: Giá tiếp tục phá vỡ đáy thấp hơn gần nhất -> BEARISH BOS (Đỏ).
 */
export function calculateSwingHighLow(
  dataList: KLineData[],
  windowSize: number = 9,
  confirmBars: number = 3
): (SwingResult | null)[] {
  const n = dataList.length;
  const result: (SwingResult | null)[] = new Array(n).fill(null);
  const win = Math.max(1, Math.floor(windowSize));
  if (n < win * 2 + 1) return result;

  // Bước 1: Tìm ứng viên đỉnh & đáy
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

  // Bước 2: Áp dụng quy tắc đan xen tuần tự
  let lastConfirmed: 'PEAK' | 'TROUGH' | null = null;
  let lastConfirmedIndex = -1;

  for (let i = win; i < n - win; i++) {
    const peak = isPeakCandidate[i];
    const trough = isTroughCandidate[i];

    if (lastConfirmed === null) {
      if (peak && !trough) {
        result[i] = {
          isPeak: true,
          isTrough: false,
          confirmedType: 'PEAK',
          price: dataList[i].high,
          peakPrice: dataList[i].high,
        };
        lastConfirmed = 'PEAK';
        lastConfirmedIndex = i;
      } else if (trough && !peak) {
        result[i] = {
          isPeak: false,
          isTrough: true,
          confirmedType: 'TROUGH',
          price: dataList[i].low,
          troughPrice: dataList[i].low,
        };
        lastConfirmed = 'TROUGH';
        lastConfirmedIndex = i;
      } else if (peak && trough) {
        result[i] = {
          isPeak: true,
          isTrough: false,
          confirmedType: 'PEAK',
          price: dataList[i].high,
          peakPrice: dataList[i].high,
        };
        lastConfirmed = 'PEAK';
        lastConfirmedIndex = i;
      }
    } else if (lastConfirmed === 'PEAK') {
      if (trough) {
        result[i] = {
          isPeak: false,
          isTrough: true,
          confirmedType: 'TROUGH',
          price: dataList[i].low,
          troughPrice: dataList[i].low,
        };
        lastConfirmed = 'TROUGH';
        lastConfirmedIndex = i;
      } else if (peak) {
        const curHigh = dataList[i].high;
        const prevHigh = lastConfirmedIndex >= 0 ? dataList[lastConfirmedIndex].high : -Infinity;
        if (curHigh > prevHigh) {
          if (lastConfirmedIndex >= 0) {
            result[lastConfirmedIndex] = null;
          }
          result[i] = {
            isPeak: true,
            isTrough: false,
            confirmedType: 'PEAK',
            price: curHigh,
            peakPrice: curHigh,
          };
          lastConfirmed = 'PEAK';
          lastConfirmedIndex = i;
        }
      }
    } else if (lastConfirmed === 'TROUGH') {
      if (peak) {
        result[i] = {
          isPeak: true,
          isTrough: false,
          confirmedType: 'PEAK',
          price: dataList[i].high,
          peakPrice: dataList[i].high,
        };
        lastConfirmed = 'PEAK';
        lastConfirmedIndex = i;
      } else if (trough) {
        const curLow = dataList[i].low;
        const prevLow = lastConfirmedIndex >= 0 ? dataList[lastConfirmedIndex].low : Infinity;
        if (curLow < prevLow) {
          if (lastConfirmedIndex >= 0) {
            result[lastConfirmedIndex] = null;
          }
          result[i] = {
            isPeak: false,
            isTrough: true,
            confirmedType: 'TROUGH',
            price: curLow,
            troughPrice: curLow,
          };
          lastConfirmed = 'TROUGH';
          lastConfirmedIndex = i;
        }
      }
    }
  }

  // Bước 3: Gán nhãn cấu trúc HH, LH, HL, LL
  interface ConfirmedSwing {
    index: number;
    type: 'PEAK' | 'TROUGH';
    price: number;
    label?: StructureLabel;
  }
  const swings: ConfirmedSwing[] = [];
  for (let i = 0; i < n; i++) {
    if (result[i]?.confirmedType) {
      swings.push({
        index: i,
        type: result[i]!.confirmedType!,
        price: result[i]!.price,
      });
    }
  }

  let prevPeak: ConfirmedSwing | null = null;
  let prevTrough: ConfirmedSwing | null = null;

  for (const s of swings) {
    if (s.type === 'PEAK') {
      if (prevPeak) {
        s.label = s.price >= prevPeak.price ? 'HH' : 'LH';
      }
      prevPeak = s;
    } else if (s.type === 'TROUGH') {
      if (prevTrough) {
        s.label = s.price <= prevTrough.price ? 'LL' : 'HL';
      }
      prevTrough = s;
    }
    if (result[s.index]) {
      result[s.index]!.structureLabel = s.label;
    }
  }

  // Bước 4: Xác định Xu hướng (Trend) và Tìm các điểm CHOCH & BOS
  const allBreaks: StructureBreak[] = [];
  if (swings.length < 2) {
    (result as any).allBreaks = allBreaks;
    return result;
  }

  // Khởi tạo xu hướng ban đầu:
  let currentTrend: 'UP' | 'DOWN' = 'UP';
  let hasLH = false;
  let hasLL = false;
  let hasHH = false;
  let hasHL = false;

  for (const s of swings) {
    if (s.label === 'LH') hasLH = true;
    if (s.label === 'LL') hasLL = true;
    if (s.label === 'HH') hasHH = true;
    if (s.label === 'HL') hasHL = true;
    if (hasLH && hasLL) {
      currentTrend = 'DOWN';
      break;
    }
    if (hasHH && hasHL) {
      currentTrend = 'UP';
      break;
    }
  }

  // Duyệt diễn biến giá theo từng nến để phát hiện CHOCH và BOS
  let activePeak: ConfirmedSwing | null = null;
  let activeTrough: ConfirmedSwing | null = null;
  let activePeakBroken = false;
  let activeTroughBroken = false;

  let swingPointer = 0;
  let consecutiveClosesAbove = 0;
  let consecutiveClosesBelow = 0;
  const minConfirm = Math.max(1, confirmBars);

  for (let k = 0; k < n; k++) {
    // Khi nến k chạm tới 1 swing mới đã được xác nhận:
    while (swingPointer < swings.length && swings[swingPointer].index <= k) {
      const sw = swings[swingPointer];
      if (sw.type === 'PEAK') {
        activePeak = sw;
        activePeakBroken = false;
        consecutiveClosesAbove = 0;
      } else if (sw.type === 'TROUGH') {
        activeTrough = sw;
        activeTroughBroken = false;
        consecutiveClosesBelow = 0;
      }
      swingPointer++;
    }

    const curClose = dataList[k].close;

    // ─────────────────────────────────────────────────────────────
    // XU HƯỚNG GIẢM (DOWN)
    // ─────────────────────────────────────────────────────────────
    if (currentTrend === 'DOWN') {
      // 1. Kiểm tra BULLISH CHOCH (Đảo chiều từ Giảm -> Tăng):
      if (activePeak && !activePeakBroken && k > activePeak.index) {
        if (curClose > activePeak.price) {
          consecutiveClosesAbove++;
          if (consecutiveClosesAbove >= minConfirm) {
            allBreaks.push({
              type: 'CHOCH',
              direction: 'BULLISH',
              startIndex: activePeak.index,
              breakIndex: k,
              price: activePeak.price,
              label: 'CHoCH',
            });
            activePeakBroken = true;
            currentTrend = 'UP';
            consecutiveClosesAbove = 0;
            consecutiveClosesBelow = 0;
          }
        } else {
          consecutiveClosesAbove = 0;
        }
      }

      // 2. Kiểm tra BEARISH BOS (Tiếp diễn xu hướng giảm):
      if (currentTrend === 'DOWN' && activeTrough && !activeTroughBroken && k > activeTrough.index) {
        if (curClose < activeTrough.price) {
          allBreaks.push({
            type: 'BOS',
            direction: 'BEARISH',
            startIndex: activeTrough.index,
            breakIndex: k,
            price: activeTrough.price,
            label: 'BOS',
          });
          activeTroughBroken = true;
        }
      }
    }
    // ─────────────────────────────────────────────────────────────
    // XU HƯỚNG TĂNG (UP)
    // ─────────────────────────────────────────────────────────────
    else if (currentTrend === 'UP') {
      // 1. Kiểm tra BEARISH CHOCH (Đảo chiều từ Tăng -> Giảm):
      if (activeTrough && !activeTroughBroken && k > activeTrough.index) {
        if (curClose < activeTrough.price) {
          consecutiveClosesBelow++;
          if (consecutiveClosesBelow >= minConfirm) {
            allBreaks.push({
              type: 'CHOCH',
              direction: 'BEARISH',
              startIndex: activeTrough.index,
              breakIndex: k,
              price: activeTrough.price,
              label: 'CHoCH',
            });
            activeTroughBroken = true;
            currentTrend = 'DOWN';
            consecutiveClosesBelow = 0;
            consecutiveClosesAbove = 0;
          }
        } else {
          consecutiveClosesBelow = 0;
        }
      }

      // 2. Kiểm tra BULLISH BOS (Tiếp diễn xu hướng tăng):
      if (currentTrend === 'UP' && activePeak && !activePeakBroken && k > activePeak.index) {
        if (curClose > activePeak.price) {
          allBreaks.push({
            type: 'BOS',
            direction: 'BULLISH',
            startIndex: activePeak.index,
            breakIndex: k,
            price: activePeak.price,
            label: 'BOS',
          });
          activePeakBroken = true;
        }
      }
    }
  }

  (result as any).allBreaks = allBreaks;
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
 * Đăng ký chỉ báo SWING_HL (Đỉnh Đáy & Cấu trúc SMC) vào KLineCharts
 */
export function registerSwingHighLowIndicator(): void {
  if (isIndicatorRegistered) return;

  try {
    registerIndicator<SwingResult | null>({
      name: SWING_HL_INDICATOR_NAME,
      shortName: 'Đỉnh Đáy & SMC',
      calcParams: [9, 1, 1, 3], // [windowSize, showZigzag, showChochBos, confirmBars]
      series: IndicatorSeries.Price,
      precision: 0,
      shouldOhlc: true,
      calc: (dataList: KLineData[], indicator: any) => {
        const windowSize = indicator?.calcParams?.[0] ? Number(indicator.calcParams[0]) : 9;
        const confirmBars = indicator?.calcParams?.[3] ? Number(indicator.calcParams[3]) : 3;
        return calculateSwingHighLow(dataList, windowSize, confirmBars);
      },
      draw: (params: IndicatorDrawParams<SwingResult | null>) => {
        const { ctx, indicator, visibleRange, xAxis, yAxis } = params;
        const results = indicator.result;
        if (!results || results.length === 0) return false;

        const showZigzag = indicator?.calcParams?.[1] !== undefined ? Boolean(indicator.calcParams[1]) : true;
        const showChochBos = indicator?.calcParams?.[2] !== undefined ? Boolean(indicator.calcParams[2]) : true;

        // 1. Vẽ đường Zigzag nét đứt màu vàng hổ phách nối các đỉnh - đáy (nếu được bật)
        if (showZigzag) {
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

        // 2. Vẽ đường CHOCH và BOS (nếu được bật)
        if (showChochBos) {
          const allBreaks: StructureBreak[] = (results as any)?.allBreaks || [];
          for (const b of allBreaks) {
            const x1 = xAxis.convertToPixel(b.startIndex);
            const x2 = xAxis.convertToPixel(b.breakIndex);
            const y = yAxis.convertToPixel(b.price);

            // Kiểm tra hiển thị trong khung nhìn
            if (Math.max(x1, x2) < -50 || Math.min(x1, x2) > ctx.canvas.width + 50) continue;

            const isBullish = b.direction === 'BULLISH';
            const color = isBullish ? '#10b981' : '#ef4444'; // Xanh nếu từ giảm sang tăng / tăng tiếp diễn; Đỏ nếu từ tăng sang giảm / giảm tiếp diễn

            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = color;

            if (b.type === 'CHOCH') {
              ctx.lineWidth = 1.6;
              ctx.setLineDash([6, 3]);
            } else {
              ctx.lineWidth = 1.2;
              ctx.setLineDash([3, 3]);
            }

            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
            ctx.stroke();

            // Vẽ huy hiệu nhãn (Badge) ở điểm giữa đoạn đường
            const midX = (x1 + x2) / 2;
            const badgeText = b.label; // 'CHoCH' hoặc 'BOS'
            ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
            const textWidth = ctx.measureText(badgeText).width;
            const badgeW = textWidth + 8;
            const badgeH = 14;
            const badgeX = midX - badgeW / 2;
            const badgeY = y - badgeH / 2;

            ctx.setLineDash([]);
            // Nền badge bán trong suốt
            ctx.fillStyle = isBullish ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)';
            drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 3);
            ctx.fill();

            // Viền badge
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.9;
            ctx.stroke();

            // Chữ trong badge
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeText, midX, y + 0.5);

            ctx.restore();
          }
        }

        // 3. Vẽ nhãn giá và cấu trúc đỉnh đáy (HH, LH, HL, LL)
        const from = Math.max(0, visibleRange.from - 2);
        const to = Math.min(results.length, visibleRange.to + 2);

        for (let i = from; i < to; i++) {
          const item = results[i];
          if (!item || !item.confirmedType) continue;

          const x = xAxis.convertToPixel(i);
          const y = yAxis.convertToPixel(item.price);
          const priceStr = Math.round(item.price).toLocaleString('en-US');
          const structLabel = item.structureLabel; // 'HH' | 'LH' | 'HL' | 'LL'

          ctx.save();
          ctx.font = 'bold 10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

          if (item.confirmedType === 'PEAK') {
            // ĐỈNH: Màu đỏ, hiển thị nhãn HH/LH kèm giá
            ctx.fillStyle = '#ef4444'; // Red-500
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const text = structLabel ? `${structLabel} ${priceStr}` : priceStr;
            ctx.fillText(text, x, y - 4);
          } else if (item.confirmedType === 'TROUGH') {
            // ĐÁY: Màu xanh, hiển thị nhãn HL/LL kèm giá
            ctx.fillStyle = '#10b981'; // Emerald-500
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const text = structLabel ? `${structLabel} ${priceStr}` : priceStr;
            ctx.fillText(text, x, y + 4);
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
