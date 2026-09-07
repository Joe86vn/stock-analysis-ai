import fs from 'fs';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { QualitativeInsights } from '@/types/qualitative';
import { AnalysisReport } from '@/types/analysis';

/**
 * Lấy cấu hình Cloudflare R2 từ biến môi trường
 */
export function getR2Config() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim() || 'stock-analysis-reports';

  const isConfigured = Boolean(accountId && accessKeyId && secretAccessKey);

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    isConfigured,
    endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '',
  };
}

let cachedS3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  const config = getR2Config();
  if (!config.isConfigured) {
    return null;
  }

  if (!cachedS3Client) {
    cachedS3Client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId!,
        secretAccessKey: config.secretAccessKey!,
      },
    });
  }

  return cachedS3Client;
}

/**
 * Đường dẫn lưu trữ R2 Object Key chuẩn hóa
 * Ví dụ: stock-reports/HPG/qualitative-latest.json
 */
export function getR2ObjectKey(ticker: string): string {
  return `stock-reports/${ticker.trim().toUpperCase()}/qualitative-latest.json`;
}

/**
 * Đường dẫn file cache local để fallback khi offline hoặc chưa config R2
 * Ví dụ: data/insights/HPG.json
 */
export function getLocalCacheFilePath(ticker: string): string {
  const cleanTicker = ticker.trim().toUpperCase();
  const dir = path.join(process.cwd(), 'data', 'insights');
  return path.join(dir, `${cleanTicker}.json`);
}

/**
 * Đường dẫn R2 Object Key cho Báo Cáo Hoàn Chỉnh (Full Report Cache)
 * Ví dụ: stock-reports/HPG/full-report-latest.json
 */
export function getFullReportR2ObjectKey(ticker: string): string {
  return `stock-reports/${ticker.trim().toUpperCase()}/full-report-latest.json`;
}

/**
 * Đường dẫn file cache local cho Báo Cáo Hoàn Chỉnh
 * Ví dụ: data/reports/HPG.json
 */
export function getLocalFullReportFilePath(ticker: string): string {
  const cleanTicker = ticker.trim().toUpperCase();
  const dir = path.join(process.cwd(), 'data', 'reports');
  return path.join(dir, `${cleanTicker}.json`);
}

/**
 * Đảm bảo thư mục lưu trữ local tồn tại
 */
function ensureLocalDirExists(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Lưu trữ báo cáo định tính (Lưu vào Local Cache + Cloudflare R2 nếu có cấu hình)
 */
export async function putQualitativeReport(
  ticker: string,
  data: QualitativeInsights
): Promise<{ success: boolean; destination: 'r2' | 'local' | 'both'; error?: string }> {
  const cleanTicker = ticker.trim().toUpperCase();
  const jsonString = JSON.stringify(data, null, 2);

  // 1. Luôn lưu bản copy vào Local Disk Cache
  try {
    const localPath = getLocalCacheFilePath(cleanTicker);
    ensureLocalDirExists(localPath);
    fs.writeFileSync(localPath, jsonString, 'utf-8');
  } catch (localErr: any) {
    console.warn(`[R2 Storage] Warning writing local cache for ${cleanTicker}:`, localErr.message);
  }

  // 2. Upload lên Cloudflare R2 nếu đã cấu hình
  const s3 = getS3Client();
  const config = getR2Config();

  if (!s3 || !config.isConfigured) {
    return {
      success: true,
      destination: 'local',
    };
  }

  try {
    const objectKey = getR2ObjectKey(cleanTicker);
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
      Body: jsonString,
      ContentType: 'application/json; charset=utf-8',
    });

    await s3.send(command);
    console.log(`[R2 Storage] Successfully uploaded ${cleanTicker} to R2 (${config.bucketName}/${objectKey})`);
    return {
      success: true,
      destination: 'both',
    };
  } catch (r2Err: any) {
    console.error(`[R2 Storage] Failed uploading to R2 for ${cleanTicker}:`, r2Err.message);
    return {
      success: true, // Vẫn trả về true vì đã lưu local cache thành công
      destination: 'local',
      error: r2Err.message,
    };
  }
}

/**
 * Đọc báo cáo định tính (Ưu tiên từ Cloudflare R2, fallback về Local Cache)
 */
export async function getQualitativeReport(ticker: string): Promise<QualitativeInsights | null> {
  const cleanTicker = ticker.trim().toUpperCase();
  const s3 = getS3Client();
  const config = getR2Config();

  // 1. Thử đọc từ R2 trước nếu có cấu hình
  if (s3 && config.isConfigured) {
    try {
      const objectKey = getR2ObjectKey(cleanTicker);
      const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: objectKey,
      });

      const response = await s3.send(command);
      if (response.Body) {
        const bodyText = await response.Body.transformToString();
        const parsed = JSON.parse(bodyText) as QualitativeInsights;

        // Đồng bộ ngược lại local cache để lần sau đọc nhanh hơn
        try {
          const localPath = getLocalCacheFilePath(cleanTicker);
          ensureLocalDirExists(localPath);
          fs.writeFileSync(localPath, bodyText, 'utf-8');
        } catch {
          // ignore cache write error
        }

        return parsed;
      }
    } catch (r2Err: any) {
      // Nếu là NoSuchKey hoặc lỗi kết nối, tiếp tục thử local cache
      if (r2Err.name !== 'NoSuchKey') {
        console.warn(`[R2 Storage] Error fetching ${cleanTicker} from R2:`, r2Err.message);
      }
    }
  }

  // 2. Fallback đọc từ Local Disk Cache
  try {
    const localPath = getLocalCacheFilePath(cleanTicker);
    if (fs.existsSync(localPath)) {
      const content = fs.readFileSync(localPath, 'utf-8');
      return JSON.parse(content) as QualitativeInsights;
    }
  } catch (localErr: any) {
    console.warn(`[R2 Storage] Error reading local cache for ${cleanTicker}:`, localErr.message);
  }

  return null;
}

