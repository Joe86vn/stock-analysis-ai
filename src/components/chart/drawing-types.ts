export type DrawingToolType =
  | 'cursor'
  | 'measure'
  | 'segment'
  | 'straightLine'
  | 'rayLine'
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
