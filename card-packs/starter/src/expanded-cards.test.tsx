import {describe, expect, it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {starterCardDefinitions, MotionCardView, getPalette} from './index';
import {expandedCardDefinitions} from './expanded-cards';
import {cardBox} from './card-layout';
import {motionCardInstanceSchema} from '@motion-master/schema';

describe('v1.3 baseline plus expanded catalog',()=>{
  it('retains HTML, scene and original cards alongside all 222 imports',()=>{
    const ids=starterCardDefinitions.map(d=>d.cardType);
    expect(ids).toHaveLength(275);
    expect(new Set(ids).size).toBe(275);
    expect(ids.filter(id=>id.startsWith('hv-'))).toHaveLength(23);
    for(const id of ['html-motion','explain-scene','metric-focus','shotcraft-blur-slide'])expect(ids).toContain(id);
    expect(expandedCardDefinitions).toHaveLength(222);
    expect(expandedCardDefinitions.filter(d=>d.cardType.startsWith('catalog-rve-')||d.cardType.startsWith('rve-')&&d.cardType!=='rve-bento-grid')).toHaveLength(81);
    expect(expandedCardDefinitions.filter(d=>d.cardType.startsWith('catalog-locomotion-')||d.cardType==='rve-bento-grid')).toHaveLength(61);
    for(const [family,count] of [['captions-kit',6],['motion-canvas',6],['remotion-resource',53],['lottiefiles',15]] as const)
      expect(expandedCardDefinitions.filter(d=>d.cardType.startsWith(`catalog-${family}-`))).toHaveLength(count);
  });
  it('all definitions create valid cards with complete classification',()=>{
    for(const d of starterCardDefinitions){
      expect(()=>motionCardInstanceSchema.parse({...d.defaults,cardId:'test',trackId:'overlay-main',startFrame:0})).not.toThrow();
      expect(d.classification?.level3).toBeTruthy();
      expect(d.classification?.level3).not.toBe('未分类');
    }
  });
  it('renders every imported visual through the same movable and resizable layout box',()=>{
    for(const definition of expandedCardDefinitions){
      const card={...structuredClone(definition.defaults),cardId:'expanded',trackId:'overlay-main',startFrame:0};
      card.content.title='合并验证';
      card.layout={x:12,y:15,width:70,height:60,scale:.5};
      expect(cardBox(card)).toEqual({x:12,y:15,width:35,height:30});
      const html=renderToStaticMarkup(<MotionCardView card={card} frame={22} palette={getPalette('dark')}/>);
      expect(html).toContain('data-card-visual="expanded"');
      expect(html).toContain('left:12%;top:15%;width:35%;height:30%');
      expect(html).toContain('viewBox="0 0 1280 720"');
      expect(html).toContain('foreignObject');
      expect(html).not.toContain('NaN');
    }
  });
});
