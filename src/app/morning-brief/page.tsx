'use client';

import React, { useState, useEffect } from 'react';
import {
  FileDown,
  Sparkles,
  Edit3,
  Printer,
  RefreshCw,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { MorningBriefData } from '@/types/morning-brief';
import { getDefaultMorningBrief } from '@/lib/morning-brief-service';
import { MorningBriefInfographic } from '@/components/morning-brief/MorningBriefInfographic';
import { MorningBriefEditor } from '@/components/morning-brief/MorningBriefEditor';
import { exportElementToPdf } from '@/lib/pdf-export';

export default function MorningBriefPage() {
  const [data, setData] = useState<MorningBriefData>(getDefaultMorningBrief());
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    async function loadInitialData() {
      try {
        const res = await fetch('/api/morning-brief/generate');
        if (res.ok) {
          const json = await res.json();
          if (json?.data) {
            setData(json.data);
          }
        }
      } catch (err) {
        console.warn('Initial brief load failed, fallback to default:', err);
      }
    }
    loadInitialData();
  }, []);

  // Gọi AI tổng hợp mới nhất
  const handleGenerateAI = async () => {
    setIsLoading(true);
    setStatusMessage('Đang kết nối Gemini AI & truy xuất dữ liệu thị trường 24h...');
    try {
      const res = await fetch('/api/morning-brief/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh: true }),
      });
      const json = await res.json();
      if (json?.data) {
        setData(json.data);
        setStatusMessage('Đã cập nhật bản tin sáng thành công!');
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        setStatusMessage('Đã tải bản tin sáng với số liệu thị trường thực tế.');
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err) {
      console.error('Error generating brief:', err);
      setStatusMessage('Có lỗi khi tạo bản tin, đang hiển thị bản tin dự phòng.');
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  // Xuất file PDF với thuật toán Smart Block Packing
  const handleExportPdf = async () => {
    setIsExporting(true);
    setStatusMessage('Đang đóng gói Infographic và xuất file PDF chuẩn A4...');
    try {
      const cleanDate = data.date.replace(/\//g, '');
      const filename = `ValueX_Morning_Brief_${cleanDate}.pdf`;
      const success = await exportElementToPdf('morning-brief-container', {
        filename,
        quality: 0.98,
        marginTop: 8,
        marginBottom: 8,
        marginLeft: 8,
        marginRight: 8,
        showPageNumber: true,
      });

      if (success) {
        setStatusMessage('Xuất file PDF thành công! File đã được tải về máy.');
      } else {
        setStatusMessage('Không thể xuất PDF. Vui lòng thử lại.');
      }
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error('Export PDF error:', err);
      setStatusMessage('Lỗi khi xuất PDF.');
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 pb-20 pt-6 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Thanh tiêu đề & Công cụ điều khiển */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                ValueX AI Morning Brief
              </span>
              <span className="text-xs text-slate-400">• 2-3 Trang A4</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              Bản Tin Sáng Thị Trường Hàng Ngày
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tổng hợp vĩ mô, dòng tiền khối ngoại, tự doanh, định giá & kịch bản phiên giao dịch
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleGenerateAI}
              disabled={isLoading || isExporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 disabled:opacity-60 transition-all cursor-pointer"
            >
              <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Đang tổng hợp AI...' : 'Tạo Bản Tin Mới (AI Sync)'}
            </button>

            <button
              onClick={() => setIsEditorOpen(true)}
              disabled={isLoading || isExporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-emerald-600" />
              Chỉnh Sửa
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isLoading || isExporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:opacity-60 transition-all cursor-pointer"
            >
              <FileDown className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
              {isExporting ? 'Đang xuất PDF...' : 'Xuất File PDF'}
            </button>

            <button
              onClick={() => window.print()}
              disabled={isLoading || isExporting}
              className="p-2.5 rounded-xl text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              title="In trực tiếp"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thông báo trạng thái */}
        {statusMessage && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-medium animate-in fade-in print:hidden">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Khung hiển thị Infographic trực quan */}
        <div className="flex justify-center">
          <MorningBriefInfographic data={data} />
        </div>
      </div>

      {/* Modal Chỉnh Sửa Nội Dung */}
      <MorningBriefEditor
        isOpen={isEditorOpen}
        data={data}
        onClose={() => setIsEditorOpen(false)}
        onSave={(updated) => setData(updated)}
      />
    </div>
  );
}

