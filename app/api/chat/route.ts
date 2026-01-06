import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory conversation storage (use Redis/DB for production)
const conversationMemory = new Map<string, Array<{ role: string; content: string }>>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, conversationId = 'default', history = [] } = body;

    // Get or create conversation history
    const sessionId = conversationId;
    let messages = conversationMemory.get(sessionId) || [];

    // If history provided from frontend, use it
    if (history.length > 0) {
      messages = history;
    }

    // First, check user intent with a quick classification
    const intentCheck = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an intent classifier for a VR lesson creation assistant.

Analyze the user's message and determine if they are:
1. LESSON_REQUEST - Asking to create, design, build, or generate a VR lesson/experience
2. CASUAL_CHAT - Greeting, asking questions, or casual conversation

Respond with ONLY one word: either "LESSON_REQUEST" or "CASUAL_CHAT"

Examples:
- "Hi" → CASUAL_CHAT
- "Hello there" → CASUAL_CHAT
- "What can you do?" → CASUAL_CHAT
- "Create a VR lesson about DNA" → LESSON_REQUEST
- "Design a solar system experience" → LESSON_REQUEST
- "Build a lesson on photosynthesis" → LESSON_REQUEST
- "I want to make a VR classroom about cells" → LESSON_REQUEST`
        },
        { role: 'user', content: input }
      ],
      temperature: 0.3,
      max_tokens: 10
    });

    const intent = intentCheck.choices[0]?.message?.content?.trim() || 'CASUAL_CHAT';
    console.log('Intent detected:', intent);

    if (intent === 'LESSON_REQUEST') {
      // Generate structured lesson plan
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: `You are an expert VR Educational Consultant specializing in immersive learning experiences.

When a teacher requests a VR lesson, provide a comprehensive design that's pedagogically sound and technically feasible.

You MUST respond in strict JSON format with these fields:
{
  "lesson_plan": "Detailed curriculum flow, learning objectives, and lesson structure (2-3 paragraphs)",
  "vr_game_design": "Engaging narrative, game mechanics, interaction design, and student activities (2-3 paragraphs)",
  "skybox_prompt": "A single vivid sentence describing the 360° environment (e.g., 'Inside a human cell with visible organelles floating in cytoplasm, bioluminescent and colorful, educational style')",
  "suggested_assets": [
    { "name": "Asset name", "role": "How it enhances learning" }
  ],
  "pedagogical_foundation": "Educational theories supporting this design (e.g., Constructivism, Experiential Learning, Embodied Cognition) with specific applications (1-2 paragraphs)"
}

Make it creative, engaging, and educationally valuable. All content in professional English.`,
          },
          ...messages.slice(-4), // Include last 2 exchanges for context
          { role: 'user', content: input },
        ],
        temperature: 0.7,
      });

      const rawContent = completion.choices[0]?.message?.content || '{}';
      const lessonData = JSON.parse(rawContent);

      // Add to conversation memory
      messages.push(
        { role: 'user', content: input },
        { role: 'assistant', content: JSON.stringify(lessonData) }
      );
      conversationMemory.set(sessionId, messages.slice(-10)); // Keep last 10 messages

      return NextResponse.json({
        type: 'lesson',
        ...lessonData,
        conversationId: sessionId
      }, { status: 200 });

    } else {
      // Casual conversation
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are BioQuest AI, a friendly and enthusiastic VR education assistant for teachers.

Your personality:
- Warm, encouraging, and passionate about education
- Knowledgeable about VR/AR learning experiences
- Helpful and conversational

Your capabilities:
- Create immersive VR lesson plans for STEM subjects
- Design engaging educational experiences
- Suggest 3D assets and environments
- Provide pedagogical insights

When chatting:
- Be friendly and natural
- Answer questions about what you can do
- Encourage teachers to try creating VR lessons
- Keep responses concise (2-4 sentences)
- Show enthusiasm for education technology

Examples:
User: "Hi"
You: "Hello! 👋 I'm BioQuest AI, your VR lesson creation assistant. I help teachers design amazing immersive learning experiences. What subject would you like to bring to life in VR today?"

User: "What can you help with?"
You: "I can help you create engaging VR lessons for STEM subjects! Just describe what you want to teach - like DNA replication, the solar system, or chemical reactions - and I'll design a complete immersive experience with lesson plans, game mechanics, and 3D assets. Want to try?"`,
          },
          ...messages.slice(-6), // Include last 3 exchanges for context
          { role: 'user', content: input },
        ],
        temperature: 0.8,
        max_tokens: 200
      });

      const response = completion.choices[0]?.message?.content || 'Hello! How can I help you today?';

      // Add to conversation memory
      messages.push(
        { role: 'user', content: input },
        { role: 'assistant', content: response }
      );
      conversationMemory.set(sessionId, messages.slice(-10));

      return NextResponse.json({
        type: 'chat',
        message: response,
        conversationId: sessionId
      }, { status: 200 });
    }

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({
      error: error.message,
      type: 'error'
    }, { status: 500 });
  }
}
