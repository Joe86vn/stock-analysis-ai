export interface BaseOhlcBar {
  date: string;
  fullDate: string; // YYYY-MM-DD
  openPrice: number;
  highestPrice: number;
  lowestPrice: number;
  closePrice: number;
  range?: [number, number];
  volume: number;
}

/**
 * Lấy ngày Thứ Hai của tuần cho một ngày YYYY-MM-DD theo chuẩn ISO
 */
export function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

/**
 * Gộp chuỗi nến Ngày (Daily) thành chuỗi nến Tuần (Weekly) chuẩn xác 100%
 * - Open: Giá mở cửa của phiên đầu tiên trong tuần (thường là Thứ Hai)
 * - High: Max giá cao nhất trong tuần
 * - Low: Min giá thấp nhất trong tuần
 * - Close: Giá đóng cửa của phiên cuối cùng trong tuần (thường là Thứ Sáu)
 * - Volume: Tổng khối lượng khớp lệnh trong tuần
 * - FullDate: Ngày Thứ Hai của tuần đó (YYYY-MM-DD)
 */
export function resampleDailyToWeekly<T extends BaseOhlcBar>(dailyBars: T[]): T[] {
  if (!dailyBars || dailyBars.length === 0) return [];

  const weeklyMap = new Map<string, T>();

  for (const bar of dailyBars) {
    if (!bar || bar.closePrice <= 0) continue;
    const mondayKey = getMondayOfWeek(bar.fullDate);

    if (!weeklyMap.has(mondayKey)) {
      const dt = new Date(mondayKey + 'T00:00:00Z');
      const day = String(dt.getUTCDate()).padStart(2, '0');
      const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const dateStr = `${day}/${month}`;

      weeklyMap.set(mondayKey, {
        ...bar,
        date: dateStr,
        fullDate: mondayKey,
        openPrice: bar.openPrice,
        highestPrice: bar.highestPrice,
        lowestPrice: bar.lowestPrice,
        closePrice: bar.closePrice,
        range: [bar.lowestPrice, bar.highestPrice],
        volume: bar.volume,
      });
    } else {
      const existing = weeklyMap.get(mondayKey)!;
      existing.highestPrice = Math.max(existing.highestPrice, bar.highestPrice);
      existing.lowestPrice = Math.min(existing.lowestPrice, bar.lowestPrice);
      existing.closePrice = bar.closePrice; // Cập nhật đến phiên cuối tuần
      existing.range = [existing.lowestPrice, existing.highestPrice];
      existing.volume += bar.volume;
    }
  }

  return Array.from(weeklyMap.values());
}

/**
 * Gộp chuỗi nến Ngày (Daily) thành chuỗi nến Tháng (Monthly) chuẩn xác 100%
 * - Open: Giá mở cửa của phiên đầu tiên trong tháng
 * - High: Max giá cao nhất trong tháng
 * - Low: Min giá thấp nhất trong tháng
 * - Close: Giá đóng cửa của phiên cuối cùng trong tháng
 * - Volume: Tổng khối lượng khớp lệnh trong tháng
 * - FullDate: Ngày đầu tiên của tháng (YYYY-MM-01)
 */
export function resampleDailyToMonthly<T extends BaseOhlcBar>(dailyBars: T[]): T[] {
  if (!dailyBars || dailyBars.length === 0) return [];

  const monthlyMap = new Map<string, T>();

  for (const bar of dailyBars) {
    if (!bar || bar.closePrice <= 0) continue;
    const monthKey = bar.fullDate.slice(0, 7) + '-01';

    if (!monthlyMap.has(monthKey)) {
      const mStr = bar.fullDate.slice(5, 7);
      const yStr = bar.fullDate.slice(2, 4);
      const dateStr = `T${mStr}/${yStr}`;

      monthlyMap.set(monthKey, {
        ...bar,
        date: dateStr,
        fullDate: monthKey,
        openPrice: bar.openPrice,
        highestPrice: bar.highestPrice,
        lowestPrice: bar.lowestPrice,
        closePrice: bar.closePrice,
        range: [bar.lowestPrice, bar.highestPrice],
        volume: bar.volume,
      });
    } else {
      const existing = monthlyMap.get(monthKey)!;
      existing.highestPrice = Math.max(existing.highestPrice, bar.highestPrice);
      existing.lowestPrice = Math.min(existing.lowestPrice, bar.lowestPrice);
      existing.closePrice = bar.closePrice; // Cập nhật đến phiên cuối tháng
      existing.range = [existing.lowestPrice, existing.highestPrice];
      existing.volume += bar.volume;
    }
  }

  return Array.from(monthlyMap.values());
}
