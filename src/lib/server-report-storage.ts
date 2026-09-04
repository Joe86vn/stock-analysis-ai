import {
  saveReport,
  getReport,
  listAllReports,
  deleteReport,
  StoredReportData,
  ReportSummaryMeta,
} from './storage-adapter';
import { AnalysisReport } from '@/types/analysis';

export type { StoredReportData, ReportSummaryMeta };

/**
 * Lưu toàn bộ báo cáo phân tích AI (ủy thác cho Storage Adapter)
 */
export async function saveServerReport(
  ticker: string,
  report: AnalysisReport,
  model?: string
): Promise<StoredReportData> {
  return saveReport(ticker, report, model);
}

/**
 * Lấy báo cáo phân tích đã lưu của một mã cổ phiếu
 */
export async function getServerReport(ticker: string): Promise<StoredReportData | null> {
  return getReport(ticker);
}

/**
 * Lấy danh sách metadata của tất cả các mã đã được phân tích AI
 */
export async function listAllServerReports(): Promise<ReportSummaryMeta[]> {
  return listAllReports();
}

/**
 * Xóa báo cáo đã lưu của mã cổ phiếu
 */
export async function deleteServerReport(ticker: string): Promise<boolean> {
  return deleteReport(ticker);
}
