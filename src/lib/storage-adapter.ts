import fs from 'fs/promises';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { AnalysisReport } from '@/types/analysis';

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

// Local filesystem path fallback
const LOCAL_REPORTS_DIR = path.join(process.cwd(), 'data', 'saved-reports');

// Cloudflare R2 configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Kiểm tra xem hệ thống có được cấu hình kết nối R2 không
export const isR2Configured = Boolean(
  R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME
);

let s3ClientInstance: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    if (!isR2Configured) {
      throw new Error('Cloudflare R2 is not configured. Missing environment variables.');
    }
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3ClientInstance;
}

function sanitizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function getR2Key(cleanTicker: string): string {
  return `reports/${cleanTicker}.json`;
}

function getLocalFilePath(cleanTicker: string): string {
  return path.join(LOCAL_REPORTS_DIR, `${cleanTicker}.json`);
}

async function ensureLocalDir(): Promise<void> {
  try {
    await fs.mkdir(LOCAL_REPORTS_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create local reports directory:', err);
  }
}

/**
 * Lưu dữ liệu báo cáo (Ưu tiên Cloudflare R2 nếu có config, fallback về Local Filesystem)
 */
export async function saveReport(
  ticker: string,
  report: AnalysisReport,
  model?: string
): Promise<StoredReportData> {
  const cleanTicker = sanitizeTicker(ticker);
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

  const jsonContent = JSON.stringify(payload, null, 2);

  if (isR2Configured) {
    try {
      const client = getS3Client();
      await client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: getR2Key(cleanTicker),
          Body: jsonContent,
          ContentType: 'application/json',
          Metadata: {
            ticker: cleanTicker,
            companyName: encodeURIComponent(payload.companyName),
            savedAt: payload.savedAt,
          },
        })
      );
      return payload;
    } catch (error) {
      console.error(`[R2 Storage] Failed to save report for ${cleanTicker} to R2:`, error);
      // Fallback về local nếu R2 lỗi tạm thời
    }
  }

  // Fallback: Local filesystem
  await ensureLocalDir();
  await fs.writeFile(getLocalFilePath(cleanTicker), jsonContent, 'utf-8');
  return payload;
}

/**
 * Đọc báo cáo của mã cổ phiếu
 */
export async function getReport(ticker: string): Promise<StoredReportData | null> {
  const cleanTicker = sanitizeTicker(ticker);

  if (isR2Configured) {
    try {
      const client = getS3Client();
      const response = await client.send(
        new GetObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: getR2Key(cleanTicker),
        })
      );

      if (!response.Body) return null;
      const str = await response.Body.transformToString();
      return JSON.parse(str) as StoredReportData;
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        // Thử tìm tiếp dưới local nếu có
      } else {
        console.error(`[R2 Storage] Error fetching report for ${cleanTicker}:`, error);
      }
    }
  }

  // Fallback: Local filesystem
  try {
    const filePath = getLocalFilePath(cleanTicker);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as StoredReportData;
  } catch (error: any) {
    if (error.code === 'ENOENT') return null;
    console.error(`[Local Storage] Error reading report for ${cleanTicker}:`, error);
    return null;
  }
}

/**
 * Lấy danh sách metadata của tất cả các mã đã lưu
 */
export async function listAllReports(): Promise<ReportSummaryMeta[]> {
  const summariesMap = new Map<string, ReportSummaryMeta>();

  // 1. Quét từ Cloudflare R2 nếu được cấu hình
  if (isR2Configured) {
    try {
      const client = getS3Client();
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: R2_BUCKET_NAME,
          Prefix: 'reports/',
        })
      );

      if (response.Contents) {
        for (const item of response.Contents) {
          if (!item.Key || !item.Key.endsWith('.json')) continue;
          const ticker = item.Key.replace('reports/', '').replace('.json', '');

          // Đọc từng file hoặc metadata
          summariesMap.set(ticker, {
            ticker,
            companyName: `Công ty Cổ phần ${ticker}`,
            savedAt: item.LastModified?.toISOString() || new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('[R2 Storage] Error listing objects from R2:', error);
    }
  }

  // 2. Quét từ Local Filesystem để bổ sung
  try {
    await ensureLocalDir();
    const files = await fs.readdir(LOCAL_REPORTS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    for (const file of jsonFiles) {
      const ticker = file.replace('.json', '');
      if (summariesMap.has(ticker)) continue;

      try {
        const fullPath = path.join(LOCAL_REPORTS_DIR, file);
        const content = await fs.readFile(fullPath, 'utf-8');
        const parsed: StoredReportData = JSON.parse(content);
        summariesMap.set(ticker, {
          ticker: parsed.ticker || ticker,
          companyName: parsed.companyName || '',
          savedAt: parsed.savedAt || '',
          generationModel: parsed.generationModel || '',
        });
      } catch (err) {
        console.warn(`[Local Storage] Failed to parse local report ${file}:`, err);
      }
    }
  } catch (error) {
    console.warn('[Local Storage] Directory scan skipped or unavailable:', error);
  }

  const result = Array.from(summariesMap.values());
  result.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  return result;
}

/**
 * Xóa báo cáo
 */
export async function deleteReport(ticker: string): Promise<boolean> {
  const cleanTicker = sanitizeTicker(ticker);
  let deletedFromR2 = false;
  let deletedFromLocal = false;

  if (isR2Configured) {
    try {
      const client = getS3Client();
      await client.send(
        new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: getR2Key(cleanTicker),
        })
      );
      deletedFromR2 = true;
    } catch (error) {
      console.error(`[R2 Storage] Error deleting ${cleanTicker} from R2:`, error);
    }
  }

  try {
    const filePath = getLocalFilePath(cleanTicker);
    await fs.unlink(filePath);
    deletedFromLocal = true;
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error(`[Local Storage] Error deleting ${cleanTicker}:`, error);
    }
  }

  return deletedFromR2 || deletedFromLocal;
}
