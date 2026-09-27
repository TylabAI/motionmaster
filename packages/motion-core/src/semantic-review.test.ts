import {it,expect} from 'vitest';
import {createProject,applyEditPlan} from './index';
import {semanticReviewRequest,importSemanticReview} from './semantic-review';
const source=()=>{
 const p=createProject({projectId:'review-test',title:'Review',durationFrames:900});
 p.transcript={revision:1,subtitleCues:[],cutDecisions:[],wordCues:Array.from({length:8},(_,i)=>({wordId:`w${i}`,text:`词${i}`,startFrame:i*60,endFrame:i*60+30,keep:true}))};
 return applyEditPlan(p,[{startFrame:0,endFrame:900}]);
};
const answer=(p:ReturnType<typeof source>)=>({projectId:p.projectId,fingerprint:semanticReviewRequest(p).fingerprint,reviewer:'Codex',summary:'删除失败重说，保留完整后一遍。',limitations:['只检查了字幕'],recommendations:[{firstWordId:'w0',lastWordId:'w1',type:'retake',confidence:.9,reason:'前遍中断，后遍完整表达相同内容。',evidenceWordIds:['w3','w4']}]});
it('stores proposals without changing cuts, cards or transcript timing',()=>{const p=source(),before=structuredClone(p);const proposals=importSemanticReview(p,answer(p));expect(proposals[0].status).toBe('proposed');expect(proposals[0].endFrame).toBe(90);expect(p.editPlan).toEqual(before.editPlan);expect(p.timeline).toEqual(before.timeline);expect(p.transcript!.wordCues).toEqual(before.transcript!.wordCues);});
it('rejects stale transcript, source and manual edits',()=>{for(const change of [(p:any)=>{p.transcript.wordCues[0].text='变更';},(p:any)=>{p.media.assetId='new.mp4';},(p:any)=>{p.editPlan.keptRanges=[{startFrame:10,endFrame:900}];}]){const p=source(),a=answer(p);change(p);expect(()=>importSemanticReview(p,a)).toThrow(/变化/);}});
it('allows unrelated card layout edits during analysis',()=>{const p=source(),a=answer(p);p.version++;p.title='改名';expect(()=>importSemanticReview(p,a)).not.toThrow();});
it('rejects invented and reversed IDs without storing partial results',()=>{for(const r of [{firstWordId:'fake'},{firstWordId:'w5',lastWordId:'w1'}]){const p=source(),a=answer(p);Object.assign(a.recommendations[0],r);expect(()=>importSemanticReview(p,a)).toThrow(/字幕词/);expect(p.transcript!.cutDecisions).toHaveLength(0);}});
it('requires retained evidence for retakes',()=>{const p=source(),a=answer(p);a.recommendations[0].evidenceWordIds=[];expect(()=>importSemanticReview(p,a)).toThrow(/依据/);});
it('rejects mutually deleted evidence',()=>{const p=source(),a=answer(p);a.recommendations.push({...a.recommendations[0],firstWordId:'w3',lastWordId:'w4',evidenceWordIds:['w0']});expect(()=>importSemanticReview(p,a)).toThrow(/另一条/);expect(p.transcript!.cutDecisions).toHaveLength(0);});
it('rejects overlapping proposals and ranges across prior cuts',()=>{const p=source(),a=answer(p);a.recommendations.push({...a.recommendations[0]});expect(()=>importSemanticReview(p,a)).toThrow(/重叠/);const cut=applyEditPlan(source(),[{startFrame:0,endFrame:35},{startFrame:55,endFrame:900}]);expect(()=>importSemanticReview(cut,answer(cut))).toThrow(/跨越/);});
it('accepts a valid no-cuts assessment and rejects extra invented timestamps',()=>{const p=source(),a=answer(p);a.recommendations=[];importSemanticReview(p,a);expect(p.semanticReview!.decisionIds).toEqual([]);const q=source(),b=answer(q);Object.assign(b.recommendations[0],{startFrame:999});expect(()=>importSemanticReview(q,b)).toThrow();});
it('preserves a shared rounding frame and rejects larger ASR overlap',()=>{const p=source();p.transcript!.wordCues[2].startFrame=89;const proposals=importSemanticReview(p,answer(p));expect(proposals[0].endFrame).toBe(89);const q=source();q.transcript!.wordCues[2].startFrame=85;expect(()=>importSemanticReview(q,answer(q))).toThrow(/重叠/);});

it('allows keep/review to cite the candidate itself as contextual evidence',()=>{
 for(const verdict of ['keep','review']){const p=source();p.transcript!.cutDecisions=[{cutId:'candidate',startFrame:0,endFrame:90,type:'duplicate',confidence:.6,sourceWordIds:['w0','w1'],evidenceWordIds:[],status:'proposed',reason:'可能重复'}];const a={...answer(p),recommendations:[],candidateReviews:[{cutId:'candidate',verdict,reason:'自然强调需要保留原句',evidenceWordIds:['w0','w1']}]};expect(()=>importSemanticReview(p,a)).not.toThrow();expect(p.transcript!.cutDecisions[0].reviewVerdict).toBe(verdict);expect(p.editPlan!.removedRanges).toEqual([]);}
});
it('allows review context to overlap a separate valid deletion without treating it as retained replacement',()=>{
 const p=source();p.transcript!.cutDecisions=[{cutId:'candidate',startFrame:20,endFrame:40,type:'pause',confidence:.5,sourceWordIds:[],evidenceWordIds:[],status:'proposed',reason:'停顿与口播冲突'}];const a={...answer(p),candidateReviews:[{cutId:'candidate',verdict:'review',reason:'不单独剪此停顿，按整句重说处理',evidenceWordIds:['w0']}]};expect(importSemanticReview(p,a)).toHaveLength(1);
});
it('still rejects remove evidence inside the cut or deleted by another proposal atomically',()=>{
 for(const span of [[0,90],[500,540]]){const p=source();p.transcript!.cutDecisions=[{cutId:'candidate',startFrame:span[0],endFrame:span[1],type:'retake',confidence:.9,sourceWordIds:[],evidenceWordIds:[],status:'proposed',reason:'删除候选'}];const a={...answer(p),candidateReviews:[{cutId:'candidate',verdict:'remove',reason:'错误替代依据不得执行',evidenceWordIds:['w0']}]};expect(()=>importSemanticReview(p,a)).toThrow(/删除依据/);expect(p.transcript!.cutDecisions).toHaveLength(1);expect(p.editPlan!.removedRanges).toEqual([]);}
});
