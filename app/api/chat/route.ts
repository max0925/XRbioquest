import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { searchNGSSAssets, type AssetSource, type AssetSearchResult } from '@/lib/ngssAssets';

// Response types
interface AgentAction {
  type: 'SEARCH_LIBRARY' | 'GENERATE_MODEL' | 'GENERATE_SKYBOX' | 'SET_ENVIRONMENT' | 'ADD_ASSET' | 'CHAT_RESPONSE' | 'CREATE_LESSON' | 'INJECT_LOGIC' | 'DISPLAY_LESSON_PLAN' | 'UPDATE_SKYBOX';
  params: Record<string, any>;
  source?: AssetSource; // Track origin: 'internal' | 'ai_generated' | 'local'
}

interface LessonPlanDisplay {
  topic: string;
  syllabus: string[];
  vrScript: string;
  pedagogy: string;
  assets: Array<{
    name: string;
    role: string;
    intent: 'environment' | 'object';
    searchKeywords: string[];
    source?: AssetSource;
    modelUrl?: string;
    thumbnailUrl?: string;
  }>;
}

// Dual-Layer Environment Protocol
interface DualLayerEnvironment {
  environment_model: string | null;  // Interior GLB (e.g., classroom.glb, lab.glb)
  skybox_prompt: string | null;      // Exterior AI vista (Blockade Labs prompt)
}

// Update types for partial modifications
type UpdateType = 'FULL_LESSON' | 'SKYBOX_ONLY' | 'ADD_ASSETS' | 'MODIFY_INTERACTIONS' | 'CHAT_ONLY';

interface AgentResponse {
  reasoning: string;
  actions: AgentAction[];
  conversationId: string;
  lessonPlan?: LessonPlanDisplay;
  updateType?: UpdateType;
  dualLayerEnv?: DualLayerEnvironment;
}

// Local asset library for matching
const LOCAL_ASSETS = [
  { file: 'microscope.glb', keywords: ['microscope', 'lab equipment', 'science tool'] },
  { file: 'animal_cell.glb', keywords: ['animal cell', 'cell', 'biology', 'organelle'] },
  { file: 'plant_cell.glb', keywords: ['plant cell', 'cell wall', 'chloroplast'] },
  { file: 'dna_helix.glb', keywords: ['dna', 'double helix', 'genetics', 'chromosome'] },
  { file: 'classroom.glb', keywords: ['classroom', 'school', 'education'] },
  { file: 'low_poly_forest.glb', keywords: ['forest', 'nature', 'trees', 'ecosystem'] }
];

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory conversation storage (use Redis/DB for production)
const conversationMemory = new Map<string, Array<ChatCompletionMessageParam>>();

