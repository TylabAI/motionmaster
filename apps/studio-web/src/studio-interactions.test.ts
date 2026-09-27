import {describe, expect, it} from 'vitest';
import {starterCardDefinitions} from '@motion-master/cards-starter';
import {editedToSource, sourceToEdited} from './timeline-coordinates';
import {createAsset, importAssets} from './motion-assets';
import {marqueeBounds, rectsOverlap} from './timeline-selection';

describe('source timeline coordinates', () => {
  const ranges = [{startFrame:100,endFrame:200},{startFrame:300,endFrame:500}];
  it('maps cut boundaries differently for start and end, without displaying deleted time as edited time', () => {
    expect(editedToSource(100,ranges)).toBe(300);
    expect(editedToSource(100,ranges,'end')).toBe(200);
    expect(sourceToEdited(250,ranges)).toBe(100);
    expect(sourceToEdited(350,ranges)).toBe(150);
    expect(editedToSource(300,ranges)).toBe(500);
  });
  it('round trips retained frames and leaves uncut projects unchanged', () => {
    for (const frame of [100,150,199,300,375,499]) expect(editedToSource(sourceToEdited(frame,ranges),ranges)).toBe(frame);
    expect(editedToSource(120)).toBe(120);
    expect(sourceToEdited(120)).toBe(120);
  });
});
describe('timeline marquee selection', () => {
  it('normalizes reverse drags and selects every intersecting card', () => {
    const selection=marqueeBounds(320,180,100,40);
    expect(selection).toEqual({left:100,top:40,right:320,bottom:180});
    expect(rectsOverlap(selection,{left:120,top:70,right:180,bottom:100})).toBe(true);
    expect(rectsOverlap(selection,{left:321,top:70,right:380,bottom:100})).toBe(false);
  });
  it('includes cards touched at the marquee boundary', () => {
    expect(rectsOverlap({left:10,top:10,right:20,bottom:20},{left:20,top:20,right:30,bottom:30})).toBe(true);
  });
});
describe('reusable motion assets', () => {
  const definition = starterCardDefinitions[1];
  it('isolates presets from project timing and subtitle references', () => {
    const card = {...definition.defaults,cardId:'project-card',trackId:'overlay-main',startFrame:240,sourceSegmentIds:['s1'],seg:'s1'};
    const asset = createAsset(card,definition,'My preset');
    expect(asset.card.startFrame).toBe(0);
    expect(asset.card.sourceSegmentIds).toEqual([]);
    expect(asset.card.seg).toBeUndefined();
    expect(card.startFrame).toBe(240);
    expect(importAssets({assets:[asset]},starterCardDefinitions)[0].name).toBe('My preset');
  });
  it('accepts AI parameter presets only for installed card types', () => {
    const assets = importAssets({cardType:definition.cardType,durationFrames:90,content:{title:'AI title'}},starterCardDefinitions);
    expect(assets[0].card.content.title).toBe('AI title');
    expect(() => importAssets({cardType:'missing-renderer'},starterCardDefinitions)).toThrow('渲染器未安装');
    expect(() => importAssets({cardType:definition.cardType,durationFrames:-3},starterCardDefinitions)).toThrow('参数无效');
    expect(() => importAssets([],starterCardDefinitions)).toThrow('1–500');
  });
});
