import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Normalize MIME type to supported formats
function normalizeMimeType(contentType: string): string {
  // Convert image/jpg to standard image/jpeg
  if (contentType === 'image/jpg') {
    return 'image/jpeg';
  }
  // Only allow image/jpeg and image/png
  if (contentType === 'image/jpeg' || contentType === 'image/png') {
    return contentType;
  }
  // Default to image/jpeg for unknown types
  return 'image/jpeg';
}

// Upload skybox image to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    // Parse FormData with image blob
    const formData = await request.formData();
    const imageBlob = formData.get('image') as Blob;
    const skyboxId = formData.get('skyboxId') as string;
    const rawContentType = formData.get('contentType') as string || 'image/jpeg';
    const contentType = normalizeMimeType(rawContentType);

    if (!imageBlob) {
      return NextResponse.json(
        { error: 'Image blob is required' },
        { status: 400 }
      );
    }

    if (!skyboxId) {
      return NextResponse.json(
        { error: 'Skybox ID is required' },
        { status: 400 }
      );
    }

    if (rawContentType !== contentType) {
      console.log(`[SKYBOX UPLOAD] Normalized MIME type: ${rawContentType} → ${contentType}`);
    }
    console.log(`[SKYBOX UPLOAD] Received image blob: ${imageBlob.size} bytes, type: ${contentType}`);

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase environment variables not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Convert Blob to ArrayBuffer for Supabase upload
    const imageBuffer = await imageBlob.arrayBuffer();

    // Determine file extension from content type
    const extension = contentType.includes('png') ? 'png' : 'jpg';
    const fileName = `skybox-${skyboxId}-${Date.now()}.${extension}`;

    console.log(`[SKYBOX UPLOAD] Uploading to Supabase Storage: ${fileName}`);

    // Upload to Supabase Storage (public bucket: "skyboxes")
    const { data, error } = await supabase.storage
      .from('skyboxes')
      .upload(fileName, imageBuffer, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('[SKYBOX UPLOAD] Supabase upload error:', error);
      return NextResponse.json(
        { error: `Failed to upload to Supabase Storage: ${error.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('skyboxes')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;
    console.log(`[SKYBOX UPLOAD] ✓ Upload complete: ${publicUrl}`);

    return NextResponse.json({
      success: true,
      publicUrl: publicUrl,
      fileName: fileName
    });

  } catch (error: any) {
    console.error('[SKYBOX UPLOAD] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload skybox image' },
      { status: 500 }
    );
  }
}
