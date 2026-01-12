import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID format (6 alphanumeric characters)
    if (!/^[a-z0-9]{6}$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid scene ID format' },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), 'public', 'scenes', `${id}.json`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    // Read and return scene data
    const sceneData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    return NextResponse.json({
      success: true,
      data: sceneData
    });

  } catch (error: any) {
    console.error('Get scene error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve scene' },
      { status: 500 }
    );
  }
}
