import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
// ALLOWED DOMAINS - Whitelist for security (only proxy from trusted sources)
// ═══════════════════════════════════════════════════════════════════════════
const ALLOWED_DOMAINS = [
  // Meshy AI domains (models + textures)
  'assets.meshy.ai',
  'api.meshy.ai',
  'meshy.ai',
  // Google Cloud (Meshy CDN)
  'storage.googleapis.com',
  'storage.cloud.google.com',
  // Blockade Labs (skyboxes) - ALL subdomains
  'blockadelabs.com',
  'backend.blockadelabs.com',      // <-- ADDED: Main API backend
  'cdn.blockadelabs.com',
  'api.blockadelabs.com',
  'skybox.blockadelabs.com',
  'blockadelabs-skybox-uploads.s3.amazonaws.com',
  'blockadelabs-skybox.s3.amazonaws.com',
  'blockadelabs-skybox.s3.us-east-1.amazonaws.com',
  'blockadelabs-skybox.s3.us-west-2.amazonaws.com',
  // AWS S3 (various CDNs)
  's3.amazonaws.com',
  's3.us-west-2.amazonaws.com',
  's3.us-east-1.amazonaws.com',
  // Cloudfront (common CDN)
  'cloudfront.net',
  'd1a370nemizbjq.cloudfront.net', // Blockade Labs Cloudfront
];

// Content type mappings for 3D assets and textures
const CONTENT_TYPES: Record<string, string> = {
  // 3D model formats
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.obj': 'text/plain',
  '.mtl': 'text/plain',
  '.fbx': 'application/octet-stream',
  // Texture formats
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.tga': 'image/x-tga',
  // Environment/HDR maps
  '.hdr': 'image/vnd.radiance',
  '.exr': 'image/x-exr',
  // Compressed textures
  '.ktx': 'image/ktx',
  '.ktx2': 'image/ktx2',
  '.basis': 'application/octet-stream',
};

function getContentType(url: string): string {
  const pathname = new URL(url).pathname.toLowerCase();
  for (const [ext, type] of Object.entries(CONTENT_TYPES)) {
    if (pathname.endsWith(ext)) return type;
  }
  return 'application/octet-stream';
}

function isAllowedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const allowed = ALLOWED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
    if (!allowed) {
      console.warn(`[PROXY] Domain not whitelisted: ${hostname}`);
    }
    return allowed;
  } catch (e) {
    console.error(`[PROXY] Invalid URL for domain check: ${url}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FIX DOUBLE-ENCODING: Decode URL if it appears to be double-encoded
// e.g., %253F should become %3F then ?
// ═══════════════════════════════════════════════════════════════════════════
function fixUrlEncoding(url: string): string {
  let decoded = url;

  // Check for double-encoding patterns (%25 = encoded %)
  // If we see %25, the URL was double-encoded
  if (decoded.includes('%25')) {
    try {
      decoded = decodeURIComponent(decoded);
      console.log(`[PROXY] Fixed double-encoding: ${url.substring(0, 50)}... -> ${decoded.substring(0, 50)}...`);
    } catch (e) {
      // If decoding fails, use original
      console.warn(`[PROXY] Failed to fix double-encoding, using original`);
    }
  }

  return decoded;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
  }

  // Fix double-encoding issues
  url = fixUrlEncoding(url);

  console.log(`[PROXY] Request for: ${url.substring(0, 80)}...`);

  // Security check
  if (!isAllowedDomain(url)) {
    // Log the full hostname for debugging
    try {
      const hostname = new URL(url).hostname;
      console.error(`[PROXY] 403 Forbidden - Domain not in whitelist: ${hostname}`);
      console.error(`[PROXY] Whitelisted domains: ${ALLOWED_DOMAINS.join(', ')}`);
    } catch (e) {
      console.error(`[PROXY] 403 Forbidden - Invalid URL: ${url}`);
    }
    return NextResponse.json(
      { error: 'Domain not allowed for proxying', url: url.substring(0, 100) },
      { status: 403 }
    );
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BioQuest-VR/1.0)',
        'Accept': 'image/*, model/*, application/octet-stream, */*',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });

    if (!response.ok) {
      console.error(`[PROXY] Upstream error ${response.status} for: ${url.substring(0, 80)}`);
      return NextResponse.json(
        { error: `Upstream error: ${response.status}`, url: url.substring(0, 100) },
        { status: response.status }
      );
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || getContentType(url);

    console.log(`[PROXY] ✓ Success: ${buffer.byteLength} bytes, type: ${contentType}`);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.byteLength.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error: any) {
    console.error(`[PROXY] Fetch failed: ${error.message} for ${url.substring(0, 80)}`);
    return NextResponse.json(
      { error: `Proxy failed: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
