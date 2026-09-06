import { CatalystItem, TimingCriterionData, TimingScorecardData } from '@/types/analysis';

/**
 * Opportunity Scoring Engine - Điểm Cơ Hội Đầu Tư ValueX (Mục A, B, C, D)
 * Theo tài liệu chuẩn Co-hoi-dau-tu-guide.md, quyet-dinh-dau-tu.md & 5-bao-cao-tom-tat.md
 */

export interface OpportunityCriterionScore {
  id: string;
  code: string;
  name: string;
  category: 'A' | 'C';
  maxScore: number;
  rawValueDisplay: string;
  autoScore: number;
  overrideScore?: number;
  finalScore: number;
  grade: 'RẤT TỐT' | 'TỐT' | 'TRUNG BÌNH' | 'YẾU';
  assessmentNote: string;
  manualReason?: string;
  warning?: string;
}

export type ThesisStatus = 'INTACT' | 'MONITOR' | 'BROKEN';

export interface OpportunityScoreInputs {
  // 1. Kịch bản & Định giá
  baseUpsidePct: number;
  bearDownsidePct: number;
  rrRatio: number;
  dispersion: number;
  
  // 2. Hệ số so sánh
  currentPe: number;
  medianPe?: number;
  peerMedianPe?: number;
  currentPb?: number;
  medianPb?: number;
  
  // 3. Cơ sở tài chính & Chất lượng
  growthTier?: string; // 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D'
  netDebt?: number; // Tỷ VNĐ (<= 0 là có tiền mặt ròng)
  annualCashDividend?: number;
  payoutRatio?: number;
  bvpsForward?: number;
  currentPrice?: number;
  
  // 4. Thanh khoản & Luận điểm
  adtvBillion?: number; // ADTV 1 tháng (tỷ VNĐ)
  thesisStatus?: ThesisStatus;
  
  // 5. Điều chỉnh thủ công
  manualOverrides?: Record<string, { overrideScore?: number; reason?: string }>;
}

export interface OpportunityScoreResult {
  sectionA: {
    items: OpportunityCriterionScore[];
    totalScore: number;
    maxScore: 40.0;
    pctAchievement: number;
    assessment: string;
  };
  sectionC: {
    items: OpportunityCriterionScore[];
    totalScore: number;
    maxScore: 25.0;
    pctAchievement: number;
    assessment: string;
  };
}

/**
 * Hàm tính điểm chi tiết cho Mục A & Mục C
 */
