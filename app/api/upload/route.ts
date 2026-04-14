import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file     = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const isVideo  = file.type.startsWith('video/');
    const uploaded = await uploadToCloudinary(buffer, {
      folder:        'draftbox',
      resource_type: isVideo ? 'video' : 'image',
    });

    return NextResponse.json({
      url:      uploaded.url,
      publicId: uploaded.publicId,
      type:     isVideo ? 'VIDEO' : 'IMAGE',
    });
  } catch (err) {
    console.error('[UPLOAD]', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}