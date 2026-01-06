import { NextRequest, NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

const SKETCHFAB_API_KEY = "61a9131ca9dc4805a0a2005c693d7820";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelUid, modelName } = body;

    if (!modelUid) {
      return NextResponse.json({ error: 'Model UID is required' }, { status: 400 });
    }

    // Step 1: Get download URL from Sketchfab API
    const downloadResponse = await fetch(
      `https://api.sketchfab.com/v3/models/${modelUid}/download`,
      {
        headers: {
          'Authorization': `Token ${SKETCHFAB_API_KEY}`,
        },
      }
    );

    if (!downloadResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get download URL. Model may not be downloadable.' },
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
    const zipBuffer = Buffer.from(await zipResponse.arrayBuffer());

    // Step 3: Extract ZIP using adm-zip
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    // Step 4: Find the .glb or .gltf file
    let modelFile = zipEntries.find(entry =>
      entry.entryName.toLowerCase().endsWith('.glb') && !entry.isDirectory
    );

    if (!modelFile) {
      modelFile = zipEntries.find(entry =>
        entry.entryName.toLowerCase().endsWith('.gltf') && !entry.isDirectory
      );
    }

    if (!modelFile) {
      return NextResponse.json(
        { error: 'No .glb or .gltf file found in downloaded archive' },
        { status: 400 }
      );
    }

    // Step 5: Create safe filename from model name
    const sanitizedName = (modelName || modelUid)
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .substring(0, 50);

    const fileExtension = path.extname(modelFile.entryName);
    const newFileName = `${sanitizedName}_${Date.now()}${fileExtension}`;

    // Step 6: Save to public/temp_models/
    const publicDir = path.join(process.cwd(), 'public', 'temp_models');

    // Ensure directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const outputPath = path.join(publicDir, newFileName);
    const fileBuffer = modelFile.getData();

    fs.writeFileSync(outputPath, fileBuffer);

    // Step 7: Return the public URL path
    const publicUrl = `/temp_models/${newFileName}`;

    return NextResponse.json({
      success: true,
      modelPath: publicUrl,
      fileName: newFileName,
      originalName: modelName,
    });

  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download and process model' },
      { status: 500 }
    );
  }
}
