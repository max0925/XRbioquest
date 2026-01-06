import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Generate a random 6-character ID
function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export async function POST(request: NextRequest) {
  try {
    const sceneData = await request.json();

    // Generate unique ID
    const id = generateId();

    // Save to local file system
    const scenesDir = path.join(process.cwd(), 'public', 'scenes');

    // Create directory if it doesn't exist
    if (!fs.existsSync(scenesDir)) {
      fs.mkdirSync(scenesDir, { recursive: true });
    }

    const filePath = path.join(scenesDir, `${id}.json`);

    // Check if ID already exists (unlikely but handle collision)
    if (fs.existsSync(filePath)) {
      // Try again with new ID
      return POST(request);
    }

    // Save scene data
    fs.writeFileSync(filePath, JSON.stringify(sceneData, null, 2));

    return NextResponse.json({
      success: true,
      id,
      url: `/view/${id}`
    });

  } catch (error: any) {
    console.error('Save scene error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save scene' },
      { status: 500 }
    );
  }
}
