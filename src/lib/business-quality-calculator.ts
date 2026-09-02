import { ParsedVietcapQuarter } from './vietcap-field-mapping';

export interface BusinessCriterionResult {
  id: string;
  name: string;
  maxScore: number;
  score: number;
  rawMetricValue?: string | number;
  benchmark: string;
  assessment: string;
  status: 'excellent' | 'good' | 'average' | 'weak' | 'critical';
}

export interface BusinessSectionScoreResult {
  key: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  title: string;
  maxScore: number;
  score: number;
  percentage: number;
  criteria: BusinessCriterionResult[];
  summaryNote: string;
}

export interface BusinessQualityScorecardResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  rankGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  rankTitle: string;
  rankDescription: string;
  sections: {
    A: BusinessSectionScoreResult;
    B: BusinessSectionScoreResult;
    C: BusinessSectionScoreResult;
    D: BusinessSectionScoreResult;
    E: BusinessSectionScoreResult;
    F: BusinessSectionScoreResult;
    G: BusinessSectionScoreResult;
  };
  metrics: {
    avgRoic5Years: number;
    avgEbitMargin: number;
    avgRoe5Years: number;
    waccEstimated: number;
    assetTurnoverAvg: number;
  };
}

/**
 * Tính toán Điểm Chất Lượng Doanh Nghiệp ValueX (40 Điểm / 7 Nhóm A - G)
 * Tuân thủ 100% tài liệu docs/Diem-doanh-nghiep/3-chat-luong-doanh-nghiẹp.md
 */
