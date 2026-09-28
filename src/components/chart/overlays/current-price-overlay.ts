import {
  registerOverlay,
  OverlayTemplate,
  OverlayCreateFiguresCallbackParams,
  OverlayFigure,
} from 'klinecharts';

let isCurrentPriceOverlayRegistered = false;

export const CURRENT_PRICE_OVERLAY_NAME = 'currentPriceBadge';

export interface CurrentPriceExtendData {
  price: number;
  change?: number;
  changePercent?: number;
}

export const currentPriceOverlayTemplate: OverlayTemplate = {
  name: CURRENT_PRICE_OVERLAY_NAME,
  totalStep: 1,
  needDefaultPointFigure: false,
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: false,
  lock: true,

  createPointFigures: ({
    coordinates,
    bounding,
    overlay,
  }: OverlayCreateFiguresCallbackParams): OverlayFigure[] => {
    if (coordinates.length === 0) return [];
    const y = coordinates[0].y;
    const data = (overlay.extendData as CurrentPriceExtendData) || {};
    const changePct = typeof data.changePercent === 'number' ? data.changePercent : 0;
    const isUp = changePct > 0;
    const isDown = changePct < 0;
    const lineColor = isUp
      ? 'rgba(16, 185, 129, 0.5)'
      : isDown
      ? 'rgba(244, 63, 94, 0.5)'
      : 'rgba(245, 158, 11, 0.5)';

    return [
      {
        type: 'line',
        attrs: {
          coordinates: [
            { x: 0, y },
            { x: bounding.width, y },
          ],
        },
        styles: {
          style: 'dashed',
          dashedValue: [3, 3],
          color: lineColor,
          size: 1,
        },
        ignoreEvent: true,
      },
    ];
  },

  createYAxisFigures: ({
    overlay,
    coordinates,
    bounding,
  }: OverlayCreateFiguresCallbackParams): OverlayFigure[] => {
    if (coordinates.length === 0) return [];
    const coord = coordinates[0];
    const data = (overlay.extendData as CurrentPriceExtendData) || {};
    const price = data.price ?? overlay.points?.[0]?.value ?? 0;
    if (!price || isNaN(price)) return [];

    const changePct = typeof data.changePercent === 'number' ? data.changePercent : 0;
    const isCeiling = changePct >= 6.7;
    const isFloor = changePct <= -6.7;
    const isUp = changePct > 0;
    const isDown = changePct < 0;

    // Màu sắc chuẩn bảng điện TTCK Việt Nam đồng bộ với sidepanel ValueX
    const bgColor = isCeiling
      ? '#9333ea' // Tím trần
      : isFloor
      ? '#0891b2' // Xanh sàn
      : isUp
      ? '#059669' // Xanh lá tăng (emerald-600)
      : isDown
      ? '#e11d48' // Đỏ giảm (rose-600)
      : '#d97706'; // Hổ phách tham chiếu (amber-600)

    const priceStr =
      price >= 1000
        ? Math.round(price).toLocaleString('vi-VN')
        : price.toFixed(2);
    const sign = isUp ? '+' : '';
    const pctStr = `${sign}${changePct.toFixed(2)}%`;

    const badgeHeight = 30;
    const yCenter = coord.y;
    const width = Math.max(bounding?.width || 66, 66);

    return [
      // 1. Khối nền trục giá (Viền trắng mờ tinh tế, bo góc 4px thanh thoát)
      {
        type: 'rect',
        attrs: {
          x: 0,
          y: yCenter - badgeHeight / 2,
          width,
          height: badgeHeight,
        },
        styles: {
          style: 'stroke_fill',
          color: bgColor,
          borderColor: 'rgba(255, 255, 255, 0.3)',
          borderSize: 1,
          borderRadius: 4,
        },
        ignoreEvent: true,
      },
      // 2. Nhãn giá hiện tại (Dòng 1 - Font mono sắc nét, tương phản cao)
      {
        type: 'text',
        attrs: {
          x: width / 2,
          y: yCenter - 5.5,
          text: priceStr,
          align: 'center',
          baseline: 'middle',
        },
        styles: {
          color: '#ffffff',
          size: 11,
          weight: 'bold',
          family: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        },
        ignoreEvent: true,
      },
      // 3. Nhãn % tăng giảm (Dòng 2 - Font mono cân xứng, dễ đọc)
      {
        type: 'text',
        attrs: {
          x: width / 2,
          y: yCenter + 6.5,
          text: pctStr,
          align: 'center',
          baseline: 'middle',
        },
        styles: {
          color: 'rgba(255, 255, 255, 0.95)',
          size: 9.5,
          weight: 'bold',
          family: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        },
        ignoreEvent: true,
      },
    ];
  },
};

export function registerCurrentPriceOverlay(): void {
  if (isCurrentPriceOverlayRegistered) return;
  registerOverlay(currentPriceOverlayTemplate);
  isCurrentPriceOverlayRegistered = true;
}
