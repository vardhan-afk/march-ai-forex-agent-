import { NextRequest, NextResponse } from 'next/server';
import { EdgeTTS } from '@andresaya/edge-tts';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const tts = new EdgeTTS();
    // A natural-sounding, deep, JARVIS-appropriate male voice
    await tts.synthesize(text, 'en-US-GuyNeural', {
      rate: '0%',
      pitch: '0Hz',
      volume: '0%',
    });

    const base64Audio = tts.toBase64();

    return NextResponse.json({ audio: base64Audio });
  } catch (err) {
    console.error('Speak API error:', err);
    return NextResponse.json({ error: 'Speech generation failed' }, { status: 500 });
  }
}