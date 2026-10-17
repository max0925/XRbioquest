import { NextRequest, NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { requireApiUser } from '@/lib/api/auth';

const SKETCHFAB_API_KEY = process.env.SKETCHFAB_API_TOKEN || '';

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;

  try {
    const body = await request.json();
    const { uid, name } = body;

    if (typeof uid !== 'string' || !/^[a-zA-Z0-9]{1,64}$/.test(uid)) {
      return NextResponse.json({ error: 'Model UID is required' }, { status: 400 });
    }

    if (!SKETCHFAB_API_KEY) {
      return NextResponse.json({ error: 'Sketchfab API token not configured' }, { status: 500 });
    }

    // Check if already imported
    const importDir = path.join(process.cwd(), 'public', 'imports', uid);
    if (fs.existsSync(importDir)) {
      // Model already imported, find and return the .glb/.gltf file
      const files = fs.readdirSync(importDir, { recursive: true }) as string[];
      const modelFile = files.find(f => f.toLowerCase().endsWith('.glb') || f.toLowerCase().endsWith('.gltf'));

      if (modelFile) {
        return NextResponse.json({
          success: true,
          modelPath: `/imports/${uid}/${modelFile}`,
          cached: true,
          modelName: name,
        });
      }
    }

    // Step 1: Get download URL from Sketchfab API
    const downloadResponse = await fetch(
      `https://api.sketchfab.com/v3/models/${uid}/download`,
      {
        headers: {
          'Authorization': `Token ${SKETCHFAB_API_KEY}`,
        },
      }
    );

    if (!downloadResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get download URL. Model may not be downloadable or you may not have permission.' },
        { status: 400 }
      );
    }

    const downloadData = await downloadResponse.json();

    // Find the gltf format download link
    const gltfDownload = downloadData.gltf?.url || downloadData.source?.url;

    if (!gltfDownload) {
      return NextResponse.json(
        { error: 'No downloadable GLTF format found for this model' },
        { status: 400 }
      );
    }

    // Step 2: Download the ZIP file
    const zipResponse = await fetch(gltfDownload);

    if (!zipResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to download model file' },
        { status: 500 }
      );
    }

    const contentLength = Number(zipResponse.headers.get('content-length') || 0);
    if (contentLength > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'Model archive is too large' }, { status: 413 });
    }
    const zipBuffer = Buffer.from(await zipResponse.arrayBuffer());
    if (zipBuffer.byteLength > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'Model archive is too large' }, { status: 413 });
    }

    // Step 3: Extract ZIP to public/imports/[uid]/
    const zip = new AdmZip(zipBuffer);

    // Reject zip-slip paths before extraction.
    const unsafeEntry = zip.getEntries().some((entry) => {
      const destination = path.resolve(importDir, entry.entryName);
      return entry.entryName.includes('\0') || !destination.startsWith(`${path.resolve(importDir)}${path.sep}`);
    });
    if (unsafeEntry) {
      return NextResponse.json({ error: 'Invalid model archive' }, { status: 400 });
    }

    // Create directory for this model
    if (!fs.existsSync(importDir)) {
      fs.mkdirSync(importDir, { recursive: true });
    }

    // Extract all files to preserve folder structure
    zip.extractAllTo(importDir, true);

    // Step 4: Find the main .glb or .gltf file
    const extractedFiles = fs.readdirSync(importDir, { recursive: true }) as string[];

    let modelFile = extractedFiles.find(file =>
      file.toLowerCase().endsWith('.glb') && !file.includes('/')
    );

    if (!modelFile) {
      modelFile = extractedFiles.find(file =>
        file.toLowerCase().endsWith('.glb')
      );
    }

    if (!modelFile) {
      modelFile = extractedFiles.find(file =>
        file.toLowerCase().endsWith('.gltf') && !file.includes('/')
      );
    }

    if (!modelFile) {
      modelFile = extractedFiles.find(file =>
        file.toLowerCase().endsWith('.gltf')
      );
    }

    if (!modelFile) {
      return NextResponse.json(
        { error: 'No .glb or .gltf file found in downloaded archive' },
        { status: 400 }
      );
    }

    // Step 5: Return the public URL path
    const publicUrl = `/imports/${uid}/${modelFile}`;

    return NextResponse.json({
      success: true,
      modelPath: publicUrl,
      cached: false,
      modelName: name,
      uid: uid,
    });

  } catch (error: any) {
    console.error('Import failed');
    return NextResponse.json(
      { error: 'Failed to import model' },
      { status: 500 }
    );
  }
}