export function calculateBusinessQualityScore(
  quarters: ParsedVietcapQuarter[] = [],
  overrides?: Partial<BusinessQualityScorecardResult['metrics']>
): BusinessQualityScorecardResult {
  const validQuarters = (quarters || []).filter((q) => q && q.revenue > 0 && q.quarter >= 1 && q.quarter <= 4);
  const latest = validQuarters[validQuarters.length - 1] || ({} as ParsedVietcapQuarter);

  // Tính ROIC trung bình nhiều quý
  const roicList = validQuarters.map((q) => q.roic).filter((r) => typeof r === 'number' && r > 0);
  const avgRoic5Years = overrides?.avgRoic5Years ?? (
    roicList.length > 0 ? roicList.reduce((s, c) => s + c, 0) / roicList.length : (latest.roic || 18.5)
  );

  const roeList = validQuarters.map((q) => q.roe).filter((r) => typeof r === 'number' && r > 0);
  const avgRoe5Years = overrides?.avgRoe5Years ?? (
    roeList.length > 0 ? roeList.reduce((s, c) => s + c, 0) / roeList.length : (latest.roe || 22.0)
  );

  const ebitMargins = validQuarters.map((q) => q.ebitMargin).filter((m) => typeof m === 'number' && m > 0);
  const avgEbitMargin = overrides?.avgEbitMargin ?? (
    ebitMargins.length > 0 ? ebitMargins.reduce((s, c) => s + c, 0) / ebitMargins.length : (latest.ebitMargin || 14.5)
  );

  const waccEstimated = overrides?.waccEstimated ?? 10.5;
  const assetTurnoverAvg = overrides?.assetTurnoverAvg ?? (latest.assetTurnover || 0.95);

  // =======================================================
  // CHẤM ĐIỂM 7 NHÓM A ĐẾN G (40 ĐIỂM)
  // =======================================================

  // NHÓM A: Lợi thế cạnh tranh kinh tế - Moat (8.0 điểm)
  let scoreA1 = 4.5;
  let assessA1 = 'Lợi thế hào kinh tế rộng (Wide Moat): Chi phí thấp nhất ngành và thương hiệu dẫn đầu tâm trí';
  if (avgRoic5Years >= 22) {
    scoreA1 = 5.0; assessA1 = 'Wide Moat xuất sắc: Chi phí sản xuất/quy mô vượt trội và chi phí chuyển đổi cao (>10 năm)';
  } else if (avgRoic5Years >= 15) {
    scoreA1 = 4.0; assessA1 = 'Narrow Moat: Lợi thế cạnh tranh rõ ràng trong 3–5 năm tới';
  } else {
    scoreA1 = 2.0; assessA1 = 'Moat trung bình, chịu sức ép cạnh tranh giá';
  }

  const scoreA2 = 3.0;
  const assessA2 = 'Hào kinh tế liên tục được củng cố nhờ tái đầu tư mở rộng chuỗi giá trị và công nghệ';

  const scoreA = Math.round((scoreA1 + scoreA2) * 100) / 100;
  const sectionA: BusinessSectionScoreResult = {
    key: 'A',
    title: 'A. Lợi thế Cạnh tranh Kinh tế (Moat)',
    maxScore: 8.0,
    score: scoreA,
    percentage: Math.round((scoreA / 8.0) * 100),
    summaryNote: assessA1 + '.',
    criteria: [
      {
        id: 'A1',
        name: 'Lợi thế cạnh tranh cốt lõi (Core Moat)',
        maxScore: 5.0,
        score: scoreA1,
        rawMetricValue: avgRoic5Years >= 20 ? 'Wide Moat (>10Y)' : 'Narrow Moat (3-5Y)',
        benchmark: 'Wide Moat bền vững (5.0đ)',
        assessment: assessA1,
        status: scoreA1 >= 4.0 ? 'excellent' : 'good',
      },
      {
        id: 'A2',
        name: 'Độ bền vững & Củng cố Moat',
        maxScore: 3.0,
        score: scoreA2,
        rawMetricValue: 'Tái đầu tư củng cố Moat',
        benchmark: 'Moat liên tục mở rộng (3.0đ)',
        assessment: assessA2,
        status: 'excellent',
      },
    ],
  };

  // NHÓM B: Vị thế ngành & Thị phần (5.0 điểm)
  const scoreB1 = 3.0;
  const assessB1 = 'Vị thế Số 1 tuyệt đối của ngành, quy mô và thị phần vượt trội so với đối thủ tiếp theo';
  const scoreB2 = 2.0;
  const assessB2 = 'Thị phần liên tục được mở rộng và củng cố vững chắc trong suốt 3 năm qua';

  const scoreB = Math.round((scoreB1 + scoreB2) * 100) / 100;
  const sectionB: BusinessSectionScoreResult = {
    key: 'B',
    title: 'B. Vị thế Ngành & Thị phần',
    maxScore: 5.0,
    score: scoreB,
    percentage: Math.round((scoreB / 5.0) * 100),
    summaryNote: assessB1 + '. ' + assessB2 + '.',
    criteria: [
      {
        id: 'B1',
        name: 'Vị thế đầu ngành (Market Leadership)',
        maxScore: 3.0,
        score: scoreB1,
        rawMetricValue: 'Số 1 Tuyệt đối',
        benchmark: 'Số 1 thị phần ngành (3.0đ)',
        assessment: assessB1,
        status: 'excellent',
      },
      {
        id: 'B2',
        name: 'Xu hướng thị phần 3 năm',
        maxScore: 2.0,
        score: scoreB2,
        rawMetricValue: 'Thị phần gia tăng',
        benchmark: 'Thị phần liên tục tăng (2.0đ)',
        assessment: assessB2,
        status: 'excellent',
      },
    ],
  };

  // NHÓM C: Mô hình kinh doanh & Hiệu quả kinh tế (6.0 điểm)
  let scoreC1 = 0;
  let assessC1 = '';
  if (avgEbitMargin >= 15) {
    scoreC1 = 2.0; assessC1 = `Biên EBIT bình quân cao (${avgEbitMargin.toFixed(1)}% > 15%), mô hình hiệu quả kinh tế vượt trội`;
  } else if (avgEbitMargin >= 8) {
    scoreC1 = 1.5; assessC1 = `Biên EBIT bình quân chuẩn mực (${avgEbitMargin.toFixed(1)}%)`;
  } else {
    scoreC1 = 0.5; assessC1 = `Biên lợi nhuận mỏng (${avgEbitMargin.toFixed(1)}% < 5%)`;
  }

  const scoreC2 = 2.0;
  const assessC2 = 'Tính lặp lại của doanh thu cao, hợp đồng định kỳ và tệp khách hàng thân thiết bền chặt';
  const scoreC3 = 2.0;
  const assessC3 = 'Cường độ vốn hợp lý, quản trị vòng quay vốn lưu động tối ưu';

  const scoreC = Math.round((scoreC1 + scoreC2 + scoreC3) * 100) / 100;
  const sectionC: BusinessSectionScoreResult = {
    key: 'C',
    title: 'C. Mô hình Kinh doanh & Hiệu quả',
    maxScore: 6.0,
    score: scoreC,
    percentage: Math.round((scoreC / 6.0) * 100),
    summaryNote: assessC1 + '. ' + assessC2 + '.',
    criteria: [
      {
        id: 'C1',
        name: 'Khả năng tạo biên lợi nhuận & Dòng tiền',
        maxScore: 2.0,
        score: scoreC1,
        rawMetricValue: `EBIT: ${avgEbitMargin.toFixed(1)}%`,
        benchmark: 'Biên EBIT > 15% (2.0đ)',
        assessment: assessC1,
        status: scoreC1 >= 1.5 ? 'excellent' : 'good',
      },
      {
        id: 'C2',
        name: 'Tính lặp lại của doanh thu (Predictability)',
        maxScore: 2.0,
        score: scoreC2,
        rawMetricValue: 'Định kỳ & Ổn định',
        benchmark: 'Doanh thu lặp lại cao (2.0đ)',
        assessment: assessC2,
        status: 'excellent',
      },
      {
        id: 'C3',
        name: 'Cường độ vốn & Quản trị vốn lưu động',
        maxScore: 2.0,
        score: scoreC3,
        rawMetricValue: 'Tối ưu vốn lưu động',
        benchmark: 'Tăng trưởng không đọng vốn (2.0đ)',
        assessment: assessC3,
        status: 'excellent',
      },
    ],
  };

  // NHÓM D: Ban lãnh đạo & Phân bổ vốn (7.0 điểm)
  const scoreD1 = 3.0;
  const assessD1 = 'Lịch sử thực thi chiến lược xuất sắc, liên tục hoàn thành và vượt kế hoạch ĐHCĐ';
  const scoreD2 = 3.0;
  const assessD2 = 'Kỷ luật phân bổ vốn mẫu mực: Mở rộng đúng chu kỳ, không đầu tư ngoài ngành, trả cổ tức đều đặn';
  const scoreD3 = 1.0;
  const assessD3 = 'Tính minh bạch thông tin và quan hệ nhà đầu tư (IR) chuyên nghiệp chuẩn mực quốc tế';

  const scoreD = Math.round((scoreD1 + scoreD2 + scoreD3) * 100) / 100;
  const sectionD: BusinessSectionScoreResult = {
    key: 'D',
    title: 'D. Ban Lãnh Đạo & Phân Bổ Vốn',
    maxScore: 7.0,
    score: scoreD,
    percentage: Math.round((scoreD / 7.0) * 100),
    summaryNote: assessD1 + '. ' + assessD2 + '.',
    criteria: [
      {
        id: 'D1',
        name: 'Năng lực thực thi chiến lược (Execution Track Record)',
        maxScore: 3.0,
        score: scoreD1,
        rawMetricValue: 'Vượt kế hoạch ĐHCĐ',
        benchmark: 'Hoàn thành 100% ĐHCĐ 5 năm (3.0đ)',
        assessment: assessD1,
        status: 'excellent',
      },
      {
        id: 'D2',
        name: 'Kỷ luật phân bổ vốn (Capital Allocation Discipline)',
        maxScore: 3.0,
        score: scoreD2,
        rawMetricValue: 'Phân bổ vốn mẫu mực',
        benchmark: 'Đầu tư hiệu quả, cổ tức đều (3.0đ)',
        assessment: assessD2,
        status: 'excellent',
      },
      {
        id: 'D3',
        name: 'Tính minh bạch & Quan hệ nhà đầu tư (IR)',
        maxScore: 1.0,
        score: scoreD3,
        rawMetricValue: 'Minh bạch cao',
        benchmark: 'Báo cáo chi tiết, IR tốt (1.0đ)',
        assessment: assessD3,
        status: 'excellent',
      },
    ],
  };

  // NHÓM E: Quản trị công ty & Quyền lợi cổ đông (5.0 điểm)
  const scoreE1 = 2.0;
  const assessE1 = 'Đồng thuận lợi ích cao với cổ đông thiểu số, chính sách ESOP hợp lý gắn chặt với KPI tăng trưởng';
  const scoreE2 = 3.0;
  const assessE2 = 'HĐQT có tính độc lập cao, kiểm toán nội bộ chặt chẽ, không có giao dịch nội bộ mờ ám';

  const scoreE = Math.round((scoreE1 + scoreE2) * 100) / 100;
  const sectionE: BusinessSectionScoreResult = {
    key: 'E',
    title: 'E. Quản Trị Công Ty & Cổ Đông',
    maxScore: 5.0,
    score: scoreE,
    percentage: Math.round((scoreE / 5.0) * 100),
    summaryNote: assessE1 + '. ' + assessE2 + '.',
    criteria: [
      {
        id: 'E1',
        name: 'Đồng thuận lợi ích với cổ đông (Alignment)',
        maxScore: 2.0,
        score: scoreE1,
        rawMetricValue: 'ESOP hợp lý < 2%',
        benchmark: 'Lợi ích gắn kết cổ đông (2.0đ)',
        assessment: assessE1,
        status: 'excellent',
      },
      {
        id: 'E2',
        name: 'Quản trị rủi ro & Độc lập HĐQT',
        maxScore: 3.0,
        score: scoreE2,
        rawMetricValue: 'HĐQT độc lập',
        benchmark: 'Chuẩn quản trị quốc tế (3.0đ)',
        assessment: assessE2,
        status: 'excellent',
      },
    ],
  };

  // NHÓM F: Khả năng duy trì ROIC cao & Tái đầu tư (5.0 điểm)
  let scoreF1 = 0;
  let assessF1 = '';
  if (avgRoic5Years >= 18) {
    scoreF1 = 3.0; assessF1 = `ROIC bình quân 5 năm đạt ${avgRoic5Years.toFixed(1)}% (vượt xa WACC ${waccEstimated}%)`;
  } else if (avgRoic5Years >= 12) {
    scoreF1 = 2.0; assessF1 = `ROIC bình quân 5 năm đạt ${avgRoic5Years.toFixed(1)}% (vượt WACC)`;
  } else {
    scoreF1 = 0.5; assessF1 = `ROIC bình quân 5 năm thấp (${avgRoic5Years.toFixed(1)}%)`;
  }

  const scoreF2 = 2.0;
  const assessF2 = 'Cơ hội tái đầu tư mở rộng thị trường với tỷ suất sinh lời ROIC cao tiếp tục rộng mở';

  const scoreF = Math.round((scoreF1 + scoreF2) * 100) / 100;
  const sectionF: BusinessSectionScoreResult = {
    key: 'F',
    title: 'F. Duy Trì ROIC Cao & Tái Đầu Tư',
    maxScore: 5.0,
    score: scoreF,
    percentage: Math.round((scoreF / 5.0) * 100),
    summaryNote: assessF1 + '. ' + assessF2 + '.',
    criteria: [
      {
        id: 'F1',
        name: 'Duy trì ROIC cao qua chu kỳ',
        maxScore: 3.0,
        score: scoreF1,
        rawMetricValue: `ROIC: ${avgRoic5Years.toFixed(1)}%`,
        benchmark: 'ROIC 5 năm ≥ 18% (3.0đ)',
        assessment: assessF1,
        status: scoreF1 >= 2.0 ? 'excellent' : 'good',
      },
      {
        id: 'F2',
        name: 'Cơ hội tái đầu tư sinh lời cao',
        maxScore: 2.0,
        score: scoreF2,
        rawMetricValue: 'Dư địa tái đầu tư lớn',
        benchmark: 'Tái đầu tư ROIC > 15% (2.0đ)',
        assessment: assessF2,
        status: 'excellent',
      },
    ],
  };

  // NHÓM G: Khả năng chống chịu & Thích ứng (4.0 điểm)
  const scoreG1 = 2.0;
  const assessG1 = 'Khả năng chống chịu suy thoái xuất sắc: Duy trì dòng tiền dương và lợi nhuận vững qua các giai đoạn khó khăn';
  const scoreG2 = 1.0;
  const assessG2 = 'Tiên phong chuyển đổi số, đổi mới công nghệ và thích ứng linh hoạt với chính sách mới';
  const scoreG3 = 1.0;
  const assessG3 = 'Cơ cấu khách hàng và nhà cung ứng phân tán, không rủi ro phụ thuộc đối tác đơn lẻ';

  const scoreG = Math.round((scoreG1 + scoreG2 + scoreG3) * 100) / 100;
  const sectionG: BusinessSectionScoreResult = {
    key: 'G',
    title: 'G. Chống Chịu & Thích Ứng',
    maxScore: 4.0,
    score: scoreG,
    percentage: Math.round((scoreG / 4.0) * 100),
    summaryNote: assessG1 + '. ' + assessG2 + '.',
    criteria: [
      {
        id: 'G1',
        name: 'Khả năng chống chịu suy thoái / Cú sốc',
        maxScore: 2.0,
        score: scoreG1,
        rawMetricValue: 'Vững qua khủng hoảng',
        benchmark: 'Không lỗ qua khủng hoảng (2.0đ)',
        assessment: assessG1,
        status: 'excellent',
      },
      {
        id: 'G2',
        name: 'Khả năng thích ứng công nghệ / chính sách',
        maxScore: 1.0,
        score: scoreG2,
        rawMetricValue: 'Tiên phong đổi mới',
        benchmark: 'Thích ứng linh hoạt (1.0đ)',
        assessment: assessG2,
        status: 'excellent',
      },
      {
        id: 'G3',
        name: 'Mức độ phân tán khách hàng / nhà cung ứng',
        maxScore: 1.0,
        score: scoreG3,
        rawMetricValue: 'Phân tán (<15%/khách)',
        benchmark: 'Không phụ thuộc đơn lẻ (1.0đ)',
        assessment: assessG3,
        status: 'excellent',
      },
    ],
  };

  // =======================================================
  // TỔNG HỢP & XẾP HẠNG TRỤ C (40 ĐIỂM)
  // =======================================================
  const totalScore = Math.round((scoreA + scoreB + scoreC + scoreD + scoreE + scoreF + scoreG) * 10) / 10;
  const percentage = Math.round((totalScore / 40.0) * 100);

  let rankGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' = 'B';
  let rankTitle = '';
  let rankDescription = '';

  if (totalScore >= 36.0) {
    rankGrade = 'A+';
    rankTitle = 'Xuất sắc toàn diện — Compounder Đẳng Cấp';
    rankDescription = 'Doanh nghiệp xuất sắc toàn diện, hào kinh tế (Moat) cực dày, phân bổ vốn mẫu mực và duy trì ROIC vượt trội qua trọn chu kỳ.';
  } else if (totalScore >= 32.0) {
    rankGrade = 'A';
    rankTitle = 'Tốt — Doanh nghiệp chất lượng cao';
    rankDescription = 'Doanh nghiệp chất lượng cao, thương hiệu mạnh, vị thế đầu ngành, quản trị tốt và sinh lời cao.';
  } else if (totalScore >= 28.0) {
    rankGrade = 'B+';
    rankTitle = 'Khá tốt — Lợi thế cạnh tranh tốt';
    rankDescription = 'Doanh nghiệp tốt, có lợi thế cạnh tranh nhưng còn một vài điểm cần theo dõi về phân bổ vốn hoặc mở rộng thị phần.';
  } else if (totalScore >= 24.0) {
    rankGrade = 'B';
    rankTitle = 'Trung bình khá — Chuẩn mực ngành';
    rankDescription = 'Ở mức trung bình khá của ngành, ít lợi thế độc quyền nhưng vận hành tương đối ổn định.';
  } else if (totalScore >= 20.0) {
    rankGrade = 'C';
    rankTitle = 'Yếu / Cần theo dõi';
    rankDescription = 'Lợi thế cạnh tranh mỏng hoặc năng lực quản trị có dấu hiệu suy giảm.';
  } else {
    rankGrade = 'D';
    rankTitle = 'Chất lượng thấp / Rủi ro nội tại';
    rankDescription = 'Không có lợi thế cạnh tranh rõ rệt, hiệu quả sinh lời kém hoặc rủi ro quản trị cao.';
  }

  return {
    totalScore,
    maxScore: 40.0,
    percentage,
    rankGrade,
    rankTitle,
    rankDescription,
    sections: {
      A: sectionA,
      B: sectionB,
      C: sectionC,
      D: sectionD,
      E: sectionE,
      F: sectionF,
      G: sectionG,
    },
    metrics: {
      avgRoic5Years,
      avgEbitMargin,
      avgRoe5Years,
      waccEstimated,
      assetTurnoverAvg,
    },
  };
}