/**
 * Kiểm tra nhanh xem báo cáo định tính của mã đã tồn tại chưa
 */
export async function checkQualitativeReportExists(ticker: string): Promise<boolean> {
  const cleanTicker = ticker.trim().toUpperCase();

  // 1. Kiểm tra local cache trước (tốc độ cao)
  const localPath = getLocalCacheFilePath(cleanTicker);
  if (fs.existsSync(localPath)) {
    return true;
  }

  // 2. Nếu chưa có local, kiểm tra R2
  const s3 = getS3Client();
  const config = getR2Config();

  if (s3 && config.isConfigured) {
    try {
      const objectKey = getR2ObjectKey(cleanTicker);
      const command = new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: objectKey,
      });
      await s3.send(command);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Lưu trữ Báo Cáo Hoàn Chỉnh vào Local Disk Cache + Cloudflare R2
 */
export async function putFullReportCache(
  ticker: string,
  report: AnalysisReport
): Promise<{ success: boolean; destination: 'r2' | 'local' | 'both'; error?: string }> {
  const cleanTicker = ticker.trim().toUpperCase();
  const cachedReport: AnalysisReport = {
    ...report,
    cachedAt: new Date().toISOString(),
    isFromCache: true,
  };
  const jsonString = JSON.stringify(cachedReport, null, 2);

  // 1. Luôn lưu vào Local Disk Cache
  try {
    const localPath = getLocalFullReportFilePath(cleanTicker);
    ensureLocalDirExists(localPath);
    fs.writeFileSync(localPath, jsonString, 'utf-8');
  } catch (localErr: any) {
    console.warn(`[Full Report Cache] Warning writing local cache for ${cleanTicker}:`, localErr.message);
  }

  // 2. Upload lên Cloudflare R2 nếu đã cấu hình
  const s3 = getS3Client();
  const config = getR2Config();

  if (!s3 || !config.isConfigured) {
    return {
      success: true,
      destination: 'local',
    };
  }

  try {
    const objectKey = getFullReportR2ObjectKey(cleanTicker);
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
      Body: jsonString,
      ContentType: 'application/json; charset=utf-8',
    });

    await s3.send(command);
    console.log(`[Full Report Cache] Successfully cached full report for ${cleanTicker} to R2 (${config.bucketName}/${objectKey})`);
    return {
      success: true,
      destination: 'both',
    };
  } catch (r2Err: any) {
    console.error(`[Full Report Cache] Failed uploading full report to R2 for ${cleanTicker}:`, r2Err.message);
    return {
      success: true,
      destination: 'local',
      error: r2Err.message,
    };
  }
}

/**
 * Đọc Báo Cáo Hoàn Chỉnh từ Cache (Ưu tiên Local Cache -> R2)
 * @param ticker Mã cổ phiếu
 * @param maxAgeHours Số giờ tối đa mà cache còn hợp lệ (mặc định 168 giờ = 7 ngày)
 */
export async function getFullReportCache(
  ticker: string,
  maxAgeHours: number = 168
): Promise<AnalysisReport | null> {
  const cleanTicker = ticker.trim().toUpperCase();
  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

  // 1. Thử đọc từ Local Disk Cache trước
  try {
    const localPath = getLocalFullReportFilePath(cleanTicker);
    if (fs.existsSync(localPath)) {
      const stats = fs.statSync(localPath);
      const isFresh = (now - stats.mtimeMs) < maxAgeMs;
      if (isFresh) {
        const content = fs.readFileSync(localPath, 'utf-8');
        const parsed = JSON.parse(content) as AnalysisReport;
        parsed.isFromCache = true;
        return parsed;
      }
    }
  } catch (localErr: any) {
    console.warn(`[Full Report Cache] Error reading local cache for ${cleanTicker}:`, localErr.message);
  }

  // 2. Thử đọc từ Cloudflare R2
  const s3 = getS3Client();
  const config = getR2Config();

  if (s3 && config.isConfigured) {
    try {
      const objectKey = getFullReportR2ObjectKey(cleanTicker);
      const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: objectKey,
      });

      const response = await s3.send(command);
      if (response.Body) {
        const bodyText = await response.Body.transformToString();
        const parsed = JSON.parse(bodyText) as AnalysisReport;

        // Kiểm tra thời hạn cache nếu có cachedAt
        if (parsed.cachedAt) {
          const cachedTime = new Date(parsed.cachedAt).getTime();
          if (!isNaN(cachedTime) && (now - cachedTime) > maxAgeMs) {
            console.log(`[Full Report Cache] Cache on R2 for ${cleanTicker} has expired (${maxAgeHours}h)`);
            return null;
          }
        }

        parsed.isFromCache = true;

        // Lưu ngược về local cache
        try {
          const localPath = getLocalFullReportFilePath(cleanTicker);
          ensureLocalDirExists(localPath);
          fs.writeFileSync(localPath, bodyText, 'utf-8');
        } catch {
          // ignore
        }

        return parsed;
      }
    } catch (r2Err: any) {
      if (r2Err.name !== 'NoSuchKey') {
        console.warn(`[Full Report Cache] Error fetching full report for ${cleanTicker} from R2:`, r2Err.message);
      }
    }
  }

  return null;
}
