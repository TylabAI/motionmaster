import path from 'node:path';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {FileProjectRepository} from '@motion-master/core';
import type {MotionProject} from '@motion-master/schema';
import {analyzeMedia} from '../../semantic-cut/src/media';
import {subtitleCues,type Decision} from '../../semantic-cut/src/index';
import {editKey} from '../../motion-core/src/precut-confirm';
import {finishAgentReview} from '../../motion-core/src/agent-protocol';
import {extractReviewFrames} from './review-media';
import {runCodexReview} from './codex-review';
import type {AsrSettings} from './asr-settings';

type Job=NonNullable<MotionProject['preCut']>;
export function preCutService(repository:FileProjectRepository,runtimeRoot:string,readAsrSettings:()=>Promise<AsrSettings>) {
 const active=new Map<string,Promise<void>>(),writes=new Map<string,Promise<void>>();
 const file=(id:string)=>path.join(repository.projectDir(id),'precut-status.json');
 const save=(id:string,job:Job)=>{const value=JSON.stringify(job,null,2);const work=(writes.get(id)??Promise.resolve()).catch(()=>{}).then(async()=>{const target=file(id),temp=`${target}.${job.jobId}.tmp`;await writeFile(temp,value);for(let n=0;;n++){try{await rename(temp,target);break;}catch(e){if(n>=6||!['EPERM','EACCES','EBUSY'].includes((e as NodeJS.ErrnoException).code??''))throw e;await new Promise(r=>setTimeout(r,50*(n+1)));}}});writes.set(id,work);return work;};
 const status=async(id:string)=>{
   const project=await repository.get(id);let job=project.preCut;
   if(job?.status==='running'){
     try{const stored=JSON.parse(await readFile(file(id),'utf8'));if(stored.jobId===job.jobId)job=stored;}catch{}
     if(!active.has(id)){job={...project.preCut!,status:'failed',stage:'分析已中断，未执行剪辑',error:'服务重启导致分析中断，请重新分析。'};await repository.mutate(id,project.version,'precut.interrupted',next=>{next.preCut=job;});return {job,project:await repository.get(id)};}
   }
   return {job,project};
 };
 const start=async(id:string,expectedVersion:number,transcript?:unknown,decisions?:Decision[],provider:'codex'|'external'='codex')=>{
   if(active.has(id))throw new Error('当前项目已有分析任务');active.set(id,Promise.resolve());
   try{
     const job:Job={jobId:randomUUID(),executionPolicy:'auto-retakes',status:'running',stage:'准备转录与分析（明确失败重说将自动移入可恢复轨道）',warnings:[]};
     const project=await repository.mutate(id,expectedVersion,'precut.started',next=>{if(!next.media.assetId)throw new Error('请先导入视频');if(['running','awaiting-agent'].includes(next.motionArrangement?.status??''))throw new Error('请先完成动效编排');next.preCut=job;delete next.preCutDraft;});
     await save(id,job);
     const work=async()=>{
       try{
         const workDir=path.join(repository.projectDir(id),'analysis',job.jobId);await mkdir(workDir,{recursive:true});
         const asset=path.join(repository.projectDir(id),'assets',project.media.assetId!);
         const asrSettings=await readAsrSettings();
         const plan=await analyzeMedia(asset,{fps:project.canvas.fps,workDir,runtimeRoot,asrSettings,transcript,decisions,onProgress:stage=>{job.stage=stage;}});
         if(!plan.wordCues.length)throw new Error('没有可用的逐词转录，无法完成语义初剪。请检查本地转录模型或导入转录后重试；轨道未改动。');
         job.warnings=plan.warnings;job.mode=`${asrSettings.provider}+${provider}-transcript-frames`;job.stage='正在准备语义分析材料';
         let draft=await repository.mutate(id,project.version,'precut.transcribed',next=>{
           const kept=next.editPlan?.keptRanges??[{startFrame:0,endFrame:plan.sourceDurationFrames}];
           const candidates=plan.cutDecisions.filter(d=>kept.some(r=>r.startFrame<=d.startFrame&&r.endFrame>=d.endFrame)).map(d=>({...d,cutId:`${job.jobId}-${d.cutId}`,evidenceWordIds:[],status:'proposed' as const}));
           next.transcript={revision:(next.transcript?.revision??0)+1,wordCues:plan.wordCues.map(w=>({...w,keep:kept.some(r=>w.startFrame<r.endFrame&&w.endFrame>r.startFrame)})),subtitleCues:subtitleCues(plan.wordCues.map(w=>({...w,keep:true})),next.canvas.fps),cutDecisions:candidates};
           delete next.semanticReview;
           next.preCutDraft={jobId:job.jobId,baseEditKey:editKey(next),decisionIds:candidates.map(d=>d.cutId),recommendedIds:[],frames:[]};next.preCut={...job};
         });
         job.stage='正在抽取关键静帧';
         let frames:NonNullable<MotionProject['preCutDraft']>['frames']=[];
         try{frames=await extractReviewFrames(asset,draft,workDir);}catch{job.warnings.push('关键静帧抽取失败，本次只按字幕分析；涉及操作画面的停顿请试听复核。');}
         draft=await repository.mutate(id,draft.version,'precut.frames_prepared',next=>{next.preCutDraft!.frames=frames;next.preCut={...job};});
         if(provider==='external'){
           Object.assign(job,{status:'awaiting-agent',stage:'分析材料已就绪，等待外部 Agent 提交决策'});
           await repository.mutate(id,draft.version,'precut.awaiting_agent',next=>{next.preCut={...job};});
         }else{
           const result=await runCodexReview(draft,workDir,stage=>{job.stage=stage;});
           const reviewed=await repository.mutate(id,draft.version,'precut.agent_finished',next=>{finishAgentReview(next,job.jobId,result,true);});
           Object.assign(job,reviewed.preCut);
         }
         await save(id,job);
       }catch(error){
         Object.assign(job,{status:'failed',stage:'分析未完成，未执行剪辑',error:error instanceof Error?error.message:String(error)});
         await save(id,job).catch(()=>{});
         try{const latest=await repository.get(id);if(latest.preCut?.jobId===job.jobId)await repository.mutate(id,latest.version,'precut.failed',next=>{next.preCut={...job};});}catch{}
       }finally{active.delete(id);}
     };
     const task=work();active.set(id,task);const timer=setInterval(()=>{if(job.status==='running')save(id,job).catch(()=>{});},1500);task.finally(()=>clearInterval(timer));return project;
   }catch(e){active.delete(id);throw e;}
 };
 return {start,status,running:(id:string)=>active.has(id)};
}


