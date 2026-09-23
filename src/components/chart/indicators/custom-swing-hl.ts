import {
  registerIndicator,
  KLineData,
  IndicatorSeries,
  IndicatorDrawParams,
} from 'klinecharts';

export type StructureLabel = 'HH' | 'LH' | 'HL' | 'LL' | 'DT' | 'DB';

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
  diffPct?: number; // % biên độ thay đổi so với swing đối lập liền trước
  barsCount?: number; // Số nến từ swing đối lập liền trước
}

export const SWING_HL_INDICATOR_NAME = 'SWING_HL';

/**
 * Thuật toán tính toán Đỉnh - Đáy cá nhân & Cấu trúc thị trường SMC (CHoCH / BOS):
 *
 * 1. Đỉnh (Peak) / Đáy (Trough):
 *    - Đỉnh: Nến i có High cao nhất trong windowSize nến trước và sau.
 *    - Đáy: Nến i có Low thấp nhất trong windowSize nến trước và sau.
 *    - Quy tắc đan xen (Alternating): Không có 2 đỉnh liên tiếp không có đáy ở giữa.
 *    - Khoảng cách Đỉnh và Đáy chuẩn tối thiểu 9 nến (lọc nhiễu sideway biên hẹp).
 *    - Ngoại lệ Breakout/Breakdown: Khi nến tạo đỉnh/đáy mới phá vỡ swing cũ cùng loại,
 *      chỉ cần swing đối lập ở giữa cách swing cũ ≥ 9 nến HOẶC cách điểm breakout ≥ 9 nến thì vẫn được xác nhận.
 *
 * 2. Cấu trúc xu hướng:
 *    - Đỉnh cao hơn (HH), Đỉnh thấp hơn (LH), Đỉnh bằng nhau (DT - Double Top).
 *    - Đáy cao hơn (HL), Đáy thấp hơn (LL), Đáy bằng nhau (DB - Double Bottom).
 *    - Xu hướng Giảm (Downtrend): Có ít nhất 1 LH và 1 LL.
 *    - Xu hướng Tăng (Uptrend): Có ít nhất 1 HH và 1 HL.
 *
 * 3. CHoCH (Change of Character):
 *    - Đang trong xu hướng GIẢM: Giá lần đầu phá vỡ đỉnh gần nhất và duy trì đóng cửa trên ít nhất confirmBars (3 nến) -> BULLISH CHOCH (Xanh). Xu hướng chuyển sang TĂNG.
 *    - Đang trong xu hướng TĂNG: Giá lần đầu phá vỡ đáy gần nhất và duy trì đóng cửa dưới ít nhất confirmBars (3 nến) -> BEARISH CHOCH (Đỏ). Xu hướng chuyển sang GIẢM.
 *
 * 4. BOS (Break of Structure):
 *    - Đang trong xu hướng TĂNG: Giá tiếp tục phá vỡ đỉnh cao hơn gần nhất và duy trì đóng cửa trên ít nhất confirmBars (3 nến) -> BULLISH BOS (Xanh).
 *    - Đang trong xu hướng GIẢM: Giá tiếp tục phá vỡ đáy thấp hơn gần nhất và duy trì đóng cửa dưới ít nhất confirmBars (3 nến) -> BEARISH BOS (Đỏ).
 */
