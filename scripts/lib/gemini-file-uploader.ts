import fs from 'fs';
import path from 'path';
import { GoogleAIFileManager, FileMetadataResponse } from '@google/generative-ai/server';

/**
 * Tải file PDF từ URL về thư mục tạm trên đĩa
 */
export async function downloadPdfToTemp(
  url: string,
  destinationDir: string = path.join(process.cwd(), 'scratch', 'temp_pdfs'),
  preferredFilename?: string
): Promise<string | null> {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return null;
  }

  if (!fs.existsSync(destinationDir)) {
    fs.mkdirSync(destinationDir, { recursive: true });
  }

  const safeFilename =
    preferredFilename ||
    `${Date.now()}_${path.basename(new URL(url).pathname).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const targetFilePath = path.join(destinationDir, safeFilename);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'application/pdf,application/octet-stream,*/*',
        Referer: 'https://simplize.vn/',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[PDF Downloader] HTTP ${response.status} when downloading: ${url}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Kiểm tra tính hợp lệ cơ bản của file PDF (> 1KB)
    if (buffer.length < 1024) {
      console.warn(`[PDF Downloader] File too small (${buffer.length} bytes), probably invalid PDF: ${url}`);
      return null;
    }

    fs.writeFileSync(targetFilePath, buffer);
    return targetFilePath;
  } catch (err: any) {
    console.warn(`[PDF Downloader] Failed to download ${url}:`, err.message);
    return null;
  }
}

/**
 * Upload PDF lên Google Gemini Native File API
 */
export async function uploadPdfToGemini(
  fileManager: GoogleAIFileManager,
  localFilePath: string,
  displayName: string
): Promise<FileMetadataResponse | null> {
  if (!fs.existsSync(localFilePath)) {
    return null;
  }

  try {
    console.log(`[Gemini File API] Uploading ${displayName} (${(fs.statSync(localFilePath).size / 1024 / 1024).toFixed(2)} MB)...`);
    const uploadResult = await fileManager.uploadFile(localFilePath, {
      mimeType: 'application/pdf',
      displayName,
    });

    let file = uploadResult.file;

    // Chờ file chuyển sang trạng thái ACTIVE nếu cần xử lý
    let attempts = 0;
    while (file.state === 'PROCESSING' && attempts < 15) {
      console.log(`[Gemini File API] Processing ${displayName}... waiting 2s`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const res = await fileManager.getFile(file.name);
      file = res;
      attempts++;
    }

    if (file.state === 'FAILED') {
      console.warn(`[Gemini File API] File processing failed for: ${displayName}`);
      return null;
    }

    console.log(`[Gemini File API] Ready: ${displayName} (URI: ${file.uri})`);
    return file;
  } catch (err: any) {
    console.error(`[Gemini File API] Upload error for ${displayName}:`, err.message);
    return null;
  }
}

/**
 * Xóa file trên Gemini File API sau khi hoàn thành để tiết kiệm bộ nhớ
 */
export async function cleanupGeminiFiles(
  fileManager: GoogleAIFileManager,
  fileNames: string[]
): Promise<void> {
  for (const name of fileNames) {
    if (!name) continue;
    try {
      await fileManager.deleteFile(name);
      console.log(`[Gemini File API] Cleaned up remote file: ${name}`);
    } catch (err: any) {
      // Bỏ qua lỗi cleanup remote
    }
  }
}

/**
 * Dọn dẹp file tạm trên local disk
 */
export function cleanupLocalFiles(filePaths: string[]): void {
  for (const p of filePaths) {
    if (!p) continue;
    try {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    } catch {
      // Bỏ qua lỗi xóa file local
    }
  }
}
