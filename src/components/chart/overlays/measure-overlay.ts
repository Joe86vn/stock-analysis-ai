import {
  registerOverlay,
  OverlayTemplate,
  OverlayCreateFiguresCallbackParams,
  OverlayFigure,
} from 'klinecharts';

let isMeasureOverlayRegistered = false;

export const MEASURE_OVERLAY_NAME = 'measure';

export const measureOverlayTemplate: OverlayTemplate = {
  name: MEASURE_OVERLAY_NAME,
  totalStep: 3,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: false,
  createPointFigures: ({
    coordinates,
    overlay,
  }: OverlayCreateFiguresCallbackParams): OverlayFigure[] => {
    if (coordinates.length < 2) return [];

    const c1 = coordinates[0];
    const c2 = coordinates[1];
    const p1 = overlay.points?.[0];
    const p2 = overlay.points?.[1];

    const val1 = p1?.value ?? 0;
    const val2 = p2?.value ?? 0;

    const diffPrice = val2 - val1;
    const diffPct = val1 !== 0 ? (diffPrice / val1) * 100 : 0;
    const isUp = diffPrice >= 0;

    // Số nến và số ngày
    const dataIdx1 = p1?.dataIndex;
    const dataIdx2 = p2?.dataIndex;
    const barsCount =
      dataIdx1 !== undefined && dataIdx2 !== undefined
        ? Math.abs(dataIdx2 - dataIdx1)
        : undefined;

    const ts1 = p1?.timestamp;
    const ts2 = p2?.timestamp;
    const daysCount =
      ts1 !== undefined && ts2 !== undefined
        ? Math.round(Math.abs(ts2 - ts1) / (1000 * 60 * 60 * 24))
        : undefined;

    const boxX = Math.min(c1.x, c2.x);
    const boxY = Math.min(c1.y, c2.y);
    const boxW = Math.max(Math.abs(c2.x - c1.x), 1);
    const boxH = Math.max(Math.abs(c2.y - c1.y), 1);

    const sign = isUp ? '+' : '';
    const diffPriceStr = Math.round(diffPrice).toLocaleString('en-US');
    const diffPctStr = diffPct.toFixed(2);
    const barsText = barsCount !== undefined ? `${barsCount} nến` : '';
    const daysText = daysCount !== undefined && daysCount > 0 ? `${daysCount} ngày` : '';
    const timeInfo = [barsText, daysText].filter(Boolean).join(' • ');

    const labelText = `${isUp ? '▲ +' : '▼ '}${diffPriceStr} đ (${sign}${diffPctStr}%) ${
      timeInfo ? `| ${timeInfo}` : ''
    }`;

    // Đặt nhãn ở giữa theo chiều ngang và cách đỉnh/đáy 14px
    const badgeX = (c1.x + c2.x) / 2;
    let badgeY = isUp ? boxY - 14 : boxY + boxH + 14;
    // Đảm bảo không tràn ra ngoài mép trên màn hình
    if (badgeY < 18) {
      badgeY = boxY + 14;
    }

    const figures: OverlayFigure[] = [
      // 1. Khung hộp diện tích phủ (Shaded Area Box)
      {
        type: 'rect',
        attrs: {
          x: boxX,
          y: boxY,
          width: boxW,
          height: boxH,
        },
        styles: {
          style: 'stroke_fill',
          color: isUp ? 'rgba(16, 185, 129, 0.16)' : 'rgba(239, 68, 68, 0.16)',
          borderColor: isUp ? '#10b981' : '#ef4444',
          borderSize: 1.2,
          borderStyle: 'dashed',
          borderDashedValue: [4, 3],
        },
      },
      // 2. Đường chéo nối điểm bắt đầu và điểm kết thúc
      {
        type: 'line',
        attrs: {
          coordinates: [c1, c2],
        },
        styles: {
          style: 'dashed',
          color: isUp ? '#10b981' : '#ef4444',
          size: 1.5,
          dashedValue: [3, 3],
        },
      },
      // 3. Huy hiệu nhãn thông số đo lường
      {
        type: 'text',
        ignoreEvent: true,
        attrs: {
          x: badgeX,
          y: badgeY,
          text: labelText,
          align: 'center',
          baseline: 'middle',
        },
        styles: {
          color: '#ffffff',
          backgroundColor: isUp ? 'rgba(5, 150, 105, 0.95)' : 'rgba(220, 38, 38, 0.95)',
          borderColor: isUp ? '#34d399' : '#f87171',
          borderSize: 1,
          borderRadius: 5,
          paddingLeft: 8,
          paddingRight: 8,
          paddingTop: 4,
          paddingBottom: 4,
          size: 11,
          weight: 'bold',
          family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
      },
    ];

    return figures;
  },
};

export function registerMeasureOverlay(): void {
  if (isMeasureOverlayRegistered) return;
  try {
    registerOverlay(measureOverlayTemplate);
    isMeasureOverlayRegistered = true;
  } catch (err) {
    console.error('Failed to register measure overlay:', err);
  }
}
