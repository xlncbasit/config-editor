import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { content } = await request.json();
    const filePath = path.join(process.cwd(), 'public', 'config.csv');
    await fs.writeFile(filePath, content, 'utf-8');
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to save configuration' }, 
      { status: 500 }
    );
  }
}