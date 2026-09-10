/**
 * Động Cơ Định Giá Chiết Khấu Dòng Tiền Tự Do (Discounted Free Cash Flow Engine - DCF / FCFF)
 * Chuẩn hóa 100% theo lý thuyết tài chính doanh nghiệp Damodaran & CFA Institute:
 * 
 * 1. FCFF_1 = CFO_Forward - CAPEX_Forward (hoặc NOPAT + Khấu hao - CAPEX - Delta NWC)
 * 2. Dự phóng chuỗi FCFF 5 năm với tốc độ tăng trưởng hội tụ về g
 * 3. Terminal Value (TV_5) = FCFF_5 * (1 + g) / (WACC - g)
 * 4. EV = PV(FCFF 1..5) + PV(TV_5)
 * 5. Equity Value = EV - Net Debt
 * 6. Giá hợp lý = (Equity Value / Shares) * 1000 (VND/cp)
 * 7. Ma trận độ nhạy 3x3: WACC (11% - 13%) x g (3% - 5%)
 */

export interface DCFInputs {
  cfoForward: number; // CFO dự phóng 4 quý (Tỷ VNĐ)
  capexForward: number; // CAPEX dự phóng 4 quý (Tỷ VNĐ)
  ebitdaForward?: number; // EBITDA dự phóng (Tỷ VNĐ)
  netProfitForward?: number; // LNST dự phóng (Tỷ VNĐ)
  netDebt: number; // Nợ vay ròng = Nợ vay - (Tiền mặt + ĐTNH) (Tỷ VNĐ)
  sharesOutstanding: number; // Triệu cổ phiếu
  currentPrice?: number; // Thị giá hiện tại (VND)
  revenueGrowthForecast?: number; // Tăng trưởng doanh thu năm 1 (%)
  wacc?: number; // WACC cơ sở (%) - Mặc định 12.0
  terminalGrowth?: number; // Tăng trưởng vĩnh viễn g (%) - Mặc định 4.0
}

export interface DCFYearProjection {
  year: number;
  label: string;
  growthRate: number; // %
  fcff: number; // Tỷ VNĐ
  discountFactor: number;
  discountedFcff: number; // Tỷ VNĐ
}

export interface DCFCalculationResult {
  fcffBaseYear1: number; // Tỷ VNĐ
  projections: DCFYearProjection[]; // 5 năm
  pvOf5YearCashFlows: number; // Tỷ VNĐ
  terminalValue5: number; // Tỷ VNĐ
  pvOfTerminalValue: number; // Tỷ VNĐ
  enterpriseValue: number; // Tỷ VNĐ
  netDebt: number; // Tỷ VNĐ
  equityValue: number; // Tỷ VNĐ
  sharesOutstanding: number; // Triệu cp
  fairValuePerShare: number; // VND/cp
  sensitivityMatrix: {
    wacc: number;
    waccLabel: string;
    columns: {
      g: number;
      gLabel: string;
      fairValue: number;
    }[];
  }[];
}

/**
 * Tính toán định giá chiết khấu dòng tiền DCF / FCFF hoàn chỉnh
 */
