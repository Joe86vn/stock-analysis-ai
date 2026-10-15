import fs from 'fs';
import path from 'path';
import { getR2Config } from './r2-storage';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { ParsedVietcapQuarter } from './vietcap-field-mapping';
import { StockFundamentalScore } from './filter-rs-data';

export interface StockFinancialManifestItem {
  ticker: string;
  latestQuarter: string; // Ví dụ: "Q2/2026"
  latestYear: number;
  latestQ: number;
  totalScore?: number;
  rankGrade?: string;
  quarterCount: number;
  hasFinancials: boolean;
  lastSyncedAt: string;
}

export interface FinancialManifest {
  updatedAt: string;
  totalTracked: number;
  stocks: Record<string, StockFinancialManifestItem>;
}

export function getLocalManifestFilePath(): string {
  const dir = path.join(process.cwd(), 'data', 'financials');
  return path.join(dir, 'manifest.json');
}

export function getR2ManifestObjectKey(): string {
  return 'financial-data/vietcap/manifest.json';
}

function ensureDirExists(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let cachedS3Client: S3Client | null = null;
function getS3Client(): S3Client | null {
  const config = getR2Config();
  if (!config.isConfigured) return null;
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
 * Đọc Bảng Chỉ Mục BCTC (manifest.json) từ SSD hoặc R2
 * Nếu chưa tồn tại, tự động quét các file .json trong data/financials để khởi tạo
 */
export async function getFinancialManifest(): Promise<FinancialManifest> {
  const localPath = getLocalManifestFilePath();

  // 1. Kiểm tra SSD NVMe
  try {
    if (fs.existsSync(localPath)) {
      const content = fs.readFileSync(localPath, 'utf-8');
      const parsed = JSON.parse(content) as FinancialManifest;
      if (parsed && parsed.stocks) {
        return parsed;
      }
    }
  } catch (err: any) {
    console.warn('[Financial Manifest] Local read warning:', err.message);
  }

  // 2. Kiểm tra Cloudflare R2
  const s3 = getS3Client();
  const config = getR2Config();
  if (s3 && config.isConfigured) {
    try {
      const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: getR2ManifestObjectKey(),
      });
      const response = await s3.send(command);
      if (response.Body) {
        const bodyText = await response.Body.transformToString();
        const parsed = JSON.parse(bodyText) as FinancialManifest;
        ensureDirExists(localPath);
        fs.writeFileSync(localPath, bodyText, 'utf-8');
        return parsed;
      }
    } catch {}
  }

  // 3. Khởi tạo manifest từ các file sẵn có trong thư mục data/financials
  const initialManifest: FinancialManifest = {
    updatedAt: new Date().toISOString(),
    totalTracked: 0,
    stocks: {},
  };

  try {
    const dir = path.join(process.cwd(), 'data', 'financials');
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'manifest.json');
      for (const f of files) {
        const ticker = f.replace('.json', '').toUpperCase();
        try {
          const filePath = path.join(dir, f);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const quarters: ParsedVietcapQuarter[] = JSON.parse(raw);
          if (Array.isArray(quarters) && quarters.length > 0) {
            const latest = quarters[quarters.length - 1];
            initialManifest.stocks[ticker] = {
              ticker,
              latestQuarter: latest.year && latest.quarter ? `Q${latest.quarter}/${latest.year}` : 'Chưa rõ',
              latestYear: latest.year || 0,
              latestQ: latest.quarter || 0,
              quarterCount: quarters.length,
              hasFinancials: true,
              lastSyncedAt: new Date().toISOString(),
            };
          }
        } catch {}
      }
      initialManifest.totalTracked = Object.keys(initialManifest.stocks).length;
    }
  } catch {}

  // Lưu manifest vừa khởi tạo
  await saveFinancialManifest(initialManifest);
  return initialManifest;
}

/**
 * Lưu trữ Bảng Chỉ Mục BCTC vào SSD NVMe & Cloudflare R2
 */
export async function saveFinancialManifest(manifest: FinancialManifest): Promise<void> {
  manifest.updatedAt = new Date().toISOString();
  manifest.totalTracked = Object.keys(manifest.stocks).length;
  const jsonString = JSON.stringify(manifest, null, 2);

  // Lưu Local SSD
  try {
    const localPath = getLocalManifestFilePath();
    ensureDirExists(localPath);
    fs.writeFileSync(localPath, jsonString, 'utf-8');
  } catch (err: any) {
    console.warn('[Financial Manifest] Local write error:', err.message);
  }

  // Lưu R2
  const s3 = getS3Client();
  const config = getR2Config();
  if (s3 && config.isConfigured) {
    try {
      const command = new PutObjectCommand({
        Bucket: config.bucketName,
        Key: getR2ManifestObjectKey(),
        Body: jsonString,
        ContentType: 'application/json; charset=utf-8',
      });
      await s3.send(command);
    } catch (r2Err: any) {
      console.warn('[Financial Manifest] R2 upload error:', r2Err.message);
    }
  }
}

/**
 * Cập nhật thông tin BCTC của một mã vào manifest
 */
