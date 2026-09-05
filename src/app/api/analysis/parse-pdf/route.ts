import { NextRequest, NextResponse } from 'next/server';
import { fetchWorker, isWorkerConfigured } from '@/lib/worker-client';
import pdf from 'pdf-parse';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const ticker = (formData.get('ticker') as string | null) || '';

    if (!file) {
      return NextResponse.json({ error: 'Tệp PDF là bắt buộc' }, { status: 400 });
    }

    // 1. Thử ủy nhiệm cho Python Worker trên Render (hỗ trợ pdfplumber trích xuất bảng biểu)
    if (isWorkerConfigured()) {
      try {
        const workerFormData = new FormData();
        workerFormData.append('file', file);
        if (ticker) {
          workerFormData.append('ticker', ticker);
        }

        const workerRes = await fetchWorker(
          '/parse-pdf',
          {
            method: 'POST',
            body: workerFormData,
          },
          45000 // 45s timeout cho file PDF hoặc Render cold start
        );

        if (workerRes.ok) {
          const workerData = await workerRes.json();
          return NextResponse.json(workerData);
        } else {
          console.warn(`[Worker] /parse-pdf returned status ${workerRes.status}, falling back to local pdf-parse`);
        }
      } catch (workerErr) {
        console.warn('[Worker] /parse-pdf call failed or timed out, falling back to local pdf-parse:', workerErr);
      }
    }

    // 2. Fallback: Parse bằng Node.js pdf-parse cục bộ nếu Worker chưa bật hoặc timeout
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = await pdf(buffer);

    return NextResponse.json({
      pageCount: parsed.numpages || 1,
      isScanned: (parsed.text || '').trim().length < 100,
      text: (parsed.text || '').slice(0, 100000),
      tables: [],
      metadata: {
        fileName: file.name,
        fileSizeMb: Math.round((file.size / (1024 * 1024)) * 100) / 100,
        ticker: ticker ? ticker.toUpperCase() : null,
      },
      source: 'local_fallback',
    });
  } catch (error: any) {
    console.error('Error in /api/analysis/parse-pdf:', error);
    return NextResponse.json(
      { error: error.message || 'Không thể đọc nội dung file PDF' },
      { status: 500 }
    );
  }
}
