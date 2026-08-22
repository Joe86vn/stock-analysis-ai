'use client';

import React, { useRef } from 'react';
import { UploadCloud, FileText, Trash2, FileCheck, CheckCircle2 } from 'lucide-react';
import { UploadedFile } from '@/types/analysis';

interface DocumentUploaderProps {
  files: UploadedFile[];
  onAddFiles: (files: UploadedFile[]) => void;
  onRemoveFile: (id: string) => void;
}

export function DocumentUploader({ files, onAddFiles, onRemoveFile }: DocumentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);

    const newUploadedFiles: UploadedFile[] = selectedFiles.map((file) => {
      let docType: UploadedFile['type'] = 'BCTC';
      const nameLower = file.name.toLowerCase();
      if (nameLower.includes('thuong nien') || nameLower.includes('annual')) {
        docType = 'BCTN';
      } else if (nameLower.includes('phan tich') || nameLower.includes('report')) {
        docType = 'BROKER_REPORT';
      }

      return {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: file.size,
        type: docType,
        content: `Nội dung giả lập đọc từ tài liệu ${file.name}: Doanh thu & Lợi nhuận tăng trưởng ổn định, các dự án nhà máy mở rộng công suất đi đúng tiến độ.`,
      };
    });

    onAddFiles(newUploadedFiles);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#111827] p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <UploadCloud className="h-5 w-5 text-emerald-400" />
          <h2 className="text-base font-semibold text-white">Tải Lên Tài Liệu Phân Tích</h2>
        </div>
        <span className="text-xs text-gray-400">PDF, DOCX, XLSX (Tối đa 50MB)</span>
      </div>

      {/* Drag & Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-700 bg-gray-900/50 p-6 text-center transition hover:border-emerald-500/50 hover:bg-gray-900/80"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.txt"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition group-hover:scale-110">
          <UploadCloud className="h-6 w-6" />
        </div>
        <p className="text-xs font-semibold text-gray-200">
          Nhấn để tải lên <span className="text-emerald-400">BCTC</span>,{' '}
          <span className="text-sky-400">Báo cáo Thường Niên</span> hoặc{' '}
          <span className="text-purple-400">Báo cáo CTCK</span>
        </p>
        <p className="mt-1 text-[11px] text-gray-500">
          Gemini 1.5 Pro Long-Context sẽ tự động đọc trích xuất dữ liệu chuẩn 4 phần
        </p>
      </div>

      {/* Uploaded File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
            <span>Danh sách tài liệu đã đính kèm ({files.length})</span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/90 px-3 py-2 text-xs"
              >
                <div className="flex items-center space-x-2 truncate">
                  <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-medium text-gray-200 truncate">{file.name}</span>
                  <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400 font-mono">
                    {file.type}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-[11px] text-gray-500">{formatFileSize(file.size)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(file.id);
                    }}
                    className="text-gray-500 hover:text-red-400 transition"
                    title="Xóa tài liệu"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
