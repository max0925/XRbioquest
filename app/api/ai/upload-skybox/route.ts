import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

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
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;

  // Validate request origin — only allow internal API calls (same-origin or server-side)
  const referer = request.headers.get('referer');
  const origin = request.headers.get('origin');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  if (origin && siteUrl && !origin.startsWith(siteUrl)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Parse FormData with image blob
    const formData = await request.formData();
    const imageBlob = formData.get('image');
    const skyboxId = formData.get('skyboxId');
    const rawContentType = formData.get('contentType') as string || 'image/jpeg';
    const contentType = normalizeMimeType(rawContentType);

    if (!(imageBlob instanceof Blob) || imageBlob.size === 0 || imageBlob.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: imageBlob instanceof Blob && imageBlob.size > MAX_IMAGE_BYTES ? 'Image is too large' : 'Image blob is required' },
        { status: imageBlob instanceof Blob && imageBlob.size > MAX_IMAGE_BYTES ? 413 : 400 }
      );
    }

    if (typeof skyboxId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(skyboxId)) {
      return NextResponse.json(
        { error: 'Skybox ID is required' },
        { status: 400 }
      );
    }

    if (rawContentType !== contentType) {
      console.log(`[SKYBOX UPLOAD] Normalized MIME type: ${rawContentType} → ${contentType}`);
    }
    console.log(`[SKYBOX UPLOAD] Received image blob: ${imageBlob.size} bytes, type: ${contentType}`);

    const { user, supabase } = auth.context;

    // Convert Blob to ArrayBuffer for Supabase upload
    const imageBuffer = await imageBlob.arrayBuffer();

    // Determine file extension from content type
    const extension = contentType.includes('png') ? 'png' : 'jpg';
    const fileName = `${user.id}/skybox-${skyboxId}-${Date.now()}.${extension}`;

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
        { error: 'Failed to upload skybox image' },
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
      { error: 'Failed to upload skybox image' },
      { status: 500 }
    );
  }
}
