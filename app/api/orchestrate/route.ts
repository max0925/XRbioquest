import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Response type matching the required format
interface OrchestratorResponse {
  reply: string;
  skybox_style: string;
  lighting_color: string;
  channel_state: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are an AI controller for a 3D biology scene. You can control the skybox environment and model parameters based on user requests.

AVAILABLE CONTROLS:

1. Skybox Environment:
   - "skybox_style" - A detailed descriptive prompt for generating a 360° skybox image
   - Must be vivid, atmospheric, and include technical details (8k resolution, lighting, mood)
   - Examples:
     * "Clean modern laboratory with white walls, scientific equipment, fluorescent lighting, professional medical environment, 8k photorealistic"
     * "Deep space with distant galaxies, nebulae clouds, stars twinkling, cosmic dust, infinite void, purple and blue hues, 8k"
     * "Underwater bioluminescent ocean, glowing jellyfish, coral reef, deep blue water, volumetric light rays from surface, mystical atmosphere, 8k"
     * "Toxic wasteland with green radioactive fog, industrial ruins, contaminated ground, eerie green glow, dystopian atmosphere, 8k"

2. Lighting Color:
   - "lighting_color" - A hex color code that matches the mood of the skybox
   - Examples: "#ffffff" (lab), "#8b5cf6" (space), "#06b6d4" (ocean), "#22c55e" (toxic)

3. Model Parameters:
   - "channel_state" (float 0.0 to 1.0) - Controls the ion channel state where 1.0 is fully Open and 0.0 is fully Closed

IMPORTANT INSTRUCTIONS:
- Analyze the user's message and determine appropriate scene settings
- Create vivid, detailed skybox descriptions that match the requested environment
- Choose lighting colors that complement the skybox mood
- If the user asks about cells, membranes, or ion channels, adjust channel_state accordingly
- Provide a helpful, conversational reply explaining what you're doing
- ALWAYS respond in valid JSON format only

You MUST respond with ONLY a JSON object in this exact format:
{
  "reply": "A friendly explanation of what you're adjusting in the scene",
  "skybox_style": "Detailed 360° skybox description with atmosphere, lighting, mood, 8k quality",
  "lighting_color": "#hexcode",
  "channel_state": 0.5
}

Examples:
User: "Open the ion channel"
Response: {"reply": "Opening the ion channel to its fully open state!", "skybox_style": "Clean modern laboratory with white walls, scientific equipment, fluorescent lighting, professional medical environment, 8k photorealistic", "lighting_color": "#ffffff", "channel_state": 1.0}

User: "Show me a toxic environment with partially closed channels"
Response: {"reply": "Switching to a toxic environment and setting channels to 30% open.", "skybox_style": "Toxic wasteland with green radioactive fog, industrial ruins, contaminated ground, eerie green glow, dystopian atmosphere, 8k", "lighting_color": "#22c55e", "channel_state": 0.3}

User: "Take me to space"
Response: {"reply": "Transporting you to a starry space environment!", "skybox_style": "Deep space with distant galaxies, nebulae clouds, stars twinkling, cosmic dust, infinite void, purple and blue hues, 8k photorealistic", "lighting_color": "#8b5cf6", "channel_state": 0.5}`;

export async function POST(request: NextRequest) {
  // Validate API key
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        reply: 'Error: OpenAI API key is not configured. Please set OPENAI_API_KEY in environment variables.',
        skybox_style: 'Clean modern laboratory with white walls, scientific equipment, 8k',
        lighting_color: '#ffffff',
        channel_state: 0.5
      } as OrchestratorResponse,
      { status: 500 }
    );
  }

  try {
    // Parse request body
    const body = await request.json();
    const { message } = body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        {
          reply: 'Error: Please provide a valid message.',
          skybox_style: 'Clean modern laboratory with white walls, scientific equipment, 8k',
          lighting_color: '#ffffff',
          channel_state: 0.5
        } as OrchestratorResponse,
        { status: 400 }
      );
    }

    // Call OpenAI API with JSON mode
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    // Parse AI response
    const rawResponse = completion.choices[0]?.message?.content;
    if (!rawResponse) {
      throw new Error('No response from OpenAI');
    }

    const aiResponse = JSON.parse(rawResponse) as OrchestratorResponse;

    // Validate and sanitize response
    const channel_state = Math.max(0.0, Math.min(1.0, aiResponse.channel_state || 0.5));

    // Validate hex color format
    const hexColorRegex = /^#[0-9A-F]{6}$/i;
    const lighting_color = hexColorRegex.test(aiResponse.lighting_color)
      ? aiResponse.lighting_color
      : '#ffffff';

    const validatedResponse: OrchestratorResponse = {
      reply: aiResponse.reply || 'Scene updated.',
      skybox_style: aiResponse.skybox_style || 'Clean modern laboratory with white walls, scientific equipment, 8k',
      lighting_color,
      channel_state
    };

    return NextResponse.json(validatedResponse, { status: 200 });

  } catch (error: any) {
    console.error('Orchestrator API Error:', error);

    // Return graceful error response in the expected format
    return NextResponse.json(
      {
        reply: `Error: ${error.message || 'An unexpected error occurred. Please try again.'}`,
        skybox_style: 'Clean modern laboratory with white walls, scientific equipment, 8k',
        lighting_color: '#ffffff',
        channel_state: 0.5
      } as OrchestratorResponse,
      { status: 500 }
    );
  }
}
