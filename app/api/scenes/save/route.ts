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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Debug: Log environment variable status (safe info only)
    console.log('=== Supabase Config Debug ===');
    console.log('URL exists:', !!supabaseUrl);
    console.log('URL length:', supabaseUrl?.length || 0);
    console.log('URL preview:', supabaseUrl?.substring(0, 30) || 'undefined');
    console.log('Key exists:', !!supabaseKey);
    console.log('Key length:', supabaseKey?.length || 0);
    console.log('Key preview:', supabaseKey?.substring(0, 10) + '...' || 'undefined');
    console.log('=============================');

    // Validate Supabase configuration
    const isUrlValid = supabaseUrl && supabaseUrl.length > 20 && supabaseUrl.includes('supabase');
    const isKeyValid = supabaseKey && supabaseKey.length > 30;

    if (!isUrlValid || !isKeyValid) {
      console.error('Supabase configuration is invalid or missing');
      return NextResponse.json({
        error: "Supabase configuration is invalid or missing in Vercel",
        debug: {
          urlExists: !!supabaseUrl,
          urlLength: supabaseUrl?.length || 0,
          urlValid: isUrlValid,
          keyExists: !!supabaseKey,
          keyLength: supabaseKey?.length || 0,
          keyValid: isKeyValid
        }
      }, { status: 500 });
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
