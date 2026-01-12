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
  // Check variables at the very beginning
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Log status (safe - only length and first 5 chars of URL)
  console.log('=== Supabase Debug ===');
  console.log('NEXT_PUBLIC_SUPABASE_URL defined:', !!supabaseUrl);
  console.log('NEXT_PUBLIC_SUPABASE_URL first 5 chars:', supabaseUrl?.substring(0, 5) || 'N/A');
  console.log('NEXT_PUBLIC_SUPABASE_URL length:', supabaseUrl?.length || 0);
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY defined:', !!supabaseKey);
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY length:', supabaseKey?.length || 0);
  console.log('======================');

  // Validation: Check if variables are missing or too short
  const urlMissing = !supabaseUrl || supabaseUrl.length < 20;
  const keyMissing = !supabaseKey || supabaseKey.length < 30;

  if (urlMissing || keyMissing) {
    console.error('Supabase env vars missing or invalid:', { urlMissing, keyMissing });
    return NextResponse.json({
      error: "Supabase environment variables are missing or invalid in Vercel",
      details: {
        NEXT_PUBLIC_SUPABASE_URL: {
          defined: !!supabaseUrl,
          length: supabaseUrl?.length || 0,
          valid: !urlMissing
        },
        NEXT_PUBLIC_SUPABASE_ANON_KEY: {
          defined: !!supabaseKey,
          length: supabaseKey?.length || 0,
          valid: !keyMissing
        }
      }
    }, { status: 500 });
  }

  try {

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
