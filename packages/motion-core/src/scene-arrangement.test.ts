import {it,expect} from 'vitest';
import {createProject,applyEditPlan} from './index';
import {sceneRequest,applySceneResult,sceneLayout} from './scene-arrangement';
import {submitMotionResult} from '../../motion-api/src/motion-arrangement';
const project=()=>{
 const p=createProject({projectId:'scene-test',title:'Test',durationFrames:900});p.media.assetId='source.mp4';
 p.transcript={revision:1,subtitleCues:[],cutDecisions:[],wordCues:Array.from({length:12},(_,i)=>({wordId:`w${i}`,text:`词${i}`,startFrame:60*i,endFrame:60*i+30,keep:true}))};
 p.motionArrangement={jobId:'scene-job',status:'awaiting-agent',stage:'等待',provider:'external',startedAt:new Date().toISOString(),warnings:[],cardIds:[],frames:[]};
 return p;
};
const result=(p:ReturnType<typeof project>)=>({projectId:p.projectId,fingerprint:sceneRequest(p).fingerprint,summary:'按两步讲解',limitations:[],scenes:[{firstWordId:'w2',lastWordId:'w6',kind:'steps',title:'配置流程',body:'按顺序操作',reason:'讲解包含明确两步',items:[{text:'第一步',wordId:'w2'},{text:'第二步',wordId:'w5'}],frameId:null,protectedRegions:[]}]});
it('adds a word-bound overlay scene without modifying source media or cuts',()=>{const p=project(),before=structuredClone(p);const cards=applySceneResult(p,result(p));expect(cards).toHaveLength(1);expect(p.media).toEqual(before.media);expect(p.canvas.durationFrames).toBe(900);expect(p.editPlan!.removedRanges).toEqual([]);expect(p.timeline.cards[0].autoScene?.split).toBe(false);expect(p.timeline.cards[0].autoScene?.items[1].revealFrame).toBe(180);expect(p.motionArrangement?.status).toBe('completed');});
it('reprojects timing after cutting and restores it without duplicating scenes',()=>{const p=project();applySceneResult(p,result(p));const cut=applyEditPlan(p,[{startFrame:60,endFrame:900}]);expect(cut.timeline.cards).toHaveLength(1);expect(cut.timeline.cards[0].startFrame).toBe(60);expect(cut.timeline.cards[0].autoScene?.items[1].revealFrame).toBe(180);const restored=applyEditPlan(cut,[{startFrame:0,endFrame:900}]);expect(restored.timeline.cards[0].startFrame).toBe(120);expect(restored.timeline.cards[0].durationFrames).toBe(270);});
it('removes all-cut scenes and restores them with their original anchors',()=>{const p=project();applySceneResult(p,result(p));const cut=applyEditPlan(p,[{startFrame:0,endFrame:100},{startFrame:400,endFrame:900}]);expect(cut.timeline.cards).toHaveLength(0);expect(applyEditPlan(cut,[{startFrame:0,endFrame:900}]).timeline.cards).toHaveLength(1);});
it('preserves hand-authored cards and skips conflicting proposals',()=>{const p=project();p.timeline.cards=[{cardId:'manual',cardType:'lower-third',cardVersion:'1',startFrame:130,durationFrames:100,trackId:'overlay-main',sourceSegmentIds:[],content:{title:'手动内容'},layout:{x:33},appearance:{},motion:{}}];const original=structuredClone(p.timeline.cards[0]);applySceneResult(p,result(p));expect(p.timeline.cards).toHaveLength(1);expect(p.timeline.cards[0].content).toEqual(original.content);expect(p.motionArrangement?.cardIds).toHaveLength(0);expect(p.motionArrangement?.warnings.join()).toMatch(/跳过/);});
it('rejects stale edits, fake words, malformed items and unknown frame observations atomically',()=>{for(const mutate of [(a:any)=>a.fingerprint='stale',(a:any)=>a.scenes[0].firstWordId='fake',(a:any)=>a.scenes[0].items[1].wordId='w10',(a:any)=>a.scenes[0].frameId='fake']){const p=project(),a=result(p);mutate(a);expect(()=>applySceneResult(p,a)).toThrow();expect(p.timeline.cards).toHaveLength(0);}});
it('external submissions reject duplicates and incorrect job IDs',()=>{const p=project(),a=result(p);expect(()=>submitMotionResult(p,'other',a)).toThrow();submitMotionResult(p,'scene-job',a);expect(()=>submitMotionResult(p,'scene-job',a)).toThrow();});
it('uses protected-region-safe corners or split fallback, with portrait bounds',()=>{const p=project();expect(sceneLayout(p,'emphasis',[{x:0,y:0,width:50,height:100}]).box.x).toBeGreaterThan(50);expect(sceneLayout(p,'emphasis',[{x:0,y:0,width:100,height:100}]).skip).toBe(true);p.canvas.width=1080;p.canvas.height=1920;const layout=sceneLayout(p,'steps',[]);expect(layout.split).toBe(false);expect(layout.box.y+layout.box.height).toBeLessThan(90);});

it("keeps anchored scenes continuous across cuts within the spoken passage",()=>{const p=project();applySceneResult(p,result(p));const cut=applyEditPlan(p,[{startFrame:0,endFrame:240},{startFrame:300,endFrame:900}]);expect(cut.timeline.cards).toHaveLength(1);expect(cut.timeline.cards[0].startFrame).toBe(120);expect(cut.timeline.cards[0].durationFrames).toBe(210);expect(cut.timeline.cards[0].autoScene?.items[1].revealFrame).toBe(120);expect(applyEditPlan(cut,[{startFrame:0,endFrame:900}]).timeline.cards[0].durationFrames).toBe(270);});

it('does not overwrite a safe overlay with a split template layout',()=>{
 const p=project();p.motionArrangement!.frames=[{id:'f1',frame:120,file:'f1.jpg',reason:'场景参考'}];
 const a=result(p);Object.assign(a.scenes[0],{frameId:'f1',protectedRegions:[{x:0,y:0,width:50,height:100}]});
 const [card]=applySceneResult(p,a);expect(card.autoScene?.split).toBe(false);expect(card.layout.x).toBeGreaterThan(50);expect(card.layout.height).toBe(23);
});
it('uses split only for observed complex conflicts, and skips obstructed lightweight cards',()=>{
 for(const kind of ['steps','emphasis']){
 const p=project();p.motionArrangement!.frames=[{id:'f1',frame:120,file:'f1.jpg',reason:'场景参考'}];
 const a=result(p);Object.assign(a.scenes[0],{kind,frameId:'f1',protectedRegions:[{x:0,y:0,width:100,height:100}]});
 const cards=applySceneResult(p,a);if(kind==='steps')expect(cards[0].autoScene?.split).toBe(true);else {expect(cards).toHaveLength(0);expect(p.motionArrangement!.warnings.join()).toMatch(/不触发视频缩小/);}
 }
});
it('keeps every unobserved scene kind on the full-size source video',()=>{
 for(const kind of ['chapter','steps','comparison','emphasis','summary'])expect(sceneLayout(project(),kind,[]).split).toBe(false);
});
