import { NextRequest, NextResponse } from 'next/server';
import { processAiMessage } from '@/lib/ai-assistant';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { message, imageBase64, mimeType } = body;

    if (!message && !imageBase64) {
      return NextResponse.json(
        { error: 'Pesan teks atau gambar harus disediakan' },
        { status: 400 }
      );
    }

    const result = await processAiMessage({
      text: message,
      imageBase64,
      imageMimeType: mimeType || 'image/jpeg',
      source: 'web',
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API /api/ai/chat error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