export async function POST(request: NextRequest) {
  // Safety check for API key
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      reasoning: 'Error: OpenAI API key is not configured. Please set OPENAI_API_KEY in environment variables.',
      actions: [],
      conversationId: 'error'
    } as AgentResponse, { status: 500 });
  }

  try {
    const body = await request.json();
    const { input, conversationId = 'default', history = [] } = body;

    // Get or create conversation history
    const sessionId = conversationId;
    let messages: ChatCompletionMessageParam[] = conversationMemory.get(sessionId) || [];

    // If history provided from frontend, use it
    if (history.length > 0) {
      messages = history as ChatCompletionMessageParam[];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTENT ARBITER: Smart classification for natural interaction
    // Routes to appropriate handler based on user intent
    // ═══════════════════════════════════════════════════════════════════════════
    const intentCheck = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an Intent Arbiter for a VR lesson creation assistant. Analyze the user's message and classify their intent.

INTENT TYPES (respond with ONLY the intent code):

1. NEW_LESSON - Creating a NEW VR lesson/experience from scratch
   Examples: "Create a VR lesson about DNA", "Design a solar system experience", "Build a lesson on photosynthesis"

2. SKYBOX_CHANGE - ONLY changing the background/sky/environment vista (NOT a full lesson)
   Examples: "Change the background to space", "Make it a night sky", "I want a forest background", "Switch to an underwater scene"

3. ADD_ASSETS - Adding objects to an EXISTING scene (NOT a full lesson)
   Examples: "Add a microscope", "Put a DNA model in the scene", "Can you add some planets?"

4. MODIFY_SCENE - Changing interactions or properties of existing assets
   Examples: "Make the DNA spin", "Add glow to the cell", "Make objects grabbable"

5. QUESTION - Asking about the current scene, capabilities, or how to do something
   Examples: "What's in the scene?", "How do I add interactions?", "What assets do you have?"

6. CASUAL_CHAT - Greetings, thanks, or general conversation
   Examples: "Hi", "Hello", "Thanks", "That looks great", "What can you do?"

DECISION RULES:
- If user mentions "lesson", "class", "teach", "learn" with a topic → NEW_LESSON
- If user ONLY mentions background/sky/environment change → SKYBOX_CHANGE
- If user wants to add specific objects without full lesson context → ADD_ASSETS
- If user asks a question (starts with how/what/why/can) → QUESTION or CASUAL_CHAT
- Default to CASUAL_CHAT for ambiguous messages

Respond with ONLY the intent code (e.g., "NEW_LESSON" or "SKYBOX_CHANGE").`
        },
        { role: 'user', content: input }
      ],
      temperature: 0.2,
      max_tokens: 20
    });

    const intent = intentCheck.choices[0]?.message?.content?.trim().toUpperCase() || 'CASUAL_CHAT';
    console.log(`[INTENT ARBITER] Input: "${input.substring(0, 50)}..." → Intent: ${intent}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // SKYBOX_CHANGE: Partial update - only change the background
    // ═══════════════════════════════════════════════════════════════════════════
    if (intent === 'SKYBOX_CHANGE') {
      const skyboxCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: `You generate skybox prompts for VR scenes. Extract the desired environment from the user's request.

Respond in JSON:
{
  "skybox_prompt": "Detailed prompt for AI skybox generation - include atmosphere, lighting, time of day, style",
  "description": "Brief description for the user"
}`
          },
          { role: 'user', content: input }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      const skyboxData = JSON.parse(skyboxCompletion.choices[0]?.message?.content || '{}');

      const response: AgentResponse = {
        reasoning: `Partial update: Changing skybox to "${skyboxData.description || 'new environment'}"`,
        actions: [
          {
            type: 'UPDATE_SKYBOX',
            params: { prompt: skyboxData.skybox_prompt }
          },
          {
            type: 'CHAT_RESPONSE',
            params: { message: `🎨 Updating the background to: ${skyboxData.description || skyboxData.skybox_prompt}` }
          }
        ],
        conversationId: sessionId,
        updateType: 'SKYBOX_ONLY',
        dualLayerEnv: {
          environment_model: null,
          skybox_prompt: skyboxData.skybox_prompt
        }
      };

      return NextResponse.json(response, { status: 200 });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADD_ASSETS: Partial update - add objects to existing scene
    // ═══════════════════════════════════════════════════════════════════════════
    if (intent === 'ADD_ASSETS') {
      const assetCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: `You identify assets to add to a VR scene. Extract the objects the user wants.

LOCAL LIBRARY: microscope.glb, animal_cell.glb, plant_cell.glb, dna_helix.glb, classroom.glb, low_poly_forest.glb

Respond in JSON:
{
  "assets": [
    {
      "name": "Asset name",
      "intent": "object",
      "search_keywords": ["keyword1", "keyword2"],
      "category": "Cells | Organs | Molecules | etc",
      "local_match": "filename.glb if in local library, else null",
      "generate_prompt": "AI generation prompt if no local match"
    }
  ],
  "description": "Brief description for the user"
}`
          },
          { role: 'user', content: input }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      const assetData = JSON.parse(assetCompletion.choices[0]?.message?.content || '{}');
      const actions: AgentAction[] = [];

      // Search internal assets first for each requested asset
      for (const asset of (assetData.assets || [])) {
        const searchKeywords = asset.search_keywords || [asset.name];

        // Check internal ngss_assets database first
        const searchResult = await searchNGSSAssets({
          keywords: searchKeywords,
          category: asset.category
        });

        if (searchResult.found && searchResult.asset) {
          // Use internal asset directly
          console.log(`[ADD_ASSETS] ✅ Internal match: "${asset.name}" -> ${searchResult.asset.name}`);
          actions.push({
            type: 'ADD_ASSET',
            params: {
              asset_name: asset.name,
              model_url: searchResult.asset.model_url,
              thumbnail_url: searchResult.asset.thumbnail_url,
              intent: 'object',
              internal_asset_id: searchResult.asset.id
            },
            source: 'internal'
          });
        } else if (asset.local_match) {
          // Use local file
          console.log(`[ADD_ASSETS] 📁 Local match: "${asset.name}" -> ${asset.local_match}`);
          actions.push({
            type: 'ADD_ASSET',
            params: {
              asset_name: asset.name,
              local_file: asset.local_match,
              intent: 'object'
            },
            source: 'local'
          });
        } else {
          // Fall back to Meshy AI generation
          console.log(`[ADD_ASSETS] 🤖 AI generation: "${asset.name}"`);
          actions.push({
            type: 'SEARCH_LIBRARY',
            params: {
              query: searchKeywords.join(' '),
              keywords: searchKeywords,
              asset_name: asset.name,
              intent: 'object',
              local_match: asset.local_match,
              generate_prompt: asset.generate_prompt
            },
            source: 'ai_generated'
          });
        }
      }

      // Count sources for user message
      const internalCount = actions.filter(a => a.source === 'internal').length;
      const aiCount = actions.filter(a => a.source === 'ai_generated').length;
      const sourceInfo = internalCount > 0
        ? ` (${internalCount} from library${aiCount > 0 ? `, ${aiCount} AI-generated` : ''})`
        : '';

      actions.push({
        type: 'CHAT_RESPONSE',
        params: { message: `✨ Adding to scene: ${assetData.description || assetData.assets?.map((a: any) => a.name).join(', ')}${sourceInfo}` }
      });

      const response: AgentResponse = {
        reasoning: `Partial update: Adding ${assetData.assets?.length || 0} asset(s) to scene. Internal: ${internalCount}, AI-generated: ${aiCount}`,
        actions,
        conversationId: sessionId,
        updateType: 'ADD_ASSETS'
      };

      return NextResponse.json(response, { status: 200 });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // QUESTION: Natural chat response about capabilities or scene
    // ═══════════════════════════════════════════════════════════════════════════
    if (intent === 'QUESTION' || intent === 'MODIFY_SCENE') {
      const questionCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are BioQuest AI, a helpful VR education assistant. Answer questions naturally and helpfully.

You can:
- Create VR lessons (say "Create a lesson about [topic]")
- Change backgrounds/skyboxes (say "Change background to [scene]")
- Add 3D objects (say "Add a [object]")
- Add interactions like glow, spin, grabbable

Local assets available: microscope, animal cell, plant cell, DNA helix, classroom, forest

Keep responses concise and friendly (2-3 sentences). Guide users toward actions they can take.`
          },
          ...messages.slice(-4),
          { role: 'user', content: input }
        ],
        temperature: 0.8,
        max_tokens: 200
      });

      const chatMessage = questionCompletion.choices[0]?.message?.content || "I can help you create VR lessons! Try saying 'Create a lesson about DNA' to get started.";

      const response: AgentResponse = {
        reasoning: 'Natural conversation - answering user question',
        actions: [{ type: 'CHAT_RESPONSE', params: { message: chatMessage } }],
        conversationId: sessionId,
        updateType: 'CHAT_ONLY'
      };

      return NextResponse.json(response, { status: 200 });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NEW_LESSON: Full lesson template with Dual-Layer Environment Protocol
    // ═══════════════════════════════════════════════════════════════════════════
    if (intent === 'NEW_LESSON' || intent === 'LESSON_REQUEST') {
      // VR Orchestrator: Generate structured scene plan with collaborative explanation
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: `You are BioQuest AI, a senior instructional designer who thinks out loud while crafting VR educational experiences. You explain your pedagogical reasoning as you design.

ASSET SOURCES (Priority Order):
1. INTERNAL LIBRARY (ngss_assets database) - Curated educational models, always preferred
2. LOCAL FILES - microscope.glb, animal_cell.glb, plant_cell.glb, dna_helix.glb, classroom.glb, low_poly_forest.glb
3. AI GENERATION (Meshy) - Only if no internal/local match found

CURRICULUM STANDARDS TO DETECT:
- IB (International Baccalaureate)
- NGSS (Next Generation Science Standards) - e.g., HS-LS1-1, MS-LS2-3
- AP (Advanced Placement)
- Common Core
- Cambridge IGCSE
- State standards (e.g., California, Texas)

You MUST respond in this JSON format:
{
  "lesson_topic": "Engaging title for the lesson",
  "curriculum_info": {
    "detected_curriculum": "IB | NGSS | AP | Cambridge | Common Core | null",
    "ngss_standards": ["HS-LS1-1", "MS-LS2-3"],
    "grade_level": "elementary | middle | high | college",
    "subject_area": "Biology | Chemistry | Physics | Earth Science | etc"
  },
  "syllabus": [
    "Learning objective 1 - specific and measurable",
    "Learning objective 2 - specific and measurable",
    "Learning objective 3 - specific and measurable"
  ],
  "vr_script": "A narrative description of the VR experience flow. Describe what the student sees when they enter, how they progress through the lesson, key moments of interaction, and how the experience concludes. Write this like a screenplay for education. (2-3 paragraphs)",
  "pedagogical_approach": "Explain your teaching philosophy for this lesson. Reference specific learning theories (constructivism, experiential learning, etc.) and why VR is particularly effective for this topic. Include assessment strategies. (1-2 paragraphs)",
  "environment_mode": "IMMERSIVE or ARCHITECTURAL",
  "dual_layer_environment": {
    "environment_model": "filename.glb or null (see mode rules below)",
    "skybox_prompt": "See mode rules below - NEVER leave null"
  },
  "assets": [
    {
      "name": "Asset name",
      "intent": "object",
      "search_keywords": ["keyword1", "keyword2", "keyword3"],
      "category": "Cells | Organs | Molecules | Organisms | Ecosystems | Equipment | etc",
      "curriculum_tags": ["IB", "NGSS"],
      "local_match": "filename.glb if found in local library, otherwise null",
      "generate_prompt": "Detailed AI generation prompt if no internal/local match",
      "role": "Educational purpose of this asset in the lesson"
    }
  ],
  "interactions": [
    {
      "target_asset": "Asset name",
      "type": "grabbable | glow_pulse | collision_trigger | rotate_on_click",
      "purpose": "How this interaction enhances understanding"
    }
  ]
}

═══════════════════════════════════════════════════════════════════════════
ENVIRONMENT MODE SELECTION (CRITICAL - Choose ONE):
═══════════════════════════════════════════════════════════════════════════

🌌 IMMERSIVE MODE - For abstract, open-world, or exploratory topics:
   Topics: Space, Solar System, Inside Cells, Ocean depths, Microscopic worlds,
           Abstract concepts, Nature exploration, Historical periods, Fantasy worlds

   Rules:
   - environment_model: null (NO interior GLB - student floats freely)
   - skybox_prompt: Full 360° immersive environment surrounding the student

   Examples:
   • "Solar System" → environment_model: null, skybox_prompt: "Deep space with distant galaxies, nebulae, stars twinkling, cosmic dust, infinite void, 8k photorealistic"
   • "Inside a Cell" → environment_model: null, skybox_prompt: "Interior of a living cell, translucent cytoplasm, floating organelles visible in distance, soft blue bioluminescence, organic membrane walls, microscopic scale, 8k"
   • "Underwater Ocean" → environment_model: null, skybox_prompt: "Deep ocean underwater scene, sunlight filtering through water surface above, coral reef in distance, schools of fish, blue-green water, volumetric light rays, 8k"

🏛️ ARCHITECTURAL MODE - For topics requiring a physical building/room:
   Topics: Laboratory experiments, Classroom lessons, Museum exhibits,
           Hospital/medical training, Office simulations, Historical buildings

   Rules:
   - environment_model: Select appropriate GLB (classroom.glb, low_poly_forest.glb for outdoor ground)
   - skybox_prompt: View OUTSIDE the window/door - what's BEYOND the room

   ⚠️ CRITICAL RULE: The skybox must NEVER describe the same space as the GLB!
   ⚠️ NEVER put a "classroom skybox" around a "classroom.glb"
   ⚠️ The skybox shows what you'd see looking OUT the windows

   Examples:
   • "DNA Lab Lesson" → environment_model: "classroom.glb", skybox_prompt: "University campus quad visible through windows, green trees, students walking, blue sky with fluffy clouds, academic buildings in distance, sunny afternoon, 8k"
   • "Biology Class" → environment_model: "classroom.glb", skybox_prompt: "Rainy city skyline through classroom windows, tall buildings, overcast sky, raindrops on glass, cozy indoor lighting contrast, 8k"
   • "Forest Ecology" → environment_model: "low_poly_forest.glb", skybox_prompt: "Mountain range on horizon, dramatic sunset sky with orange and purple clouds, birds flying in distance, vast wilderness extending to horizon, 8k"
   • "Chemistry Lab" → environment_model: "classroom.glb", skybox_prompt: "Modern research campus exterior, glass buildings, landscaped gardens, clear blue sky, professional academic environment, 8k"

═══════════════════════════════════════════════════════════════════════════
VALIDATION CHECKLIST:
═══════════════════════════════════════════════════════════════════════════
□ Did I choose the correct mode (IMMERSIVE vs ARCHITECTURAL)?
□ If ARCHITECTURAL: Does my skybox describe the EXTERIOR view, not the room itself?
□ If IMMERSIVE: Is environment_model set to null?
□ Is skybox_prompt detailed with atmosphere, lighting, quality (8k)?
□ Would putting this skybox around this GLB make visual sense?

INTENT RULES (assets only - NOT for skybox_prompt):
- intent: "object" -> Use for ALL 3D models students can observe or interact with
- Do NOT create assets with intent: "environment" - use dual_layer_environment.skybox_prompt instead

CRITICAL RULES:
1. ALWAYS search local library first using search_keywords - avoid AI generation if possible
2. search_keywords should include: the asset name, synonyms, related terms, and category words
3. Each asset MUST have at least one meaningful interaction
4. ALWAYS provide skybox_prompt - NEVER leave it null
5. Syllabus must have 3-5 specific, measurable learning objectives
6. VR script should be engaging and describe a clear learning journey`
          },
          ...messages.slice(-4),
          { role: 'user', content: input },
        ],
        temperature: 0.7,
      });

      const rawContent = completion.choices[0]?.message?.content || '{}';
      const lessonData = JSON.parse(rawContent);

      // ═══════════════════════════════════════════════════════════════════════════
      // INTERNAL ASSET SEARCH: Check ngss_assets database before AI generation
      // Priority: 1. Internal (ngss_assets) → 2. Local files → 3. AI generation
      // ═══════════════════════════════════════════════════════════════════════════
      const curriculumInfo = lessonData.curriculum_info || {};
      const detectedCurriculum = curriculumInfo.detected_curriculum;
      const subjectArea = curriculumInfo.subject_area;

      console.log(`[CURRICULUM] Detected: ${detectedCurriculum || 'none'} | Subject: ${subjectArea || 'general'}`);

      // Search internal assets for each requested asset
      const assetsWithSources: Array<{
        asset: any;
        searchResult: AssetSearchResult;
      }> = [];

      if (lessonData.assets && Array.isArray(lessonData.assets)) {
        for (const asset of lessonData.assets) {
          // Build search params from asset metadata
          const searchResult = await searchNGSSAssets({
            keywords: asset.search_keywords || [asset.name],
            category: asset.category || subjectArea,
            curriculum: detectedCurriculum,
            ngssStandard: curriculumInfo.ngss_standards?.[0]
          });

          if (searchResult.found && searchResult.asset) {
            console.log(`[ASSET MATCH] ✅ "${asset.name}" → Internal: ${searchResult.asset.name} (${searchResult.matchType}, confidence: ${searchResult.confidence})`);
            // Enrich asset with internal source info
            asset.source = 'internal';
            asset.model_url = searchResult.asset.model_url;
            asset.thumbnail_url = searchResult.asset.thumbnail_url;
            asset.internal_asset_id = searchResult.asset.id;
            asset.internal_asset_name = searchResult.asset.name;
          } else if (asset.local_match) {
            console.log(`[ASSET MATCH] 📁 "${asset.name}" → Local: ${asset.local_match}`);
            asset.source = 'local';
          } else {
            console.log(`[ASSET MATCH] 🤖 "${asset.name}" → Will generate with Meshy AI`);
            asset.source = 'ai_generated';
          }

          assetsWithSources.push({ asset, searchResult });
        }
      }

      // Add to conversation memory
      messages.push(
        { role: 'user', content: input },
        { role: 'assistant', content: JSON.stringify(lessonData) }
      );
      conversationMemory.set(sessionId, messages.slice(-10));

      // Build structured lesson plan for display
      const lessonPlan: LessonPlanDisplay = {
        topic: lessonData.lesson_topic || 'VR Lesson',
        syllabus: lessonData.syllabus || [],
        vrScript: lessonData.vr_script || lessonData.lesson_plan || '',
        pedagogy: lessonData.pedagogical_approach || lessonData.pedagogical_notes || '',
        assets: (lessonData.assets || []).map((a: any) => ({
          name: a.name,
          role: a.role,
          intent: a.intent || 'object',
          searchKeywords: a.search_keywords || [a.search_query, a.name].filter(Boolean),
          source: a.source || 'ai_generated',
          modelUrl: a.model_url,
          thumbnailUrl: a.thumbnail_url
        }))
      };

      // Build structured response with VR Orchestrator logic
      const actions: AgentAction[] = [];
      const reasoningSteps: string[] = [];

      reasoningSteps.push(`Analyzing request: "${input}"`);
      reasoningSteps.push(`Topic identified: ${lessonData.lesson_topic || 'Custom VR Lesson'}`);

      // First action: Display the lesson plan in the chat
      actions.push({
        type: 'DISPLAY_LESSON_PLAN',
        params: { lessonPlan }
      });

      // Step 1: Process each asset via SEARCH_LIBRARY only (handles all 3 levels internally)
      // NOTE: Removed redundant ADD_ASSET and GENERATE_MODEL actions to prevent duplication
      // SEARCH_LIBRARY now handles: L1 (keyword) -> L2 (semantic) -> L3 (AI generation)
      reasoningSteps.push('Step 1: Querying asset libraries...');

      if (lessonData.assets && Array.isArray(lessonData.assets)) {
        for (const asset of lessonData.assets) {
          // Use search_keywords for better matching
          const searchKeywords = asset.search_keywords || [asset.search_query, asset.name].filter(Boolean);

          // Determine intent - default to 'object' if not specified
          const assetIntent = asset.intent || 'object';

          // Determine source-based action
          const assetSource: AssetSource = asset.source || 'ai_generated';

          if (assetSource === 'internal' && asset.model_url) {
            // INTERNAL ASSET: Use directly from ngss_assets database
            actions.push({
              type: 'ADD_ASSET',
              params: {
                asset_name: asset.name,
                model_url: asset.model_url,
                thumbnail_url: asset.thumbnail_url,
                intent: assetIntent,
                role: asset.role,
                internal_asset_id: asset.internal_asset_id
              },
              source: 'internal'
            });
            reasoningSteps.push(`  [INTERNAL] ✅ ${asset.name} -> ${asset.internal_asset_name || 'ngss_assets'}`);
          } else if (assetSource === 'local' && asset.local_match) {
            // LOCAL FILE: Use from /public/models
            actions.push({
              type: 'ADD_ASSET',
              params: {
                asset_name: asset.name,
                local_file: asset.local_match,
                intent: assetIntent,
                role: asset.role
              },
              source: 'local'
            });
            reasoningSteps.push(`  [LOCAL] 📁 ${asset.name} -> ${asset.local_match}`);
          } else {
            // AI GENERATION: Fall back to Meshy via SEARCH_LIBRARY
            actions.push({
              type: 'SEARCH_LIBRARY',
              params: {
                query: searchKeywords.join(' '),
                keywords: searchKeywords,
                asset_name: asset.name,
                intent: assetIntent,
                local_match: asset.local_match,
                generate_prompt: asset.generate_prompt,
                role: asset.role
              },
              source: 'ai_generated'
            });
            reasoningSteps.push(`  [AI GEN] 🤖 ${asset.name} -> Meshy generation | Keywords: ${searchKeywords.slice(0, 3).join(', ')}`);
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // DUAL-LAYER ENVIRONMENT: Immersive vs Architectural Mode
      // ═══════════════════════════════════════════════════════════════════════════
      const environmentMode = lessonData.environment_mode || 'ARCHITECTURAL';
      reasoningSteps.push(`Step 2: Configuring ${environmentMode} environment...`);

      const dualLayerEnv: DualLayerEnvironment = {
        environment_model: lessonData.dual_layer_environment?.environment_model || lessonData.environment?.local_file || null,
        skybox_prompt: lessonData.dual_layer_environment?.skybox_prompt || lessonData.environment?.generate_prompt || null
      };

      // ═══════════════════════════════════════════════════════════════════════════
      // VALIDATION: Prevent "classroom skybox around classroom GLB" anti-pattern
      // ═══════════════════════════════════════════════════════════════════════════
      if (dualLayerEnv.environment_model && dualLayerEnv.skybox_prompt) {
        const modelName = dualLayerEnv.environment_model.toLowerCase().replace('.glb', '');
        const skyboxLower = dualLayerEnv.skybox_prompt.toLowerCase();

        // Check for redundant interior descriptions in skybox
        const interiorKeywords = ['interior', 'inside', 'indoor', 'room', 'classroom interior', 'lab interior', 'building interior'];
        const hasInteriorKeyword = interiorKeywords.some(kw => skyboxLower.includes(kw));

        // Check if skybox describes the same space as the GLB
        const isSameSpace = skyboxLower.includes(modelName) && !skyboxLower.includes('window') && !skyboxLower.includes('outside') && !skyboxLower.includes('exterior');

        if (hasInteriorKeyword || isSameSpace) {
          console.warn(`[ENV VALIDATION] ⚠️ Skybox may describe interior instead of exterior view`);
          console.warn(`[ENV VALIDATION] GLB: ${dualLayerEnv.environment_model} | Skybox: "${dualLayerEnv.skybox_prompt.substring(0, 60)}..."`);
          reasoningSteps.push(`  ⚠️ [VALIDATION WARNING] Skybox may describe interior - should show exterior window view`);

          // Auto-fix: Append exterior context if missing
          if (!skyboxLower.includes('window') && !skyboxLower.includes('outside') && !skyboxLower.includes('exterior') && !skyboxLower.includes('horizon')) {
            dualLayerEnv.skybox_prompt = `View through windows: ${dualLayerEnv.skybox_prompt}, visible through large windows, exterior vista`;
            reasoningSteps.push(`  [AUTO-FIX] Adjusted skybox to emphasize exterior window view`);
          }
        }
      }

      // Log environment mode decision
      if (environmentMode === 'IMMERSIVE') {
        reasoningSteps.push(`  [MODE: IMMERSIVE] Full 360° environment - student floats in space`);
        console.log(`[ENV MODE] IMMERSIVE: No interior GLB, full skybox immersion`);
      } else {
        reasoningSteps.push(`  [MODE: ARCHITECTURAL] Interior GLB + exterior window view`);
        console.log(`[ENV MODE] ARCHITECTURAL: Interior=${dualLayerEnv.environment_model}, Exterior skybox for windows`);
      }

      // Layer 1: Interior environment model (GLB) - only for ARCHITECTURAL mode
      if (dualLayerEnv.environment_model) {
        reasoningSteps.push(`  [LAYER 1] Interior GLB: ${dualLayerEnv.environment_model}`);
        actions.push({
          type: 'SET_ENVIRONMENT',
          params: {
            type: 'local',
            file: dualLayerEnv.environment_model,
            skybox_prompt: dualLayerEnv.skybox_prompt // Pass for dual-loading
          }
        });
      }

      // Layer 2: Exterior skybox (AI-generated vista) - ALWAYS generate
      if (dualLayerEnv.skybox_prompt) {
        const skyboxContext = environmentMode === 'IMMERSIVE'
          ? '[IMMERSIVE] Full 360° environment'
          : '[ARCHITECTURAL] Exterior window view';
        reasoningSteps.push(`  [LAYER 2] Skybox (${skyboxContext}): "${dualLayerEnv.skybox_prompt.substring(0, 50)}..."`);
        actions.push({
          type: 'GENERATE_SKYBOX',
          params: { prompt: dualLayerEnv.skybox_prompt }
        });
      }

      // Fallback: Legacy environment field support
      if (!dualLayerEnv.environment_model && !dualLayerEnv.skybox_prompt && lessonData.environment) {
        if (lessonData.environment.type === 'local' && lessonData.environment.local_file) {
          reasoningSteps.push(`  [LEGACY] Using local environment: ${lessonData.environment.local_file}`);
          dualLayerEnv.environment_model = lessonData.environment.local_file;
          actions.push({
            type: 'SET_ENVIRONMENT',
            params: { type: 'local', file: lessonData.environment.local_file }
          });
        } else if (lessonData.environment.generate_prompt) {
          reasoningSteps.push(`  [LEGACY] Generating AI skybox`);
          dualLayerEnv.skybox_prompt = lessonData.environment.generate_prompt;
          actions.push({
            type: 'GENERATE_SKYBOX',
            params: { prompt: lessonData.environment.generate_prompt }
          });
        }
      }

      // Step 3: Inject interaction logic
      reasoningSteps.push('Step 3: Injecting interaction logic...');
      if (lessonData.interactions && Array.isArray(lessonData.interactions)) {
        for (const interaction of lessonData.interactions) {
          reasoningSteps.push(`  Adding ${interaction.type} to ${interaction.target_asset}`);
          actions.push({
            type: 'INJECT_LOGIC',
            params: {
              target: interaction.target_asset,
              interaction_type: interaction.type,
              purpose: interaction.purpose
            }
          });
        }
      }

      // Final step: Create lesson metadata
      reasoningSteps.push('Step 4: Finalizing lesson metadata...');
      actions.push({
        type: 'CREATE_LESSON',
        params: {
          topic: lessonData.lesson_topic,
          syllabus: lessonData.syllabus,
          vrScript: lessonData.vr_script,
          pedagogy: lessonData.pedagogical_approach
        }
      });

      reasoningSteps.push(`Complete. Generated ${actions.length} actions for VR scene.`);
      reasoningSteps.push(`[ENV MODE] ${environmentMode} | Interior: ${dualLayerEnv.environment_model || 'null (immersive)'} | Skybox: ${dualLayerEnv.skybox_prompt ? 'AI-generated' : 'none'}`);

      // Final validation log
      console.log(`[ENVIRONMENT SUMMARY] Mode: ${environmentMode} | GLB: ${dualLayerEnv.environment_model || 'null'} | Skybox: ${dualLayerEnv.skybox_prompt ? 'YES' : 'NO'}`);

      const response: AgentResponse = {
        reasoning: reasoningSteps.join('\n'),
        actions,
        conversationId: sessionId,
        lessonPlan,
        updateType: 'FULL_LESSON',
        dualLayerEnv
      };

      return NextResponse.json(response, { status: 200 });

    } else {
      // Casual conversation
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are BioQuest AI, a friendly and enthusiastic VR education assistant for teachers.

Your personality:
- Warm, encouraging, and passionate about education
- Knowledgeable about VR/AR learning experiences
- Helpful and conversational

Your capabilities:
- Create immersive VR lesson plans for STEM subjects
- Design engaging educational experiences
- Suggest 3D assets and environments
- Provide pedagogical insights

When chatting:
- Be friendly and natural
- Answer questions about what you can do
- Encourage teachers to try creating VR lessons
- Keep responses concise (2-4 sentences)
- Show enthusiasm for education technology

Examples:
User: "Hi"
You: "Hello! I'm BioQuest AI, your VR lesson creation assistant. I help teachers design amazing immersive learning experiences. What subject would you like to bring to life in VR today?"

User: "What can you help with?"
You: "I can help you create engaging VR lessons for STEM subjects! Just describe what you want to teach - like DNA replication, the solar system, or chemical reactions - and I'll design a complete immersive experience with lesson plans, game mechanics, and 3D assets. Want to try?"`,
          },
          ...messages.slice(-6),
          { role: 'user', content: input },
        ],
        temperature: 0.8,
        max_tokens: 200
      });

      const chatMessage = completion.choices[0]?.message?.content || 'Hello! How can I help you today?';

      // Add to conversation memory
      messages.push(
        { role: 'user', content: input },
        { role: 'assistant', content: chatMessage }
      );
      conversationMemory.set(sessionId, messages.slice(-10));

      const response: AgentResponse = {
        reasoning: 'User sent a casual message. Responding with friendly conversation to guide them toward VR lesson creation.',
        actions: [
          {
            type: 'CHAT_RESPONSE',
            params: { message: chatMessage }
          }
        ],
        conversationId: sessionId,
        updateType: 'CHAT_ONLY'
      };

      return NextResponse.json(response, { status: 200 });
    }

  } catch (error: any) {
    const errorResponse: AgentResponse = {
      reasoning: `Error occurred while processing request: ${error.message}`,
      actions: [],
      conversationId: 'error'
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
