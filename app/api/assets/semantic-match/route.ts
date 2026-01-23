import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Internal asset library with rich metadata for semantic matching
const INTERNAL_ASSETS = [
  {
    file: 'microscope.glb',
    path: '/models/microscope.glb',
    name: 'Microscope',
    description: 'Laboratory microscope for scientific observation and research',
    keywords: ['microscope', 'lab', 'laboratory', 'scientific tool', 'magnifier', 'lens', 'observation', 'research', 'science equipment', 'optical instrument', 'biology tool', 'magnification'],
    category: 'lab-equipment',
    thumb: '/bio.png'
  },
  {
    file: 'animal_cell.glb',
    path: '/models/animal_cell.glb',
    name: 'Animal Cell',
    description: '3D model of an animal cell showing organelles like nucleus, mitochondria, and cell membrane',
    keywords: ['animal cell', 'cell', 'organelle', 'nucleus', 'mitochondria', 'cytoplasm', 'cell membrane', 'biology', 'cellular', 'eukaryote', 'living cell', 'cell structure'],
    category: 'biology',
    thumb: '/bio.png'
  },
  {
    file: 'plant_cell.glb',
    path: '/models/plant_cell.glb',
    name: 'Plant Cell',
    description: '3D model of a plant cell with cell wall, chloroplast, and vacuole',
    keywords: ['plant cell', 'cell wall', 'chloroplast', 'vacuole', 'photosynthesis', 'plant biology', 'botany', 'vegetation cell', 'plant structure', 'green cell'],
    category: 'biology',
    thumb: '/ecosystems.png'
  },
  {
    file: 'dna_helix.glb',
    path: '/models/dna_helix.glb',
    name: 'DNA Helix',
    description: 'Double helix DNA structure showing genetic material and base pairs',
    keywords: ['dna', 'double helix', 'genetics', 'chromosome', 'gene', 'genetic material', 'nucleotide', 'base pair', 'heredity', 'genome', 'molecular biology', 'replication'],
    category: 'genetics',
    thumb: '/bio.png'
  },
  {
    file: 'classroom.glb',
    path: '/environemnt/classroom.glb',
    name: 'Classroom',
    description: 'Virtual classroom environment with desks, chairs, and educational setting',
    keywords: ['classroom', 'school', 'education', 'lecture hall', 'learning space', 'academic', 'teaching room', 'study room', 'educational environment'],
    category: 'environment',
    thumb: '/classroom.jpg'
  },
  {
    file: 'low_poly_forest.glb',
    path: '/environemnt/low_poly_forest.glb',
    name: 'Low Poly Forest',
    description: 'Natural forest environment with trees, plants, and ecosystem elements',
    keywords: ['forest', 'nature', 'trees', 'ecosystem', 'woodland', 'natural environment', 'outdoor', 'vegetation', 'jungle', 'woods', 'greenery', 'habitat'],
    category: 'environment',
    thumb: '/classroom.jpg'
  }
];

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      error: 'OpenAI API key not configured',
      match: null
    }, { status: 500 });
  }

  try {
    const { query, context } = await request.json();

    if (!query) {
      return NextResponse.json({
        error: 'Query is required',
        match: null
      }, { status: 400 });
    }

    // Build asset list for the prompt
    const assetList = INTERNAL_ASSETS.map((asset, index) =>
      `${index + 1}. "${asset.name}" (${asset.file}): ${asset.description}. Keywords: ${asset.keywords.slice(0, 6).join(', ')}`
    ).join('\n');

    // Use GPT to perform semantic matching
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: "json_object" },
      messages: [
        {
          role: 'system',
          content: `You are a semantic asset matcher for an educational VR platform. Your job is to match user requests to the most relevant 3D asset from our internal library.

INTERNAL ASSET LIBRARY:
${assetList}

MATCHING RULES:
1. Match based on semantic meaning, not just exact keywords
2. Consider synonyms, related concepts, and educational context
3. "scientific tool" or "magnifier" should match "Microscope"
4. "genetic material" or "heredity" should match "DNA Helix"
5. "living cell" or "biology model" could match "Animal Cell" or "Plant Cell"
6. "nature scene" or "outdoor" should match "Low Poly Forest"
7. If no asset is relevant, return null

Respond with JSON: { "match": { "file": "filename.glb", "name": "Asset Name", "confidence": 0.0-1.0, "reasoning": "brief explanation" } } or { "match": null, "reasoning": "why no match" }`
        },
        {
          role: 'user',
          content: `Find the best matching asset for: "${query}"${context ? `\nContext: ${context}` : ''}`
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const responseText = completion.choices[0]?.message?.content || '{"match": null}';
    const result = JSON.parse(responseText);

    // If we got a match, enrich it with full asset data
    if (result.match && result.match.file) {
      const fullAsset = INTERNAL_ASSETS.find(a => a.file === result.match.file);
      if (fullAsset) {
        return NextResponse.json({
          match: {
            ...result.match,
            path: fullAsset.path,
            thumb: fullAsset.thumb,
            category: fullAsset.category,
            description: fullAsset.description
          },
          reasoning: result.reasoning || result.match.reasoning
        });
      }
    }

    return NextResponse.json({
      match: null,
      reasoning: result.reasoning || 'No suitable match found in internal library'
    });

  } catch (error: any) {
    console.error('Semantic match error:', error);
    return NextResponse.json({
      error: error.message,
      match: null
    }, { status: 500 });
  }
}

// Also export the asset list for use in other parts of the app
export const getInternalAssets = () => INTERNAL_ASSETS;
