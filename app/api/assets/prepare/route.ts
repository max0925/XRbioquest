import { NextRequest, NextResponse } from 'next/server';

// 模拟自有库数据 (未来可以存入数据库)
const LOCAL_ASSETS_DB = [
  { name: 'plant cell', url: '/models/plant_cell.glb', thumbnail: '/thumbs/plant_cell.png' },
  { name: 'animal cell', url: '/models/animal_cell.glb', thumbnail: '/thumbs/animal_cell.png' },
  { name: 'microscope', url: '/models/microscope.glb', thumbnail: '/thumbs/microscope.png' },
];

export async function POST(request: NextRequest) {
  try {
    const { suggested_assets } = await request.json(); // 来自上一步 OpenAI 的建议

    const processedAssets = suggested_assets.map((asset: any) => {
      const lowerName = asset.name.toLowerCase();
      
      // 1. 匹配自有库
      const localMatch = LOCAL_ASSETS_DB.find(l => lowerName.includes(l.name));
      if (localMatch) {
        return { ...asset, source: 'local', url: localMatch.url, status: 'ready' };
      }

      // 2. 如果没匹配到，标记为需要外部检索或AI生成
      // 这里先标记为 'pending'，由前端决定是去查 Sketchfab 还是直接 AI 生成
      return { ...asset, source: 'external', status: 'searching' };
    });

    return NextResponse.json({ assets: processedAssets });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to prepare assets' }, { status: 500 });
  }
}