export function computeOpportunityScoreAC(inputs: OpportunityScoreInputs): OpportunityScoreResult {
  const overrides = inputs.manualOverrides || {};
  const thesisStatus = inputs.thesisStatus || 'INTACT';

  // ==========================================
  // MỤC A: ĐỊNH GIÁ & BIÊN AN TOÀN (40.0 ĐIỂM)
  // ==========================================

  // A1. Dư địa tăng theo Giá trị hợp lý cơ sở (12.0 điểm)
  // Ngưỡng: >= 40% (12đ), 30-40% (9-11đ), 20-30% (6-8.5đ), < 20% (0-5đ, <0% = 0đ)
  const baseUpside = inputs.baseUpsidePct;
  let a1Auto = 0;
  let a1Grade: OpportunityCriterionScore['grade'] = 'YẾU';
  if (baseUpside >= 40) {
    a1Auto = 12.0;
    a1Grade = 'RẤT TỐT';
  } else if (baseUpside >= 30) {
    a1Auto = Number((9.0 + ((baseUpside - 30) / 10) * 3.0).toFixed(1));
    a1Grade = 'TỐT';
  } else if (baseUpside >= 20) {
    a1Auto = Number((6.0 + ((baseUpside - 20) / 10) * 3.0).toFixed(1));
    a1Grade = 'TRUNG BÌNH';
  } else if (baseUpside > 0) {
    a1Auto = Number(Math.max(0, (baseUpside / 20) * 5.5).toFixed(1));
    a1Grade = 'YẾU';
  } else {
    a1Auto = 0.0;
    a1Grade = 'YẾU';
  }
  const a1Override = overrides['A1_UPSIDE']?.overrideScore;
  const a1Final = typeof a1Override === 'number' ? Math.min(12.0, Math.max(0, a1Override)) : a1Auto;

  // A2. Mức giảm trong kịch bản thận trọng (6.0 điểm)
  // Ngưỡng: >= -5% (6đ), -5% đến -10% (4.5-5.5đ), -10% đến -20% (3-4.5đ), < -20% (0-2.5đ)
  const bearDownside = inputs.bearDownsidePct;
  let a2Auto = 0;
  let a2Grade: OpportunityCriterionScore['grade'] = 'YẾU';
  if (bearDownside >= -5) {
    a2Auto = 6.0;
    a2Grade = 'RẤT TỐT';
  } else if (bearDownside >= -10) {
    a2Auto = Number((4.5 + ((bearDownside - (-10)) / 5) * 1.5).toFixed(1));
    a2Grade = 'TỐT';
  } else if (bearDownside >= -20) {
    a2Auto = Number((3.0 + ((bearDownside - (-20)) / 10) * 1.5).toFixed(1));
    a2Grade = 'TRUNG BÌNH';
  } else if (bearDownside >= -35) {
    a2Auto = Number(Math.max(0, 1.0 + ((bearDownside - (-35)) / 15) * 1.5).toFixed(1));
    a2Grade = 'YẾU';
  } else {
    a2Auto = 0.0;
    a2Grade = 'YẾU';
  }
  const a2Override = overrides['A2_DOWNSIDE']?.overrideScore;
  const a2Final = typeof a2Override === 'number' ? Math.min(6.0, Math.max(0, a2Override)) : a2Auto;

  // A3. Định giá so lịch sử (5.0 điểm)
  // Ngưỡng: <= -25% so μ (5đ), -10% đến -25% (3.5-4.5đ), ±10% (2.5đ), > +10% (0-1.5đ)
  let a3Auto = 2.5;
  let a3Grade: OpportunityCriterionScore['grade'] = 'TRUNG BÌNH';
  let a3Display = 'Chưa đủ dữ liệu';
  if (inputs.currentPe > 0 && inputs.medianPe && inputs.medianPe > 0) {
    const peVsMed = ((inputs.currentPe - inputs.medianPe) / inputs.medianPe) * 100;
    a3Display = `${peVsMed > 0 ? '+' : ''}${peVsMed.toFixed(1)}% so μ (${inputs.medianPe}x)`;
    if (peVsMed <= -25) {
      a3Auto = 5.0;
      a3Grade = 'RẤT TỐT';
    } else if (peVsMed <= -10) {
      a3Auto = Number((3.5 + ((-10 - peVsMed) / 15) * 1.5).toFixed(1));
      a3Grade = 'TỐT';
    } else if (peVsMed <= 10) {
      a3Auto = 2.5;
      a3Grade = 'TRUNG BÌNH';
    } else if (peVsMed <= 25) {
      a3Auto = Number(Math.max(0, 2.5 - ((peVsMed - 10) / 15) * 2.0).toFixed(1));
      a3Grade = 'YẾU';
    } else {
      a3Auto = 0.0;
      a3Grade = 'YẾU';
    }
  }
  const a3Override = overrides['A3_PE_HISTORY']?.overrideScore;
  const a3Final = typeof a3Override === 'number' ? Math.min(5.0, Math.max(0, a3Override)) : a3Auto;

  // A4. Định giá so doanh nghiệp cùng ngành (4.0 điểm)
  // Ngưỡng: <= -20% so peers (4đ), -5% đến -20% (3-3.8đ), ±10% (2.0đ), > +10% (0-1đ)
  let a4Auto = 2.0;
  let a4Grade: OpportunityCriterionScore['grade'] = 'TRUNG BÌNH';
  let a4Display = 'Chưa có dữ liệu peers';
  if (inputs.currentPe > 0 && inputs.peerMedianPe && inputs.peerMedianPe > 0) {
    const peVsPeers = ((inputs.currentPe - inputs.peerMedianPe) / inputs.peerMedianPe) * 100;
    a4Display = `${peVsPeers > 0 ? '+' : ''}${peVsPeers.toFixed(1)}% so Peers (${inputs.peerMedianPe}x)`;
    if (peVsPeers <= -20) {
      a4Auto = 4.0;
      a4Grade = 'RẤT TỐT';
    } else if (peVsPeers <= -5) {
      a4Auto = Number((3.0 + ((-5 - peVsPeers) / 15) * 1.0).toFixed(1));
      a4Grade = 'TỐT';
    } else if (peVsPeers <= 10) {
      a4Auto = 2.0;
      a4Grade = 'TRUNG BÌNH';
    } else if (peVsPeers <= 25) {
      a4Auto = Number(Math.max(0, 2.0 - ((peVsPeers - 10) / 15) * 1.5).toFixed(1));
      a4Grade = 'YẾU';
    } else {
      a4Auto = 0.0;
      a4Grade = 'YẾU';
    }
  }
  const a4Override = overrides['A4_PE_PEERS']?.overrideScore;
  const a4Final = typeof a4Override === 'number' ? Math.min(4.0, Math.max(0, a4Override)) : a4Auto;

  // A5. Định giá trên lợi nhuận bình thường hóa (5.0 điểm)
  // Dựa trên Hạng chất lượng tăng trưởng Tab D: A+ -> 5đ, A -> 4.5đ, B+ -> 4.0đ, B -> 3.0đ, C -> 2.0đ, D -> 1.0đ
  const tier = (inputs.growthTier || 'B').toUpperCase();
  let a5Auto = 3.5;
  let a5Grade: OpportunityCriterionScore['grade'] = 'TRUNG BÌNH';
  if (tier.startsWith('A+')) {
    a5Auto = 5.0;
    a5Grade = 'RẤT TỐT';
  } else if (tier.startsWith('A')) {
    a5Auto = 4.5;
    a5Grade = 'TỐT';
  } else if (tier.startsWith('B+')) {
    a5Auto = 4.0;
    a5Grade = 'TỐT';
  } else if (tier.startsWith('B')) {
    a5Auto = 3.2;
    a5Grade = 'TRUNG BÌNH';
  } else {
    a5Auto = 2.0;
    a5Grade = 'YẾU';
  }
  const a5Override = overrides['A5_NORMALIZED_PROFIT']?.overrideScore;
  const a5Final = typeof a5Override === 'number' ? Math.min(5.0, Math.max(0, a5Override)) : a5Auto;

  // A6. Độ chắc chắn Giá trị hợp lý (4.0 điểm)
  // Ngưỡng phân tán (dispersion): <= 10% (4đ), 10-20% (3đ), 20-35% (2đ), > 35% (0-1đ)
  const disp = inputs.dispersion;
  let a6Auto = 2.0;
  let a6Grade: OpportunityCriterionScore['grade'] = 'TRUNG BÌNH';
  if (disp <= 10) {
    a6Auto = 4.0;
    a6Grade = 'RẤT TỐT';
  } else if (disp <= 20) {
    a6Auto = Number((3.0 + ((20 - disp) / 10) * 1.0).toFixed(1));
    a6Grade = 'TỐT';
  } else if (disp <= 35) {
    a6Auto = Number((2.0 + ((35 - disp) / 15) * 1.0).toFixed(1));
    a6Grade = 'TRUNG BÌNH';
  } else {
    a6Auto = Number(Math.max(0, 2.0 - ((disp - 35) / 20) * 2.0).toFixed(1));
    a6Grade = 'YẾU';
  }
  const a6Override = overrides['A6_DISPERSION']?.overrideScore;
  const a6Final = typeof a6Override === 'number' ? Math.min(4.0, Math.max(0, a6Override)) : a6Auto;

  // A7. Mức hỗ trợ cho kịch bản giảm giá (4.0 điểm)
  // Tiền mặt ròng > 0 (+1.5đ), Cổ tức tiền mặt đều (+1.5đ), Vùng đệm tài sản/BVPS (+1.0đ)
  let a7Auto = 0.0;
  const supports: string[] = [];
  if (typeof inputs.netDebt === 'number' && inputs.netDebt <= 0) {
    a7Auto += 1.5;
    supports.push('Tiền mặt ròng');
  }
  if (inputs.annualCashDividend && inputs.annualCashDividend > 0) {
    a7Auto += 1.5;
    supports.push('Cổ tức tiền mặt');
  }
  if (inputs.currentPb && inputs.currentPb <= 1.5) {
    a7Auto += 1.0;
    supports.push('P/B hỗ trợ');
  } else if (inputs.bvpsForward && inputs.currentPrice && inputs.currentPrice <= inputs.bvpsForward * 1.2) {
    a7Auto += 1.0;
    supports.push('Gần BVPS');
  } else {
    a7Auto += 0.5;
  }
  a7Auto = Math.min(4.0, Number(a7Auto.toFixed(1)));
  const a7Grade: OpportunityCriterionScore['grade'] =
    a7Auto >= 3.5 ? 'RẤT TỐT' : a7Auto >= 2.5 ? 'TỐT' : a7Auto >= 1.5 ? 'TRUNG BÌNH' : 'YẾU';
  const a7Override = overrides['A7_DOWNSIDE_SUPPORT']?.overrideScore;
  const a7Final = typeof a7Override === 'number' ? Math.min(4.0, Math.max(0, a7Override)) : a7Auto;

  const itemsA: OpportunityCriterionScore[] = [
    {
      id: 'A1_UPSIDE',
      code: 'A.1',
      name: 'Dư địa tăng theo FV cơ sở',
      category: 'A',
      maxScore: 12.0,
      rawValueDisplay: `${baseUpside > 0 ? '+' : ''}${baseUpside}%`,
      autoScore: a1Auto,
      overrideScore: a1Override,
      finalScore: a1Final,
      grade: a1Grade,
      assessmentNote:
        baseUpside >= 40
          ? 'Rất tốt (≥ 40%) - Tiềm năng bứt phá mạnh mẽ'
          : baseUpside >= 30
          ? 'Tốt (30% – 40%) - Dư địa hấp dẫn'
          : baseUpside >= 20
          ? 'Trung bình (20% – 30%) - Dư địa vừa phải'
          : 'Yếu (< 20%) - Dư địa chưa đủ biên an toàn',
      manualReason: overrides['A1_UPSIDE']?.reason,
    },
    {
      id: 'A2_DOWNSIDE',
      code: 'A.2',
      name: 'Mức giảm trong kịch bản thận trọng',
      category: 'A',
      maxScore: 6.0,
      rawValueDisplay: `${bearDownside > 0 ? '+' : ''}${bearDownside}%`,
      autoScore: a2Auto,
      overrideScore: a2Override,
      finalScore: a2Final,
      grade: a2Grade,
      assessmentNote:
        bearDownside >= -5
          ? 'Rất tốt (≥ -5%) - Rủi ro giảm giá cực thấp'
          : bearDownside >= -10
          ? 'Tốt (-5% đến -10%) - Mức chiết khấu kiểm soát tốt'
          : bearDownside >= -20
          ? 'Trung bình (-10% đến -20%) - Cần lưu ý vùng hỗ trợ'
          : 'Yếu (< -20%) - Rủi ro chiết khấu sâu',
      manualReason: overrides['A2_DOWNSIDE']?.reason,
    },
    {
      id: 'A3_PE_HISTORY',
      code: 'A.3',
      name: 'Hệ số định giá so lịch sử 5 năm',
      category: 'A',
      maxScore: 5.0,
      rawValueDisplay: a3Display,
      autoScore: a3Auto,
      overrideScore: a3Override,
      finalScore: a3Final,
      grade: a3Grade,
      assessmentNote:
        a3Auto >= 4.5
          ? 'Rất tốt - Đang ở vùng định giá thấp lịch sử (≤ -25% so μ)'
          : a3Auto >= 3.5
          ? 'Tốt - Chiết khấu hợp lý (-10% đến -25% so μ)'
          : a3Auto >= 2.0
          ? 'Trung bình - Quanh vùng trung vị lịch sử'
          : 'Yếu - Đang ở vùng P/E cao so với quá khứ',
      manualReason: overrides['A3_PE_HISTORY']?.reason,
    },
    {
      id: 'A4_PE_PEERS',
      code: 'A.4',
      name: 'Hệ số định giá so cùng ngành (Peers)',
      category: 'A',
      maxScore: 4.0,
      rawValueDisplay: a4Display,
      autoScore: a4Auto,
      overrideScore: a4Override,
      finalScore: a4Final,
      grade: a4Grade,
      assessmentNote:
        a4Auto >= 3.5
          ? 'Rất tốt - Chiết khấu sâu so với Top 3 cùng ngành (≤ -20%)'
          : a4Auto >= 2.8
          ? 'Tốt - Rẻ hơn trung vị ngành (-5% đến -20%)'
          : a4Auto >= 1.8
          ? 'Trung bình - Tương đương mặt bằng ngành'
          : 'Yếu - Cao hơn đáng kể so với các đối thủ ngành',
      manualReason: overrides['A4_PE_PEERS']?.reason,
    },
    {
      id: 'A5_NORMALIZED_PROFIT',
      code: 'A.5',
      name: 'Định giá trên LN bình thường hóa',
      category: 'A',
      maxScore: 5.0,
      rawValueDisplay: `Hạng tăng trưởng: ${tier}`,
      autoScore: a5Auto,
      overrideScore: a5Override,
      finalScore: a5Final,
      grade: a5Grade,
      assessmentNote:
        a5Auto >= 4.5
          ? 'Chất lượng lợi nhuận cốt lõi cao, không phụ thuộc yếu tố bất thường'
          : a5Auto >= 3.5
          ? 'Lợi nhuận tương đối ổn định, đã chuẩn hóa theo chu kỳ'
          : 'Cần thận trọng với biến động lợi nhuận hoặc khoản bất thường',
      manualReason: overrides['A5_NORMALIZED_PROFIT']?.reason,
    },
    {
      id: 'A6_DISPERSION',
      code: 'A.6',
      name: 'Độ chắc chắn Giá trị hợp lý',
      category: 'A',
      maxScore: 4.0,
      rawValueDisplay: `Độ phân tán: ${disp}%`,
      autoScore: a6Auto,
      overrideScore: a6Override,
      finalScore: a6Final,
      grade: a6Grade,
      assessmentNote:
        disp <= 10
          ? 'Rất tốt (≤ 10%) - Các phương pháp định giá đồng thuận cao'
          : disp <= 20
          ? 'Tốt (10% – 20%) - Chênh lệch giữa các phương pháp trong ngưỡng kiểm soát'
          : disp <= 35
          ? 'Trung bình (20% – 35%) - Có sự phân hóa giữa các góc nhìn định giá'
          : 'Yếu (> 35%) - Phân tán lớn, cần rà soát lại biến số DCF/Multiples',
      manualReason: overrides['A6_DISPERSION']?.reason,
    },
    {
      id: 'A7_DOWNSIDE_SUPPORT',
      code: 'A.7',
      name: 'Mức hỗ trợ cho kịch bản giảm giá',
      category: 'A',
      maxScore: 4.0,
      rawValueDisplay: supports.length > 0 ? supports.join(' • ') : 'Đệm thông thường',
      autoScore: a7Auto,
      overrideScore: a7Override,
      finalScore: a7Final,
      grade: a7Grade,
      assessmentNote:
        a7Auto >= 3.5
          ? 'Rất tốt - Có cả tiền mặt ròng dồi dào và chính sách cổ tức bảo hộ'
          : a7Auto >= 2.5
          ? 'Tốt - Nền tảng tài chính và cổ tức tạo đệm giá tin cậy'
          : 'Mức hỗ trợ vừa phải, biến động giá chịu chi phối bởi tâm lý chung',
      manualReason: overrides['A7_DOWNSIDE_SUPPORT']?.reason,
    },
  ];

  const totalScoreA = Number(itemsA.reduce((sum, it) => sum + it.finalScore, 0).toFixed(1));
  const pctA = Math.round((totalScoreA / 40.0) * 100);
  const assessmentA =
    totalScoreA >= 34
      ? 'Biên an toàn rất cao (≥ 85%)'
      : totalScoreA >= 28
      ? 'Biên an toàn tốt (70% – 85%)'
      : totalScoreA >= 22
      ? 'Biên an toàn trung bình (55% – 70%)'
      : 'Biên an toàn thấp (< 55%)';

  // ===============================================
  // MỤC C: RỦI RO / LỢI NHUẬN & LUẬN ĐIỂM (25.0 ĐIỂM)
  // ===============================================

  // C1. Tỷ lệ Lợi nhuận / Rủi ro (8.0 điểm)
  // Ngưỡng: >= 3x (8đ), 2-3x (6-7.8đ), 1.5-2x (4-5.8đ), < 1.5x (0-2đ, <1x = 0đ)
  const rr = inputs.rrRatio;
  let c1Auto = 0.0;
  let c1Grade: OpportunityCriterionScore['grade'] = 'YẾU';
  if (rr >= 3.0) {
    c1Auto = 8.0;
    c1Grade = 'RẤT TỐT';
  } else if (rr >= 2.0) {
    c1Auto = Number((6.0 + ((rr - 2.0) / 1.0) * 2.0).toFixed(1));
    c1Grade = 'TỐT';
  } else if (rr >= 1.5) {
    c1Auto = Number((4.0 + ((rr - 1.5) / 0.5) * 2.0).toFixed(1));
    c1Grade = 'TRUNG BÌNH';
  } else if (rr >= 1.0) {
    c1Auto = Number(((rr - 1.0) / 0.5 * 3.5).toFixed(1));
    c1Grade = 'YẾU';
  } else {
    c1Auto = 0.0;
    c1Grade = 'YẾU';
  }
  const c1Override = overrides['C1_RR_RATIO']?.overrideScore;
  const c1Final = typeof c1Override === 'number' ? Math.min(8.0, Math.max(0, c1Override)) : c1Auto;

  // C2. Khả năng chống chịu trong kịch bản thận trọng (5.0 điểm)
  let c2Auto = 4.0;
  let c2Grade: OpportunityCriterionScore['grade'] = 'TỐT';
  if (typeof inputs.netDebt === 'number' && inputs.netDebt <= 0) {
    c2Auto = 5.0;
    c2Grade = 'RẤT TỐT';
  } else if (typeof inputs.netDebt === 'number' && inputs.netDebt > 10000) {
    c2Auto = 3.0;
    c2Grade = 'TRUNG BÌNH';
  }
  const c2Override = overrides['C2_BEAR_RESILIENCE']?.overrideScore;
  const c2Final = typeof c2Override === 'number' ? Math.min(5.0, Math.max(0, c2Override)) : c2Auto;

  // C3. Độ chắc chắn luận điểm (5.0 điểm)
  // INTACT (5đ), MONITOR (3đ), BROKEN (0đ)
  let c3Auto = 5.0;
  let c3Grade: OpportunityCriterionScore['grade'] = 'RẤT TỐT';
  let c3Note = '🟢 Luận điểm còn nguyên vẹn - Giả định tăng trưởng cốt lõi đúng kế hoạch';
  if (thesisStatus === 'MONITOR') {
    c3Auto = 3.0;
    c3Grade = 'TRUNG BÌNH';
    c3Note = '🟡 Cần theo dõi - Một số biến số lệch dự phóng hoặc tiến độ bị chậm';
  } else if (thesisStatus === 'BROKEN') {
    c3Auto = 0.0;
    c3Grade = 'YẾU';
    c3Note = '🔴 Đã phá vỡ - Giả định then chốt không còn giá trị, cần định giá lại toàn bộ';
  }
  const c3Override = overrides['C3_THESIS_STATUS']?.overrideScore;
  const c3Final = typeof c3Override === 'number' ? Math.min(5.0, Math.max(0, c3Override)) : c3Auto;

  // C4. Độ nhạy giả định (4.0 điểm)
  // Đánh giá biên an toàn trước biến động chi phí vốn và tăng trưởng
  let c4Auto = 3.5;
  let c4Grade: OpportunityCriterionScore['grade'] = 'TỐT';
  if (disp <= 12) {
    c4Auto = 4.0;
    c4Grade = 'RẤT TỐT';
  } else if (disp > 30) {
    c4Auto = 2.5;
    c4Grade = 'TRUNG BÌNH';
  }
  const c4Override = overrides['C4_SENSITIVITY']?.overrideScore;
  const c4Final = typeof c4Override === 'number' ? Math.min(4.0, Math.max(0, c4Override)) : c4Auto;

  // C5. Thanh khoản & rủi ro vị thế (3.0 điểm)
  // ADTV 1 tháng: >= 30 tỷ (3đ), 15-30 tỷ (2đ), < 15 tỷ (1đ)
  const adtv = inputs.adtvBillion || 25;
  let c5Auto = 2.0;
  let c5Grade: OpportunityCriterionScore['grade'] = 'TRUNG BÌNH';
  let c5Display = `${adtv} tỷ/phiên`;
  if (adtv >= 30) {
    c5Auto = 3.0;
    c5Grade = 'RẤT TỐT';
  } else if (adtv >= 15) {
    c5Auto = 2.0;
    c5Grade = 'TỐT';
  } else {
    c5Auto = 1.0;
    c5Grade = 'TRUNG BÌNH';
  }
  const c5Override = overrides['C5_LIQUIDITY_POSITION']?.overrideScore;
  const c5Final = typeof c5Override === 'number' ? Math.min(3.0, Math.max(0, c5Override)) : c5Auto;

  const itemsC: OpportunityCriterionScore[] = [
    {
      id: 'C1_RR_RATIO',
      code: 'C.1',
      name: 'Tỷ lệ Lợi nhuận / Rủi ro (R/R Ratio)',
      category: 'C',
      maxScore: 8.0,
      rawValueDisplay: rr >= 99 ? '∞' : `${rr}x`,
      autoScore: c1Auto,
      overrideScore: c1Override,
      finalScore: c1Final,
      grade: c1Grade,
      assessmentNote:
        rr >= 3.0
          ? 'Rất tốt (≥ 3.0x) - Cơ hội bất đối xứng vượt trội'
          : rr >= 2.0
          ? 'Tốt (2.0x – 3.0x) - Biên an toàn rất tốt'
          : rr >= 1.5
          ? 'Trung bình (1.5x – 2.0x) - Đạt chuẩn tối thiểu'
          : 'Yếu (< 1.5x) - Cờ đỏ rủi ro giảm giá lớn hơn tiềm năng',
      manualReason: overrides['C1_RR_RATIO']?.reason,
    },
    {
      id: 'C2_BEAR_RESILIENCE',
      code: 'C.2',
      name: 'Khả năng chống chịu kịch bản xấu',
      category: 'C',
      maxScore: 5.0,
      rawValueDisplay: inputs.netDebt !== undefined ? (inputs.netDebt <= 0 ? 'Tiền mặt ròng' : `Nợ ròng ${inputs.netDebt} tỷ`) : 'An toàn',
      autoScore: c2Auto,
      overrideScore: c2Override,
      finalScore: c2Final,
      grade: c2Grade,
      assessmentNote:
        c2Auto >= 4.5
          ? 'Doanh nghiệp đòn bẩy thấp, dòng tiền vững vàng trong kịch bản xấu'
          : c2Auto >= 3.5
          ? 'Cấu trúc tài chính ở mức an toàn kiểm soát được'
          : 'Cần chú ý áp lực nợ vay nếu kịch bản xấu kéo dài',
      manualReason: overrides['C2_BEAR_RESILIENCE']?.reason,
    },
    {
      id: 'C3_THESIS_STATUS',
      code: 'C.3',
      name: 'Trạng thái & Độ chắc chắn luận điểm',
      category: 'C',
      maxScore: 5.0,
      rawValueDisplay: thesisStatus === 'INTACT' ? '🟢 Còn nguyên vẹn' : thesisStatus === 'MONITOR' ? '🟡 Cần theo dõi' : '🔴 Đã phá vỡ',
      autoScore: c3Auto,
      overrideScore: c3Override,
      finalScore: c3Final,
      grade: c3Grade,
      assessmentNote: c3Note,
      manualReason: overrides['C3_THESIS_STATUS']?.reason,
    },
    {
      id: 'C4_SENSITIVITY',
      code: 'C.4',
      name: 'Độ nhạy giả định định giá',
      category: 'C',
      maxScore: 4.0,
      rawValueDisplay: `Độ nhạy: ${c4Grade}`,
      autoScore: c4Auto,
      overrideScore: c4Override,
      finalScore: c4Final,
      grade: c4Grade,
      assessmentNote:
        c4Auto >= 3.8
          ? 'Độ nhạy thấp - Giá trị hợp lý ít bị méo mó khi WACC/g dao động nhẹ'
          : 'Độ nhạy vừa phải - Các kịch bản bất lợi vẫn nằm trong ngưỡng chịu đựng',
      manualReason: overrides['C4_SENSITIVITY']?.reason,
    },
    {
      id: 'C5_LIQUIDITY_POSITION',
      code: 'C.5',
      name: 'Thanh khoản & Rủi ro vị thế',
      category: 'C',
      maxScore: 3.0,
      rawValueDisplay: c5Display,
      autoScore: c5Auto,
      overrideScore: c5Override,
      finalScore: c5Final,
      grade: c5Grade,
      assessmentNote:
        c5Auto >= 3.0
          ? 'Rất tốt (ADTV ≥ 30 tỷ) - Dễ dàng giải ngân và cơ cấu vị thế lớn'
          : c5Auto >= 2.0
          ? 'Tốt (ADTV 15 – 30 tỷ) - Thanh khoản phù hợp quy mô vừa và lớn'
          : 'Thanh khoản vừa phải, cần phân bổ vị thế theo từng giai đoạn',
      manualReason: overrides['C5_LIQUIDITY_POSITION']?.reason,
    },
  ];

  const totalScoreC = Number(itemsC.reduce((sum, it) => sum + it.finalScore, 0).toFixed(1));
  const pctC = Math.round((totalScoreC / 25.0) * 100);
  const assessmentC =
    totalScoreC >= 21
      ? 'Hồ sơ rủi ro/lợi nhuận rất tốt (≥ 84%)'
      : totalScoreC >= 17
      ? 'Hồ sơ rủi ro/lợi nhuận tốt (68% – 84%)'
      : totalScoreC >= 13
      ? 'Hồ sơ rủi ro/lợi nhuận trung bình (52% – 68%)'
      : 'Hồ sơ rủi ro/lợi nhuận bất lợi (< 52%)';

  return {
    sectionA: {
      items: itemsA,
      totalScore: totalScoreA,
      maxScore: 40.0,
      pctAchievement: pctA,
      assessment: assessmentA,
    },
    sectionC: {
      items: itemsC,
      totalScore: totalScoreC,
      maxScore: 25.0,
      pctAchievement: pctC,
      assessment: assessmentC,
    },
  };
}

