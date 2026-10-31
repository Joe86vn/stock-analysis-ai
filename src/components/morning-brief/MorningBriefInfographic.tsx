'use client';

import React from 'react';
import Image from 'next/image';
import {
  TrendingUp,
  TrendingDown,
  Globe,
  Landmark,
  Calendar,
  Building2,
  Eye,
  ShieldCheck,
  Compass,
  DollarSign,
  PieChart,
  BarChart2,
  Clock,
  Sparkles,
  Phone,
  Mail,
} from 'lucide-react';
import { MorningBriefData } from '@/types/morning-brief';

interface Props {
  data: MorningBriefData;
}

export function MorningBriefInfographic({ data }: Props) {
  const isUp = (data.marketOverview?.change ?? 0) >= 0;

  return (
    <div
      id="morning-brief-container"
      className="w-full max-w-[840px] mx-auto bg-[#F8FAFC] text-slate-800 font-sans shadow-2xl rounded-2xl overflow-hidden border border-slate-200/90 print:shadow-none print:border-none print:rounded-none"
    >
      {/* =========================================================================
          TRANG 1: HEADER, CHIẾN LƯỢC VN-INDEX & TIÊU ĐIỂM VĨ MÔ
          ========================================================================= */}

      {/* --- HEADER THƯƠNG HIỆU --- */}
      <div
        data-pdf-block="true"
        className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 border-b-4 border-emerald-500 overflow-hidden"
      >
        {/* Subtle geometric pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative h-11 w-44 bg-white/10 backdrop-blur-md rounded-xl p-2 border border-white/15">
              <Image
                src="/brand/logo/logo-full-light.svg"
                alt="ValueX Logo"
                fill
                className="object-contain p-1"
                priority
              />
            </div>
            <div className="h-9 w-px bg-white/20 hidden sm:block" />
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <Sparkles className="w-3 h-3" /> Daily Morning Brief
              </span>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight mt-1 text-white">
                BẢN TIN SÁNG GIÁ TRỊ & THỊ TRƯỜNG
              </h1>
            </div>
          </div>

          <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{data.date}</span>
              <span className="text-slate-500">•</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{data.time}</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-medium tracking-wide mt-1">
              Phát hành bởi: <strong className="text-white font-bold">{data.brand.teamName}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* --- KHỐI CHIẾN LƯỢC & KỊCH BẢN GIAO DỊCH VN-INDEX --- */}
        <div
          data-pdf-block="true"
          className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Chiến Lược & Kịch Bản VN-Index Hôm Nay
                </h2>
                <p className="text-[11px] text-slate-500">Định hướng giải ngân & quản trị danh mục ngắn hạn</p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs">
              Xu hướng: {data.marketStrategy.trend}
            </span>
          </div>

          {/* Vùng hỗ trợ & Kháng cự */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" /> Vùng Hỗ Trợ Gần
              </div>
              <div className="text-base font-extrabold text-slate-800 mt-1">
                {data.marketStrategy.supportZone}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Vùng Kháng Cự Mục Tiêu
              </div>
              <div className="text-base font-extrabold text-slate-800 mt-1">
                {data.marketStrategy.resistanceZone}
              </div>
            </div>
          </div>

          <div className="space-y-2.5 text-xs leading-relaxed text-slate-700">
            <p className="bg-slate-50/70 p-3 rounded-lg border-l-4 border-emerald-500">
              <strong className="text-slate-900 font-bold">Nhận định kỹ thuật: </strong>
              {data.marketStrategy.commentary}
            </p>
            <p className="bg-amber-50/60 p-3 rounded-lg border-l-4 border-amber-500 text-amber-950">
              <strong className="text-amber-900 font-bold">Hành động khuyến nghị: </strong>
              {data.marketStrategy.actionRecommendation}
            </p>
          </div>
        </div>

        {/* --- TIÊU ĐIỂM VĨ MÔ QUỐC TẾ & TRONG NƯỚC (BENTO 2 CỘT) --- */}
        <div data-pdf-block="true" className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Vĩ mô quốc tế */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-100">
                <Globe className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Vĩ Mô Quốc Tế (Global Macro)
                </h3>
              </div>
              <div className="space-y-3">
                {data.macroInternational.map((item) => (
                  <div key={item.id} className="text-xs space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-800">{item.title}</span>
                      {item.metric && (
                        <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {item.metric}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{item.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Vĩ mô trong nước */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-100">
                <Landmark className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Vĩ Mô Trong Nước (Vietnam Macro)
                </h3>
              </div>
              <div className="space-y-3">
                {data.macroDomestic.map((item) => (
                  <div key={item.id} className="text-xs space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-800">{item.title}</span>
                      {item.metric && (
                        <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {item.metric}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{item.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            TRANG 2: THỐNG KÊ THỊ TRƯỜNG, DÒNG TIỀN KHỐI NGOẠI & TỰ DOANH, ĐỊNH GIÁ
            ========================================================================= */}

        {/* --- TỔNG QUAN PHIÊN GIAO DỊCH TRƯỚC & ĐỘ RỘNG --- */}
        <div
          data-pdf-block="true"
          className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Thống Kê Thị Trường Phiên Trước
              </h2>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Chỉ số chính & Độ rộng toàn thị trường
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase">VN-INDEX</span>
              <div className="text-lg font-black text-slate-900 mt-0.5">
                {data.marketOverview.price.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
              </div>
              <div
                className={`text-xs font-bold inline-flex items-center gap-0.5 mt-0.5 ${
                  isUp ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {isUp ? '+' : ''}
                {data.marketOverview.change} ({isUp ? '+' : ''}
                {data.marketOverview.percentChange}%)
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Giá Trị Giao Dịch</span>
              <div className="text-lg font-black text-slate-900 mt-0.5">
                {data.marketOverview.totalValue.toLocaleString('vi-VN')}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">Tỷ đồng (Khớp lệnh)</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Khối Lượng Khớp</span>
              <div className="text-lg font-black text-slate-900 mt-0.5">
                {data.marketOverview.totalVolume.toLocaleString('vi-VN')}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">Triệu cổ phiếu</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Độ Rộng Thị Trường</span>
              <div className="flex items-center justify-center gap-2 mt-1 text-xs font-bold">
                <span className="text-emerald-600">▲ {data.marketOverview.advances}</span>
                <span className="text-slate-400">|</span>
                <span className="text-rose-600">▼ {data.marketOverview.declines}</span>
                <span className="text-slate-400">|</span>
                <span className="text-amber-500">■ {data.marketOverview.noChange}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Tăng / Giảm / Không đổi</div>
            </div>
          </div>
        </div>

        {/* --- DÒNG TIỀN KHỐI NGOẠI & TỰ DOANH (BENTO 2 CỘT) --- */}
        <div data-pdf-block="true" className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Khối ngoại */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Giao Dịch Khối Ngoại
                </h3>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  data.foreignFlow.netTotalBillion >= 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                Ròng: {data.foreignFlow.netTotalBillion >= 0 ? '+' : ''}
                {data.foreignFlow.netTotalBillion} Tỷ
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 block mb-1">Top Mua Ròng</span>
                <div className="space-y-1">
                  {data.foreignFlow.topBuy.slice(0, 4).map((item) => (
                    <div key={item.symbol} className="flex justify-between py-0.5 border-b border-slate-50">
                      <span className="font-extrabold text-slate-800">{item.symbol}</span>
                      <span className="font-bold text-emerald-600">+{item.netValueBillion} tỷ</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[11px] font-bold text-rose-700 block mb-1">Top Bán Ròng</span>
                <div className="space-y-1">
                  {data.foreignFlow.topSell.slice(0, 4).map((item) => (
                    <div key={item.symbol} className="flex justify-between py-0.5 border-b border-slate-50">
                      <span className="font-extrabold text-slate-800">{item.symbol}</span>
                      <span className="font-bold text-rose-600">{item.netValueBillion} tỷ</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tự doanh */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Giao Dịch Tự Doanh CTCK
                </h3>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  data.proprietaryFlow.netTotalBillion >= 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                Ròng: {data.proprietaryFlow.netTotalBillion >= 0 ? '+' : ''}
                {data.proprietaryFlow.netTotalBillion} Tỷ
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 block mb-1">Top Mua Ròng</span>
                <div className="space-y-1">
                  {data.proprietaryFlow.topBuy.slice(0, 3).map((item) => (
                    <div key={item.symbol} className="flex justify-between py-0.5 border-b border-slate-50">
                      <span className="font-extrabold text-slate-800">{item.symbol}</span>
                      <span className="font-bold text-emerald-600">+{item.netValueBillion} tỷ</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[11px] font-bold text-rose-700 block mb-1">Top Bán Ròng</span>
                <div className="space-y-1">
                  {data.proprietaryFlow.topSell.slice(0, 3).map((item) => (
                    <div key={item.symbol} className="flex justify-between py-0.5 border-b border-slate-50">
                      <span className="font-extrabold text-slate-800">{item.symbol}</span>
                      <span className="font-bold text-rose-600">{item.netValueBillion} tỷ</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- ĐỊNH GIÁ THỊ TRƯỜNG & TOP TÁC ĐỘNG CHỈ SỐ --- */}
        <div data-pdf-block="true" className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Định giá thị trường */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Định Giá VN-Index
                </h3>
              </div>
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {data.valuation.evaluation}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">P/E Hiện Tại / 5Y Avg</div>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                  {data.valuation.peCurrent}x <span className="text-slate-400 font-normal">/ {data.valuation.peAvg5Y}x</span>
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">P/B Hiện Tại / 5Y Avg</div>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                  {data.valuation.pbCurrent}x <span className="text-slate-400 font-normal">/ {data.valuation.pbAvg5Y}x</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
              {data.valuation.summary}
            </p>
          </div>

          {/* Top tác động chỉ số */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Cổ Phiếu Tác Động Lớn Nhất
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Điểm số tác động</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 block mb-1">Top Kéo Tăng</span>
                <div className="space-y-1">
                  {data.marketInfluence.topGainers.slice(0, 4).map((item) => (
                    <div key={item.symbol} className="flex justify-between py-0.5 border-b border-slate-50">
                      <span className="font-extrabold text-slate-800">{item.symbol}</span>
                      <span className="font-bold text-emerald-600">+{item.pointContribution} đ</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[11px] font-bold text-rose-700 block mb-1">Top Ghì Giảm</span>
                <div className="space-y-1">
                  {data.marketInfluence.topLosers.slice(0, 4).map((item) => (
                    <div key={item.symbol} className="flex justify-between py-0.5 border-b border-slate-50">
                      <span className="font-extrabold text-slate-800">{item.symbol}</span>
                      <span className="font-bold text-rose-600">{item.pointContribution} đ</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            TRANG 3: TIN DOANH NGHIỆP, LỊCH SỰ KIỆN, WATCHLIST & DISCLAIMER
            ========================================================================= */}

        {/* --- TIN TỨC DOANH NGHIỆP NỔI BẬT --- */}
        <div
          data-pdf-block="true"
          className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm space-y-3"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Tin Tức Doanh Nghiệp Nổi Bật Trong 24 Giờ
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.corporateNews.map((news) => (
              <div
                key={news.id}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {news.symbol && (
                      <span className="px-2 py-0.5 rounded font-black bg-blue-600 text-white text-[11px]">
                        {news.symbol}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        news.impact === 'positive'
                          ? 'bg-emerald-100 text-emerald-800'
                          : news.impact === 'negative'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {news.impact === 'positive' ? 'Tích cực' : news.impact === 'negative' ? 'Tiêu cực' : 'Trung lập'}
                    </span>
                  </div>
                </div>
                <h4 className="font-bold text-slate-900 line-clamp-1">{news.headline}</h4>
                <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">{news.summary}</p>
              </div>
            ))}
          </div>
        </div>

        {/* --- LỊCH SỰ KIỆN & CỔ PHIẾU KHUYẾN NGHỊ (BENTO 2 CỘT) --- */}
        <div data-pdf-block="true" className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Lịch sự kiện */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Lịch Sự Kiện Thị Trường
              </h3>
            </div>
            <div className="space-y-2">
              {data.marketEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-xs"
                >
                  <span className="shrink-0 px-2 py-0.5 rounded font-extrabold bg-amber-100 text-amber-800 text-[10px]">
                    {evt.date}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 font-bold">{evt.symbol}</strong>
                      <span className="text-[10px] text-slate-400 font-medium">({evt.type})</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">{evt.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cổ phiếu đáng chú ý */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Eye className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Cổ Phiếu Đáng Chú Ý (Watchlist)
              </h3>
            </div>
            <div className="space-y-2">
              {data.watchlist.map((stock) => (
                <div
                  key={stock.symbol}
                  className="p-2.5 rounded-lg bg-emerald-50/40 border border-emerald-100/80 flex items-start justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-emerald-900 font-black text-sm">{stock.symbol}</strong>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200/70 text-emerald-900">
                        {stock.action}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1 line-clamp-1">{stock.catalyst}</p>
                  </div>
                  {stock.targetPrice && (
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block">Giá mục tiêu</span>
                      <span className="font-extrabold text-slate-900 text-xs">{stock.targetPrice}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- FOOTER & DISCLAIMER --- */}
        <div
          data-pdf-block="true"
          className="bg-slate-100 rounded-xl p-4 border border-slate-200 text-slate-600 text-[10px] leading-relaxed space-y-2"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-800 uppercase tracking-wide">
              {data.brand.teamName} • Nền tảng Phân Tích Cổ Phiếu Tự Động ValueX
            </span>
            <div className="flex items-center gap-3 text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-600" /> {data.brand.hotline}
              </span>
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3 h-3 text-blue-600" /> {data.brand.email}
              </span>
            </div>
          </div>
          <p className="italic text-slate-500">
            <strong>Tuyên bố miễn trừ trách nhiệm: </strong>
            {data.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}