export function calculateDCFFairValue(inputs: DCFInputs): DCFCalculationResult {
  const {
    cfoForward,
    capexForward,
    netProfitForward = 0,
    netDebt = 0,
    sharesOutstanding,
    revenueGrowthForecast = 12.0,
    wacc = 12.0,
    terminalGrowth = 4.0,
  } = inputs;

  const shares = sharesOutstanding > 0 ? sharesOutstanding : 100;

  // 1. Xác định FCFF Năm 1 (FCFF_1)
  // Ưu tiên CFO Forward - CAPEX Forward
  let fcff1 = cfoForward - Math.abs(capexForward);

  // Chuẩn hóa dòng tiền (Normalized FCFF Safeguard):
  // Nếu CFO bị âm do mùa vụ chu kỳ hoặc vốn lưu động tăng vọt bất thường,
  // dùng Normalized Operating Cash Flow = LNST * Cash Conversion Rate (~85%)
  if (fcff1 <= 0 && netProfitForward > 0) {
    const normalizedCfo = Math.round(netProfitForward * 0.85);
    fcff1 = normalizedCfo - Math.abs(capexForward);
  }

  // Đảm bảo FCFF tối thiểu không bị âm để mô hình chiết khấu vận hành
  if (fcff1 <= 0) {
    fcff1 = Math.max(100, Math.round(netProfitForward * 0.6));
  }

  // 2. Dự phóng 5 năm (Năm 1..5)
  // Tốc độ tăng trưởng năm 1 neo theo tăng trưởng doanh thu/lợi nhuận,
  // sau đó giảm dần theo bước (glide path) về mức tăng trưởng vĩnh viễn g
  const initialGrowth = Math.min(25, Math.max(8, revenueGrowthForecast));
  const step = (initialGrowth - terminalGrowth) / 4;

  const waccDec = wacc / 100;
  const gDec = terminalGrowth / 100;

  let currentFcff = fcff1;
  const projections: DCFYearProjection[] = [];
  let pv5Y = 0;

  for (let t = 1; t <= 5; t++) {
    const growthRate = t === 1 ? initialGrowth : Math.max(terminalGrowth, initialGrowth - step * (t - 1));
    if (t > 1) {
      currentFcff = Math.round(currentFcff * (1 + growthRate / 100) * 10) / 10;
    }

    const discountFactor = Math.pow(1 + waccDec, t);
    const discounted = Math.round((currentFcff / discountFactor) * 10) / 10;
    pv5Y += discounted;

    projections.push({
      year: t,
      label: `Năm ${t}`,
      growthRate: Math.round(growthRate * 10) / 10,
      fcff: currentFcff,
      discountFactor: Math.round(discountFactor * 1000) / 1000,
      discountedFcff: discounted,
    });
  }

  // 3. Giá trị vĩnh viễn (Terminal Value) tại cuối năm 5
  const fcffYear5 = projections[4]?.fcff || currentFcff;
  const denominator = Math.max(0.01, waccDec - gDec);
  const terminalValue5 = Math.round(((fcffYear5 * (1 + gDec)) / denominator) * 10) / 10;
  const pvTerminalValue = Math.round((terminalValue5 / Math.pow(1 + waccDec, 5)) * 10) / 10;

  // 4. Giá trị Doanh nghiệp (Enterprise Value) & Vốn chủ sở hữu (Equity Value)
  const enterpriseValue = Math.round((pv5Y + pvTerminalValue) * 10) / 10;
  const equityValue = Math.max(0, Math.round((enterpriseValue - netDebt) * 10) / 10);

  // 5. Giá trị hợp lý trên mỗi cổ phiếu (VND/cp)
  const fairValuePerShare = Math.round((equityValue * 1e9) / (shares * 1e6));

  // 6. Ma trận độ nhạy 3x3: WACC (11%, 12%, 13%) x g (3%, 4%, 5%)
  const waccList = [wacc - 1.0, wacc, wacc + 1.0];
  const gList = [terminalGrowth - 1.0, terminalGrowth, terminalGrowth + 1.0];

  const sensitivityMatrix = waccList.map((w) => {
    const wDec = w / 100;
    const wLabel = w === wacc ? `${w.toFixed(1)}% (Base)` : `${w.toFixed(1)}%`;

    const cols = gList.map((gVal) => {
      const gD = gVal / 100;
      const gLabel = gVal === terminalGrowth ? `g = ${gVal.toFixed(1)}% (Chuẩn)` : `g = ${gVal.toFixed(1)}%`;

      // Tính lại PV 5 năm với WACC thử nghiệm
      let testPv5Y = 0;
      let testFcff = fcff1;
      for (let t = 1; t <= 5; t++) {
        const testGrowth = t === 1 ? initialGrowth : Math.max(gVal, initialGrowth - step * (t - 1));
        if (t > 1) {
          testFcff = testFcff * (1 + testGrowth / 100);
        }
        testPv5Y += testFcff / Math.pow(1 + wDec, t);
      }

      // TV với WACC và g thử nghiệm
      const testDenom = Math.max(0.005, wDec - gD);
      const testTv5 = (testFcff * (1 + gD)) / testDenom;
      const testPvTv = testTv5 / Math.pow(1 + wDec, 5);

      const testEv = testPv5Y + testPvTv;
      const testEquity = Math.max(0, testEv - netDebt);
      const testPrice = Math.round((testEquity * 1e9) / (shares * 1e6));

      return {
        g: gVal,
        gLabel,
        fairValue: testPrice,
      };
    });

    return {
      wacc: w,
      waccLabel: wLabel,
      columns: cols,
    };
  });

  return {
    fcffBaseYear1: fcff1,
    projections,
    pvOf5YearCashFlows: Math.round(pv5Y * 10) / 10,
    terminalValue5,
    pvOfTerminalValue: pvTerminalValue,
    enterpriseValue,
    netDebt,
    equityValue,
    sharesOutstanding: shares,
    fairValuePerShare,
    sensitivityMatrix,
  };
}
