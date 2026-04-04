import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 30;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  let body: {
    message?: string;
    npcPersona?: string;
    currentPhaseTitle?: string;
    currentPhaseInstruction?: string;
    knowledgeContext?: string;
    history?: ChatHistoryItem[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    message,
    npcPersona,
    currentPhaseTitle,
    currentPhaseInstruction,
    knowledgeContext,
    history = [],
  } = body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const systemPrompt = [
    npcPersona ?? 'You are a friendly biology guide helping students explore a virtual cell.',
    '',
    'CURRENT GAME CONTEXT:',
    `Phase: ${currentPhaseTitle ?? 'Unknown'}`,
    `Task: ${currentPhaseInstruction ?? ''}`,
    knowledgeContext ? `Background knowledge: ${knowledgeContext}` : '',
    '',
    'STRICT RULES:',
    '- Reply in 1–2 sentences maximum. Be brief.',
    '- Give hints and analogies — never give the direct answer.',
    '- Stay in character. Be warm, enthusiastic, and encouraging.',
    '- If asked something off-topic, gently redirect to the current task.',
  ]
    .filter(Boolean)
    .join('\n');

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    // Keep last 4 exchanges for context (8 messages)
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message.trim() },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 120,
      temperature: 0.75,
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ??
      "Hmm, I'm not sure about that — keep exploring and you'll figure it out!";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error('[npc-chat] OpenAI error:', err.message);
    return NextResponse.json(
      { error: 'AI request failed', details: err.message },
      { status: 502 }
    );
  }
}
