'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ValueX ErrorBoundary] Caught an unhandled client error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/20 p-6 my-4 space-y-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300 font-heading">
                {this.props.fallbackTitle || 'Đã xảy ra sự cố khi hiển thị phần nội dung này'}
              </h3>
              <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-1 leading-relaxed">
                Hệ thống bảo vệ của ValueX đã ghi nhận lỗi render để tránh làm sập toàn bộ trang web.
              </p>
              {this.state.error?.message && (
                <div className="mt-2 text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-rose-200/50 dark:border-rose-900/40 break-words">
                  {this.state.error.message}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={this.handleRetry}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Thử Tải Lại Thành Phần Này</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
