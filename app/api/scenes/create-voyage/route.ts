import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireApiUser } from '@/lib/api/auth';

// ═══════════════════════════════════════════════════════════════════════════
// VOYAGE INSIDE THE CELL - Demo Scene Generator
// Creates a pre-configured VR biology lesson with Sketchfab models + AI skybox
// ═══════════════════════════════════════════════════════════════════════════

// Sketchfab model UIDs (free downloadable CC models)
const MODELS = {
  GLUCOSE: {
    uid: '10659ca1502c4ade88abba6284bb50f2',
    name: 'Glucose Molecule',
    position: { x: 1.5, y: 2, z: -2 },
  },
  GOLGI: {
    uid: 'f9a893dac37e43a487bc92e7f828db50',
    name: 'Golgi Apparatus',
    position: { x: -3, y: 1.5, z: -5 },
  },
  ENDOPLASMIC_RETICULUM: {
    uid: 'cd27ea87988348faa351ae2b7237e1d9',
    name: 'Endoplasmic Reticulum',
    position: { x: 0, y: 1, z: -6 },
  },
  LYSOSOME: {
    uid: '6bd2957542ae4625aa0dcd180d979f9b',
    name: 'Lysosome',
    position: { x: 2, y: 1, z: -4 },
  },
  MITOCHONDRIA: {
    uid: '397631a85faa487ba1f1cc4fe5e1b7e3',
    name: 'Mitochondria',
    position: { x: -2, y: 1, z: -4 },
  },
};

const SKYBOX_PROMPT = "Interior of a living animal cell, bioluminescent organelles floating in cytoplasm, deep teal and purple glowing fluid, microscopic sci-fi world, photorealistic, 8K, volumetric light rays, alien underwater atmosphere";

// Generate a random 6-character short ID for scene URLs
function generateShortId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// ─── Step 1: Generate AI Skybox ─────────────────────────────────────────────
async function generateSkybox(origin: string, cookie: string): Promise<string> {
  console.log('[VOYAGE] 🌌 Generating skybox via /api/generate-skybox...');

  const res = await fetch(`${origin}/api/generate-skybox`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ prompt: SKYBOX_PROMPT }),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(`Skybox generation failed: ${errData.error}`);
  }

  const data = await res.json();
  console.log(`[VOYAGE] 🎉 Skybox complete: ${data.file_url}`);

  return data.file_url;
}

// ─── Step 2: Upload Skybox to Supabase Storage ─────────────────────────────
async function uploadSkyboxToSupabase(skyboxUrl: string, origin: string, cookie: string): Promise<string> {
  console.log('[VOYAGE] 📤 Downloading skybox from Blockade Labs...');

  // Fetch the skybox image
  const imageRes = await fetch(skyboxUrl);
  if (!imageRes.ok) {
    throw new Error('Failed to download skybox image from Blockade Labs');
  }

  const imageBlob = await imageRes.blob();
  const contentType = imageRes.headers.get('content-type') || 'image/jpeg';

  console.log(`[VOYAGE] ✓ Downloaded ${imageBlob.size} bytes, type: ${contentType}`);

  // Prepare FormData for upload
  const formData = new FormData();
  formData.append('image', imageBlob);
  formData.append('skyboxId', 'voyage-cell');
  formData.append('contentType', contentType);

  console.log('[VOYAGE] 📤 Uploading to Supabase Storage via /api/ai/upload-skybox...');

  // Call our upload endpoint
  const uploadRes = await fetch(`${origin}/api/ai/upload-skybox`, {
    method: 'POST',
    headers: { cookie },
    body: formData,
  });

  if (!uploadRes.ok) {
    const errData = await uploadRes.json();
    throw new Error(`Skybox upload failed: ${errData.error}`);
  }

  const uploadData = await uploadRes.json();
  console.log(`[VOYAGE] ✓ Skybox uploaded: ${uploadData.publicUrl}`);

  return uploadData.publicUrl;
}

