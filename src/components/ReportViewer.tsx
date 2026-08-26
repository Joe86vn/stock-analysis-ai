'use client';

import React, { useState, useEffect } from 'react';
import { AnalysisReport, SectionA, SectionB, SectionC, SectionD, SectorType } from '@/types/analysis';
import { ValuationCalculator } from './ValuationCalculator';
import { FileText, Building2, Factory, LineChart, Target, Edit3, Check, BarChart2, Cpu, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from 'recharts';

interface ReportViewerProps {
  report: AnalysisReport;
  onUpdateReport: (updatedReport: AnalysisReport) => void;
  onRegenerate?: () => void;
  isGenerating?: boolean;
}


// Sector-aware Supply Chain / Value Chain Flowchart
function SupplyChainFlowchart({ ticker, sectorType }: { ticker: string; sectorType?: SectorType }) {
  const t = ticker.toUpperCase();
  const sector = sectorType || 'general';

  // --- Build sector-specific node data ---
  type FlowNode = { label: string; items: { left: string; right?: string }[] };

  const SECTOR_FLOWS: Record<SectorType, { title: string; inputHeader: string; processHeader: string; outputHeader: string; inputItems: FlowNode['items']; processDesc: string; processDetail: string; outputItems: FlowNode['items'] }> = {
    manufacturing: {
      title: 'Sơ đồ chuỗi giá trị: Sản xuất Công nghiệp',
      inputHeader: 'ĐẦU VÀO (Inputs)',
      processHeader: 'QUY TRÌNH (Production)',
      outputHeader: 'ĐẦU RA (Outputs)',
      inputItems: [
        { left: 'Nguyên liệu thô', right: 'Nhà cung cấp quốc tế' },
        { left: 'Năng lượng (KWh, Khí, Dầu)', right: 'EVN / Tự cấp' },
        { left: 'Vận chuyển đầu vào', right: 'Logistics' },
      ],
      processDesc: 'Sản xuất / Chế biến',
      processDetail: 'Kiểm soát chất lượng chặt chẽ, tối ưu hóa năng suất và hạ chi phí giá vốn.',
      outputItems: [
        { left: 'Sản phẩm hoàn thiện', right: 'Thị trường nội địa' },
        { left: 'Xuất khẩu', right: 'Đông Nam Á / Quốc tế' },
      ],
    },
    logistics_port: {
      title: 'Sơ đồ chuỗi giá trị: Dịch vụ Cảng biển & Logistics',
      inputHeader: 'ĐẦU VÀO DỊCH VỤ',
      processHeader: 'VẬN HÀNH (Operations)',
      outputHeader: 'GIÁ TRỊ ĐẦU RA',
      inputItems: [
        { left: 'Hàng container xuất khẩu (TEU)', right: 'Chủ hàng / Forwarder' },
        { left: 'Hàng container nhập khẩu (TEU)', right: 'Doanh nghiệp FDI' },
        { left: 'Nhân công cầu cảng & thiết bị', right: 'Tuyển dụng & Mua sắm' },
        { left: 'Năng lượng (EVN + Dầu diesel)', right: 'Chi phí biến đổi' },
      ],
      processDesc: 'Xếp dỡ & Lưu kho (Stevedoring)',
      processDetail: 'Hệ thống cầu bờ STS / Tukan → Cầu giàn RTG → Xe nâng → Yard Depot. Tự động hóa tăng công suất xếp dỡ và giảm chi phí nhân công.',
      outputItems: [
        { left: 'Phí xếp dỡ container', right: '~60-70% doanh thu' },
        { left: 'Dịch vụ kho bãi & lưu bãi', right: '~20-25% doanh thu' },
        { left: 'Dịch vụ cảng cạn (ICD) & vận chuyển', right: '~10-15% doanh thu' },
      ],
    },
    technology: {
      title: 'Sơ đồ chuỗi giá trị: Công nghệ & Phần mềm',
      inputHeader: 'NGUỒN LỰC ĐẦU VÀO',
      processHeader: 'QUY TRÌNH TẠO GIÁ TRỊ',
      outputHeader: 'SẢN PHẨM / DỊCH VỤ',
      inputItems: [
        { left: 'Kỹ sư Phần mềm', right: 'Đại học & Chiêu mộ tài năng' },
        { left: 'Hạ tầng Cloud & AI', right: 'AWS, Azure, NVIDIA' },
        { left: 'Sở hữu trí tuệ (IP)', right: 'R&D nội bộ' },
      ],
      processDesc: 'Phát triển & Tư vấn',
      processDetail: 'Mô hình phát triển toàn cầu (Global Delivery Model): kết hợp talent Việt Nam với tinh hoa công nghệ quốc tế.',
      outputItems: [
        { left: 'Xuất khẩu phần mềm', right: '~55% doanh thu' },
        { left: 'Viễn thông & Internet', right: '~35% doanh thu' },
        { left: 'Giáo dục & Bán lẻ CNTT', right: '~10% doanh thu' },
      ],
    },
    retail: {
      title: 'Sơ đồ chuỗi giá trị: Bán lẻ Tiêu dùng',
      inputHeader: 'NGUỒN CUNG ỨNG',
      processHeader: 'VẬN HÀNH CHUỖI BÁN LẺ',
      outputHeader: 'KÊNH PHÂN PHỐI',
      inputItems: [
        { left: 'Hàng hóa từ nhà sản xuất', right: 'Năng lực thương lượng giá' },
        { left: 'Hệ thống kho vận', right: 'Quản lý tồn kho (WMS)' },
        { left: 'Nhân sự bán hàng', right: 'Đào tạo nội bộ' },
      ],
      processDesc: 'Quản lý chuỗi cửa hàng',
      processDetail: 'Hệ thống ERP tích hợp, tối ưu kho từ đầu đến hết ngày (sell-through) và giảm tối đa hàng tồn chết.',
      outputItems: [
        { left: 'Cửa hàng trực tiếp (Offline)', right: 'Hệ thống cả nước' },
        { left: 'Kênh online / E-commerce', right: 'Tăng trưởng nhanh' },
        { left: 'Omni-channel', right: 'Tích hợp đa kênh' },
      ],
    },
    consumer_goods: {
      title: 'Sơ đồ chuỗi giá trị: Hàng Tiêu dùng (FMCG)',
      inputHeader: 'NGUYÊN LIỆU ĐẦU VÀO',
      processHeader: 'SẢN XUẤT & ĐÓNG GÓI',
      outputHeader: 'PHÂN PHỐI',
      inputItems: [
        { left: 'Nguyên liệu thô (sữa tươi, đường...)', right: 'Nông dân & Nhà cung cấp' },
        { left: 'Bao bì & Đóng gói', right: 'Nhà cung cấp đa dạng' },
        { left: 'Năng lượng sản xuất', right: 'Chi phí ổn định' },
      ],
      processDesc: 'Sản xuất khoa học & Kiểm định chất lượng',
      processDetail: 'Công đoạn chế biến đạt chuẩn an toàn thực phẩm cao nhất, kiểm soát vi sinh và chất lượng theo tiêu chuẩn quốc tế (ISO, FSSC 22000).',
      outputItems: [
        { left: 'Siêu thị / Convenience', right: '~60% doanh thu' },
        { left: 'Kênh truyền thống (GT)', right: '~30% doanh thu' },
        { left: 'Xuất khẩu', right: '~10% doanh thu' },
      ],
    },
    real_estate: {
      title: 'Sơ đồ chuỗi giá trị: Bất động sản & Xây dựng',
      inputHeader: 'NGUỒN LỰC DỰ ÁN',
      processHeader: 'PHÁT TRIỂN & XÂY DỰNG',
      outputHeader: 'BÁN HÀNG & BÀN GIAO',
      inputItems: [
        { left: 'Quỹ đất (Land bank)', right: 'Nền tảng tài sản' },
        { left: 'Vốn tài trợ (vay ngân hàng)', right: 'Đòn bẩy tài chính' },
        { left: 'Nhà thầu & Vật tư xây dựng', right: 'Chi phí xây dựng' },
      ],
      processDesc: 'Phát triển và Thi công dự án',
      processDetail: 'Pháp lý dự án → Thiết kế → Thi công → PCCC & nghiệm thu. Tốc độ bàn giao tác động trực tiếp đến dòng tiền.',
      outputItems: [
        { left: 'Bán căn hộ / nền đất', right: 'Doanh thu chính' },
        { left: 'Cho thuê BĐS thương mại', right: 'Thu nhập ổn định' },
        { left: 'Dịch vụ quản lý tòa nhà', right: 'Thu phí dịch vụ' },
      ],
    },
    finance: {
      title: 'Sơ đồ chuỗi giá trị: Dịch vụ Tài chính',
      inputHeader: 'NGUỒN VỐN & KHÁCH HÀNG',
      processHeader: 'DỊCH VỤ TÀI CHÍNH',
      outputHeader: 'LOẠI HÌNH DOANH THU',
      inputItems: [
        { left: 'Vốn chủ sở hữu (Equity)', right: 'Nền tảng vốn' },
        { left: 'Khách hàng cá nhân & tổ chức', right: 'Hồ khách hàng' },
        { left: 'Công nghệ Fintech & nền tảng GD', right: 'Hạ tầng công nghệ' },
      ],
      processDesc: 'Quản lý rủi ro & tạo lợi nhuận',
      processDetail: 'Mô hình kiếm tiền từ chênh lệch lãi suất (NIM), phí giao dịch và tự doanh (proprietary trading). Kiểm soát NPL và quản trị rủi ro tín dụng.',
      outputItems: [
        { left: 'Phí môi giới & tư vấn', right: 'Mảng tạo phí' },
        { left: 'Lãi vay margin', right: 'Thu nhập lãi' },
        { left: 'Tự doanh chứng khoán (Prop trading)', right: 'Thu nhập biến động' },
      ],
    },
    energy: {
      title: 'Sơ đồ chuỗi giá trị: Năng lượng & Tài nguyên',
      inputHeader: 'THU HÁI TÀI NGUYÊN',
      processHeader: 'CHẾ BIẾN & PHÂN PHỐI',
      outputHeader: 'SẢN PHẨM & DỊCH VỤ',
      inputItems: [
        { left: 'Khai thác khoáng sản / dầu khí', right: 'Mỏ và giếng khai thác' },
        { left: 'Nhập khẩu nguyên liệu', right: 'Nhà cung cấp quốc tế' },
        { left: 'Hạ tầng sản xuất điện', right: 'Nhiệt điện / Điện mặt trời' },
      ],
      processDesc: 'Chế biến & Tạo ra năng lượng',
      processDetail: 'Chuỗi giá trị từ thượng nguồn (Upstream: khai thác) → trung nguồn (Midstream: chế biến) → hạ nguồn (Downstream: phân phối).',
      outputItems: [
        { left: 'Bán điện (EVN / mua bán)', right: 'Doanh thu chính' },
        { left: 'Chế phẩm dầu khí (LPG, Xăng)', right: 'Thị trường bán lẻ' },
        { left: 'Dịch vụ vận tải năng lượng', right: 'Hợp đồng dài hạn' },
      ],
    },
    general: {
      title: 'Sơ đồ chuỗi giá trị Hoạt động',
      inputHeader: 'ĐẦU VÀO (Inputs)',
      processHeader: 'QUY TRÌNH VẬN HÀNH',
      outputHeader: 'ĐẦU RA (Outputs)',
      inputItems: [
        { left: 'Nguyên vật liệu cốt lõi', right: 'Nhà cung cấp chính' },
        { left: 'Nguồn nhân lực', right: 'Tuyển dụng & Đào tạo' },
        { left: 'Công nghệ & Hạ tầng', right: 'Mua sắm đầu tư' },
      ],
      processDesc: 'Quản lý hoạt động',
      processDetail: 'Tối ưu hóa năng suất hoạt động và kiểm soát chi phí giá vốn cạnh tranh.',
      outputItems: [
        { left: 'Sản phẩm / Dịch vụ chính', right: 'Khách hàng cốt lõi' },
        { left: 'Mảng kiến tạo giá trị khác', right: 'Tăng trưởng mới' },
      ],
    },
  };

  // HPG gets its dedicated manufacturing flowchart with specific data
  const isHPG = t === 'HPG';
  const flow = isHPG ? {
    title: 'Sơ đồ chuỗi giá trị tích hợp chiều sâu: HPG (Hòa Phát)',
    inputHeader: '1. ĐẦU VÀO KHÉP KÍN (INPUTS)',
    processHeader: '2. SẢN XUẤT ĐỒNG BỘ (PRODUCTION)',
    outputHeader: '3. ĐẦU RA THỊ TRƯỜNG (OUTPUTS)',
    inputItems: [
      { left: 'Quặng sắt (Úc / Brazil):', right: 'Hợp đồng dài hạn' },
      { left: 'Than mỡ luyện cốc:', right: 'Chi phí biến đổi chính' },
      { left: 'Thạch cao & Đá vôi:', right: 'Phụ gia luyện kim' },
      { left: 'Cảng biển nước sâu:', right: 'Tàu 200.000 tấn cập bến' },
    ],
    processDesc: 'Lò cao BOF & Dung Quất 1 + 2',
    processDetail: 'Công nghệ lò cao khép kín từ quặng đến thép. Tái sử dụng 100% khí dư để phát điện (tự đáp ứng 80% điện nhà máy, tiết kiệm hàng nghìn tỷ/năm).',
    outputItems: [
      { left: 'Thép xây dựng & Phôi thép:', right: 'Thị phần #1 Việt Nam (~35%)' },
      { left: 'Thép cuộn cán nóng HRC:', right: 'Cung cấp cho ống thép & tôn mạ' },
      { left: 'Ống thép & Tôn mạ Hòa Phát:', right: 'Thị phần #1 ống thép (~28%)' },
      { left: 'Xuất khẩu (>30 quốc gia):', right: 'Mỹ, EU, Đông Nam Á' },
    ],
  } : (SECTOR_FLOWS[sector] || SECTOR_FLOWS.general);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-sky-500/20 bg-white dark:bg-gray-950/60 p-4 shadow-sm dark:shadow-lg space-y-3 my-4 transition-colors">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
        <h4 className="text-xs font-bold text-blue-700 dark:text-sky-400 flex items-center gap-1.5 uppercase tracking-wide font-heading">
          <Factory className="h-4 w-4 text-blue-600 dark:text-sky-400" />
          <span>{flow.title}</span>
        </h4>
        <span className="text-[10px] text-slate-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-2 py-0.5 rounded font-mono">
          Sector: {sector}
        </span>
      </div>

      {/* Desktop & Tablet: Flow 3 cột */}
      <div className="hidden md:grid grid-cols-3 gap-3 text-xs">
        {/* Inputs */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 space-y-2.5 overflow-hidden">
          <div className="font-bold border-b border-gray-200 dark:border-gray-800 pb-1.5 mb-1 uppercase text-[10px] tracking-wider text-blue-700 dark:text-sky-400">{flow.inputHeader}</div>
          {flow.inputItems.map((item, i) => (
            <div key={i} className="space-y-0.5">
              <div className="text-slate-800 dark:text-gray-300 font-medium leading-snug">{item.left}</div>
              {item.right && <div className="text-blue-600 dark:text-sky-400 font-semibold text-[10px]">{item.right}</div>}
            </div>
          ))}
        </div>

        {/* Process */}
        <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/25 space-y-2 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="font-bold text-emerald-800 dark:text-emerald-400 border-b border-emerald-200 dark:border-emerald-500/15 pb-1.5 mb-2 uppercase text-[10px] tracking-wider">{flow.processHeader}</div>
            <div className="font-bold text-slate-900 dark:text-gray-100 text-xs mb-1 font-heading">{flow.processDesc}</div>
            <p className="text-[11px] text-slate-700 dark:text-gray-300 leading-relaxed">{flow.processDetail}</p>
          </div>
          <div className="pt-2 text-[10px] text-emerald-700 dark:text-emerald-400/80 font-mono text-right font-bold border-t border-emerald-200 dark:border-emerald-500/10">
            ► Tối ưu chi phí &amp; Biên lợi nhuận
          </div>
        </div>

        {/* Outputs */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 space-y-2.5 overflow-hidden">
          <div className="font-bold border-b border-gray-200 dark:border-gray-800 pb-1.5 mb-1 uppercase text-[10px] tracking-wider text-purple-700 dark:text-purple-400">{flow.outputHeader}</div>
          {flow.outputItems.map((item, i) => (
            <div key={i} className="space-y-0.5">
              <div className="text-slate-800 dark:text-gray-300 leading-snug">{item.left}</div>
              {item.right && <div className="text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">{item.right}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: stack dọc */}
      <div className="md:hidden flex flex-col gap-3 text-xs">
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 space-y-2">
          <div className="font-bold border-b border-gray-200 dark:border-gray-800 pb-1.5 uppercase text-[10px] tracking-wider text-blue-700 dark:text-sky-400">{flow.inputHeader}</div>
          {flow.inputItems.map((item, i) => (
            <div key={i}>
              <div className="text-slate-800 dark:text-gray-300 font-medium">{item.left}</div>
              {item.right && <div className="text-slate-500 dark:text-gray-500 text-[10px]">{item.right}</div>}
            </div>
          ))}
        </div>
        <div className="text-center text-gray-400 dark:text-gray-600 text-xl">&#11015;</div>
        <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/25 space-y-1.5">
          <div className="font-bold text-emerald-800 dark:text-emerald-400 border-b border-emerald-200 dark:border-emerald-500/15 pb-1.5 uppercase text-[10px] tracking-wider">{flow.processHeader}</div>
          <div className="font-semibold text-slate-900 dark:text-gray-200 text-[11px] font-heading">{flow.processDesc}</div>
          <p className="text-[10px] text-slate-700 dark:text-gray-400 leading-relaxed">{flow.processDetail}</p>
        </div>
        <div className="text-center text-gray-400 dark:text-gray-600 text-xl">&#11015;</div>
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 space-y-2">
          <div className="font-bold border-b border-gray-200 dark:border-gray-800 pb-1.5 uppercase text-[10px] tracking-wider text-purple-700 dark:text-purple-400">{flow.outputHeader}</div>
          {flow.outputItems.map((item, i) => (
            <div key={i}>
              <div className="text-slate-800 dark:text-gray-300">{item.left}</div>
              {item.right && <div className="text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">{item.right}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReportViewer({
  report,
  onUpdateReport,
  onRegenerate,
  isGenerating,
}: ReportViewerProps) {
  const [activeTab, setActiveTab] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [isEditing, setIsEditing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [realQuarterlyFinancials, setRealQuarterlyFinancials] = useState<any[]>([]);

  // Fetch real BCTC quarterly data from Simplize API endpoint
  useEffect(() => {
    if (report?.ticker) {
      fetch(`/api/stocks/${report.ticker}/financials`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.quarters && Array.isArray(data.quarters)) {
            setRealQuarterlyFinancials(data.quarters);
          }
        })
        .catch((err) => console.warn('Failed to fetch real financials:', err));
    }
  }, [report?.ticker]);

  // Editable states
  const [secA, setSecA] = useState<SectionA>(report.sectionA);
  const [secB, setSecB] = useState<SectionB>(report.sectionB);
  const [secC, setSecC] = useState<SectionC>(report.sectionC);
  const [secDGrowth, setSecDGrowth] = useState<string>(report.sectionD.growthDriversRevenueAndCost);

  // Sync internal states when report prop updates
  useEffect(() => {
    setSecA(report.sectionA);
    setSecB(report.sectionB);
    setSecC(report.sectionC);
    setSecDGrowth(report.sectionD.growthDriversRevenueAndCost);
    setIsEditing(false);
  }, [report]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSaveEdits = () => {
    onUpdateReport({
      ...report,
      sectionA: secA,
      sectionB: secB,
      sectionC: secC,
      sectionD: {
        ...report.sectionD,
        growthDriversRevenueAndCost: secDGrowth,
      },
    });
    setIsEditing(false);
  };

  // Helper: Custom Table renderer with Grouped Year/Quarter Headers & Hierarchy Styling
  const renderTable = (headers: string[], rows: string[][], key: string) => {
    const isYear = (h: string) => /^\d{4}$/.test(h.replace(/[A-Za-z]/g, '').trim());
    const isQuarter = (h: string) => h.includes('Q') || h.includes('6T') || h.includes('9T') || h.includes('Tháng') || h.includes('Quý');

    const yearCols = headers.filter(isYear);
    const quarterCols = headers.filter(isQuarter);

    const hasYearAndQuarter = yearCols.length > 0 && quarterCols.length > 0;

    return (
      <div key={key} className="overflow-x-auto my-4 border border-gray-200 dark:border-gray-800/80 rounded-xl bg-white dark:bg-gray-950/20 shadow-2xs">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-850 text-xs">
          <thead className="bg-gray-50 dark:bg-[#0b1329]/80">
            {hasYearAndQuarter && (
              <tr className="border-b border-gray-200 dark:border-gray-800/60 text-[9px] uppercase tracking-wider text-slate-600 dark:text-gray-400">
                <th className="px-4 py-2 text-left font-bold bg-gray-100/80 dark:bg-[#070d1a]/50 text-slate-700 dark:text-gray-400">Chỉ số kỳ báo cáo</th>
                <th colSpan={yearCols.length} className="px-4 py-2 text-center font-bold bg-blue-50/70 dark:bg-sky-950/15 text-blue-700 dark:text-sky-400 border-l border-r border-gray-200 dark:border-gray-800/60">
                  Dữ liệu theo Năm
                </th>
                <th colSpan={quarterCols.length} className="px-4 py-2 text-center font-bold bg-emerald-50/70 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400">
                  Dữ liệu theo Quý (5 Quý gần nhất)
                </th>
              </tr>
            )}
            <tr className="border-b border-gray-200 dark:border-gray-800/50">
              {headers.map((h, idx) => {
                let headerColor = "text-slate-800 dark:text-gray-300";
                if (idx > 0) {
                  if (isYear(h)) headerColor = "text-blue-700 dark:text-sky-400 font-bold";
                  else if (isQuarter(h)) headerColor = "text-emerald-700 dark:text-emerald-400 font-bold";
                }
                return (
                  <th
                    key={idx}
                    className={`px-4 py-2.5 text-left font-bold uppercase tracking-wider ${headerColor}`}
                  >
                    {h}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800/60 bg-transparent text-slate-800 dark:text-gray-200">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/20 transition">
                {row.map((cell, cIdx) => {
                  const isIndicatorCol = cIdx === 0;
                  const cellText = cell.trim();

                  // Nhận diện xem dòng này có phải là chỉ tiêu tăng trưởng không
                  const isGrowthRow = cellText.startsWith('+') || cellText.toLowerCase().includes('tăng trưởng') || cellText.includes('%');

                  let tdClass = "px-4 py-2.5 text-slate-800 dark:text-gray-300 whitespace-nowrap";
                  if (isIndicatorCol) {
                    if (isGrowthRow) {
                      tdClass = "px-4 py-2 text-slate-600 dark:text-gray-400 italic font-medium whitespace-nowrap pl-6 bg-gray-50/40 dark:bg-gray-950/10";
                    } else {
                      tdClass = "px-4 py-2.5 text-slate-900 dark:text-white font-bold whitespace-nowrap bg-gray-50/80 dark:bg-[#0b1329]/10";
                    }
                  } else {
                    if (isGrowthRow) {
                      tdClass = "px-4 py-2 text-slate-700 dark:text-gray-355 whitespace-nowrap font-medium";
                    }
                  }

                  return (
                    <td key={cIdx} className={tdClass}>
                      {renderInlineStyles(cell)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Helper: Process inline numbered points like (1), (2), (3) into clean letter list items a), b), c) (Phong cách 2)
  const renderFormattedParagraph = (text: string, keyPrefix: string) => {
    if (!text) return null;

    // Pattern to catch inline numbered points like (1), (2), (3) - strictly 1-2 digits (1..99)
    // Ignore 4-digit years like (2025), (2026F), (2027)
    const numRegex = /\(([1-9]\d?)\)/g;
    const matches = Array.from(text.matchAll(numRegex));

    // Filter out matches that are actually years or non-list numbers
    const validMatches = matches.filter((m) => {
      const numVal = parseInt(m[1], 10);
      return numVal < 100; // List items are always 1..99
    });

    if (validMatches.length > 0) {
      const elements: React.ReactNode[] = [];

      // Extract intro text before the first (1)
      const firstMatchIndex = validMatches[0].index ?? 0;
      if (firstMatchIndex > 0) {
        const introText = text.substring(0, firstMatchIndex).trim();
        if (introText) {
          elements.push(
            <p key={`${keyPrefix}-intro`} className="text-xs text-slate-800 dark:text-gray-200 leading-relaxed my-2">
              {renderInlineStyles(introText)}
            </p>
          );
        }
      }

      // Loop through each valid numbered point and convert to a), b), c)
      const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
      validMatches.forEach((m, idx) => {
        const letterMarker = letters[idx] || `${idx + 1}`;
        const startPos = (m.index ?? 0) + m[0].length;
        const endPos = idx + 1 < validMatches.length ? (validMatches[idx + 1].index ?? text.length) : text.length;

        let itemText = text.substring(startPos, endPos).trim();
        // Clean trailing semicolons, brackets, or dots
        itemText = itemText.replace(/[;\s]+$/, '').replace(/^\]\s*->\s*\[?/, '').trim();

        if (itemText) {
          elements.push(
            <div key={`${keyPrefix}-item-${idx}`} className="my-1.5 flex items-start space-x-2 pl-3">
              <span className="text-xs font-bold text-emerald-700 dark:text-sky-400 shrink-0">
                {letterMarker})
              </span>
              <div className="text-xs text-slate-800 dark:text-gray-200 leading-relaxed flex-1 pt-0.5">
                {renderInlineStyles(itemText)}
              </div>
            </div>
          );
        }
      });

      return <div key={`${keyPrefix}-num-container`} className="my-2 space-y-1">{elements}</div>;
    }

    // Default regular paragraph
    return (
      <p key={`${keyPrefix}-p`} className="text-xs text-slate-800 dark:text-gray-200 leading-relaxed my-2">
        {renderInlineStyles(text)}
      </p>
    );
  };

  // Helper: Process bracketed chain text into clean natural paragraphs (Phong cách 3)
  const renderBracketOrStructuredBlock = (rawText: string, keyPrefix: string) => {
    if (!rawText) return null;

    // Check if rawText contains bracketed arrow format: [X] -> [Y]
    if (rawText.includes('] -> [') || (rawText.startsWith('[') && rawText.includes(']'))) {
      const bracketMatches = rawText.match(/\[(.*?)\]/g);

      if (bracketMatches && bracketMatches.length >= 2) {
        const cleanedBlocks = bracketMatches.map((b) => b.replace(/^\[/, '').replace(/\]$/, '').trim());

        return (
          <div key={`${keyPrefix}-bracket-wrapper`} className="my-3 space-y-1.5">
            {/* Block 0: Luận điểm (Subheading in bold, no boxes/borders) */}
            <div className="text-xs font-bold text-emerald-800 dark:text-sky-300 mt-2 mb-1 font-heading">
              {renderInlineStyles(cleanedBlocks[0])}
            </div>

            {/* Block 1: Nội dung phân tích chi tiết */}
            <div className="text-xs text-slate-800 dark:text-gray-200 leading-relaxed">
              {renderFormattedParagraph(cleanedBlocks[1], `${keyPrefix}-body`)}
            </div>

            {/* Block 2 (nếu có): Đánh giá tác động & Kết luận */}
            {cleanedBlocks.length >= 3 && (
              <div className="text-xs text-slate-700 dark:text-gray-300 leading-relaxed mt-1.5 font-medium">
                {renderInlineStyles(cleanedBlocks[2])}
              </div>
            )}
          </div>
        );
      }
    }

    // Normal text paragraph processing
    return renderFormattedParagraph(rawText, keyPrefix);
  };

  // Helper: Custom Markdown + Tables + ASCII Flowcharts parser
  const renderMarkdown = (text: string) => {
    if (!text) return null;

    const parts: React.ReactNode[] = [];
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code block check (for ASCII diagrams)
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          parts.push(
            <pre
              key={`code-${i}`}
              className="font-mono bg-gray-900 dark:bg-[#030712] p-4 rounded-xl border border-gray-200 dark:border-gray-800 text-emerald-400 dark:text-sky-400 overflow-x-auto text-[11px] my-3 leading-relaxed"
            >
              {codeBlockLines.join('\n')}
            </pre>
          );
          codeBlockLines = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      // Markdown Table check
      const isTableLine = line.trim().startsWith('|') && line.trim().endsWith('|');
      if (isTableLine) {
        if (!inTable) {
          inTable = true;
          tableHeaders = line
            .split('|')
            .map((s) => s.trim())
            .filter((s) => s);
          // Skip separator row (like |---|---|)
          if (
            i + 1 < lines.length &&
            (lines[i + 1].includes('-|-') || lines[i + 1].includes('---'))
          ) {
            i++;
          }
        } else {
          const rawRow = line.split('|').map((s) => s.trim());
          // Remove empty elements from ends of split row
          const row = rawRow.slice(1, rawRow.length - 1);
          tableRows.push(row);
        }
        continue;
      } else if (inTable) {
        parts.push(renderTable(tableHeaders, tableRows, `table-${i}`));
        inTable = false;
        tableHeaders = [];
        tableRows = [];
      }

      // General content formatting
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        parts.push(
          <h4 key={i} className="text-xs font-bold text-emerald-800 dark:text-sky-300 mt-4 mb-1.5 font-heading">
            {trimmed.replace('###', '').trim()}
          </h4>
        );
      } else if (trimmed.startsWith('##')) {
        parts.push(
          <h3 key={i} className="text-sm font-bold text-slate-900 dark:text-white mt-5 mb-2 font-heading">
            {trimmed.replace('##', '').trim()}
          </h3>
        );
      } else if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        const bulletText = trimmed.substring(1).trim();
        parts.push(
          <div key={i} className="my-1.5 text-xs text-slate-800 dark:text-gray-200 leading-relaxed">
            {renderBracketOrStructuredBlock(bulletText, `bullet-${i}`)}
          </div>
        );
      } else if (trimmed.length > 0) {
        // Check if line starts with numbered list item like "1. ", "2. ", "3. "
        const numberedLineMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numberedLineMatch) {
          const num = numberedLineMatch[1];
          const content = numberedLineMatch[2];
          const isYearNum = parseInt(num, 10) >= 1900;

          if (!isYearNum) {
            parts.push(
              <div key={i} className="my-2 text-xs text-slate-800 dark:text-gray-200 leading-relaxed">
                <span className="font-bold text-emerald-700 dark:text-sky-300 mr-1.5">{num}.</span>
                {renderBracketOrStructuredBlock(content, `numitem-${i}`)}
              </div>
            );
            continue;
          }
        }

        parts.push(renderBracketOrStructuredBlock(trimmed, `line-${i}`));
      }
    }

    if (inTable) {
      parts.push(renderTable(tableHeaders, tableRows, "table-end"));
    }

    return parts;
  };

  const renderInlineStyles = (text: string) => {
    if (!text) return text;

    // 1. Kiểm tra và định dạng màu cho số tăng trưởng phần trăm dương/âm (sau khi dọn dẹp dấu *)
    const cleanText = text.replace(/\*/g, '').trim();

    // Tăng trưởng dương bắt đầu bằng dấu '+' và kết thúc bằng '%' (ví dụ: +15.0% hoặc +44.2%)
    if (cleanText.startsWith('+') && cleanText.endsWith('%')) {
      return (
        <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
          {cleanText}
        </span>
      );
    }
    // Tăng trưởng âm bắt đầu bằng dấu '-' và kết thúc bằng '%' (ví dụ: -8.3%)
    if (cleanText.startsWith('-') && cleanText.endsWith('%')) {
      return (
        <span className="text-rose-600 dark:text-red-400 font-bold tabular-nums">
          {cleanText}
        </span>
      );
    }

    // 2. Parse Bold **text** và Italic *text*
    const boldRegex = /\*\*(.*?)\*\*/g;
    const processedText: React.ReactNode[] = [];
    let lastIndex = 0;

    const parseItalicAndNormal = (str: string, baseKey: string) => {
      const parts: React.ReactNode[] = [];
      let last = 0;
      let match;
      const italicRegex = /\*(.*?)\*/g;

      while ((match = italicRegex.exec(str)) !== null) {
        if (match.index > last) {
          parts.push(str.substring(last, match.index));
        }
        parts.push(
          <em key={`${baseKey}-it-${match.index}`} className="italic text-slate-600 dark:text-gray-400 not-italic style-italic">
            {match[1]}
          </em>
        );
        last = italicRegex.lastIndex;
      }
      if (last < str.length) {
        parts.push(str.substring(last));
      }
      return parts.length > 0 ? parts : str;
    };

    let boldMatch;
    let keyIdx = 0;
    while ((boldMatch = boldRegex.exec(text)) !== null) {
      if (boldMatch.index > lastIndex) {
        const normalPart = text.substring(lastIndex, boldMatch.index);
        const parsed = parseItalicAndNormal(normalPart, `norm-${keyIdx}`);
        if (Array.isArray(parsed)) {
          processedText.push(...parsed);
        } else {
          processedText.push(parsed);
        }
      }
      processedText.push(
        <strong key={`bold-${boldMatch.index}`} className="font-bold text-slate-950 dark:text-white">
          {boldMatch[1]}
        </strong>
      );
      lastIndex = boldRegex.lastIndex;
      keyIdx++;
    }

    if (lastIndex < text.length) {
      const remaining = text.substring(lastIndex);
      const parsed = parseItalicAndNormal(remaining, `rem`);
      if (Array.isArray(parsed)) {
        processedText.push(...parsed);
      } else {
        processedText.push(parsed);
      }
    }

    return processedText.length > 0 ? processedText : text;
  };

  // Chart Data: AI-generated revenueBreakdown takes priority, then known ticker hardcodes
  const PALETTE = ['#38bdf8', '#10b981', '#a855f7', '#f59e0b', '#ef4444'];
  const getProductMixData = (ticker: string) => {
    // 1. Use AI-provided breakdown if present
    if (report.sectionB.revenueBreakdown && report.sectionB.revenueBreakdown.length > 0) {
      return report.sectionB.revenueBreakdown.map((seg, i) => ({
        name: seg.name,
        value: seg.value,
        color: seg.color || PALETTE[i % PALETTE.length],
      }));
    }
    // 2. Fall back to known ticker hardcodes
    const t = ticker.toUpperCase();
    if (t === 'HPG') {
      return [
        { name: 'Thép xây dựng', value: 62, color: '#38bdf8' },
        { name: 'Thép HRC', value: 28, color: '#10b981' },
        { name: 'Ống thép & Tôn', value: 8, color: '#a855f7' },
        { name: 'Khác', value: 2, color: '#f59e0b' },
      ];
    }
    if (t === 'FPT') {
      return [
        { name: 'CNTT Nước Ngoài', value: 55, color: '#38bdf8' },
        { name: 'Viễn Thông', value: 35, color: '#10b981' },
        { name: 'Giáo Dục & Khác', value: 10, color: '#a855f7' },
      ];
    }
    if (t === 'VNM') {
      return [
        { name: 'Sữa Nước', value: 45, color: '#38bdf8' },
        { name: 'Sữa Bột', value: 25, color: '#10b981' },
        { name: 'Sữa Chua', value: 18, color: '#a855f7' },
        { name: 'Khác', value: 12, color: '#f59e0b' },
      ];
    }
    if (t === 'MWG') {
      return [
        { name: 'Điện Máy Xanh', value: 48, color: '#38bdf8' },
        { name: 'Bách Hóa Xanh', value: 28, color: '#10b981' },
        { name: 'Thế Giới Di Động', value: 20, color: '#a855f7' },
        { name: 'Khác', value: 4, color: '#f59e0b' },
      ];
    }
    if (t === 'PHP') {
      return [
        { name: 'Phí xếp dỡ container', value: 65, color: '#38bdf8' },
        { name: 'Dịch vụ kho bãi', value: 22, color: '#10b981' },
        { name: 'Cảng cạn (ICD) & vận chuyển', value: 13, color: '#a855f7' },
      ];
    }
    // 3. Generic fallback — labels are intentionally informative
    return [
      { name: 'Mảng dịch vụ chính', value: 60, color: '#38bdf8' },
      { name: 'Mảng phụ', value: 30, color: '#10b981' },
      { name: 'Khác', value: 10, color: '#a855f7' },
    ];
  };

  const getFinancialsAnnualData = (ticker: string) => {
    const t = ticker.toUpperCase();
    if (t === 'HPG') {
      return [
        { period: '2023', 'Doanh thu': 120.3, 'LNST': 6.8, 'Biên gộp (%)': 10.5, 'ROE (%)': 7.8 },
        { period: '2024', 'Doanh thu': 127.1, 'LNST': 9.2, 'Biên gộp (%)': 12.2, 'ROE (%)': 9.8 },
        { period: '2025', 'Doanh thu': 142.5, 'LNST': 11.7, 'Biên gộp (%)': 14.5, 'ROE (%)': 12.8 },
      ];
    }
    if (t === 'FPT') {
      return [
        { period: '2023', 'Doanh thu': 52.6, 'LNST': 6.5, 'Biên gộp (%)': 37.8, 'ROE (%)': 23.5 },
        { period: '2024', 'Doanh thu': 61.4, 'LNST': 7.85, 'Biên gộp (%)': 38.2, 'ROE (%)': 24.8 },
        { period: '2025', 'Doanh thu': 74.8, 'LNST': 9.56, 'Biên gộp (%)': 38.5, 'ROE (%)': 25.8 },
      ];
    }
    if (t === 'PHP') {
      return [
        { period: '2023', 'Doanh thu': 2.156, 'LNST': 0.612, 'Biên gộp (%)': 34.2, 'ROE (%)': 10.5 },
        { period: '2024', 'Doanh thu': 2.480, 'LNST': 0.745, 'Biên gộp (%)': 36.8, 'ROE (%)': 12.2 },
        { period: '2025', 'Doanh thu': 2.750, 'LNST': 0.880, 'Biên gộp (%)': 38.5, 'ROE (%)': 13.8 },
      ];
    }
    return [
      { period: '2023', 'Doanh thu': 80.0, 'LNST': 6.0, 'Biên gộp (%)': 15.0, 'ROE (%)': 10.0 },
      { period: '2024', 'Doanh thu': 88.0, 'LNST': 7.2, 'Biên gộp (%)': 16.5, 'ROE (%)': 12.0 },
      { period: '2025', 'Doanh thu': 100.0, 'LNST': 8.5, 'Biên gộp (%)': 18.0, 'ROE (%)': 13.5 },
    ];
  };

  const getFinancialsQuarterlyData = (ticker: string) => {
    if (realQuarterlyFinancials && realQuarterlyFinancials.length > 0) {
      return realQuarterlyFinancials.slice(-6).map((q) => ({
        period: q.period,
        'Doanh thu': q.revenue, // Tỷ VNĐ
        'LNST': q.netProfit, // Tỷ VNĐ
        'Biên gộp (%)': q.grossMargin,
        'ROE (%)': q.roe || 15.0,
      }));
    }

    const t = ticker.toUpperCase();
    if (t === 'HPG') {
      return [
        { period: 'Q1/2025', 'Doanh thu': 37621.7 / 1000, 'LNST': 3344.3 / 1000, 'Biên gộp (%)': 10.1, 'ROE (%)': 10.5 },
        { period: 'Q2/2025', 'Doanh thu': 35910.5 / 1000, 'LNST': 4256.5 / 1000, 'Biên gộp (%)': 13.8, 'ROE (%)': 11.5 },
        { period: 'Q3/2025', 'Doanh thu': 36407.4 / 1000, 'LNST': 3988.3 / 1000, 'Biên gộp (%)': 12.6, 'ROE (%)': 12.2 },
        { period: 'Q4/2025', 'Doanh thu': 46176.5 / 1000, 'LNST': 3864.1 / 1000, 'Biên gộp (%)': 9.9, 'ROE (%)': 12.5 },
        { period: 'Q1/2026', 'Doanh thu': 52900.8 / 1000, 'LNST': 8994.0 / 1000, 'Biên gộp (%)': 20.2, 'ROE (%)': 18.6 },
        { period: 'Q2/2026', 'Doanh thu': 55158.9 / 1000, 'LNST': 6371.0 / 1000, 'Biên gộp (%)': 13.0, 'ROE (%)': 16.5 },
      ];
    }
    if (t === 'FPT') {
      return [
        { period: 'Q1/2025', 'Doanh thu': 16058.1 / 1000, 'LNST': 2174.3 / 1000, 'Biên gộp (%)': 18.6, 'ROE (%)': 24.5 },
        { period: 'Q2/2025', 'Doanh thu': 16624.7 / 1000, 'LNST': 2257.5 / 1000, 'Biên gộp (%)': 18.8, 'ROE (%)': 25.2 },
        { period: 'Q3/2025', 'Doanh thu': 17204.5 / 1000, 'LNST': 2434.8 / 1000, 'Biên gộp (%)': 19.4, 'ROE (%)': 25.5 },
        { period: 'Q4/2025', 'Doanh thu': 20225.4 / 1000, 'LNST': 2509.5 / 1000, 'Biên gộp (%)': 17.2, 'ROE (%)': 25.9 },
        { period: 'Q1/2026', 'Doanh thu': 12480.0 / 1000, 'LNST': 2487.4 / 1000, 'Biên gộp (%)': 22.0, 'ROE (%)': 26.2 },
        { period: 'Q2/2026', 'Doanh thu': 13788.5 / 1000, 'LNST': 2567.7 / 1000, 'Biên gộp (%)': 20.9, 'ROE (%)': 26.5 },
      ];
    }
    if (t === 'PHP') {
      return [
        { period: 'Q1/2025', 'Doanh thu': 577.4 / 1000, 'LNST': 145.2 / 1000, 'Biên gộp (%)': 38.9, 'ROE (%)': 13.0 },
        { period: 'Q2/2025', 'Doanh thu': 658.5 / 1000, 'LNST': 189.9 / 1000, 'Biên gộp (%)': 38.0, 'ROE (%)': 13.2 },
        { period: 'Q3/2025', 'Doanh thu': 700.3 / 1000, 'LNST': 260.8 / 1000, 'Biên gộp (%)': 50.1, 'ROE (%)': 13.5 },
        { period: 'Q4/2025', 'Doanh thu': 794.1 / 1000, 'LNST': 227.3 / 1000, 'Biên gộp (%)': 40.8, 'ROE (%)': 13.9 },
        { period: 'Q1/2026', 'Doanh thu': 744.9 / 1000, 'LNST': 310.7 / 1000, 'Biên gộp (%)': 56.5, 'ROE (%)': 14.5 },
        { period: 'Q2/2026', 'Doanh thu': 949.7 / 1000, 'LNST': 425.1 / 1000, 'Biên gộp (%)': 59.4, 'ROE (%)': 16.0 },
      ];
    }
    return [
      { period: 'Q1/2025', 'Doanh thu': 20.5, 'LNST': 1.6, 'Biên gộp (%)': 15.5, 'ROE (%)': 10.8 },
      { period: 'Q2/2025', 'Doanh thu': 22.0, 'LNST': 1.8, 'Biên gộp (%)': 16.2, 'ROE (%)': 11.5 },
      { period: 'Q3/2025', 'Doanh thu': 24.5, 'LNST': 2.1, 'Biên gộp (%)': 16.8, 'ROE (%)': 11.8 },
      { period: 'Q4/2025', 'Doanh thu': 25.0, 'LNST': 2.0, 'Biên gộp (%)': 17.5, 'ROE (%)': 12.2 },
      { period: 'Q1/2026', 'Doanh thu': 28.5, 'LNST': 2.5, 'Biên gộp (%)': 19.2, 'ROE (%)': 14.2 },
      { period: 'Q2/2026', 'Doanh thu': 30.0, 'LNST': 2.8, 'Biên gộp (%)': 20.0, 'ROE (%)': 15.0 },
    ];
  };

  const getDebtEquityData = (ticker: string) => {
    const t = ticker.toUpperCase();
    if (t === 'HPG') {
      return [
        { name: 'Vốn chủ sở hữu', value: 131.22, color: '#10b981' },
        { name: 'Nợ ngắn hạn', value: 55.08, color: '#f59e0b' },
        { name: 'Nợ dài hạn', value: 36.72, color: '#a855f7' },
      ];
    }
    if (t === 'FPT') {
      return [
        { name: 'Vốn chủ sở hữu', value: 34.0, color: '#10b981' },
        { name: 'Nợ ngắn hạn', value: 10.5, color: '#f59e0b' },
        { name: 'Nợ dài hạn', value: 2.0, color: '#a855f7' },
      ];
    }
    if (t === 'PHP') {
      return [
        { name: 'Vốn chủ sở hữu', value: 6.45, color: '#10b981' },
        { name: 'Nợ ngắn hạn', value: 1.25, color: '#f59e0b' },
        { name: 'Nợ dài hạn', value: 1.85, color: '#a855f7' },
      ];
    }
    if (t === 'VNM') {
      return [
        { name: 'Vốn chủ sở hữu', value: 32.5, color: '#10b981' },
        { name: 'Nợ ngắn hạn', value: 8.2, color: '#f59e0b' },
        { name: 'Nợ dài hạn', value: 1.6, color: '#a855f7' },
      ];
    }
    if (t === 'MWG') {
      return [
        { name: 'Vốn chủ sở hữu', value: 29.8, color: '#10b981' },
        { name: 'Nợ ngắn hạn', value: 18.0, color: '#f59e0b' },
        { name: 'Nợ dài hạn', value: 5.2, color: '#a855f7' },
      ];
    }
    return [
      { name: 'Vốn chủ sở hữu', value: 50.0, color: '#10b981' },
      { name: 'Nợ ngắn hạn', value: 25.0, color: '#f59e0b' },
      { name: 'Nợ dài hạn', value: 10.0, color: '#a855f7' },
    ];
  };

  const getForecastAnnualData = (ticker: string) => {
    const val = report.sectionD.valuation;
    const p2026 = val.forecastNetProfitQ1 ? val.forecastNetProfitQ1 / 1000000000 : 0;
    const p2027 = val.forecastNetProfitQ2 ? val.forecastNetProfitQ2 / 1000000000 : 0;

    const shares = val.sharesOutstanding || 0;
    const eps2026 = (shares > 0 && p2026 > 0) ? Math.round((p2026 * 1000000000) / (shares * 1000000)) : 0;
    const eps2027 = (shares > 0 && p2027 > 0) ? Math.round((p2027 * 1000000000) / (shares * 1000000)) : 0;

    return [
      { period: 'Năm 2026 (Dự phóng)', 'LNST (Tỷ VNĐ)': p2026 > 0 ? p2026 : 'Đang tính...', 'EPS (k VNĐ)': eps2026 > 0 ? (eps2026 / 1000).toFixed(2) : '---', 'PE (lần)': val.peBase },
      { period: 'Năm 2027 (Dự phóng)', 'LNST (Tỷ VNĐ)': p2027 > 0 ? p2027 : 'Đang tính...', 'EPS (k VNĐ)': eps2027 > 0 ? (eps2027 / 1000).toFixed(2) : '---', 'PE (lần)': val.peBase },
    ];
  };

  const getForecastQuarterlyData = (ticker: string) => {
    const val = report.sectionD.valuation;
    const shares = val.sharesOutstanding || 0;

    // Build quarterly rows if specific quarter profits exist in valuation
    const q1Profit = val.forecastNetProfitQ1 ? val.forecastNetProfitQ1 / 1000000000 : 0;
    const q2Profit = val.forecastNetProfitQ2 ? val.forecastNetProfitQ2 / 1000000000 : 0;
    const q3Profit = val.forecastNetProfitQ3 ? val.forecastNetProfitQ3 / 1000000000 : 0;
    const q4Profit = val.forecastNetProfitQ4 ? val.forecastNetProfitQ4 / 1000000000 : 0;

    const calcEps = (profitBillions: number) => {
      if (shares <= 0 || profitBillions <= 0) return '---';
      return (Math.round((profitBillions * 1000000000) / (shares * 1000000)) / 1000).toFixed(2);
    };

    return [
      { period: 'Q1 (Dự phóng)', 'LNST (Tỷ VNĐ)': q1Profit > 0 ? q1Profit : '---', 'EPS (k VNĐ)': calcEps(q1Profit), 'PE (lần)': val.peBase },
      { period: 'Q2 (Dự phóng)', 'LNST (Tỷ VNĐ)': q2Profit > 0 ? q2Profit : '---', 'EPS (k VNĐ)': calcEps(q2Profit), 'PE (lần)': val.peBase },
      { period: 'Q3 (Dự phóng)', 'LNST (Tỷ VNĐ)': q3Profit > 0 ? q3Profit : '---', 'EPS (k VNĐ)': calcEps(q3Profit), 'PE (lần)': val.peBase },
      { period: 'Q4 (Dự phóng)', 'LNST (Tỷ VNĐ)': q4Profit > 0 ? q4Profit : '---', 'EPS (k VNĐ)': calcEps(q4Profit), 'PE (lần)': val.peBase },
    ];
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] p-5 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors duration-200">
      {/* Background Watermark for Report Screen View */}
      <div
        className="pointer-events-none absolute right-4 top-16 h-64 w-64 opacity-[0.04] dark:opacity-[0.03] select-none print:hidden"
        style={{
          backgroundImage: 'url(/brand/logo/logo-watermark.svg)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'contain',
        }}
      />

      {/* Print-only Header (Appears when saving PDF or printing) */}
      <div className="hidden print:block mb-8 pb-4 border-b-2 border-slate-900 text-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900">
              VALUEX <span className="text-emerald-600 font-bold">RESEARCH</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium italic">
              Đồng hành bứt phá giá trị - Đầu tư bền vững
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-600">
            <div>Ngày lập báo cáo: <strong>{report.createdDate}</strong></div>
            <div>Bản quyền: <strong>valuex.vn</strong></div>
          </div>
        </div>

        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 mt-4">
          BÁO CÁO PHÂN TÍCH ĐẦU TƯ CHỨNG KHOÁN: {report.ticker} ({report.companyName})
        </h1>
        <p className="text-xs text-slate-600 mt-1 font-medium">
          Ngành: {report.marketData.industry} | Giá hiện tại: {report.marketData.currentPrice.toLocaleString('vi-VN')} VNĐ | Phương pháp: Bottom-Up 4 Bước
        </p>
      </div>

      {/* Header & Tabs (Screen view only) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4 gap-3 print:hidden">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white font-heading">
            Báo Cáo Phân Tích Chuyên Sâu ValueX
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          {isEditing ? (
            <button
              onClick={handleSaveEdits}
              className="flex items-center space-x-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-emerald-400 transition"
            >
              <Check className="h-4 w-4" />
              <span>Lưu Thay Đổi</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-gray-700 hover:border-emerald-500/40 hover:text-emerald-300 transition"
            >
              <Edit3 className="h-4 w-4 text-emerald-400" />
              <span>Chỉnh Sửa Văn Bản</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Model Indicator Bar */}
      <div className="mt-3 flex flex-col sm:flex-row items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-2.5 gap-3 print:hidden">
        <div className="flex items-center space-x-2 text-xs">
          <Cpu className="h-4 w-4 text-emerald-400 shrink-0 animate-pulse" />
          <span className="text-gray-400 font-medium">Model AI Phân Tích:</span>
          <span className="font-extrabold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded-lg shadow-sm">
            {report.generationModel || 'gemini-3.6-flash'}
          </span>
        </div>
      </div>

      {/* Navigation Tabs for A, B, C, D (Screen view only) */}
      <div className="mt-4 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-3 print:hidden">
        <button
          onClick={() => setActiveTab('A')}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === 'A'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'bg-gray-100 dark:bg-gray-900 text-slate-700 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-gray-200'
            }`}
        >
          <Building2 className="h-4 w-4" />
          <span>A. Tổng Quan Doanh Nghiệp</span>
        </button>

        <button
          onClick={() => setActiveTab('B')}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === 'B'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
              : 'bg-gray-100 dark:bg-gray-900 text-slate-700 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-gray-200'
            }`}
        >
          <Factory className="h-4 w-4" />
          <span>B. Hoạt Động KD & Chuỗi Giá Trị</span>
        </button>

        <button
          onClick={() => setActiveTab('C')}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === 'C'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
              : 'bg-gray-100 dark:bg-gray-900 text-slate-700 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-gray-200'
            }`}
        >
          <LineChart className="h-4 w-4" />
          <span>C. Tình Hình Tài Chính</span>
        </button>

        <button
          onClick={() => setActiveTab('D')}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === 'D'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
              : 'bg-gray-100 dark:bg-gray-900 text-slate-700 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-gray-200'
            }`}
        >
          <Target className="h-4 w-4" />
          <span>D. Triển Vọng & Định Giá</span>
        </button>
      </div>

      {/* Tab Content Display / Edit */}
      <div className="mt-5">
        {/* TAB A: TỔNG QUAN DOANH NGHIỆP */}
        <div className={`space-y-5 ${activeTab === 'A' ? 'block' : 'hidden print:block'}`}>
          <h2 className="hidden print:block text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-2 mb-3">
            A. TỔNG QUAN DOANH NGHIỆP
          </h2>
          <SectionCard title="1. Tổng quan doanh nghiệp" isEditing={isEditing}>
            {isEditing ? (
              <textarea
                rows={6}
                value={secA.historyAndOverview}
                onChange={(e) => setSecA({ ...secA, historyAndOverview: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            ) : (
              <div className="text-xs text-slate-800 dark:text-gray-200 leading-relaxed animate-fade-in">
                {renderMarkdown(secA.historyAndOverview)}
              </div>
            )}
          </SectionCard>

          <SectionCard title="2. Cơ cấu cổ đông & ban lãnh đạo" isEditing={isEditing}>
            {isEditing ? (
              <textarea
                rows={4}
                value={secA.shareholdersAndManagement}
                onChange={(e) => setSecA({ ...secA, shareholdersAndManagement: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            ) : (
              <div className="text-xs text-slate-800 dark:text-gray-200 leading-relaxed">
                {renderMarkdown(secA.shareholdersAndManagement)}
              </div>
            )}
          </SectionCard>

          <SectionCard title="3. Cơ cấu doanh nghiệp & Công ty liên kết (trọng số lớn)" isEditing={isEditing}>
            {isEditing ? (
              <textarea
                rows={4}
                value={secA.subsidiariesAndAffiliates}
                onChange={(e) => setSecA({ ...secA, subsidiariesAndAffiliates: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            ) : (
              <div className="text-xs text-slate-800 dark:text-gray-200 leading-relaxed">
                {renderMarkdown(secA.subsidiariesAndAffiliates)}
              </div>
            )}
          </SectionCard>
        </div>

        {/* TAB B: HOẠT ĐỘNG KINH DOANH & CHUỖI GIÁ TRỊ */}
        <div className={`space-y-5 print:pt-6 ${activeTab === 'B' ? 'block' : 'hidden print:block'}`}>
          <h2 className="hidden print:block text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-2 mb-3">
            B. HOẠT ĐỘNG KINH DOANH &amp; CHUỖI GIÁ TRỊ
          </h2>
          <SupplyChainFlowchart ticker={report.ticker} sectorType={report.marketData.sectorType} />

          <SectionCard title="1. Chuỗi giá trị: Đầu vào (Yếu tố chi phí & Nhà cung cấp)" isEditing={isEditing}>
            {isEditing ? (
              <textarea
                rows={5}
                value={secB.valueChainInput}
                onChange={(e) => setSecB({ ...secB, valueChainInput: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            ) : (
              <div className="text-xs text-slate-800 dark:text-gray-200 leading-relaxed">
                {renderMarkdown(secB.valueChainInput)}
              </div>
            )}
          </SectionCard>

          <SectionCard title="2. Quy trình vận hành & Năng lực công suất" isEditing={isEditing}>
            {isEditing ? (
              <textarea
                rows={5}
                value={secB.valueChainProduction}
                onChange={(e) => setSecB({ ...secB, valueChainProduction: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            ) : (
              <div className="text-xs text-slate-800 dark:text-gray-200 leading-relaxed">
                {renderMarkdown(secB.valueChainProduction)}
              </div>
            )}
          </SectionCard>

          {/* Section 3: Đầu ra + Pie Chart tích hợp bên dưới */}
          <SectionCard title="3. Đầu ra (Cơ cấu doanh thu & Phân tích sản phẩm chính)" isEditing={isEditing}>
            {isEditing ? (
              <textarea
                rows={5}
                value={secB.valueChainOutput}
                onChange={(e) => setSecB({ ...secB, valueChainOutput: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            ) : (
              <div className="space-y-4">
                <div className="text-xs text-slate-800 dark:text-gray-200 leading-relaxed">
                  {renderMarkdown(secB.valueChainOutput)}
                </div>

                {/* Pie Chart nhúng ngay dưới phân tích đầu ra */}
                <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-1.5 font-heading">
                    <BarChart2 className="h-4 w-4" />
                    Biểu đồ Cơ cấu Doanh thu Đầu ra (%)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    {/* Legend list bên trái */}
                    <div className="space-y-2">
                      {getProductMixData(report.ticker).map((entry, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                          <span
                            className="inline-block h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-xs text-slate-800 dark:text-gray-300 flex-1 font-medium">{entry.name}</span>
                          <span
                            className="text-xs font-bold tabular-nums"
                            style={{ color: entry.color }}
                          >
                            {entry.value}%
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Pie chart bên phải */}
                    {isMounted ? (
                      <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={getProductMixData(report.ticker)}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={85}
                              paddingAngle={3}
                              dataKey="value"
                              label={({ cx, cy, midAngle, outerRadius, value, name }) => {
                                const RADIAN = Math.PI / 180;
                                const radius = outerRadius + 16;
                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                return (
                                  <text
                                    x={x}
                                    y={y}
                                    fill="#64748B"
                                    textAnchor={x > cx ? 'start' : 'end'}
                                    dominantBaseline="central"
                                    style={{ fontSize: '10px', fontWeight: '700' }}
                                  >
                                    {`${value}%`}
                                  </text>
                                );
                              }}
                              labelLine={{ stroke: '#94A3B8', strokeWidth: 1 }}
                            >
                              {getProductMixData(report.ticker).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }}
                              itemStyle={{ color: '#fff', fontSize: '11px' }}
                              formatter={(value: number, name: string) => [`${value}%`, name]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-52 w-full bg-gray-100 dark:bg-gray-950/20 rounded-xl animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* TAB C: TÌNH HÌNH TÀI CHÍNH */}
        <div className={`space-y-5 print:pt-6 ${activeTab === 'C' ? 'block' : 'hidden print:block'}`}>
          <h2 className="hidden print:block text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-2 mb-3">
            C. TÌNH HÌNH TÀI CHÍNH
          </h2>
          {/* Section 1: Phân tích doanh thu + Biểu đồ Doanh thu & Lợi nhuận */}
          <SectionCard title="1. Phân tích doanh thu (3 năm gần nhất & So sánh Quý mới nhất YoY)" isEditing={isEditing}>
            {isEditing ? (
              <textarea
                rows={5}
                value={secC.revenueHistory3Years}
                onChange={(e) => setSecC({ ...secC, revenueHistory3Years: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            ) : (
              <div className="space-y-4">
                <div className="text-xs text-slate-800 dark:text-gray-200 leading-relaxed">
                  {renderMarkdown(secC.revenueHistory3Years)}
                </div>

                {/* Tách thành 2 biểu đồ riêng biệt: Biểu đồ Năm và Biểu đồ Quý */}
                <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-6">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Biểu đồ 1: Dữ liệu năm */}
                    <div className="bg-gray-50 dark:bg-gray-950/20 p-4 rounded-xl border border-gray-200 dark:border-gray-800/60 shadow-2xs">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-1.5 font-heading">
                        <BarChart2 className="h-4 w-4 text-blue-600 dark:text-sky-400" />
                        Doanh thu & Lợi nhuận qua các năm (Tỷ VNĐ)
                      </h4>
                      {isMounted ? (
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={getFinancialsAnnualData(report.ticker)} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.2} />
                              <XAxis dataKey="period" stroke="#64748B" style={{ fontSize: '10px' }} />
                              <YAxis yAxisId="left" stroke="#64748B" style={{ fontSize: '10px' }} />
                              <YAxis yAxisId="right" orientation="right" stroke="#9333EA" style={{ fontSize: '10px' }} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }}
                                itemStyle={{ color: '#fff', fontSize: '11px' }}
                              />
                              <Legend
                                iconSize={8}
                                formatter={(value) => <span className="text-[10px] text-slate-700 dark:text-gray-300 font-medium">{value}</span>}
                              />
                              <Bar dataKey="Doanh thu" yAxisId="left" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24}>
                                <LabelList dataKey="Doanh thu" position="top" style={{ fill: '#2563EB', fontSize: '9px', fontWeight: 'bold' }} />
                              </Bar>
                              <Bar dataKey="LNST" yAxisId="left" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24}>
                                <LabelList dataKey="LNST" position="top" style={{ fill: '#059669', fontSize: '9px', fontWeight: 'bold' }} />
                              </Bar>
                              <Line dataKey="Biên gộp (%)" yAxisId="right" type="monotone" stroke="#D97706" strokeWidth={2} activeDot={{ r: 4 }} />
                              <Line dataKey="ROE (%)" yAxisId="right" type="monotone" stroke="#9333EA" strokeWidth={2} activeDot={{ r: 4 }} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 w-full bg-gray-100 dark:bg-gray-950/20 rounded-xl animate-pulse" />
                      )}
                    </div>

                    {/* Biểu đồ 2: Dữ liệu quý */}
                    <div className="bg-gray-50 dark:bg-gray-950/20 p-4 rounded-xl border border-gray-200 dark:border-gray-800/60 shadow-2xs">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-1.5 font-heading">
                        <BarChart2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        Doanh thu & Lợi nhuận 4 quý gần nhất (Tỷ VNĐ)
                      </h4>
                      {isMounted ? (
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={getFinancialsQuarterlyData(report.ticker)} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.2} />
                              <XAxis dataKey="period" stroke="#64748B" style={{ fontSize: '10px' }} />
                              <YAxis yAxisId="left" stroke="#64748B" style={{ fontSize: '10px' }} />
                              <YAxis yAxisId="right" orientation="right" stroke="#9333EA" style={{ fontSize: '10px' }} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }}
                                itemStyle={{ color: '#fff', fontSize: '11px' }}
                              />
                              <Legend
                                iconSize={8}
                                formatter={(value) => <span className="text-[10px] text-slate-700 dark:text-gray-300 font-medium">{value}</span>}
                              />
                              <Bar dataKey="Doanh thu" yAxisId="left" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24}>
                                <LabelList dataKey="Doanh thu" position="top" style={{ fill: '#2563EB', fontSize: '9px', fontWeight: 'bold' }} />
                              </Bar>
                              <Bar dataKey="LNST" yAxisId="left" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24}>
                                <LabelList dataKey="LNST" position="top" style={{ fill: '#059669', fontSize: '9px', fontWeight: 'bold' }} />
                              </Bar>
                              <Line dataKey="Biên gộp (%)" yAxisId="right" type="monotone" stroke="#D97706" strokeWidth={2} activeDot={{ r: 4 }} />
                              <Line dataKey="ROE (%)" yAxisId="right" type="monotone" stroke="#9333EA" strokeWidth={2} activeDot={{ r: 4 }} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 w-full bg-gray-100 dark:bg-gray-950/20 rounded-xl animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Section 2: Phân tích Tỷ suất lợi nhuận */}
          <SectionCard title="2. Phân tích tỷ suất lợi nhuận (Gross/Net Margin & ROE - Cập nhật Q2/2026 YoY)" isEditing={isEditing}>
            {isEditing ? (
              <textarea
                rows={5}
                value={secC.profitabilityMargins}
                onChange={(e) => setSecC({ ...secC, profitabilityMargins: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            ) : (
              <div className="text-xs text-slate-800 dark:text-gray-200 leading-relaxed">
                {renderMarkdown(secC.profitabilityMargins)}
              </div>
            )}
          </SectionCard>

          {/* Section 3: Sức khỏe tài chính + Biểu đồ Cơ cấu nợ */}
          <SectionCard title="3. Sức khỏe tài chính & Tỷ lệ nợ vay/VCSH (D/E)" isEditing={isEditing}>
            {isEditing ? (
              <textarea
                rows={5}
                value={secC.financialHealthAndDebt}
                onChange={(e) => setSecC({ ...secC, financialHealthAndDebt: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            ) : (
              <div className="space-y-4">
                <div className="text-xs text-slate-800 dark:text-gray-200 leading-relaxed">
                  {renderMarkdown(secC.financialHealthAndDebt)}
                </div>

                {/* Biểu đồ Cơ cấu nợ nhúng trực tiếp */}
                <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-1.5 font-heading">
                    <BarChart2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Biểu đồ Cơ cấu Nợ Vay & Vốn Chủ Sở Hữu (Tỷ VNĐ)
                  </h4>
                  {isMounted ? (
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getDebtEquityData(report.ticker)} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.2} />
                          <XAxis dataKey="name" stroke="#64748B" style={{ fontSize: '10px', fontWeight: '600' }} />
                          <YAxis stroke="#64748B" style={{ fontSize: '10px' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }}
                            itemStyle={{ color: '#fff', fontSize: '11px' }}
                          />
                          <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40}>
                            {getDebtEquityData(report.ticker).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            <LabelList dataKey="value" position="top" style={{ fill: '#334155', fontSize: '10px', fontWeight: 'bold' }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-56 w-full bg-gray-100 dark:bg-gray-950/20 rounded-xl animate-pulse" />
                  )}
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* TAB D: TRIỂN VỌNG KINH DOANH & ĐỊNH GIÁ */}
        <div className={`space-y-5 print:pt-6 ${activeTab === 'D' ? 'block' : 'hidden print:block'}`}>
          <h2 className="hidden print:block text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-2 mb-3">
            D. TRIỂN VỌNG KINH DOANH &amp; ĐỊNH GIÁ
          </h2>
          <SectionCard title="1. Phân tích yếu tố ảnh hưởng tăng trưởng (Sản lượng, Giá bán, Chi phí)" isEditing={isEditing}>
            {isEditing ? (
              <textarea
                rows={6}
                value={secDGrowth}
                onChange={(e) => setSecDGrowth(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            ) : (
              <div className="text-xs text-slate-800 dark:text-gray-200 leading-relaxed">
                {renderMarkdown(secDGrowth)}
              </div>
            )}
          </SectionCard>

          <SectionCard title="2. Luận điểm ước lượng KQKD & Bộ tính toán định giá" isEditing={false}>
            <div className="space-y-6">
              <div className="text-xs text-slate-800 dark:text-gray-200 leading-relaxed">
                {renderMarkdown(report.sectionD.quarterlyForecastReasoning)}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-5">
                <ValuationCalculator
                  valuation={report.sectionD.valuation}
                  currentPrice={report.marketData.currentPrice}
                  ticker={report.ticker}
                  historicalQuarters={getFinancialsQuarterlyData(report.ticker)}
                  forecastReasoningText={report.sectionD.quarterlyForecastReasoning}
                  realQuarterlyFinancials={realQuarterlyFinancials}
                  onUpdateValuation={(newVal) => {
                    onUpdateReport({
                      ...report,
                      sectionD: {
                        ...report.sectionD,
                        valuation: newVal,
                      },
                    });
                  }}
                />
              </div>

              {/* 2 Biểu đồ Dự phóng độc lập (Năm và Quý) hiển thị đầy đủ tiêu chí */}
              <div className="border-t border-gray-200 dark:border-gray-800 pt-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-1.5 font-heading">
                  <BarChart2 className="h-4 w-4 text-blue-600 dark:text-sky-400" />
                  Biểu đồ Dự phóng Tài chính & Chỉ số Định giá (2026 - 2027)
                </h4>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Biểu đồ 1: Dự phóng theo Năm */}
                  <div className="bg-gray-50 dark:bg-[#0b1324]/40 p-4 rounded-xl border border-gray-200 dark:border-gray-850 shadow-2xs">
                    <h5 className="text-[11px] font-bold text-slate-700 dark:text-gray-400 mb-3 flex items-center gap-1 font-heading">
                      Doanh thu, LNST & Chỉ số Định giá theo Năm
                    </h5>
                    {isMounted ? (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={getForecastAnnualData(report.ticker)} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.2} />
                            <XAxis dataKey="period" stroke="#64748B" style={{ fontSize: '10px' }} />
                            <YAxis yAxisId="left" stroke="#64748B" style={{ fontSize: '10px' }} />
                            <YAxis yAxisId="right" orientation="right" stroke="#D97706" style={{ fontSize: '10px' }} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }}
                              itemStyle={{ color: '#FFF', fontSize: '11px' }}
                            />
                            <Legend
                              iconSize={8}
                              formatter={(value) => <span className="text-[10px] text-slate-700 dark:text-gray-300 font-medium">{value}</span>}
                            />
                            <Bar dataKey="Doanh thu" yAxisId="left" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24}>
                              <LabelList dataKey="Doanh thu" position="top" style={{ fill: '#2563EB', fontSize: '9px', fontWeight: 'bold' }} />
                            </Bar>
                            <Bar dataKey="LNST" yAxisId="left" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24}>
                              <LabelList dataKey="LNST" position="top" style={{ fill: '#059669', fontSize: '9px', fontWeight: 'bold' }} />
                            </Bar>
                            <Line dataKey="Biên gộp (%)" yAxisId="right" type="monotone" stroke="#D97706" strokeWidth={2} activeDot={{ r: 4 }} />
                            <Line dataKey="EPS (k VNĐ)" yAxisId="right" type="monotone" stroke="#9333EA" strokeWidth={2} activeDot={{ r: 4 }} />
                            <Line dataKey="PE (lần)" yAxisId="right" type="monotone" stroke="#DC2626" strokeWidth={2} activeDot={{ r: 4 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 w-full bg-gray-100 dark:bg-gray-950/20 rounded-xl animate-pulse" />
                    )}
                  </div>

                  {/* Biểu đồ 2: Dự phóng theo Quý */}
                  <div className="bg-gray-50 dark:bg-[#0b1324]/40 p-4 rounded-xl border border-gray-200 dark:border-gray-850 shadow-2xs">
                    <h5 className="text-[11px] font-bold text-slate-700 dark:text-gray-400 mb-3 flex items-center gap-1 font-heading">
                      Doanh thu, LNST & Chỉ số Định giá theo Quý (2026 - 2027)
                    </h5>
                    {isMounted ? (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={getForecastQuarterlyData(report.ticker)} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.2} />
                            <XAxis dataKey="period" stroke="#64748B" style={{ fontSize: '10px' }} />
                            <YAxis yAxisId="left" stroke="#64748B" style={{ fontSize: '10px' }} />
                            <YAxis yAxisId="right" orientation="right" stroke="#D97706" style={{ fontSize: '10px' }} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }}
                              itemStyle={{ color: '#FFF', fontSize: '11px' }}
                            />
                            <Legend
                              iconSize={8}
                              formatter={(value) => <span className="text-[10px] text-slate-700 dark:text-gray-300 font-medium">{value}</span>}
                            />
                            <Bar dataKey="Doanh thu" yAxisId="left" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={20}>
                              <LabelList dataKey="Doanh thu" position="top" style={{ fill: '#2563EB', fontSize: '9px', fontWeight: 'bold' }} />
                            </Bar>
                            <Bar dataKey="LNST" yAxisId="left" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20}>
                              <LabelList dataKey="LNST" position="top" style={{ fill: '#059669', fontSize: '9px', fontWeight: 'bold' }} />
                            </Bar>
                            <Line dataKey="Biên gộp (%)" yAxisId="right" type="monotone" stroke="#D97706" strokeWidth={2} activeDot={{ r: 4 }} />
                            <Line dataKey="EPS (k VNĐ)" yAxisId="right" type="monotone" stroke="#9333EA" strokeWidth={2} activeDot={{ r: 4 }} />
                            <Line dataKey="PE (lần)" yAxisId="right" type="monotone" stroke="#DC2626" strokeWidth={2} activeDot={{ r: 4 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 w-full bg-gray-100 dark:bg-gray-950/20 rounded-xl animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
  isEditing,
}: {
  title: string;
  children: React.ReactNode;
  isEditing: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition duration-200 ${
        isEditing
          ? 'border-emerald-500 bg-emerald-50/40 dark:bg-gray-900/90 shadow-md'
          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-2xs dark:shadow-none'
      }`}
    >
      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2.5 font-heading">
        {title}
      </h3>
      {children}
    </div>
  );
}