export function calculateSwingHighLow(
  dataList: KLineData[],
  windowSize: number = 9,
  confirmBars: number = 3
): (SwingResult | null)[] {
  const n = dataList.length;
  const result: (SwingResult | null)[] = new Array(n).fill(null);
  const minBars = Math.max(9, Math.floor(windowSize));
  const minConfirm = Math.max(1, confirmBars);
  if (n < minBars * 2) return result;

  // Bước 1: Quét ứng viên fractal cực bộ (windowSize = 9)
  const isPeakCandidate = new Array(n).fill(false);
  const isTroughCandidate = new Array(n).fill(false);

  for (let i = minBars; i < n; i++) {
    const curHigh = dataList[i].high;
    const curLow = dataList[i].low;

    let pb = true;
    for (let k = 1; k <= minBars; k++) {
      if (dataList[i - k].high > curHigh) { pb = false; break; }
    }
    let pa = true;
    const la = Math.min(n - 1, i + minBars);
    for (let k = i + 1; k <= la; k++) {
      if (dataList[k].high >= curHigh) { pa = false; break; }
    }
    if (pb && (pa || i + minBars >= n)) {
      isPeakCandidate[i] = true;
    }

    let tb = true;
    for (let k = 1; k <= minBars; k++) {
      if (dataList[i - k].low < curLow) { tb = false; break; }
    }
    let ta = true;
    const lt = Math.min(n - 1, i + minBars);
    for (let k = i + 1; k <= lt; k++) {
      if (dataList[k].low <= curLow) { ta = false; break; }
    }
    if (tb && (ta || i + minBars >= n)) {
      isTroughCandidate[i] = true;
    }
  }

  // Bước 2: Chuẩn hóa toàn diện Engine Đỉnh Đáy sang Kiến trúc Tuyến tính Đơn luồng
  let lastConfirmed: 'PEAK' | 'TROUGH' | null = null;
  let lastConfirmedIndex = -1;

  for (let i = minBars; i < n; i++) {
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
      }
      continue;
    }

    if (lastConfirmed === 'PEAK') {
      const peakPrice = dataList[lastConfirmedIndex].high;

      // 1. Kiểm tra Breakout vượt đỉnh cũ (Uptrend Breakout Exception):
      if (dataList[i].high > peakPrice) {
        let minLowPrice = Infinity;
        let minLowIdx = -1;
        for (let k = lastConfirmedIndex + 1; k <= i; k++) {
          if (dataList[k].low < minLowPrice) {
            minLowPrice = dataList[k].low;
            minLowIdx = k;
          }
        }
        const distToPrevPeak = minLowIdx - lastConfirmedIndex;
        const distToBreak = i - minLowIdx;

        if (distToPrevPeak >= minBars || distToBreak >= minBars) {
          // Xác nhận đáy pullback ở giữa
          result[minLowIdx] = {
            isPeak: false,
            isTrough: true,
            confirmedType: 'TROUGH',
            price: minLowPrice,
            troughPrice: minLowPrice,
          };
          lastConfirmed = 'TROUGH';
          lastConfirmedIndex = minLowIdx;
        } else {
          // Nhiễu < 9 ở cả 2 phía: Sóng tăng tiếp diễn, đỉnh cũ dời lên nến i
          result[lastConfirmedIndex] = null;
          result[i] = {
            isPeak: true,
            isTrough: false,
            confirmedType: 'PEAK',
            price: dataList[i].high,
            peakPrice: dataList[i].high,
          };
          lastConfirmed = 'PEAK';
          lastConfirmedIndex = i;
          continue;
        }
      }

      // 2. Tìm Đáy chuẩn hoặc thay thế Đỉnh:
      if (lastConfirmed === 'PEAK') {
        if (trough && (i - lastConfirmedIndex >= minBars) && (dataList[i].low < peakPrice)) {
          result[i] = {
            isPeak: false,
            isTrough: true,
            confirmedType: 'TROUGH',
            price: dataList[i].low,
            troughPrice: dataList[i].low,
          };
          lastConfirmed = 'TROUGH';
          lastConfirmedIndex = i;
        } else if (peak && dataList[i].high > peakPrice) {
          result[lastConfirmedIndex] = null;
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
      }
    } else if (lastConfirmed === 'TROUGH') {
      const troughPrice = dataList[lastConfirmedIndex].low;

      // 1. Kiểm tra Breakdown thủng đáy cũ (Downtrend Breakdown Exception):
      if (dataList[i].low < troughPrice) {
        let maxHighPrice = -Infinity;
        let maxHighIdx = -1;
        for (let k = lastConfirmedIndex + 1; k <= i; k++) {
          if (dataList[k].high > maxHighPrice) {
            maxHighPrice = dataList[k].high;
            maxHighIdx = k;
          }
        }
        const distToPrevTrough = maxHighIdx - lastConfirmedIndex;
        const distToBreak = i - maxHighIdx;

        // Điểm bounce ở giữa chỉ được xác nhận đỉnh nếu có ít nhất 1 phía đạt minBars VÀ nhịp nảy đạt tối thiểu 4 nến (tránh giật 1-2 nến)
        if ((distToPrevTrough >= minBars || distToBreak >= minBars) && distToPrevTrough >= 4) {
          result[maxHighIdx] = {
            isPeak: true,
            isTrough: false,
            confirmedType: 'PEAK',
            price: maxHighPrice,
            peakPrice: maxHighPrice,
          };
          lastConfirmed = 'PEAK';
          lastConfirmedIndex = maxHighIdx;
        } else {
          result[lastConfirmedIndex] = null;
          result[i] = {
            isPeak: false,
            isTrough: true,
            confirmedType: 'TROUGH',
            price: dataList[i].low,
            troughPrice: dataList[i].low,
          };
          lastConfirmed = 'TROUGH';
          lastConfirmedIndex = i;
          continue;
        }
      }

      // 2. Tìm Đỉnh chuẩn hoặc thay thế Đáy:
      if (lastConfirmed === 'TROUGH') {
        if (peak && (i - lastConfirmedIndex >= minBars) && (dataList[i].high > troughPrice)) {
          result[i] = {
            isPeak: true,
            isTrough: false,
            confirmedType: 'PEAK',
            price: dataList[i].high,
            peakPrice: dataList[i].high,
          };
          lastConfirmed = 'PEAK';
          lastConfirmedIndex = i;
        } else if (trough && dataList[i].low < troughPrice) {
          result[lastConfirmedIndex] = null;
          result[i] = {
            isPeak: false,
            isTrough: true,
            confirmedType: 'TROUGH',
            price: dataList[i].low,
            troughPrice: dataList[i].low,
          };
          lastConfirmed = 'TROUGH';
          lastConfirmedIndex = i;
        }
      }
    }
  }

  // Bước 3: Gán nhãn cấu trúc HH, LH, HL, LL, DT (Double Top), DB (Double Bottom)
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

  for (let idx = 0; idx < swings.length; idx++) {
    const s = swings[idx];
    if (s.type === 'PEAK') {
      if (prevPeak) {
        if (Math.round(s.price) === Math.round(prevPeak.price)) {
          s.label = 'DT'; // Double Top (Đỉnh bằng nhau)
        } else if (s.price > prevPeak.price) {
          s.label = 'HH';
        } else {
          s.label = 'LH';
        }
      }
      prevPeak = s;
    } else if (s.type === 'TROUGH') {
      if (prevTrough) {
        if (Math.round(s.price) === Math.round(prevTrough.price)) {
          s.label = 'DB'; // Double Bottom (Đáy bằng nhau)
        } else if (s.price < prevTrough.price) {
          s.label = 'LL';
        } else {
          s.label = 'HL';
        }
      }
      prevTrough = s;
    }
    if (result[s.index]) {
      result[s.index]!.structureLabel = s.label;
      // Tính % biên độ tăng/giảm và số nến so với swing đối lập liền trước
      if (idx > 0) {
        const prevPrice = swings[idx - 1].price;
        if (prevPrice > 0) {
          result[s.index]!.diffPct = ((s.price - prevPrice) / prevPrice) * 100;
          result[s.index]!.barsCount = s.index - swings[idx - 1].index;
        }
      }
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

  for (let k = 0; k < n; k++) {
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
              breakIndex: k - minConfirm + 1, // Vẽ đường nét đứt đến cây nến breakout đầu tiên
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
          consecutiveClosesBelow++;
          if (consecutiveClosesBelow >= minConfirm) {
            allBreaks.push({
              type: 'BOS',
              direction: 'BEARISH',
              startIndex: activeTrough.index,
              breakIndex: k - minConfirm + 1, // Vẽ đường nét đứt đến cây nến breakout đầu tiên
              price: activeTrough.price,
              label: 'BOS',
            });
            activeTroughBroken = true;
            consecutiveClosesBelow = 0;
          }
        } else {
          consecutiveClosesBelow = 0;
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
              breakIndex: k - minConfirm + 1, // Vẽ đường nét đứt đến cây nến breakout đầu tiên
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
          consecutiveClosesAbove++;
          if (consecutiveClosesAbove >= minConfirm) {
            allBreaks.push({
              type: 'BOS',
              direction: 'BULLISH',
              startIndex: activePeak.index,
              breakIndex: k - minConfirm + 1, // Vẽ đường nét đứt đến cây nến breakout đầu tiên
              price: activePeak.price,
              label: 'BOS',
            });
            activePeakBroken = true;
            consecutiveClosesAbove = 0;
          }
        } else {
          consecutiveClosesAbove = 0;
        }
      }
    }

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

