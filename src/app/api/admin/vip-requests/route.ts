import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllVipRequests, approveVipRequest, rejectVipRequest } from '@/lib/vip-requests-store';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền truy cập' }, { status: 403 });
    }

    const requests = getAllVipRequests();
    return NextResponse.json({ requests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền truy cập' }, { status: 403 });
    }

    const body = await req.json();
    const { requestId, action } = body;

    if (!requestId || !action) {
      return NextResponse.json({ error: 'Thiếu thông tin requestId hoặc action' }, { status: 400 });
    }

    if (action === 'approve') {
      const ok = await approveVipRequest(requestId);
      return NextResponse.json({ success: ok });
    } else if (action === 'reject') {
      const ok = await rejectVipRequest(requestId);
      return NextResponse.json({ success: ok });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
