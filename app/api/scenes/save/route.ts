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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
        console.log('[SAVE] Authenticated user detected:', user.id);

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

        console.log('[SAVE] Extracted project metadata:', {
          name: projectName,
          thumbnail: thumbnailUrl?.substring(0, 50) + '...',
          short_id: shortId
        });

        // Check if a project with this short_id already exists
        const { data: existingProject, error: findError } = await supabase
          .from('user_projects')
          .select('id')
          .eq('user_id', user.id)
          .eq('short_id', shortId)
          .maybeSingle();

        if (findError) {
          console.error('[SAVE] Error finding existing project:', findError);
          throw findError;
        }

        if (existingProject) {
          // Update existing project
          const { error: updateError } = await supabase
            .from('user_projects')
            .update({
              scene_data: sceneData,
              thumbnail_url: thumbnailUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingProject.id);

          if (updateError) {
            console.error('[SAVE] Error updating project:', updateError);
            throw updateError;
          }

          console.log('[SAVE] ✓ Updated existing project:', existingProject.id);
        } else {
          // Create new project
          const { data: newProject, error: insertError } = await supabase
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
            })
            .select('id')
            .single();

          if (insertError) {
            console.error('[SAVE] Error inserting project:', insertError);
            throw insertError;
          }

          console.log('[SAVE] ✓ Created new project:', newProject.id, 'for user:', user.id);
        }
      } catch (projectError: any) {
        // Log but don't fail the request - scenes table save succeeded
        console.error('[SAVE] ✗ Failed to save to user_projects:', {
          message: projectError.message,
          code: projectError.code,
          details: projectError.details,
          hint: projectError.hint
        });
      }
    } else {
      console.log('[SAVE] No authenticated user - skipping user_projects save');
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