export async function updateStockInManifest(
  ticker: string,
  quarters: ParsedVietcapQuarter[],
  fundamentalScore?: StockFundamentalScore | null
): Promise<void> {
  const cleanTicker = ticker.trim().toUpperCase();
  const manifest = await getFinancialManifest();

  if (!quarters || quarters.length === 0) {
    manifest.stocks[cleanTicker] = {
      ticker: cleanTicker,
      latestQuarter: 'Chưa rõ',
      latestYear: 0,
      latestQ: 0,
      quarterCount: 0,
      hasFinancials: false,
      lastSyncedAt: new Date().toISOString(),
    };
  } else {
    const latest = quarters[quarters.length - 1];
    manifest.stocks[cleanTicker] = {
      ticker: cleanTicker,
      latestQuarter: latest.year && latest.quarter ? `Q${latest.quarter}/${latest.year}` : 'Chưa rõ',
      latestYear: latest.year || 0,
      latestQ: latest.quarter || 0,
      totalScore: fundamentalScore?.totalScore,
      rankGrade: fundamentalScore?.rankGrade,
      quarterCount: quarters.length,
      hasFinancials: true,
      lastSyncedAt: new Date().toISOString(),
    };
  }

  await saveFinancialManifest(manifest);
}

/**
 * TỰ ĐỘNG ĐỒNG BỘ BCTC MỚI (Khung giờ 08:15 Sáng & 15:15 Chiều)
 * Kiểm tra các sự kiện công bố BCTC / KQKD trong ngày từ Vietcap.
 * Nếu không có mã nào ra BCTC mới: kết thúc ngay (0ms).
 * Nếu có mã ra BCTC mới: chỉ cập nhật BCTC và tính lại điểm cho riêng mã đó!
 */
export async function syncNewFinancialReports(
  todayCompact?: string
): Promise<{ updatedCount: number; updatedTickers: string[] }> {
  const dateStr = todayCompact || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const updatedTickers: string[] = [];

  console.log(`\n📑 2. [BCTC CHECK] Kiểm tra công bố Báo Cáo Tài Chính mới ngày ${dateStr}...`);
  const manifest = await getFinancialManifest();

  // 1. Quét sự kiện tài chính / KQKD trong ngày từ Vietcap Events API
  const newReportTickers = new Set<string>();
  try {
    const url = `https://iq.vietcap.com.vn/api/iq-insight-service/v2/events?fromDate=${dateStr}&toDate=${dateStr}&page=0&size=100`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'https://iq.vietcap.com.vn',
        'Referer': 'https://iq.vietcap.com.vn/',
      },
    });
    if (res.ok) {
      const json = await res.json();
      const list = json.data?.content || json.data || [];
      if (Array.isArray(list)) {
        for (const ev of list) {
          const code = (ev.eventCode || '').toUpperCase();
          const title = (ev.eventTitle || '').toLowerCase();
          // Kiểm tra xem sự kiện có liên quan đến BCTC / Báo cáo tài chính / KQKD
          if (
            code.includes('FIN') ||
            code.includes('REP') ||
            code.includes('AUDIT') ||
            title.includes('tài chính') ||
            title.includes('kqkd') ||
            title.includes('báo cáo')
          ) {
            if (ev.ticker && ev.ticker.length === 3) {
              newReportTickers.add(ev.ticker.trim().toUpperCase());
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('   ⚠️ Lỗi truy vấn sự kiện BCTC từ Vietcap:', err.message);
  }

  // 2. Nếu phát hiện mã có BCTC mới, cập nhật BCTC và điểm số cho riêng các mã đó
  if (newReportTickers.size > 0) {
    console.log(`   📌 Phát hiện ${newReportTickers.size} mã có tin BCTC mới hôm nay: ${Array.from(newReportTickers).join(', ')}`);
    // Import động để tránh circular dependency
    const { fetchFullVietcapData } = await import('./vietcap-field-mapping');
    const { calculateStockFundamentalScore } = await import('./filter-rs-data');

    for (const ticker of Array.from(newReportTickers)) {
      try {
        console.log(`   📥 Đang tải BCTC mới cho ${ticker}...`);
        const quarters = await fetchFullVietcapData(ticker, { forceRefresh: true });
        if (quarters && quarters.length > 0) {
          const score = await calculateStockFundamentalScore(ticker, quarters);
          await updateStockInManifest(ticker, quarters, score);
          updatedTickers.push(ticker);
          console.log(`   ✅ Đã cập nhật BCTC & Điểm ValueX thành công cho ${ticker} (${score?.totalScore}đ, Hạng ${score?.rankGrade})`);
        }
      } catch (err: any) {
        console.warn(`   ❌ Lỗi cập nhật BCTC cho ${ticker}:`, err.message);
      }
    }
  } else {
    console.log(`   ✅ Không có BCTC mới phát sinh hôm nay. Toàn bộ dữ liệu tài chính & tính toán trên SSD được giữ nguyên 100%.`);
  }

  return {
    updatedCount: updatedTickers.length,
    updatedTickers,
  };
}

