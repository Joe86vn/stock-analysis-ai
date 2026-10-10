import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { fetchReports, saveReport, deleteReportById } from '@/lib/reports-service';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền truy cập' }, { status: 403 });
    }

    const posts = await fetchReports('all');
    return NextResponse.json({ posts });
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
    const { title, slug, excerpt, content, category, is_vip, pdf_url, id } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Tiêu đề và Slug không được để trống' }, { status: 400 });
    }

    const saved = await saveReport({
      id,
      title,
      slug,
      excerpt,
      content,
      category,
      is_vip: !!is_vip,
      pdf_url: pdf_url || null,
      author: session.user.name || 'Admin',
    });

    return NextResponse.json({ success: true, post: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền truy cập' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu id bài viết' }, { status: 400 });
    }

    const ok = await deleteReportById(id);
    return NextResponse.json({ success: ok });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
