// hooks/useAssetLibrary.ts
import { useCallback } from 'react';

// Data
const ASSET_LIBRARY: Record<string, { modelPath: string; name: string; thumb: string; keywords: string[] }> = {
  'microscope.glb': { 
    modelPath: '/models/microscope.glb', name: 'Microscope', thumb: '/bio.png',
    keywords: ['microscope', 'lab', 'science tool', 'lens'] 
  },
  'animal_cell.glb': { 
    modelPath: '/models/animal_cell.glb', name: 'Animal Cell', thumb: '/bio.png',
    keywords: ['animal cell', 'cell', 'nucleus', 'mitochondria', 'organelle'] 
  },
  'plant_cell.glb': {
    modelPath: '/models/plant_cell.glb', name: 'Plant Cell', thumb: '/ecosystems.png',
    keywords: ['plant cell', 'chloroplast', 'photosynthesis', 'cell wall']
  },
  'classroom.glb': { 
    modelPath: '/environemnt/classroom.glb', name: 'Classroom', thumb: '/classroom.jpg',
    keywords: ['classroom', 'school', 'lecture', 'room', 'lab'] 
  },
  'low_poly_forest.glb': { 
    modelPath: '/environemnt/low_poly_forest.glb', name: 'Low Poly Forest', thumb: '/classroom.jpg',
    keywords: ['forest', 'nature', 'trees', 'ecosystem', 'wood'] 
  },
};

export function useAssetLibrary() {
  const searchLibrary = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    
    // Direct key match
    if (ASSET_LIBRARY[lowerQuery]) return { file: lowerQuery, asset: ASSET_LIBRARY[lowerQuery] };
    
    // Keyword match
    for (const [file, asset] of Object.entries(ASSET_LIBRARY)) {
      if (asset.name.toLowerCase().includes(lowerQuery)) return { file, asset };
      if (asset.keywords.some(k => lowerQuery.includes(k))) return { file, asset };
    }
    return null;
  }, []);

  return { searchLibrary, ASSET_LIBRARY };
}