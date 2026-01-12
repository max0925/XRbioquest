import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    // Check Supabase configuration
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: "Supabase credentials missing" }, { status: 500 });
    }

    const sceneData = await request.json();

    // Generate unique ID
    const id = generateId();

    // Create Supabase client
    const supabase = await createClient();

    // Upsert scene data to database
    const { data, error } = await supabase
      .from('scenes')
      .upsert({
        id,
        data: sceneData,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message || 'Failed to save scene to database');
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      url: `/view/${data.id}`
    });

  } catch (error: any) {
    console.error('Save scene error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save scene' },
      { status: 500 }
    );
  }
}
