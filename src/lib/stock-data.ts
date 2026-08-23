import { StockMarketData, SectorType } from '@/types/analysis';

export const POPULAR_STOCKS: StockMarketData[] = [
  {
    ticker: 'HPG',
    companyName: 'Tập đoàn Hòa Phát',
    industry: 'Thép & Vật liệu xây dựng',
    sectorType: 'manufacturing',
    currentPrice: 28500,
    pe5YearMin: 6.2,
    pe5YearMax: 16.5,
    pe5YearAvg: 9.8,
    peIndustry: 11.2,
    pbIndustry: 1.4,
    peCompetitors: [
      { name: 'NKG (Thép Nam Kim)', pe: 12.4 },
      { name: 'HSG (Hoa Sen)', pe: 11.8 },
    ],
    pbCompetitors: [
      { name: 'NKG', pb: 1.2 },
      { name: 'HSG', pb: 1.3 },
    ],
  },
  {
    ticker: 'FPT',
    companyName: 'Công ty Cổ phần FPT',
    industry: 'Công nghệ thông tin & Viễn thông',
    sectorType: 'technology',
    currentPrice: 135000,
    pe5YearMin: 14.5,
    pe5YearMax: 26.8,
    pe5YearAvg: 19.2,
    peIndustry: 21.5,
    pbIndustry: 3.8,
    peCompetitors: [
      { name: 'CMG (CMC)', pe: 24.1 },
      { name: 'ELC (Elcom)', pe: 18.5 },
    ],
    pbCompetitors: [
      { name: 'CMG', pb: 2.9 },
      { name: 'ELC', pb: 2.1 },
    ],
  },
  {
    ticker: 'VNM',
    companyName: 'Công ty CP Sữa Việt Nam (Vinamilk)',
    industry: 'Thực phẩm & Đồ uống',
    sectorType: 'consumer_goods',
    currentPrice: 68500,
    pe5YearMin: 15.2,
    pe5YearMax: 24.5,
    pe5YearAvg: 18.6,
    peIndustry: 19.0,
    pbIndustry: 4.1,
    peCompetitors: [
      { name: 'MCM (Mộc Châu)', pe: 16.8 },
      { name: 'QNS (Đường Quảng Ngãi)', pe: 12.2 },
    ],
    pbCompetitors: [
      { name: 'MCM', pb: 2.8 },
      { name: 'QNS', pb: 2.4 },
    ],
  },
  {
    ticker: 'MWG',
    companyName: 'CTCP Đầu tư Thế Giới Di Động',
    industry: 'Bán lẻ tiêu dùng',
    sectorType: 'retail',
    currentPrice: 64200,
    pe5YearMin: 12.0,
    pe5YearMax: 28.5,
    pe5YearAvg: 17.4,
    peIndustry: 18.9,
    pbIndustry: 2.8,
    peCompetitors: [
      { name: 'FRT (FPT Retail)', pe: 35.2 },
      { name: 'DGW (Digiworld)', pe: 19.5 },
    ],
    pbCompetitors: [
      { name: 'FRT', pb: 6.2 },
      { name: 'DGW', pb: 3.1 },
    ],
  },
  {
    ticker: 'SSI',
    companyName: 'Công ty Cổ phần Chứng khoán SSI',
    industry: 'Dịch vụ Tài chính & Chứng khoán',
    sectorType: 'finance',
    currentPrice: 34200,
    pe5YearMin: 9.5,
    pe5YearMax: 25.4,
    pe5YearAvg: 15.8,
    peIndustry: 16.5,
    pbIndustry: 1.8,
    peCompetitors: [
      { name: 'VND (VNDirect)', pe: 14.2 },
      { name: 'VCI (Vietcap)', pe: 18.1 },
    ],
    pbCompetitors: [
      { name: 'VND', pb: 1.4 },
      { name: 'VCI', pb: 2.1 },
    ],
  },
  {
    ticker: 'PHP',
    companyName: 'Công ty CP Cảng Hải Phòng',
    industry: 'Dịch vụ Cảng biển & Logistics',
    sectorType: 'logistics_port',
    currentPrice: 48500,
    pe5YearMin: 7.5,
    pe5YearMax: 18.0,
    pe5YearAvg: 12.0,
    peIndustry: 13.5,
    pbIndustry: 1.6,
    peCompetitors: [
      { name: 'GMD (Gemadept)', pe: 15.2 },
      { name: 'HAH (Hàng Hải Hà Nội)', pe: 11.8 },
    ],
    pbCompetitors: [
      { name: 'GMD', pb: 2.0 },
      { name: 'HAH', pb: 1.4 },
    ],
  },
];

// Infer a sector from free-text industry description
function inferSector(industry: string): SectorType {
  const s = industry.toLowerCase();
  if (s.includes('cảng') || s.includes('logistics') || s.includes('vận tải') || s.includes('kho bãi')) return 'logistics_port';
  if (s.includes('ngân hàng') || s.includes('chứng khoán') || s.includes('bảo hiểm') || s.includes('tài chính')) return 'finance';
  if (s.includes('công nghệ') || s.includes('phần mềm') || s.includes('viễn thông') || s.includes('cntt')) return 'technology';
  if (s.includes('bán lẻ') || s.includes('thương mại')) return 'retail';
  if (s.includes('bất động sản') || s.includes('xây dựng')) return 'real_estate';
  if (s.includes('điện') || s.includes('dầu khí') || s.includes('khoáng sản')) return 'energy';
  if (s.includes('thực phẩm') || s.includes('đồ uống') || s.includes('sữa') || s.includes('fmcg')) return 'consumer_goods';
  if (s.includes('thép') || s.includes('xi măng') || s.includes('sản xuất') || s.includes('hoá chất')) return 'manufacturing';
  return 'general';
}

export function getStockData(ticker: string): StockMarketData {
  const found = POPULAR_STOCKS.find((s) => s.ticker.toUpperCase() === ticker.toUpperCase());
  if (found) return found;

  // Default fallback data for arbitrary custom tickers
  return {
    ticker: ticker.toUpperCase(),
    companyName: `Công ty Cổ phần ${ticker.toUpperCase()}`,
    industry: 'Doanh nghiệp sản xuất / thương mại',
    sectorType: 'general',
    currentPrice: 30000,
    pe5YearMin: 8.0,
    pe5YearMax: 20.0,
    pe5YearAvg: 13.5,
    peIndustry: 14.5,
    pbIndustry: 1.8,
    peCompetitors: [{ name: 'Đang cập nhật đối thủ A', pe: 14.0 }],
    pbCompetitors: [{ name: 'Đang cập nhật đối thủ A', pb: 1.6 }],
  };
}

export { inferSector };
