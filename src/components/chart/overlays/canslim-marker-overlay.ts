import {
  registerOverlay,
  OverlayTemplate,
  OverlayCreateFiguresCallbackParams,
  OverlayFigure,
} from 'klinecharts';

let isCanslimMarkerRegistered = false;

export const CANSLIM_MARKER_OVERLAY_NAME = 'canslimMarker';

export interface CanslimMarkerExtendData {
  type: 'distribution' | 'ftd' | 'rallyDay1';
  label?: string;
  isDistribActive?: boolean;
}

export const canslimMarkerOverlayTemplate: OverlayTemplate = {
  name: CANSLIM_MARKER_OVERLAY_NAME,
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
    const data = (overlay.extendData as CanslimMarkerExtendData) || {
      type: 'distribution',
      label: 'D',
    };

    const cx = coord.x;
    const figures: OverlayFigure[] = [];

    if (data.type === 'distribution') {
      // 🔴 Phiên phân phối CANSLIM (vẽ phía trên nến: High - 12px)
      const cy = coord.y - 14;
      const r = 6.5;
      const isActive = data.isDistribActive ?? true;
      const color = isActive ? '#ef4444' : '#6b7280';

      figures.push(
        // Line từ High nến lên nốt D
        {
          type: 'line',
          attrs: {
            coordinates: [
              { x: cx, y: coord.y },
              { x: cx, y: cy + r },
            ],
          },
          styles: {
            style: isActive ? 'solid' : 'dashed',
            color,
            size: 1,
            dashedValue: [2, 2],
          },
          ignoreEvent: true,
        },
        // Chấm tròn D màu đỏ/xám
        {
          type: 'circle',
          attrs: {
            x: cx,
            y: cy,
            r: r,
          },
          styles: {
            style: 'fill',
            color,
            borderColor: '#FFFFFF',
            borderSize: 1,
          },
        },
        // Chữ D màu trắng
        {
          type: 'text',
          attrs: {
            x: cx,
            y: cy,
            text: 'D',
            align: 'center',
            baseline: 'middle',
          },
          styles: {
            color: '#FFFFFF',
            size: 8,
            weight: 'bold',
            family: 'sans-serif',
          },
          ignoreEvent: true,
        }
      );
    } else if (data.type === 'ftd') {
      // 🟢 Phiên Bùng Nổ Theo Đà FTD (vẽ phía dưới nến: Low + 14px)
      const cy = coord.y + 14;
      const w = 26;
      const h = 13;

      figures.push(
        // Line từ Low nến xuống nhãn FTD
        {
          type: 'line',
          attrs: {
            coordinates: [
              { x: cx, y: coord.y },
              { x: cx, y: cy - h / 2 },
            ],
          },
          styles: {
            style: 'solid',
            color: '#22c55e',
            size: 1.2,
          },
          ignoreEvent: true,
        },
        // Khung chữ FTD bo góc xanh lá
        {
          type: 'rect',
          attrs: {
            x: cx - w / 2,
            y: cy - h / 2,
            width: w,
            height: h,
          },
          styles: {
            style: 'fill',
            color: '#22c55e',
            borderColor: '#FFFFFF',
            borderSize: 1,
            borderRadius: 3,
          },
        },
        // Chữ FTD
        {
          type: 'text',
          attrs: {
            x: cx,
            y: cy,
            text: 'FTD',
            align: 'center',
            baseline: 'middle',
          },
          styles: {
            color: '#FFFFFF',
            size: 7.5,
            weight: 'bold',
            family: 'sans-serif',
          },
          ignoreEvent: true,
        }
      );
    } else if (data.type === 'rallyDay1') {
      // 🔵 Phiên Phục Hồi Đáy 1 (vẽ phía dưới nến: Low + 14px)
      const cy = coord.y + 14;
      const w = 28;
      const h = 13;

      figures.push(
        // Line từ Low nến xuống nhãn Đáy 1
        {
          type: 'line',
          attrs: {
            coordinates: [
              { x: cx, y: coord.y },
              { x: cx, y: cy - h / 2 },
            ],
          },
          styles: {
            style: 'dashed',
            color: '#3b82f6',
            size: 1,
            dashedValue: [2, 2],
          },
          ignoreEvent: true,
        },
        // Khung chữ Đáy 1 bo góc xanh dương
        {
          type: 'rect',
          attrs: {
            x: cx - w / 2,
            y: cy - h / 2,
            width: w,
            height: h,
          },
          styles: {
            style: 'fill',
            color: '#3b82f6',
            borderColor: '#FFFFFF',
            borderSize: 1,
            borderRadius: 3,
          },
        },
        // Chữ Đáy 1
        {
          type: 'text',
          attrs: {
            x: cx,
            y: cy,
            text: 'Đáy 1',
            align: 'center',
            baseline: 'middle',
          },
          styles: {
            color: '#FFFFFF',
            size: 7,
            weight: 'bold',
            family: 'sans-serif',
          },
          ignoreEvent: true,
        }
      );
    }

    return figures;
  },
};

export function registerCanslimMarkerOverlay(): void {
  if (isCanslimMarkerRegistered) return;
  registerOverlay(canslimMarkerOverlayTemplate);
  isCanslimMarkerRegistered = true;
}
