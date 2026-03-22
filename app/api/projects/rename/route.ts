import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const { id, name } = await req.json();

    if (!id || !name || !name.trim()) {
      return NextResponse.json(
        { error: 'Project ID and name are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Update project name
    const { error } = await supabase
      .from('user_projects')
      .update({
        name: name.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id); // Ensure user owns the project

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[RENAME] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rename project' },
      { status: 500 }
    );
  }
}
