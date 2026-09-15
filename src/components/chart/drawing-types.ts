export type DrawingToolType =
  | 'cursor'
  | 'straightLine'
  | 'rayLine'
  | 'segment'
  | 'horizontalStraightLine'
  | 'priceLine'
  | 'rect'
  | 'parallelStraightLine'
  | 'fibonacciLine'
  | 'brush'
  | 'simpleAnnotation';

export interface ChartPoint {
  time: string; // fullDate: YYYY-MM-DD
  price: number;
}
