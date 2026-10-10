import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createVipRequest, getUserVipRequest } from '@/lib/vip-requests-store';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const request = getUserVipRequest(session.user.id);
    return NextResponse.json({ request });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await req.json();
    const { phoneContact, note } = body;

    if (!phoneContact || typeof phoneContact !== 'string') {
      return NextResponse.json({ error: 'Vui lòng cung cấp số điện thoại liên hệ' }, { status: 400 });
    }

    const request = await createVipRequest(
      session.user.id,
      session.user.email,
      phoneContact.trim(),
      note?.trim() || '',
      session.user.name || ''
    );

    return NextResponse.json({ success: true, request });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
