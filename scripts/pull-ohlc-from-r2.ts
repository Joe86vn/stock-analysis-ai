/**
 * Script Kéo Toàn Bộ Dữ Liệu Nến OHLC từ Cloudflare R2 về SSD Local của VPS
 * 
 * Cách chạy trên VPS:
 *   npx tsx scripts/pull-ohlc-from-r2.ts
 */

import fs from 'fs';
import path from 'path';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getR2Config } from '../src/lib/r2-storage';

async function main() {
  console.log('================================================================');
  console.log('⚡ [OHLC PULL] KÉO TOÀN BỘ NẾN TỪ CLOUDFLARE R2 VỀ NVMe SSD VPS');
  console.log('================================================================');

  const config = getR2Config();
  if (!config.isConfigured) {
    console.error('❌ Cloudflare R2 chưa được cấu hình trong môi trường.');
    process.exit(1);
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId!,
      secretAccessKey: config.secretAccessKey!,
    },
  });

  const dir = path.join(process.cwd(), 'data', 'ohlc');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log('🔍 Đang liệt kê toàn bộ file nến trong bucket (prefix: market-data/ohlc/)...');

  let continuationToken: string | undefined = undefined;
  const ohlcKeys: string[] = [];

  while (true) {
    const listRes: any = await s3.send(
      new ListObjectsV2Command({
        Bucket: config.bucketName,
        Prefix: 'market-data/ohlc/',
        ContinuationToken: continuationToken,
      })
    );

    if (listRes.Contents && Array.isArray(listRes.Contents)) {
      for (const obj of listRes.Contents) {
        if (obj.Key && obj.Key.endsWith('.json')) {
          ohlcKeys.push(obj.Key);
        }
      }
    }

    if (listRes.IsTruncated && listRes.NextContinuationToken) {
      continuationToken = listRes.NextContinuationToken;
    } else {
      break;
    }
  }

  console.log(`📦 Tìm thấy ${ohlcKeys.length} file nến trên Cloudflare R2.\n`);

  let downloadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  const CONCURRENCY = 10;
  const queue = [...ohlcKeys];

  async function worker() {
    while (queue.length > 0) {
      const key = queue.shift();
      if (!key) break;

      const ticker = path.basename(key, '.json');
      const targetPath = path.join(dir, `${ticker}.json`);

      try {
        const getRes = await s3.send(
          new GetObjectCommand({
            Bucket: config.bucketName,
            Key: key,
          })
        );

        if (getRes.Body) {
          const content = await getRes.Body.transformToString();
          fs.writeFileSync(targetPath, content, 'utf-8');
          downloadedCount++;
        }
      } catch (err: any) {
        errorCount++;
        console.warn(`⚠️ Lỗi tải ${ticker}:`, err.message);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n================================================================');
  console.log(`✅ [HOÀN TẤT TRONG ${durationSec} GIÂY]`);
  console.log(`- Tổng số nến đã lưu vào SSD: ${downloadedCount}`);
  console.log(`- Thất bại: ${errorCount}`);
  console.log(`- Thư mục lưu trữ: ${dir}`);
  console.log('================================================================');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
