import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    // Call Blockade Labs API for skybox generation
    const response = await fetch('https://backend.blockadelabs.com/api/v1/skybox', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.BLOCKADE_LABS_API_KEY!
      },
      body: JSON.stringify({
        prompt: prompt,
        generator: 'stable-skybox',
      }),
    });

    const data = await response.json();

    // Return task information with id for frontend polling
    // Skybox generation takes ~20 seconds, frontend needs to poll for completion
    console.log(`[SKYBOX] ✓ Generation started - ID: ${data.id}`);

    return NextResponse.json({ id: data.id, status: data.status });
  } catch (error) {
    return NextResponse.json({ error: 'Skybox trigger failed' }, { status: 500 });
  }
}