// =========================================================================
// MỤC D: THỜI ĐIỂM & ĐIỂM VÀO (10.0 ĐIỂM)
// =========================================================================

export interface TimingScoreInputs {
  currentPrice: number;
  priceHistory?: Array<{
    closePrice: number;
    volume: number;
    date?: string;
    fullDate?: string;
  }>;
  rsRating?: number | null;
  rs1Month?: number | null;
  growthMomentum?: {
    revenueGrowthYoY?: number;
    epsGrowthYoY?: number;
    growthTier?: string;
    forwardEpsGrowth?: number;
  };
  consensusData?: {
    buyCount?: number;
    totalReports?: number;
    targetPriceTrend?: 'UP' | 'FLAT' | 'DOWN';
    avgTargetPrice?: number;
  };
  catalysts?: CatalystItem[];
  manualOverrides?: Record<string, { overrideScore?: number; reason?: string }>;
}

export function computeTimingScoreD(inputs: TimingScoreInputs): TimingScorecardData {
  const overrides = inputs.manualOverrides || {};
  const history = inputs.priceHistory || [];
  const currentPrice = inputs.currentPrice;

  // -----------------------------------------------------------------------
  // D1. Động lượng cơ bản (4.0 điểm)
  // Tiêu chí: Doanh thu / EPS cốt lõi đang tăng tốc hay giảm tốc?
  // -----------------------------------------------------------------------
  const growthTier = inputs.growthMomentum?.growthTier || 'B';
  const revGrowth = inputs.growthMomentum?.revenueGrowthYoY ?? 15;
  const epsGrowth = inputs.growthMomentum?.epsGrowthYoY ?? inputs.growthMomentum?.forwardEpsGrowth ?? 18;

  let d1Auto = 2.5;
  let d1Grade: TimingCriterionData['grade'] = 'TRUNG BÌNH';
  let d1Display = `Tăng trưởng: DT +${revGrowth.toFixed(1)}%, EPS +${epsGrowth.toFixed(1)}%`;
  let d1Note = 'Động lượng cơ bản ổn định, cần theo dõi thêm kết quả quý tới';

  if (growthTier === 'A+' || (revGrowth >= 25 && epsGrowth >= 25)) {
    d1Auto = 4.0;
    d1Grade = 'RẤT TỐT';
    d1Note = 'Doanh thu & EPS cốt lõi đang tăng tốc rất mạnh (Hạng A+ / > 25% YoY)';
  } else if (growthTier === 'A' || (revGrowth >= 18 && epsGrowth >= 18)) {
    d1Auto = 3.5;
    d1Grade = 'TỐT';
    d1Note = 'Động lượng tăng trưởng tốt, biên lợi nhuận mở rộng vững chắc';
  } else if (growthTier === 'B+' || (revGrowth >= 10 && epsGrowth >= 10)) {
    d1Auto = 2.8;
    d1Grade = 'TRUNG BÌNH';
    d1Note = 'Tăng trưởng khá, duy trì phong độ nhưng chưa có dấu hiệu bứt phá mạnh';
  } else if (revGrowth > 0 && epsGrowth > 0) {
    d1Auto = 2.0;
    d1Grade = 'TRUNG BÌNH';
    d1Note = 'Tăng trưởng khiêm tốn hoặc đang đi ngang ở vùng đáy chu kỳ';
  } else {
    d1Auto = 0.8;
    d1Grade = 'YẾU';
    d1Note = 'Động lượng cơ bản suy giảm hoặc âm YoY, rủi ro điều chỉnh kết quả kinh doanh';
  }

  const d1Override = overrides['D1_MOMENTUM']?.overrideScore;
  const d1Final = typeof d1Override === 'number' ? Math.min(4.0, Math.max(0, d1Override)) : d1Auto;

  // -----------------------------------------------------------------------
  // D2. Điều chỉnh dự báo lợi nhuận / Kỳ vọng (2.0 điểm)
  // Tiêu chí: Kỳ vọng lợi nhuận có bị downgrade không? CTCK nâng hay hạ dự báo?
  // -----------------------------------------------------------------------
  const buyCount = inputs.consensusData?.buyCount ?? 2;
  const totalReps = inputs.consensusData?.totalReports ?? 3;
  const trend = inputs.consensusData?.targetPriceTrend || 'UP';

  let d2Auto = 1.5;
  let d2Grade: TimingCriterionData['grade'] = 'TỐT';
  let d2Display = `${buyCount}/${totalReps} CTCK khuyến nghị MUA / KHẢ QUAN`;
  let d2Note = 'Không có tín hiệu downgrade từ các CTCK; kỳ vọng lợi nhuận được giữ vững';

  if (totalReps > 0 && buyCount / totalReps >= 0.75 && trend === 'UP') {
    d2Auto = 2.0;
    d2Grade = 'RẤT TỐT';
    d2Note = 'Đồng thuận cao: Đa số CTCK khuyến nghị Mua và liên tục nâng giá mục tiêu';
  } else if (trend === 'DOWN' || (totalReps > 0 && buyCount / totalReps < 0.3)) {
    d2Auto = 0.6;
    d2Grade = 'YẾU';
    d2Note = 'Cảnh báo: Có tín hiệu hạ dự báo lợi nhuận hoặc hạ khuyến nghị từ giới phân tích';
  } else {
    d2Auto = 1.5;
    d2Grade = 'TỐT';
    d2Note = 'Kỳ vọng lợi nhuận duy trì ổn định, không có rủi ro hạ mức dự báo đột biến';
  }

  const d2Override = overrides['D2_EARNINGS_REVISION']?.overrideScore;
  const d2Final = typeof d2Override === 'number' ? Math.min(2.0, Math.max(0, d2Override)) : d2Auto;

  // -----------------------------------------------------------------------
  // D3. Cấu trúc giá, Thanh khoản & Sức mạnh giá RS 1M (2.0 điểm)
  // Tiêu chí: Giá - Khối lượng ủng hộ, trên MA20/MA50 và RS 1M mạnh mẽ
  // -----------------------------------------------------------------------
  let sma20 = currentPrice;
  let sma50 = currentPrice;
  let vol20 = 1;
  let latestVol = 1;
  let rsi14 = 55;
  let priceVsMa20 = 0;
  let priceVsMa50 = 0;
  let volRatio = 1;
  let trendStatus: NonNullable<TimingScorecardData['technicalSummary']>['trendStatus'] = 'Đi ngang';

  if (history.length > 0) {
    const latest = history[history.length - 1];
    const latestPrice = latest.closePrice || currentPrice;
    latestVol = latest.volume || 1;

    // Tính SMA20
    const slice20 = history.slice(-20);
    sma20 = slice20.reduce((s, p) => s + (p.closePrice || 0), 0) / (slice20.length || 1);
    vol20 = slice20.reduce((s, p) => s + (p.volume || 0), 0) / (slice20.length || 1);

    // Tính SMA50
    const slice50 = history.slice(-50);
    sma50 = slice50.reduce((s, p) => s + (p.closePrice || 0), 0) / (slice50.length || 1);

    priceVsMa20 = ((latestPrice - sma20) / (sma20 || 1)) * 100;
    priceVsMa50 = ((latestPrice - sma50) / (sma50 || 1)) * 100;
    volRatio = latestVol / (vol20 || 1);

    // Tính RSI 14
    if (history.length >= 15) {
      const rsiSlice = history.slice(-15);
      let gains = 0;
      let losses = 0;
      for (let i = 1; i < rsiSlice.length; i++) {
        const diff = (rsiSlice[i].closePrice || 0) - (rsiSlice[i - 1].closePrice || 0);
        if (diff > 0) gains += diff;
        else losses += Math.abs(diff);
      }
      const avgGain = gains / 14;
      const avgLoss = losses / 14;
      const rs = avgGain / (avgLoss === 0 ? 0.0001 : avgLoss);
      rsi14 = Number((100 - 100 / (1 + rs)).toFixed(1));
    }

    if (latestPrice >= sma20 && sma20 >= sma50) {
      trendStatus = 'Tăng mạnh';
    } else if (latestPrice >= sma20 && priceVsMa20 <= 4) {
      trendStatus = 'Tích lũy bứt phá';
    } else if (latestPrice < sma20 && latestPrice < sma50) {
      trendStatus = 'Phân phối / Gãy xu hướng';
    } else {
      trendStatus = 'Đi ngang';
    }
  }

  // Lấy chỉ số RS 1M: Ưu tiên rs1Month hoặc rsRating từ input, fallback qua momentum 1M
  let effectiveRs = 75;
  if (typeof inputs.rs1Month === 'number' && inputs.rs1Month > 0) {
    effectiveRs = inputs.rs1Month;
  } else if (typeof inputs.rsRating === 'number' && inputs.rsRating > 0) {
    effectiveRs = inputs.rsRating;
  } else if (history.length >= 20) {
    const p0 = history[history.length - 1]?.closePrice || currentPrice;
    const p20 = history[history.length - 20]?.closePrice || p0;
    const ret1M = ((p0 - p20) / (p20 || 1)) * 100;
    effectiveRs = Math.min(99, Math.max(10, Math.round(50 + ret1M * 2.5)));
  }

  // 1. Cấu trúc xu hướng MA (tối đa 0.7đ)
  let c1Score = 0.4;
  if (trendStatus === 'Tăng mạnh') c1Score = 0.7;
  else if (trendStatus === 'Tích lũy bứt phá') c1Score = 0.55;
  else if (trendStatus === 'Đi ngang') c1Score = 0.4;
  else c1Score = 0.15;

  // 2. Thanh khoản xác nhận (tối đa 0.5đ)
  let c2Score = 0.35;
  if (volRatio >= 1.2 && trendStatus !== 'Phân phối / Gãy xu hướng') c2Score = 0.5;
  else if (volRatio >= 0.8) c2Score = 0.4;
  else if (volRatio < 0.6) c2Score = 0.35;
  else c2Score = 0.2;

  // 3. Sức mạnh giá RS 1M (tối đa 0.8đ)
  let c3Score = 0.5;
  if (effectiveRs >= 85) c3Score = 0.8;
  else if (effectiveRs >= 70) c3Score = 0.65;
  else if (effectiveRs >= 55) c3Score = 0.45;
  else c3Score = 0.2;

  const d3Auto = Number(Math.min(2.0, c1Score + c2Score + c3Score).toFixed(1));
  const d3Grade: TimingCriterionData['grade'] =
    d3Auto >= 1.7 ? 'RẤT TỐT' : d3Auto >= 1.3 ? 'TỐT' : d3Auto >= 0.9 ? 'TRUNG BÌNH' : 'YẾU';

  const d3Display = `Giá/MA20: ${priceVsMa20 > 0 ? '+' : ''}${priceVsMa20.toFixed(1)}% | Vol/V20: ${(volRatio * 100).toFixed(0)}% | RS 1M: ${effectiveRs}`;
  const d3Note =
    d3Auto >= 1.7
      ? `Cấu trúc giá lý tưởng (${trendStatus}), RS 1M (${effectiveRs}) dẫn dắt thị trường`
      : d3Auto >= 1.3
      ? `Giá tích lũy trên nền tảng vững (${trendStatus}), thanh khoản và RS 1M (${effectiveRs}) ở mức khá`
      : `Đang dao động tích lũy đi ngang, RS 1M (${effectiveRs}) trung bình, chưa bứt phá`;

  const d3Override = overrides['D3_PRICE_VOLUME_RS']?.overrideScore;
  const d3Final = typeof d3Override === 'number' ? Math.min(2.0, Math.max(0, d3Override)) : d3Auto;

  // -----------------------------------------------------------------------
  // D4. Điểm vào so với Chất xúc tác (2.0 điểm)
  // Tiêu chí: Khoảng cách tới chất xúc tác gần nhất đã phản ánh vào giá chưa?
  // -----------------------------------------------------------------------
  const cats = inputs.catalysts || [];
  const nearCatalysts = cats.filter(
    (c) => c.status === 'on_track' && (c.pricedInStatus === 'Chưa phản ánh' || c.pricedInStatus === 'Phản ánh một phần')
  );

  let d4Auto = 1.2;
  let d4Grade: TimingCriterionData['grade'] = 'TRUNG BÌNH';
  let d4Display = `${nearCatalysts.length} chất xúc tác tiềm năng chưa phản ánh`;
  let d4Note = 'Có chất xúc tác trong tầm nhìn 6–12 tháng nhưng chưa đến giai đoạn bùng nổ điểm rơi';

  if (nearCatalysts.some((c) => (c.impactLevel === 'Rất lớn' || c.impactLevel === 'Lớn') && c.probability >= 70)) {
    d4Auto = 2.0;
    d4Grade = 'RẤT TỐT';
    d4Note = 'Điểm vào rất thuận lợi: Có chất xúc tác lớn sắp xảy ra trong 1–3 quý tới và chưa phản ánh vào giá';
  } else if (nearCatalysts.length > 0) {
    d4Auto = 1.6;
    d4Grade = 'TỐT';
    d4Note = 'Có chất xúc tác hỗ trợ giá cổ phiếu nhưng mức độ tác động vừa phải';
  } else {
    d4Auto = 0.8;
    d4Grade = 'YẾU';
    d4Note = 'Chất xúc tác còn ở xa hoặc thị trường đã phản ánh phần lớn vào mức giá hiện tại';
  }

  const d4Override = overrides['D4_CATALYST_TIMING']?.overrideScore;
  const d4Final = typeof d4Override === 'number' ? Math.min(2.0, Math.max(0, d4Override)) : d4Auto;

  const items: TimingCriterionData[] = [
    {
      id: 'D1_MOMENTUM',
      code: 'D.1',
      name: 'Động lượng cơ bản (Doanh thu/EPS cốt lõi)',
      maxScore: 4.0,
      autoScore: d1Auto,
      overrideScore: d1Override,
      finalScore: d1Final,
      grade: d1Grade,
      displayValue: d1Display,
      note: d1Note,
      manualReason: overrides['D1_MOMENTUM']?.reason,
    },
    {
      id: 'D2_EARNINGS_REVISION',
      code: 'D.2',
      name: 'Điều chỉnh dự báo lợi nhuận / Kỳ vọng',
      maxScore: 2.0,
      autoScore: d2Auto,
      overrideScore: d2Override,
      finalScore: d2Final,
      grade: d2Grade,
      displayValue: d2Display,
      note: d2Note,
      manualReason: overrides['D2_EARNINGS_REVISION']?.reason,
    },
    {
      id: 'D3_PRICE_VOLUME_RS',
      code: 'D.3',
      name: 'Cấu trúc giá, Thanh khoản & Sức mạnh giá (RS 1M)',
      maxScore: 2.0,
      autoScore: d3Auto,
      overrideScore: d3Override,
      finalScore: d3Final,
      grade: d3Grade,
      displayValue: d3Display,
      note: d3Note,
      manualReason: overrides['D3_PRICE_VOLUME_RS']?.reason,
    },
    {
      id: 'D4_CATALYST_TIMING',
      code: 'D.4',
      name: 'Điểm vào so với Chất xúc tác',
      maxScore: 2.0,
      autoScore: d4Auto,
      overrideScore: d4Override,
      finalScore: d4Final,
      grade: d4Grade,
      displayValue: d4Display,
      note: d4Note,
      manualReason: overrides['D4_CATALYST_TIMING']?.reason,
    },
  ];

  const totalScore = Number(items.reduce((sum, it) => sum + it.finalScore, 0).toFixed(1));
  const tier: TimingScorecardData['tier'] =
    totalScore >= 8.5
      ? 'Rất thuận lợi'
      : totalScore >= 7.0
      ? 'Khá'
      : totalScore >= 5.0
      ? 'Trung bình'
      : 'Chưa thuận lợi';

  return {
    items,
    totalScore,
    maxScore: 10.0,
    tier,
    manualOverrides: overrides,
    technicalSummary: {
      trendStatus,
      priceVsMa20Pct: Number(priceVsMa20.toFixed(1)),
      priceVsMa50Pct: Number(priceVsMa50.toFixed(1)),
      volVsVol20Pct: Number((volRatio * 100).toFixed(0)),
      rsi14,
      rs1Month: effectiveRs,
    },
  };
}

