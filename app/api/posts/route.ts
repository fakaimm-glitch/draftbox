import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
  content: z.string().min(1).max(2000),
  status:  z.enum(['DRAFT', 'READY']).default('DRAFT'),
  media:   z.array(z.object({
    url:      z.string().url(),
    publicId: z.string().optional(),
    type:     z.enum(['IMAGE', 'VIDEO']),
  })).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const posts = await prisma.post.findMany({
      where:   { userId: session.user.id! },
      include: { media: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ posts });
  } catch (err) {
    console.error('[POSTS GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body   = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { content, status, media } = parsed.data;

    const post = await prisma.post.create({
      data: {
        content,
        status,
        userId: session.user.id!,
        media: media ? {
          create: media.map((m) => ({
            url:      m.url,
            publicId: m.publicId,
            type:     m.type,
          })),
        } : undefined,
      },
      include: { media: true },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    console.error('[POSTS POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}