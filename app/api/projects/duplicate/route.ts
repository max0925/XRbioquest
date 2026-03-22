import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
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

    // Fetch the original project
    const { data: originalProject, error: fetchError } = await supabase
      .from('user_projects')
      .select('name, scene_data, thumbnail_url, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !originalProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Create duplicate with " (Copy)" suffix
    const { data: newProject, error: insertError } = await supabase
      .from('user_projects')
      .insert({
        user_id: user.id,
        name: `${originalProject.name} (Copy)`,
        scene_data: originalProject.scene_data,
        thumbnail_url: originalProject.thumbnail_url,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      id: newProject.id
    });
  } catch (error: any) {
    console.error('[DUPLICATE] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to duplicate project' },
      { status: 500 }
    );
  }
}
