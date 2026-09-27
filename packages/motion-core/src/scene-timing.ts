import type {MotionProject,MotionCardInstance} from '@motion-master/schema';
import {sourceToEdited} from '../../semantic-cut/src/index';
export function bindSourceScenes(p:MotionProject,cards:MotionCardInstance[]){
 const words=p.transcript?.wordCues??[],byId=new Map(words.map(w=>[w.wordId,w]));
 return cards.map(c=>{
  const a=c.autoScene;if(!a?.followWords)return c;
  const first=byId.get(a.firstWordId),last=byId.get(a.lastWordId);
  if(a.assetId!==p.media.assetId||!first||!last||last.endFrame<=first.startFrame)return {...c,durationFrames:0};
  return {...c,startFrame:first.startFrame,durationFrames:last.endFrame-first.startFrame};
 }).filter(c=>c.durationFrames>0);
}
export function resolveSceneItems(p:MotionProject,cards:MotionCardInstance[]){
 const words=p.transcript?.wordCues??[],ranges=p.editPlan?.keptRanges??[{startFrame:0,endFrame:p.canvas.durationFrames}];
 return cards.map(c=>{
  if(!c.autoScene)return c;
  return {...c,autoScene:{...c.autoScene,items:c.autoScene.items.map(item=>{const w=words.find(w=>w.wordId===item.wordId);const visible=w&&w.keep!==false&&ranges.some(r=>w.startFrame<r.endFrame&&w.endFrame>r.startFrame);return {...item,revealFrame:visible?Math.max(0,sourceToEdited(w!.startFrame,ranges)-c.startFrame):c.durationFrames+1};})}};
 });
}
