import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Generate a random 6-character short ID for user-facing URLs
function generateShortId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export async function POST(request: NextRequest) {
  console.log("SUPABASE SDK VERSION:", require("@supabase/supabase-js/package.json").version);

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

    // Generate short ID for user-facing URLs
    const shortId = generateShortId();

    // Create Supabase client
    console.log("USING KEY PREFIX:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 16));
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get current user (may be null if not authenticated)
    const { data: { user } } = await supabase.auth.getUser();

    // Insert scene data to database (id is auto-generated UUID, short_id is for URLs)
    const { data, error } = await supabase
      .from('scenes')
      .insert({
        short_id: shortId,
        data: sceneData,
        created_at: new Date().toISOString()
      })
      .select('short_id')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message || 'Failed to save scene to database');
    }

    // If user is authenticated, also save/update in user_projects table
    if (user) {
      try {
        // Extract thumbnail from scene data (environment imagePath)
        let thumbnailUrl: string | null = null;
        let projectName = 'Untitled Project';

        if (sceneData.environment?.imagePath) {
          thumbnailUrl = sceneData.environment.imagePath;
        }

        // Try to generate a meaningful name from environment name or type
        if (sceneData.environment?.name) {
          projectName = sceneData.environment.name;
        } else if (sceneData.environment?.type === 'environment-ai') {
          projectName = 'AI Environment';
        } else if (sceneData.models && sceneData.models.length > 0) {
          projectName = `Scene with ${sceneData.models.length} model${sceneData.models.length !== 1 ? 's' : ''}`;
        }

        // Check if a project with this short_id already exists
        const { data: existingProject } = await supabase
          .from('user_projects')
          .select('id')
          .eq('user_id', user.id)
          .eq('short_id', shortId)
          .maybeSingle();

        if (existingProject) {
          // Update existing project
          await supabase
            .from('user_projects')
            .update({
              scene_data: sceneData,
              thumbnail_url: thumbnailUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingProject.id);

          console.log('[SAVE] Updated existing project:', existingProject.id);
        } else {
          // Create new project
          await supabase
            .from('user_projects')
            .insert({
              user_id: user.id,
              name: projectName,
              short_id: shortId,
              scene_data: sceneData,
              thumbnail_url: thumbnailUrl,
              status: 'draft',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          console.log('[SAVE] Created new project for user:', user.id);
        }
      } catch (projectError: any) {
        // Log but don't fail the request - scenes table save succeeded
        console.error('[SAVE] Failed to save to user_projects:', projectError.message);
      }
    }

    return NextResponse.json({
      success: true,
      id: data.short_id,
      url: `/view/${data.short_id}`
    });

  } catch (error: any) {
    console.error('Save scene error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save scene' },
      { status: 500 }
    );
  }
}
