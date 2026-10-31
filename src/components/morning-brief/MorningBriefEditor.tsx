'use client';

import React, { useState } from 'react';
import { X, Check, RotateCcw, Edit3, Plus, Trash2 } from 'lucide-react';
import { MorningBriefData } from '@/types/morning-brief';

interface Props {
  data: MorningBriefData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: MorningBriefData) => void;
}

export function MorningBriefEditor({ data, isOpen, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<MorningBriefData>(data);

  if (!isOpen) return null;

  const handleStrategyChange = (field: keyof MorningBriefData['marketStrategy'], val: string) => {
    setFormData((prev) => ({
      ...prev,
      marketStrategy: {
        ...prev.marketStrategy,
        [field]: val,
      },
    }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Biên Tập Nội Dung Bản Tin Sáng
              </h3>
              <p className="text-xs text-slate-500">Chỉnh sửa nhận định & tin tức trước khi xuất bản PDF</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300">
          {/* Nhận định & Kịch bản VN-Index */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100 dark:border-slate-800">
              1. Kịch Bản & Khuyến Nghị VN-Index
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold block mb-1">Xu hướng phiên</label>
                <select
                  value={formData.marketStrategy.trend}
                  onChange={(e) => handleStrategyChange('trend', e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                >
                  <option value="Tăng trưởng">Tăng trưởng</option>
                  <option value="Điều chỉnh tích lũy">Điều chỉnh tích lũy</option>
                  <option value="Thận trọng">Thận trọng</option>
                  <option value="Phục hồi">Phục hồi</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Vùng hỗ trợ</label>
                <input
                  type="text"
                  value={formData.marketStrategy.supportZone}
                  onChange={(e) => handleStrategyChange('supportZone', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Vùng kháng cự</label>
                <input
                  type="text"
                  value={formData.marketStrategy.resistanceZone}
                  onChange={(e) => handleStrategyChange('resistanceZone', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Bình luận kỹ thuật thị trường</label>
              <textarea
                rows={3}
                value={formData.marketStrategy.commentary}
                onChange={(e) => handleStrategyChange('commentary', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium leading-relaxed"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Hành động khuyến nghị giải ngân</label>
              <textarea
                rows={2}
                value={formData.marketStrategy.actionRecommendation}
                onChange={(e) => handleStrategyChange('actionRecommendation', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium leading-relaxed"
              />
            </div>
          </div>

          {/* Cổ phiếu đáng chú ý */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100 dark:border-slate-800">
              2. Danh Mục Cổ Phiếu Theo Dõi (Watchlist)
            </h4>
            <div className="space-y-2.5">
              {formData.watchlist.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Mã CP"
                      value={item.symbol}
                      onChange={(e) => {
                        const updated = [...formData.watchlist];
                        updated[idx].symbol = e.target.value.toUpperCase();
                        setFormData({ ...formData, watchlist: updated });
                      }}
                      className="w-full px-2 py-1.5 rounded font-black text-emerald-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 uppercase"
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={item.action}
                      onChange={(e) => {
                        const updated = [...formData.watchlist];
                        updated[idx].action = e.target.value as any;
                        setFormData({ ...formData, watchlist: updated });
                      }}
                      className="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    >
                      <option value="Mua gom">Mua gom</option>
                      <option value="Theo dõi">Theo dõi</option>
                      <option value="Nắm giữ">Nắm giữ</option>
                      <option value="Chốt lời">Chốt lời</option>
                    </select>
                  </div>
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Luận điểm / Catalyst"
                      value={item.catalyst}
                      onChange={(e) => {
                        const updated = [...formData.watchlist];
                        updated[idx].catalyst = e.target.value;
                        setFormData({ ...formData, watchlist: updated });
                      }}
                      className="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Giá mục tiêu"
                      value={item.targetPrice || ''}
                      onChange={(e) => {
                        const updated = [...formData.watchlist];
                        updated[idx].targetPrice = e.target.value;
                        setFormData({ ...formData, watchlist: updated });
                      }}
                      className="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all"
          >
            <Check className="w-4 h-4" /> Áp Dụng Thay Đổi
          </button>
        </div>
      </div>
    </div>
  );
}

