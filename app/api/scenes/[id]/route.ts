import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check Supabase configuration
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: "Supabase credentials missing" }, { status: 500 });
    }

    const { id } = await params;

    // Validate ID format (6 alphanumeric characters)
    if (!/^[a-z0-9]{6}$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid scene ID format' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Fetch scene from database by short_id
    const { data, error } = await supabase
      .from('scenes')
      .select('data')
      .eq('short_id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.data
    });

  } catch (error: any) {
    console.error('Get scene error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve scene' },
      { status: 500 }
    );
  }
}
