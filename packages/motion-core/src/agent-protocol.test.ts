import {it,expect} from 'vitest';
import {createProject,applyEditPlan} from './index';
import {agentTask,agentProtocol,finishAgentReview} from './agent-protocol';
import {editKey} from './precut-confirm';
const pending=()=>{const p=applyEditPlan(createProject({projectId:'external-test',title:'外部 Agent',durationFrames:300}),[{startFrame:0,endFrame:300}]);p.transcript={revision:1,subtitleCues:[],wordCues:[{wordId:'w',text:'保留内容',startFrame:100,endFrame:150,keep:true}],cutDecisions:[{cutId:'pause',type:'pause',startFrame:0,endFrame:50,confidence:.9,sourceWordIds:[],evidenceWordIds:[],status:'proposed',reason:'停顿'}]};p.preCut={jobId:'job',status:'awaiting-agent',stage:'等候',warnings:[]};p.preCutDraft={jobId:'job',baseEditKey:editKey(p),decisionIds:['pause'],recommendedIds:[],frames:[{id:'frame-1',frame:10,file:'frame-1.jpg',reason:'候选静帧'}]};return p;};
const answer=(p:ReturnType<typeof pending>)=>({projectId:p.projectId,fingerprint:agentTask(p).fingerprint,reviewer:'Other Agent',summary:'保留演示停顿',limitations:['未试听'],candidateReviews:[{cutId:'pause',verdict:'keep',reason:'停顿可能对应操作演示'}],recommendations:[]});
it('discovers agent-neutral resources and preserves access prefix',()=>{const task=agentTask(pending(),'/host-token');expect(task.frameResources[0].url).toBe('/host-token/api/projects/external-test/precut/frame/frame-1');expect(agentProtocol('/host-token').operations.listTasks.path).toBe('/host-token/api/agent/tasks');expect(task.resultSchema).toHaveProperty('properties');});
it('external result moves only to confirmation, preserving edit and exact source',()=>{const p=pending(),before=structuredClone(p);finishAgentReview(p,'job',answer(p));expect(p.preCut!.status).toBe('awaiting-confirmation');expect(p.editPlan).toEqual(before.editPlan);expect(p.timeline).toEqual(before.timeline);expect(p.preCutDraft!.confirmationFingerprint).toBeTruthy();expect(p.semanticReview!.reviewer).toBe('Other Agent');expect(()=>finishAgentReview(p,'job',answer(p))).toThrow();});
it('rejects wrong task, incomplete reviews, stale source and changed edit',()=>{const p=pending();expect(()=>finishAgentReview(p,'old',answer(p))).toThrow(/任务/);const a=answer(p);a.candidateReviews=[];expect(()=>finishAgentReview(p,'job',a)).toThrow(/未完整/);const q=pending(),b=answer(q);q.transcript!.wordCues[0].text='变化';expect(()=>finishAgentReview(q,'job',b)).toThrow(/变化/);const n=pending(),c=answer(n);n.editPlan!.keptRanges[0].endFrame=200;expect(()=>finishAgentReview(n,'job',c)).toThrow(/剪辑/);});
it('automatically applies a verified retake with retained evidence, without a confirmation draft',()=>{
 const p=pending();p.preCut!.executionPolicy='auto-retakes';p.transcript!.cutDecisions[0].type='retake';
 const a=answer(p);a.candidateReviews=[{cutId:'pause',verdict:'remove',reason:'前遍未完成，后文完整替代',evidenceWordIds:['w']}] as any;
 finishAgentReview(p,'job',a);
 expect(p.preCut!.status).toBe('completed');expect(p.preCutDraft).toBeUndefined();
 expect(p.editPlan!.removedRanges).toEqual([{startFrame:0,endFrame:50}]);expect(p.canvas.durationFrames).toBe(250);
 expect(p.transcript!.wordCues[0].keep).toBe(true);
});
it('automatically keeps uncertain retakes and missing evidence without asking for review',()=>{
 for(const verdict of ['review','keep','remove']){
 const p=pending();p.preCut!.executionPolicy='auto-retakes';p.transcript!.cutDecisions[0].type='retake';const a=answer(p);a.candidateReviews[0].verdict=verdict;
 finishAgentReview(p,'job',a);expect(p.preCut!.status).toBe('completed');expect(p.editPlan!.removedRanges).toEqual([]);expect(p.preCutDraft).toBeUndefined();
 }
});
it('rejects invented candidate evidence before applying any cuts',()=>{
 const p=pending();p.preCut!.executionPolicy='auto-retakes';const a=answer(p);(a.candidateReviews[0] as any).evidenceWordIds=['invented'];
 expect(()=>finishAgentReview(p,'job',a)).toThrow(/依据/);expect(p.editPlan!.removedRanges).toEqual([]);
});
