import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { getEarningsPdfPath } from '@/lib/earnings-store';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/earnings/pdf/[id]
 * Mở xem trực tiếp file PDF BCTC gốc trên tab trình duyệt
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Mã báo cáo không hợp lệ' }, { status: 400 });
    }

    const cleanId = decodeURIComponent(id).trim();
    const filePath = getEarningsPdfPath(cleanId);

    if (!filePath || !fs.existsSync(filePath)) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>BCTC Gốc - ValueX</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; }
            .card { background: #131c2e; border: 1px solid #1e293b; padding: 32px; border-radius: 16px; max-width: 520px; text-align: center; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
            h2 { color: #f59e0b; margin-top: 0; font-size: 20px; }
            p { color: #94a3b8; line-height: 1.6; font-size: 14px; margin-bottom: 12px; }
            .actions { display: flex; gap: 12px; justify-content: center; margin-top: 24px; flex-wrap: wrap; }
            .btn-primary { padding: 10px 20px; background: #059669; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 13px; transition: background 0.2s; }
            .btn-primary:hover { background: #10b981; }
            .btn-secondary { padding: 10px 18px; background: #1e293b; color: #cbd5e1; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 13px; border: 1px solid #334155; }
            .btn-secondary:hover { background: #334155; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Bản Tin Số Hóa Trước Kỳ Mới</h2>
            <p>Bản ghi <strong>${cleanId}</strong> được số hóa từ các phiên quét trước thời điểm triển khai lưu trữ file PDF vĩnh viễn.</p>
            <p>Số liệu kết quả kinh doanh và các chỉ số YoY của doanh nghiệp vẫn được lưu trữ đầy đủ trong Bảng KQKD ValueX. Bạn có thể tra cứu trực tiếp văn bản gốc trên Cổng UBCKNN.</p>
            <div class="actions">
              <a href="https://congbothongtin.ssc.gov.vn/faces/NewsSearch" target="_blank" rel="noopener noreferrer" class="btn-primary">Mở Cổng UBCKNN Tra Cứu</a>
              <a href="javascript:window.close()" class="btn-secondary">Đóng cửa sổ</a>
            </div>
          </div>
        </body>
        </html>`,
        {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);
    const filename = `${cleanId}.pdf`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err: any) {
    console.error('[API /api/earnings/pdf/[id]] Error serving PDF:', err.message);
    return NextResponse.json({ error: 'Lỗi khi đọc file PDF' }, { status: 500 });
  }
}
