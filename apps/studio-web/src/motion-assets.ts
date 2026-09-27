import {motionCardInstanceSchema, type MotionCardDefinition, type MotionCardInstance, type MotionCardClassification} from '@motion-master/schema';

export type SavedAsset = {id: string; name: string; classification: MotionCardClassification; card: MotionCardInstance; createdAt: string};
export type AssetLibrary = {assets: SavedAsset[]; favorites: string[]};
export const assetStorageKey = 'motion-master-assets-v1';
export const readAssetLibrary = (): AssetLibrary => {
  try { const saved = JSON.parse(localStorage.getItem(assetStorageKey) ?? '{}'); return {assets: Array.isArray(saved.assets) ? saved.assets : [], favorites: Array.isArray(saved.favorites) ? saved.favorites : []}; }
  catch { return {assets: [], favorites: []}; }
};
export const createAsset = (card: MotionCardDefinition['defaults'], definition: MotionCardDefinition, name = definition.displayName): SavedAsset => ({
  id: crypto.randomUUID(), name: name.trim() || definition.displayName,
  classification: {...definition.classification ?? {level1: '未分类', level2: '自定义', level3: definition.displayName}},
  card: {...structuredClone(card), cardId: 'preset', trackId: definition.category === 'ambient' ? 'overlay-ambient' : 'overlay-main', startFrame: 0, sourceSegmentIds: [], seg: undefined},
  createdAt: new Date().toISOString(),
});
export const importAssets = (value: unknown, catalog: MotionCardDefinition[]): SavedAsset[] => {
  const data = value as any;
  const items = Array.isArray(data) ? data : data?.assets ?? data?.timeline?.cards ?? data?.cards ?? [data];
  if (!Array.isArray(items) || !items.length || items.length > 500) throw new Error('请选择包含 1–500 张卡片预设的 JSON 文件');
  return items.map((item: any, index: number) => {
    const raw = item?.card ?? item?.defaults ?? item;
    const definition = catalog.find((entry) => entry.cardType === raw?.cardType);
    if (!definition) throw new Error(`第 ${index + 1} 张卡片的渲染器未安装：${String(raw?.cardType ?? '缺少 cardType')}。请先安装对应卡包。`);
    const parsed = motionCardInstanceSchema.safeParse({...definition.defaults, ...raw, cardId: 'preset', trackId: definition.category === 'ambient' ? 'overlay-ambient' : 'overlay-main', startFrame: 0, sourceSegmentIds: [], seg: undefined});
    if (!parsed.success) throw new Error(`第 ${index + 1} 张卡片参数无效：${parsed.error.issues[0]?.message}`);
    const asset = createAsset(parsed.data, definition, String(item.name ?? item.displayName ?? definition.displayName));
    if (item.classification && ['level1','level2','level3'].every((key) => typeof item.classification[key] === 'string' && item.classification[key].trim())) asset.classification = {level1:item.classification.level1, level2:item.classification.level2, level3:item.classification.level3};
    return asset;
  });
};
export const downloadAssets = (assets: SavedAsset[]) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify({format: 'motion-master-assets', version: 1, assets}, null, 2)], {type:'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = 'motion-master-assets.json'; link.click(); URL.revokeObjectURL(url);
};
