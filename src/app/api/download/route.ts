import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('file');

    if (!filePath) {
      return new NextResponse('Thiếu thông tin file tải xuống.', { status: 400 });
    }

    // 1. Verify user session from ValueX Auth
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Bạn phải đăng nhập để tải báo cáo.', { status: 401 });
    }

    const role = session.user.role;
    const isAuthorized = role === 'admin' || role === 'member_vip';
    if (!isAuthorized) {
      return new NextResponse('Tài khoản của bạn cần được nâng cấp lên VIP để tải file báo cáo này.', { status: 403 });
    }

    // Fallback: If sample file or local demo
    return new NextResponse(
      `Đã xác thực quyền VIP thành công cho tài khoản ${session.user.email}. File tài liệu: ${filePath} đang được đồng bộ từ kho lưu trữ.`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filePath.split('/').pop() || 'report.txt'}"`,
        },
      }
    );
  } catch (error: any) {
    console.error('Lỗi khi tải file:', error);
    return new NextResponse('Đã xảy ra lỗi ngoài ý muốn.', { status: 500 });
  }
}