// =========================================================================
// MASTER OPPORTUNITY SCORING ENGINE (100 ĐIỂM TOÀN DIỆN & MA TRẬN HÀNH ĐỘNG)
// =========================================================================

export interface MasterOpportunityScoreResult {
  totalScore: number;
  maxScore: 100.0;
  pctAchievement: number;
  rankGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  rankTitle: string;
  sectionA: { score: number; maxScore: 40.0; pct: number };
  sectionB: { score: number; maxScore: 25.0; pct: number };
  sectionC: { score: number; maxScore: 25.0; pct: number };
  sectionD: { score: number; maxScore: 10.0; pct: number };
  matrixAction: {
    businessGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
    opportunityGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
    interpretation: string;
    actionFramework: string;
    positionTier: 'TẬP TRUNG' | 'CHUẨN' | 'THĂM DÒ' | 'QUAN SÁT';
    suggestedAllocationPct: string;
    actionColor: string;
  };
}

export function computeMasterOpportunityScore(
  scoreA: number,
  scoreB: number,
  scoreC: number,
  scoreD: number,
  businessScore150: number = 110
): MasterOpportunityScoreResult {
  const cleanA = Math.min(40.0, Math.max(0, scoreA));
  const cleanB = Math.min(25.0, Math.max(0, scoreB));
  const cleanC = Math.min(25.0, Math.max(0, scoreC));
  const cleanD = Math.min(10.0, Math.max(0, scoreD));

  const totalScore = Number((cleanA + cleanB + cleanC + cleanD).toFixed(1));
  const pctAchievement = Math.round((totalScore / 100.0) * 100);

  // Xếp hạng Cơ Hội Đầu Tư theo Co-hoi-dau-tu-guide.md
  let rankGrade: MasterOpportunityScoreResult['rankGrade'] = 'D';
  let rankTitle = 'Rủi ro/Lợi nhuận không phù hợp';

  if (totalScore >= 85.0) {
    rankGrade = 'A+';
    rankTitle = 'Cơ hội đầu tư rất hấp dẫn';
  } else if (totalScore >= 75.0) {
    rankGrade = 'A';
    rankTitle = 'Cơ hội đầu tư hấp dẫn';
  } else if (totalScore >= 65.0) {
    rankGrade = 'B+';
    rankTitle = 'Cơ hội đầu tư khá hấp dẫn';
  } else if (totalScore >= 55.0) {
    rankGrade = 'B';
    rankTitle = 'Trung lập / Cần thêm biên an toàn';
  } else if (totalScore >= 45.0) {
    rankGrade = 'C';
    rankTitle = 'Chưa hấp dẫn ở mức giá hiện tại';
  } else {
    rankGrade = 'D';
    rankTitle = 'Rủi ro/Lợi nhuận không phù hợp';
  }

  // Xếp hạng Doanh Nghiệp ValueX (150 điểm)
  let businessGrade: MasterOpportunityScoreResult['matrixAction']['businessGrade'] = 'D';
  if (businessScore150 >= 125) businessGrade = 'A+';
  else if (businessScore150 >= 115) businessGrade = 'A';
  else if (businessScore150 >= 100) businessGrade = 'B+';
  else if (businessScore150 >= 85) businessGrade = 'B';
  else if (businessScore150 >= 70) businessGrade = 'C';
  else businessGrade = 'D';

  // Ma trận diễn giải (quyet-dinh-dau-tu.md mục 3)
  let interpretation = '';
  let actionFramework = '';
  let positionTier: MasterOpportunityScoreResult['matrixAction']['positionTier'] = 'QUAN SÁT';
  let suggestedAllocationPct = '0–5%';
  let actionColor = 'slate';

  const isHighBiz = businessGrade === 'A+' || businessGrade === 'A';
  const isMedBiz = businessGrade === 'B+' || businessGrade === 'B';
  const isLowBiz = businessGrade === 'C' || businessGrade === 'D';

  const isHighOpp = rankGrade === 'A+' || rankGrade === 'A';
  const isMedPlusOpp = rankGrade === 'B+';
  const isMedOpp = rankGrade === 'B' || rankGrade === 'C';

  if (isHighBiz && isHighOpp) {
    interpretation = 'Doanh nghiệp tốt + Cơ hội đầu tư hấp dẫn';
    actionFramework = 'Ưu tiên nghiên cứu/giải ngân theo kế hoạch. Hội tụ đủ biên an toàn, chất xúc tác và thời điểm.';
    positionTier = 'TẬP TRUNG';
    suggestedAllocationPct = '20–30% danh mục';
    actionColor = 'emerald';
  } else if (isHighBiz && isMedPlusOpp) {
    interpretation = 'Doanh nghiệp tốt, cơ hội khá';
    actionFramework = 'Có thể giải ngân từng phần nếu luận điểm còn nguyên vẹn. Thêm vị thế khi thị trường chiết khấu.';
    positionTier = 'CHUẨN';
    suggestedAllocationPct = '12–18% danh mục';
    actionColor = 'teal';
  } else if (isHighBiz && isMedOpp) {
    interpretation = 'Doanh nghiệp tốt nhưng giá/chất xúc tác chưa tốt';
    actionFramework = 'Đưa vào danh sách theo dõi (Watchlist). Chờ biên an toàn MOS hoặc chất xúc tác cải thiện trước khi mua.';
    positionTier = 'QUAN SÁT';
    suggestedAllocationPct = '0–5% (hoặc đứng ngoài)';
    actionColor = 'amber';
  } else if (isMedBiz && isHighOpp) {
    interpretation = 'Chu kỳ / Phục hồi / Cơ hội đặc biệt';
    actionFramework = 'Giải ngân vị thế chuẩn/thăm dò. Cần đặt mức dừng lỗ chặt chẽ và theo dõi sát điều kiện phá vỡ luận điểm.';
    positionTier = 'CHUẨN';
    suggestedAllocationPct = '8–15% danh mục';
    actionColor = 'blue';
  } else if (isLowBiz && (rankGrade === 'A+' || rankGrade === 'A' || rankGrade === 'B+')) {
    interpretation = 'Có thể rẻ nhưng nguy cơ bẫy giá trị (Value Trap)';
    actionFramework = 'Yêu cầu biên an toàn MOS cực cao. Tránh giải ngân vị thế lớn vì chất lượng doanh nghiệp thấp.';
    positionTier = 'THĂM DÒ';
    suggestedAllocationPct = '0–5% (Hạn chế tối đa)';
    actionColor = 'rose';
  } else {
    interpretation = 'Cơ hội chưa hấp dẫn / Luận điểm yếu';
    actionFramework = 'Cấu trúc cơ hội bất lợi. Tạm thời đứng ngoài quan sát diễn biến thị trường.';
    positionTier = 'QUAN SÁT';
    suggestedAllocationPct = '0% danh mục';
    actionColor = 'slate';
  }

  return {
    totalScore,
    maxScore: 100.0,
    pctAchievement,
    rankGrade,
    rankTitle,
    sectionA: { score: cleanA, maxScore: 40.0, pct: Math.round((cleanA / 40.0) * 100) },
    sectionB: { score: cleanB, maxScore: 25.0, pct: Math.round((cleanB / 25.0) * 100) },
    sectionC: { score: cleanC, maxScore: 25.0, pct: Math.round((cleanC / 25.0) * 100) },
    sectionD: { score: cleanD, maxScore: 10.0, pct: Math.round((cleanD / 10.0) * 100) },
    matrixAction: {
      businessGrade,
      opportunityGrade: rankGrade,
      interpretation,
      actionFramework,
      positionTier,
      suggestedAllocationPct,
      actionColor,
    },
  };
}
