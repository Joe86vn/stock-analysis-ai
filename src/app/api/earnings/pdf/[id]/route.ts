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
          <title>Không tìm thấy file BCTC</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; border: 1px solid #334155; padding: 32px; border-radius: 12px; max-width: 480px; text-align: center; }
            h2 { color: #f43f5e; margin-top: 0; }
            p { color: #94a3b8; line-height: 1.5; font-size: 14px; }
            a { display: inline-block; margin-top: 16px; padding: 8px 16px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Không tìm thấy bản PDF</h2>
            <p>Bản PDF của báo cáo <strong>${cleanId}</strong> chưa được lưu vào bộ đệm hoặc đã được dọn dẹp khi chuyển sang kỳ mới.</p>
            <p>Số liệu kết quả kinh doanh của doanh nghiệp vẫn được lưu trữ đầy đủ trong Bảng KQKD ValueX.</p>
            <a href="javascript:window.close()">Đóng cửa sổ</a>
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
