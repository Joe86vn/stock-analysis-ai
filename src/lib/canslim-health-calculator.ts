export type MarketStatus = 'confirmed_uptrend' | 'uptrend_under_pressure' | 'correction';

export interface DayData {
  date: string;
  close: number;
  low: number;
  volume: number;
}

export interface HealthScoreResult {
  score: number;
  status: MarketStatus;
  distributionDays: number;
  isBelowMa20: boolean;
  ma20: number | null;
}

/**
 * Đếm số ngày phân phối active theo quy tắc O'Neil / IBD tính tới phiên targetIndex:
 * - Giảm > 0.2% (-0.002) VÀ Khối lượng > phiên trước.
 * - Hết hiệu lực sau 25 phiên giao dịch.
 * - Hết hiệu lực nếu chỉ số tăng ≥ 5% so với giá đóng cửa phiên phân phối đó.
 */
export function countDistributionDays(days: DayData[], targetIndex: number): number {
  if (targetIndex < 1) return 0;

  const distribDays: { sessionIndex: number; close: number }[] = [];

  for (let i = 1; i <= targetIndex; i++) {
    const prev = days[i - 1];
    const curr = days[i];
    if (!prev || !curr) continue;

    const pctChange = (curr.close - prev.close) / prev.close;
    const isDistribution = pctChange <= -0.002 && curr.volume > prev.volume;
    if (isDistribution) {
      distribDays.push({ sessionIndex: i, close: curr.close });
    }
  }

  const lastClose = days[targetIndex].close;

  const active = distribDays.filter((d) => {
    const sessionAge = targetIndex - d.sessionIndex;
    if (sessionAge > 25) return false;
    if (lastClose >= d.close * 1.05) return false;
    return true;
  });

  return active.length;
}

export interface FtdAnalysis {
  ftdDetected: boolean;
  ftdIndex: number | null;
  postFtdPenalty: number;
  ftdFailureProb: number | null;
  postFtdDistribDay: number | null;
}

/**
 * Phân tích Bùng nổ theo đà (FTD) từ phiên 4 đến 10 của đợt nỗ lực phục hồi
 */
export function analyzeFTD(days: DayData[], targetIndex: number): FtdAnalysis {
  let rallyStartLow = Infinity;
  let rallyDayCount = 0;
  let inConfirmedUptrend = false;
  let lastFtdIdx: number | null = null;

  const maxLen = Math.min(days.length - 1, targetIndex);

  for (let i = 1; i <= maxLen; i++) {
    const prev = days[i - 1];
    const curr = days[i];
    const pct = (curr.close - prev.close) / prev.close;

    if (inConfirmedUptrend) {
      if (curr.close < prev.close * 0.95) {
        inConfirmedUptrend = false;
        rallyDayCount = 0;
        rallyStartLow = Infinity;
        lastFtdIdx = null;
      }
    } else {
      if (rallyDayCount === 0) {
        if (pct > 0) {
          rallyDayCount = 1;
          rallyStartLow = prev.low ?? prev.close;
        }
      } else {
        if (curr.close < rallyStartLow) {
          if (pct > 0) {
            rallyDayCount = 1;
            rallyStartLow = prev.close;
          } else {
            rallyDayCount = 0;
            rallyStartLow = Infinity;
          }
        } else {
          rallyDayCount++;
          if (rallyDayCount >= 4 && rallyDayCount <= 10 && pct > 0.0125 && curr.volume > prev.volume) {
            lastFtdIdx = i;
            inConfirmedUptrend = true;
          }
        }
      }
    }
  }

  if (lastFtdIdx === null) {
    return { ftdDetected: false, ftdIndex: null, postFtdPenalty: 0, ftdFailureProb: null, postFtdDistribDay: null };
  }

  let penalty = 0;
  let failProb: number | null = null;
  let distribDay: number | null = null;

  for (let i = lastFtdIdx + 1; i < Math.min(maxLen + 1, lastFtdIdx + 6); i++) {
    const prev = days[i - 1];
    const curr = days[i];
    const pctChange = (curr.close - prev.close) / prev.close;
    const isDistrib = pctChange <= -0.002 && curr.volume > prev.volume;

    if (isDistrib) {
      const offset = i - lastFtdIdx;
      if (offset === 1 || offset === 2) {
        if (3 > penalty) {
          penalty = 3;
          failProb = 95;
          distribDay = offset;
        }
      } else if (offset === 3) {
        if (2 > penalty) {
          penalty = 2;
          failProb = 70;
          distribDay = offset;
        }
      } else if (offset === 4 || offset === 5) {
        if (1 > penalty) {
          penalty = 1;
          failProb = 30;
          distribDay = offset;
        }
      }
    }
  }

  return {
    ftdDetected: true,
    ftdIndex: lastFtdIdx,
    postFtdPenalty: penalty,
    ftdFailureProb: failProb,
    postFtdDistribDay: distribDay,
  };
}

/**
 * Tính điểm và Trạng thái Sức khỏe Thị trường tại phiên targetIndex
 */
export function calculateHealthScoreForBar(days: DayData[], targetIndex: number): HealthScoreResult {
  if (days.length === 0 || targetIndex < 0 || targetIndex >= days.length) {
    return { score: 5, status: 'uptrend_under_pressure', distributionDays: 0, isBelowMa20: false, ma20: null };
  }

  // 1. Tính MA20
  let ma20: number | null = null;
  if (targetIndex >= 19) {
    let sum = 0;
    for (let k = targetIndex - 19; k <= targetIndex; k++) {
      sum += days[k].close;
    }
    ma20 = sum / 20;
  }

  const currentClose = days[targetIndex].close;
  const isBelowMa20 = ma20 !== null ? currentClose < ma20 : false;

  // 2. Đếm số ngày phân phối & phân tích FTD
  const distDays = countDistributionDays(days, targetIndex);
  const ftdInfo = analyzeFTD(days, targetIndex);

  let baseScore = 10;
  let postFtdPenalty = 0;
  let otherDistribDays = distDays;

  if (ftdInfo.ftdDetected && ftdInfo.ftdIndex !== null) {
    const sessionsSinceFtd = targetIndex - ftdInfo.ftdIndex;
    if (sessionsSinceFtd <= 5) {
      baseScore = 7;
      postFtdPenalty = ftdInfo.postFtdPenalty;
      if (ftdInfo.postFtdDistribDay !== null) {
        otherDistribDays = Math.max(0, distDays - 1);
      }
    } else {
      if (ftdInfo.postFtdDistribDay !== null) {
        baseScore = 7;
        postFtdPenalty = ftdInfo.postFtdPenalty;
        otherDistribDays = Math.max(0, distDays - 1);
      } else {
        baseScore = 10;
        postFtdPenalty = 0;
        otherDistribDays = distDays;
      }
    }
  }

  const rawScore = baseScore - postFtdPenalty - otherDistribDays - (isBelowMa20 ? 1 : 0);
  const score = Math.max(0, Math.min(10, rawScore));

  let status: MarketStatus = 'uptrend_under_pressure';
  if (score >= 7) status = 'confirmed_uptrend';
  else if (score < 5) status = 'correction';

  return {
    score,
    status,
    distributionDays: distDays,
    isBelowMa20,
    ma20,
  };
}

/**
 * Mảng tính sẵn Health Score cho toàn bộ lịch sử nến VN-Index
 */
export function calculateHistoricalHealthScores(days: DayData[]): HealthScoreResult[] {
  const n = days.length;
  const result: HealthScoreResult[] = new Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = calculateHealthScoreForBar(days, i);
  }
  return result;
}
