import { NextRequest, NextResponse } from 'next/server';

// Blockade Labs Skybox AI API
const BLOCKADE_API_KEY = process.env.BLOCKADE_API_KEY || '';
const BLOCKADE_API_URL = 'https://backend.blockadelabs.com/api/v1/skybox';

// Debug: Log API key status (first 10 chars only for security)
if (BLOCKADE_API_KEY) {
  console.log('✅ Using Blockade API Key:', BLOCKADE_API_KEY.substring(0, 10) + '...');
} else {
  console.warn('⚠️ BLOCKADE_API_KEY not found in environment variables');
}

// Poll for skybox generation status
async function pollSkyboxStatus(skyboxId: number): Promise<any> {
  const maxAttempts = 60; // 5 minutes max (5 seconds per attempt)
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(`https://backend.blockadelabs.com/api/v1/imagine/requests/${skyboxId}`, {
      method: 'GET',
      headers: {
        'x-api-key': BLOCKADE_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Poll request failed (${response.status}):`, errorText);
      throw new Error(`Failed to check status: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // 修复：从 data.request 中获取状态（如果存在）
    const requestData = data.request || data;
    const status = requestData.status;

    console.log(`🔄 Poll attempt ${attempts + 1}: Status = ${status}, Queue = ${requestData.queue_position || 'N/A'}`);

    if (status === 'complete') {
      console.log('✅ Generation complete!');
      return requestData;
    } else if (status === 'error' || status === 'abort') {
      const errorMsg = requestData.error_message || requestData.message || 'Unknown error';
      throw new Error(`Skybox generation failed: ${errorMsg}`);
    }

    // Wait 5 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error('Skybox generation timeout (exceeded 5 minutes)');
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!BLOCKADE_API_KEY) {
      return NextResponse.json(
        { error: 'Blockade Labs API key not configured' },
        { status: 500 }
      );
    }

    console.log('🎨 Generating AI skybox with prompt:', prompt);

    // Step 1: Initiate skybox generation
    const generateResponse = await fetch(BLOCKADE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BLOCKADE_API_KEY,
      },
      body: JSON.stringify({
        prompt: prompt,
        skybox_style_id: 37, // 'Netrunner' style - you can make this configurable
      }),
    });

    console.log('📡 Response status:', generateResponse.status);
    const responseText = await generateResponse.text();
    console.log('📡 Response body:', responseText.substring(0, 300) + '...');

    if (!generateResponse.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`API request failed (${generateResponse.status}): ${responseText}`);
      }
      throw new Error(errorData.error || errorData.message || 'Failed to generate skybox');
    }

    const generateData = JSON.parse(responseText);
    const skyboxId = generateData.id;

    if (!skyboxId) {
      console.error('❌ No ID in response:', generateData);
      throw new Error('Failed to get skybox ID from response');
    }

    console.log('🔄 Skybox generation started, ID:', skyboxId);

    // Step 2: Poll for completion
    const completedSkybox = await pollSkyboxStatus(skyboxId);

    console.log('✅ Skybox generation complete!');

    // Step 3: Get the image URL directly (no local download)
    const imageUrl = completedSkybox.file_url || completedSkybox.thumb_url;

    if (!imageUrl) {
      throw new Error('No image URL found in response');
    }

    return NextResponse.json({
      success: true,
      imagePath: imageUrl,
      prompt: prompt,
      skyboxId: skyboxId
    });

  } catch (error: any) {
    console.error('❌ AI generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate AI environment' },
      { status: 500 }
    );
  }
}
