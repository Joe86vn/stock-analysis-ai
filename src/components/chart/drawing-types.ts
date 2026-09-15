export type DrawingToolType =
  | 'cursor'
  | 'trendline'
  | 'horizontal'
  | 'box'
  | 'measure'
  | 'fibonacci';

export interface ChartPoint {
  time: string; // fullDate: YYYY-MM-DD
  price: number;
}

export interface DrawingItem {
  id: string;
  type: DrawingToolType;
  p1: ChartPoint;
  p2?: ChartPoint;
  color: string;
  lineWidth?: number;
  text?: string;
}

export const FIB_RATIOS = [
  { ratio: 0.0, color: '#94a3b8', label: '0.000' },
  { ratio: 0.236, color: '#f59e0b', label: '0.236' },
  { ratio: 0.382, color: '#22c55e', label: '0.382' },
  { ratio: 0.5, color: '#06b6d4', label: '0.500' },
  { ratio: 0.618, color: '#3b82f6', label: '0.618' },
  { ratio: 0.786, color: '#a855f7', label: '0.786' },
  { ratio: 1.0, color: '#ef4444', label: '1.000' },
];

export const DRAWING_COLORS = [
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#06b6d4', // Cyan
  '#ffffff', // White / Gray
];
