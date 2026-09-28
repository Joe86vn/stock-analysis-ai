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
  }: OverlayCreateFiguresCallbackParams): OverlayFigure[] => {
    if (coordinates.length === 0) return [];
    const y = coordinates[0].y;
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
          dashedValue: [4, 4],
          color: 'rgba(148, 163, 184, 0.4)',
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
    const isUp = changePct > 0;
    const isDown = changePct < 0;

    // Màu sắc theo chuẩn bảng điện VN: Xanh lá tăng, Đỏ giảm, Hổ phách/Vàng tham chiếu
    const bgColor = isUp ? '#16a34a' : isDown ? '#dc2626' : '#d97706';

    const priceStr =
      price >= 1000
        ? Math.round(price).toLocaleString('vi-VN')
        : price.toFixed(2);
    const sign = isUp ? '+' : '';
    const pctStr = `${sign}${changePct.toFixed(2)}%`;

    const badgeHeight = 28;
    const yCenter = coord.y;
    const width = Math.max(bounding?.width || 56, 56);

    return [
      // 1. Khối nền trục giá
      {
        type: 'rect',
        attrs: {
          x: 0,
          y: yCenter - badgeHeight / 2,
          width,
          height: badgeHeight,
        },
        styles: {
          style: 'fill',
          color: bgColor,
          borderColor: bgColor,
          borderSize: 0,
          borderRadius: 3,
        },
        ignoreEvent: true,
      },
      // 2. Nhãn giá hiện tại (Dòng 1)
      {
        type: 'text',
        attrs: {
          x: width / 2,
          y: yCenter - 5,
          text: priceStr,
          align: 'center',
          baseline: 'middle',
        },
        styles: {
          color: '#ffffff',
          size: 10.5,
          weight: 'bold',
          family: 'ui-sans-serif, system-ui, sans-serif',
        },
        ignoreEvent: true,
      },
      // 3. Nhãn % tăng giảm (Dòng 2 ngay dưới giá)
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
          color: '#ffffff',
          size: 9,
          weight: 'bold',
          family: 'ui-sans-serif, system-ui, sans-serif',
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
