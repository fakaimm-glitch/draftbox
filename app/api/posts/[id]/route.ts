import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  content:  z.string().min(1).max(2000).optional(),
  status:   z.enum(['DRAFT', 'READY', 'PUBLISHED']).optional(),
  platform: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || post.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body   = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const updated = await prisma.post.update({
      where: { id },
      data:  {
        ...parsed.data,
        publishedAt: parsed.data.status === 'PUBLISHED' ? new Date() : undefined,
      },
      include: { media: true },
    });

    return NextResponse.json({ post: updated });
  } catch (err) {
    console.error('[POSTS PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || post.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.post.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POSTS DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}