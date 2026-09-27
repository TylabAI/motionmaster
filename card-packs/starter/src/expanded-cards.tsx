import type {MotionCardDefinition, MotionCardInstance, MotionProject} from '@motion-master/schema';
import {CuratedMotionCardView, curatedCardDefinitions} from './curated-remotion';
import {SourceCatalogCardView, sourceCatalogDefinitions} from './source-catalog';

// The v1.3 editor owns position and dimensions. The imported artwork renders
// in local coordinates so preview handles and export share one layout box.
export const expandedCardDefinitions: MotionCardDefinition[] = [...curatedCardDefinitions, ...sourceCatalogDefinitions].map(definition => ({
  ...definition,
  source: {...definition.source!, adaptationNotes: definition.cardType.startsWith('catalog-')
    ? '来源目录条目，使用 MotionMaster 通用样式呈现；未直接加载上游实现或远程素材。'
    : 'MotionMaster 本地重建样式，非上游组件的直接加载。'},
  description: definition.cardType.startsWith('catalog-lottiefiles-')
    ? `${definition.displayName} · 素材包入口与通用示例，包内动画尚未下载`
    : definition.cardType.startsWith('catalog-') ? `${definition.displayName} · 来源目录的通用示例样式` : definition.description,
  parameterSchema: [...definition.parameterSchema, ...(['x','y','width','height'] as const).map(key => ({
    key, path: `layout.${key}`, label: {x:'横向位置',y:'纵向位置',width:'宽度',height:'高度'}[key],
    group: 'layout' as const, control: 'number' as const, min: key==='x'||key==='y'?0:4, max:100, step:1,
  }))],
  defaults: {...definition.defaults, layout: {...definition.defaults.layout, x:5, y:10, width:90, height:80, scale:1}},
}));

const expandedTypes = new Set(expandedCardDefinitions.map(card => card.cardType));
export const isExpandedCard = (type: string) => expandedTypes.has(type);

export function ExpandedCardView({card,frame,theme}:{card:MotionCardInstance;frame:number;theme:MotionProject['theme']}) {
  const local = {...card,layout:{...card.layout,scale:1,offsetX:0,offsetY:0}};
  return <svg width="100%" height="100%" viewBox="0 0 1280 720" preserveAspectRatio="none" style={{display:'block',overflow:'hidden'}}>
    <foreignObject width="1280" height="720"><div style={{position:'relative',width:1280,height:720}}>
      {card.cardType.startsWith('catalog-') ? <SourceCatalogCardView card={local} frame={frame} theme={theme}/> : <CuratedMotionCardView card={local} frame={frame} theme={theme}/>}
    </div></foreignObject>
  </svg>;
}
