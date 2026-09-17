import {
  registerOverlay,
  OverlayTemplate,
  OverlayCreateFiguresCallbackParams,
  OverlayFigure,
} from 'klinecharts';

let isDividendMarkerRegistered = false;

export const DIVIDEND_MARKER_OVERLAY_NAME = 'dividendMarker';

export interface DividendMarkerExtendData {
  type: 'cash' | 'stock' | 'issue';
  title: string;
  ratio?: number;
  dateStr?: string;
  shortLabel?: string;
}

export const dividendMarkerOverlayTemplate: OverlayTemplate = {
  name: DIVIDEND_MARKER_OVERLAY_NAME,
  totalStep: 1,
  needDefaultPointFigure: false,
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: false,
  createPointFigures: ({
    coordinates,
    overlay,
  }: OverlayCreateFiguresCallbackParams): OverlayFigure[] => {
    if (coordinates.length === 0) return [];

    const coord = coordinates[0];
    const data = (overlay.extendData as DividendMarkerExtendData) || {
      type: 'cash',
      title: 'Cổ tức',
    };

    const isCash = data.type === 'cash';
    const markerColor = isCash ? '#10B981' : '#3B82F6';
    const letter = isCash ? 'D' : 'S';

    const cx = coord.x;
    // Đặt marker ngay dưới chân cây nến (cách điểm Low 14px)
    const cy = coord.y + 14;
    const r = 8;

    const figures: OverlayFigure[] = [
      // 1. Đường nối chấm từ chân nến xuống nốt tròn
      {
        type: 'line',
        attrs: {
          coordinates: [
            { x: cx, y: coord.y },
            { x: cx, y: cy - r },
          ],
        },
        styles: {
          style: 'dashed',
          color: markerColor,
          size: 1.2,
          dashedValue: [2, 2],
        },
        ignoreEvent: true,
      },
      // 2. Nốt tròn đại diện sự kiện cổ tức (D hoặc S)
      {
        type: 'circle',
        attrs: {
          x: cx,
          y: cy,
          r: r,
        },
        styles: {
          style: 'fill',
          color: markerColor,
          borderColor: '#FFFFFF',
          borderSize: 1.5,
        },
      },
      // 3. Chữ D / S màu trắng bên trong nốt tròn
      {
        type: 'text',
        attrs: {
          x: cx,
          y: cy,
          text: letter,
          align: 'center',
          baseline: 'middle',
        },
        styles: {
          color: '#FFFFFF',
          size: 9.5,
          weight: 'bold',
          family: 'sans-serif',
        },
        ignoreEvent: true,
      },
    ];

    // Nếu có nhãn tóm tắt ngắn (ví dụ: "10%" hoặc "1.5K"), hiển thị nhãn nhỏ bên dưới nốt tròn
    if (data.shortLabel) {
      figures.push({
        type: 'text',
        attrs: {
          x: cx,
          y: cy + r + 7,
          text: data.shortLabel,
          align: 'center',
          baseline: 'middle',
        },
        styles: {
          color: '#FFFFFF',
          backgroundColor: isCash ? 'rgba(5, 150, 105, 0.92)' : 'rgba(37, 99, 235, 0.92)',
          borderColor: isCash ? '#34d399' : '#60a5fa',
          borderSize: 0.8,
          borderRadius: 3,
          paddingLeft: 3,
          paddingRight: 3,
          paddingTop: 1,
          paddingBottom: 1,
          size: 8.5,
          weight: 'bold',
          family: 'sans-serif',
        },
        ignoreEvent: true,
      });
    }

    return figures;
  },
};

export function registerDividendMarkerOverlay(): void {
  if (isDividendMarkerRegistered) return;
  registerOverlay(dividendMarkerOverlayTemplate);
  isDividendMarkerRegistered = true;
}
