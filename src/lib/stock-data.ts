import { StockMarketData } from '@/types/analysis';

export const POPULAR_STOCKS: StockMarketData[] = [
  {
    ticker: 'HPG',
    companyName: 'Tập đoàn Hòa Phát',
    industry: 'Thép & Vật liệu xây dựng',
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
];

export function getStockData(ticker: string): StockMarketData {
  const found = POPULAR_STOCKS.find((s) => s.ticker.toUpperCase() === ticker.toUpperCase());
  if (found) return found;

  // Default fallback data for arbitrary custom tickers
  return {
    ticker: ticker.toUpperCase(),
    companyName: `Công ty Cổ phần ${ticker.toUpperCase()}`,
    industry: 'Doanh nghiệp sản xuất / thương mại',
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
