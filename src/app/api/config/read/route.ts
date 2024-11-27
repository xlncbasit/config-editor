import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'config.csv');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return NextResponse.json({ content: fileContent });
  } catch {
    return NextResponse.json({ error: 'Failed to read config file' }, { status: 500 });
  }
}