function hexToRgba(hex: string, alpha: number = 0.5): string {
  if (!hex || typeof hex !== 'string') return `rgba(34, 197, 94, ${alpha})`;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return `rgba(34, 197, 94, ${alpha})`;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
      calcParams: [9, 1, 1, 3, 1], // [windowSize, showZigzag, showChochBos, confirmBars, showPercent]
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
        const showPercent = indicator?.calcParams?.[4] !== undefined ? Boolean(indicator.calcParams[4]) : true;

        // Đọc màu sắc động từ styles hoặc fallback về mã màu chuẩn
        const customStyles = (indicator as any)?.styles || {};
        const zigzagColor = customStyles.zigzagColor || '#eab308';
        const peakColor = customStyles.peakColor || '#ef4444';
        const troughColor = customStyles.troughColor || '#10b981';
        const showPeak = customStyles.showPeak !== undefined ? Boolean(customStyles.showPeak) : true;
        const showTrough = customStyles.showTrough !== undefined ? Boolean(customStyles.showTrough) : true;
        const bullishColor = customStyles.bullishBreakColor || '#10b981';
        const bearishColor = customStyles.bearishBreakColor || '#ef4444';

        // 1. Vẽ đường Zigzag nét đứt màu vàng hổ phách nối các đỉnh - đáy (nếu được bật)
        if (showZigzag) {
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = zigzagColor;
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
            const color = isBullish ? bullishColor : bearishColor;

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

            // Vẽ huy hiệu nhãn (Badge) phía trên đoạn đường nét đứt
            const midX = (x1 + x2) / 2;
            const badgeText = b.label; // 'CHoCH' hoặc 'BOS'
            ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
            const textWidth = ctx.measureText(badgeText).width;
            const badgeW = textWidth + 8;
            const badgeH = 14;
            const badgeX = midX - badgeW / 2;
            const badgeY = isBullish ? y - badgeH - 3 : y + 3; // Xu hướng tăng nằm TRÊN, xu hướng giảm nằm DƯỚI đường nét đứt

            ctx.setLineDash([]);
            // Nền badge bán trong suốt
            ctx.fillStyle = isBullish ? hexToRgba(bullishColor, 0.22) : hexToRgba(bearishColor, 0.22);
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
            ctx.fillText(badgeText, midX, badgeY + badgeH / 2 + 0.5);

            ctx.restore();
          }
        }

        // 3. Vẽ nhãn giá và cấu trúc đỉnh đáy (HH, LH, HL, LL) kèm % tăng giảm
        const from = Math.max(0, visibleRange.from - 2);
        const to = Math.min(results.length, visibleRange.to + 2);

        for (let i = from; i < to; i++) {
          const item = results[i];
          if (!item || !item.confirmedType) continue;

          const x = xAxis.convertToPixel(i);
          const y = yAxis.convertToPixel(item.price);
          const priceStr = Math.round(item.price).toLocaleString('en-US');
          const structLabel = item.structureLabel; // 'HH' | 'LH' | 'HL' | 'LL'
          const pctStr = (showPercent && item.diffPct !== undefined)
            ? ` (${item.diffPct > 0 ? '+' : ''}${item.diffPct.toFixed(1)}%)`
            : '';

          ctx.save();
          ctx.font = 'bold 10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

          if (item.confirmedType === 'PEAK' && showPeak) {
            // ĐỈNH: Màu peakColor (mặc định đỏ), hiển thị nhãn HH/LH kèm giá & %
            ctx.fillStyle = peakColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const text = (structLabel ? `${structLabel} ${priceStr}` : priceStr) + pctStr;
            ctx.fillText(text, x, y - 4);
          } else if (item.confirmedType === 'TROUGH' && showTrough) {
            // ĐÁY: Màu troughColor (mặc định xanh), hiển thị nhãn HL/LL kèm giá & %
            ctx.fillStyle = troughColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const text = (structLabel ? `${structLabel} ${priceStr}` : priceStr) + pctStr;
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