// ─── Step 3: Import Sketchfab Models ────────────────────────────────────────
async function importSketchfabModel(uid: string, name: string, origin: string, cookie: string): Promise<string> {
  console.log(`[VOYAGE] 📦 Importing ${name}...`);

  const res = await fetch(`${origin}/api/assets/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ uid, name }),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(`Failed to import ${name}: ${errData.error}`);
  }

  const data = await res.json();
  console.log(`[VOYAGE] ✓ ${name} imported: ${data.modelPath}`);

  return data.modelPath;
}

// ─── Step 4: Assemble Scene Data ────────────────────────────────────────────
async function assembleScene(skyboxUrl: string, modelPaths: Record<string, string>) {
  return {
    environment: {
      type: 'environment-ai',
      imagePath: skyboxUrl,
      rotation: { x: 0, y: 0, z: 0 },
    },
    models: [
      {
        uid: crypto.randomUUID(),
        name: 'Mitochondria',
        modelPath: modelPaths.MITOCHONDRIA,
        position: { x: -1.5, y: 0, z: -3 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
        interactionFX: {
          grabbable: true,
          glowPulse: false,
          collisionTrigger: false,
        },
      },
      {
        uid: crypto.randomUUID(),
        name: 'Lysosome',
        modelPath: modelPaths.LYSOSOME,
        position: { x: 1.5, y: 0, z: -3 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
        interactionFX: {
          grabbable: true,
          glowPulse: false,
          collisionTrigger: false,
        },
      },
      {
        uid: crypto.randomUUID(),
        name: 'Endoplasmic Reticulum',
        modelPath: modelPaths.ENDOPLASMIC_RETICULUM,
        position: { x: 0, y: 0, z: -4.5 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
        interactionFX: {
          grabbable: true,
          glowPulse: false,
          collisionTrigger: false,
        },
      },
      {
        uid: crypto.randomUUID(),
        name: 'Golgi Apparatus',
        modelPath: modelPaths.GOLGI,
        position: { x: -3, y: 0, z: -4 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
        interactionFX: {
          grabbable: true,
          glowPulse: false,
          collisionTrigger: false,
        },
      },
      {
        uid: crypto.randomUUID(),
        name: 'Glucose Molecule',
        modelPath: modelPaths.GLUCOSE,
        position: { x: 2.5, y: 0, z: -2.5 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
        interactionFX: {
          grabbable: true,
          glowPulse: false,
          collisionTrigger: false,
        },
      },
    ],
  };
}

// ─── Step 5: Save Scene to Supabase ─────────────────────────────────────────
async function saveSceneToSupabase(sceneData: any): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Validate Supabase env vars
  const urlMissing = !supabaseUrl || supabaseUrl.length < 20;
  const keyMissing = !supabaseKey || supabaseKey.length < 30;

  if (urlMissing || keyMissing) {
    console.error('[VOYAGE] Supabase env vars missing or invalid:', { urlMissing, keyMissing });
    throw new Error('Supabase environment variables are missing or invalid');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const shortId = generateShortId();

  console.log(`[VOYAGE] 💾 Saving scene to Supabase with short_id: ${shortId}`);

  const { data, error } = await supabase
    .from('scenes')
    .insert({
      short_id: shortId,
      data: sceneData,
      created_at: new Date().toISOString(),
    })
    .select('short_id')
    .single();

  if (error) {
    console.error('[VOYAGE] Supabase insert error:', error);
    throw new Error(`Failed to save scene to Supabase: ${error.message}`);
  }

  console.log(`[VOYAGE] ✓ Scene saved successfully: /view/${data.short_id}`);
  return data.short_id;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;

  const origin = request.nextUrl.origin;
  const cookie = request.headers.get('cookie') || '';
  console.log('[VOYAGE] 🚀 Starting "Voyage Inside the Cell" scene generation...');
  console.log(`[VOYAGE] Origin: ${origin}`);

  let skyboxUrl: string | null = null;
  let skyboxStorageUrl: string | null = null;
  const modelPaths: Record<string, string> = {};

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Generate AI Skybox
    // ═══════════════════════════════════════════════════════════════════════
    console.log('[VOYAGE] ──── STEP 1: Generating skybox ────');
    try {
      skyboxUrl = await generateSkybox(origin, cookie);
    } catch (error: any) {
      console.error('[VOYAGE] ❌ Step 1 failed:', error.message);
      throw new Error(`Skybox generation failed: ${error.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Upload Skybox to Supabase Storage
    // ═══════════════════════════════════════════════════════════════════════
    console.log('[VOYAGE] ──── STEP 2: Uploading skybox to Supabase ────');
    try {
      skyboxStorageUrl = await uploadSkyboxToSupabase(skyboxUrl, origin, cookie);
    } catch (error: any) {
      console.error('[VOYAGE] ❌ Step 2 failed:', error.message);
      throw new Error(`Skybox upload failed: ${error.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Import All Sketchfab Models (Sequential)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('[VOYAGE] ──── STEP 3: Importing 5 models sequentially ────');

    try {
      modelPaths.GLUCOSE = await importSketchfabModel(MODELS.GLUCOSE.uid, MODELS.GLUCOSE.name, origin, cookie);
    } catch (error: any) {
      console.error('[VOYAGE] ❌ Failed to import Glucose:', error.message);
      throw new Error(`Glucose import failed: ${error.message}`);
    }

    try {
      modelPaths.GOLGI = await importSketchfabModel(MODELS.GOLGI.uid, MODELS.GOLGI.name, origin, cookie);
    } catch (error: any) {
      console.error('[VOYAGE] ❌ Failed to import Golgi:', error.message);
      throw new Error(`Golgi import failed: ${error.message}`);
    }

    try {
      modelPaths.ENDOPLASMIC_RETICULUM = await importSketchfabModel(MODELS.ENDOPLASMIC_RETICULUM.uid, MODELS.ENDOPLASMIC_RETICULUM.name, origin, cookie);
    } catch (error: any) {
      console.error('[VOYAGE] ❌ Failed to import Endoplasmic Reticulum:', error.message);
      throw new Error(`Endoplasmic Reticulum import failed: ${error.message}`);
    }

    try {
      modelPaths.LYSOSOME = await importSketchfabModel(MODELS.LYSOSOME.uid, MODELS.LYSOSOME.name, origin, cookie);
    } catch (error: any) {
      console.error('[VOYAGE] ❌ Failed to import Lysosome:', error.message);
      throw new Error(`Lysosome import failed: ${error.message}`);
    }

    try {
      modelPaths.MITOCHONDRIA = await importSketchfabModel(MODELS.MITOCHONDRIA.uid, MODELS.MITOCHONDRIA.name, origin, cookie);
    } catch (error: any) {
      console.error('[VOYAGE] ❌ Failed to import Mitochondria:', error.message);
      throw new Error(`Mitochondria import failed: ${error.message}`);
    }

    console.log('[VOYAGE] ✓ All 5 models imported successfully');

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: Assemble Scene Data
    // ═══════════════════════════════════════════════════════════════════════
    console.log('[VOYAGE] ──── STEP 4: Assembling scene data ────');
    let sceneData;
    try {
      sceneData = await assembleScene(skyboxStorageUrl, modelPaths);
      console.log('[VOYAGE] ✓ Scene data assembled');
    } catch (error: any) {
      console.error('[VOYAGE] ❌ Step 4 failed:', error.message);
      throw new Error(`Scene assembly failed: ${error.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 5: Save to Supabase
    // ═══════════════════════════════════════════════════════════════════════
    console.log('[VOYAGE] ──── STEP 5: Saving to Supabase ────');
    let shortId;
    try {
      shortId = await saveSceneToSupabase(sceneData);
    } catch (error: any) {
      console.error('[VOYAGE] ❌ Step 5 failed:', error.message);
      throw new Error(`Database save failed: ${error.message}`);
    }

    console.log('[VOYAGE] ═══════════════════════════════════════════════');
    console.log('[VOYAGE] 🎉 VOYAGE SCENE CREATED SUCCESSFULLY!');
    console.log('[VOYAGE] URL: /view/' + shortId);
    console.log('[VOYAGE] ═══════════════════════════════════════════════');

    return NextResponse.json({
      success: true,
      short_id: shortId,
      url: `/view/${shortId}`,
      modelPaths: [
        modelPaths.MITOCHONDRIA,
        modelPaths.LYSOSOME,
        modelPaths.ENDOPLASMIC_RETICULUM,
        modelPaths.GOLGI,
        modelPaths.GLUCOSE,
      ],
      skyboxUrl: skyboxStorageUrl,
    });

  } catch (error: any) {
    console.error('[VOYAGE] ═══════════════════════════════════════════════');
    console.error('[VOYAGE] ❌ VOYAGE SCENE CREATION FAILED');
    console.error('[VOYAGE] Error:', error.message);
    console.error('[VOYAGE] ═══════════════════════════════════════════════');

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create Voyage scene',
        skyboxUrl: skyboxStorageUrl,
        modelPaths: Object.values(modelPaths),
      },
      { status: 500 }
    );
  }
}
