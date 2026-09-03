import fs from 'fs/promises';
import path from 'path';
import { AnalysisReport } from '@/types/analysis';

const REPORTS_DIR = path.join(process.cwd(), 'data', 'saved-reports');

export interface StoredReportData {
  ticker: string;
  companyName: string;
  savedAt: string;
  generationModel?: string;
  report: AnalysisReport;
}

export interface ReportSummaryMeta {
  ticker: string;
  companyName: string;
  savedAt: string;
  generationModel?: string;
}

async function ensureDirectoryExists(): Promise<void> {
  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create reports directory:', error);
  }
}

function getFilePath(ticker: string): string {
  const sanitized = ticker.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return path.join(REPORTS_DIR, `${sanitized}.json`);
}

/**
 * Lưu toàn bộ báo cáo phân tích AI vào file JSON trên máy chủ
 */
export async function saveServerReport(
  ticker: string,
  report: AnalysisReport,
  model?: string
): Promise<StoredReportData> {
  await ensureDirectoryExists();
  const cleanTicker = ticker.trim().toUpperCase();
  const filePath = getFilePath(cleanTicker);

  const payload: StoredReportData = {
    ticker: cleanTicker,
    companyName: report.companyName || `Công ty Cổ phần ${cleanTicker}`,
    savedAt: new Date().toISOString(),
    generationModel: model || report.generationModel || 'gemini-3.8-flash',
    report: {
      ...report,
      ticker: cleanTicker,
      generationModel: model || report.generationModel || 'gemini-3.8-flash',
    },
  };

  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  return payload;
}

/**
 * Lấy báo cáo phân tích đã lưu của một mã cổ phiếu
 */
export async function getServerReport(ticker: string): Promise<StoredReportData | null> {
  try {
    const cleanTicker = ticker.trim().toUpperCase();
    const filePath = getFilePath(cleanTicker);
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed: StoredReportData = JSON.parse(content);
    return parsed;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    console.error(`Error reading report for ${ticker}:`, error);
    return null;
  }
}

/**
 * Lấy danh sách metadata của tất cả các mã đã được phân tích AI trên server
 */
export async function listAllServerReports(): Promise<ReportSummaryMeta[]> {
  try {
    await ensureDirectoryExists();
    const files = await fs.readdir(REPORTS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const summaries: ReportSummaryMeta[] = [];

    for (const file of jsonFiles) {
      try {
        const fullPath = path.join(REPORTS_DIR, file);
        const content = await fs.readFile(fullPath, 'utf-8');
        const parsed: StoredReportData = JSON.parse(content);
        summaries.push({
          ticker: parsed.ticker || file.replace('.json', ''),
          companyName: parsed.companyName || '',
          savedAt: parsed.savedAt || '',
          generationModel: parsed.generationModel || '',
        });
      } catch (err) {
        console.warn(`Failed to parse report file ${file}:`, err);
      }
    }

    // Sắp xếp theo ngày cập nhật mới nhất trước
    summaries.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    return summaries;
  } catch (error) {
    console.error('Error listing server reports:', error);
    return [];
  }
}

/**
 * Xóa báo cáo đã lưu của mã cổ phiếu
 */
export async function deleteServerReport(ticker: string): Promise<boolean> {
  try {
    const cleanTicker = ticker.trim().toUpperCase();
    const filePath = getFilePath(cleanTicker);
    await fs.unlink(filePath);
    return true;
  } catch (error: any) {
    if (error.code === 'ENOENT') return false;
    console.error(`Error deleting report for ${ticker}:`, error);
    return false;
  }
}
