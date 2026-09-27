import {it,expect} from 'vitest';
import {createProject,applyEditPlan} from './index';
import {editKey,confirmPreCut} from './precut-confirm';
import {semanticReviewRequest} from './semantic-review';
import {motionProjectSchema} from '@motion-master/schema';
function pending(){
 const p=applyEditPlan(createProject({projectId:'confirm-test',title:'Test',durationFrames:900}),[{startFrame:0,endFrame:900}]);
 p.media.assetId='test.mp4';
 p.transcript={revision:1,subtitleCues:[],wordCues:[{wordId:'a',text:'失败的开头',startFrame:100,endFrame:150,keep:true},{wordId:'b',text:'重新说完整',startFrame:200,endFrame:300,keep:true}],cutDecisions:[{cutId:'d',type:'retake',startFrame:100,endFrame:150,sourceWordIds:['a'],evidenceWordIds:['b'],confidence:.9,status:'proposed',reason:'后一遍完整替代'}]};
 p.preCut={jobId:'j',status:'awaiting-confirmation',stage:'请确认',warnings:[]};
 p.preCutDraft={jobId:'j',baseEditKey:editKey(p),decisionIds:['d'],recommendedIds:['d'],frames:[]};
 p.preCutDraft.confirmationFingerprint=semanticReviewRequest(p).fingerprint;return p;
}
it('does not cut at proposal time; explicit confirmation cuts, adds subtitles and keeps recoverable source',()=>{const p=pending();expect(p.canvas.durationFrames).toBe(900);expect(p.editPlan!.removedRanges).toEqual([]);confirmPreCut(p,'j',['d']);expect(p.canvas.durationFrames).toBe(850);expect(p.editPlan!.removedRanges).toEqual([{startFrame:100,endFrame:150}]);expect(p.sourceTimeline!.segments.length).toBeGreaterThan(0);expect(p.timeline.segments.length).toBeGreaterThan(0);expect(p.preCut?.status).toBe('completed');expect(p.preCutDraft).toBeUndefined();expect(()=>confirmPreCut(p,'j',['d'])).toThrow();});
it('all keep confirmation leaves video duration unchanged',()=>{const p=pending();confirmPreCut(p,'j',[]);expect(p.canvas.durationFrames).toBe(900);expect(p.transcript!.cutDecisions[0].status).toBe('rejected');});
it('confirmation fingerprint survives schema field ordering and disk roundtrip',()=>{const p=pending();p.transcript!.cutDecisions[0].reviewReason='保存字段顺序变化';p.preCutDraft!.confirmationFingerprint=semanticReviewRequest(p).fingerprint;const disk=motionProjectSchema.parse(JSON.parse(JSON.stringify(p)));expect(()=>confirmPreCut(disk,'j',['d'])).not.toThrow();});
it('rejects stale media, words and manual cuts',()=>{for(const change of [(p:any)=>p.media.assetId='new.mp4',(p:any)=>p.transcript.wordCues[0].text='修改',(p:any)=>p.editPlan.keptRanges[0].endFrame=899]){const p=pending();change(p);expect(()=>confirmPreCut(p,'j',['d'])).toThrow(/变化/);}});
it('rejects forged selection, premature confirmation and evidence deletion',()=>{const p=pending();expect(()=>confirmPreCut(p,'j',['missing'])).toThrow(/建议/);p.preCut!.status='running';expect(()=>confirmPreCut(p,'j',['d'])).toThrow(/确认/);const q=pending();q.transcript!.cutDecisions.push({...q.transcript!.cutDecisions[0],cutId:'e',startFrame:200,endFrame:300,evidenceWordIds:[]});q.preCutDraft!.decisionIds.push('e');q.preCutDraft!.confirmationFingerprint=semanticReviewRequest(q).fingerprint;expect(()=>confirmPreCut(q,'j',['d','e'])).toThrow(/保留依据/);});
it('preserves existing cuts and remaps hand-edited cards',()=>{let p=pending();p.timeline.cards=[{cardId:'c',cardType:'lower-third',cardVersion:'1',trackId:'overlay-main',startFrame:250,durationFrames:50,content:{title:'人工内容'},appearance:{},layout:{x:42},motion:{},sourceSegmentIds:[]}];p=applyEditPlan(p,[{startFrame:0,endFrame:800}]);p.preCutDraft!.baseEditKey=editKey(p);p.preCutDraft!.confirmationFingerprint=semanticReviewRequest(p).fingerprint;confirmPreCut(p,'j',['d']);expect(p.editPlan!.removedRanges).toContainEqual({startFrame:800,endFrame:900});expect(p.timeline.cards[0].startFrame).toBe(200);expect(p.timeline.cards[0].layout.x).toBe(42);expect(p.timeline.cards[0].content.title).toBe('人工内容');});
