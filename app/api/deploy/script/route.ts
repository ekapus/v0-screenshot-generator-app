import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const scriptPath = join(process.cwd(), 'scripts', 'deploy-template.sh');
    const scriptContent = readFileSync(scriptPath, 'utf-8');

    return new NextResponse(scriptContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="deploy.sh"',
      },
    });
  } catch (error) {
    console.error('Error reading deployment script:', error);
    return NextResponse.json(
      { error: 'Failed to read deployment script' },
      { status: 500 }
    );
  }
}
