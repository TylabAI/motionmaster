import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {FileProjectRepository} from '@motion-master/core';
import type {MotionProject} from '@motion-master/schema';
import {analyzeMedia,mediaExecutables,runMedia} from '../../semantic-cut/src/media';
import {editedToSource,subtitleCues} from '../../semantic-cut/src/index';
import {applySceneResult,sceneRequest} from '../../motion-core/src/scene-arrangement';
import {runCodexScene} from './codex-review';

type Job=NonNullable<MotionProject['motionArrangement']>;
export function motionArrangementService(repository:FileProjectRepository,runtimeRoot:string){
 const active=new Map<string,Job>();
 const start=async(id:string,version:number,provider:'codex'|'external')=>{
  if(active.has(id))throw new Error('已有动效编排任务');
  const job:Job={jobId:randomUUID(),status:'running',stage:'准备字幕与画面材料',startedAt:new Date().toISOString(),provider,warnings:[],cardIds:[],frames:[]};
  active.set(id,job);
  let p:MotionProject;
  try{p=await repository.mutate(id,version,'motion.arrangement_started',p=>{if(p.preCut?.status==='running'||p.motionArrangement?.status==='running'||p.motionArrangement?.status==='awaiting-agent')throw new Error('已有任务，请先完成当前任务');if(!p.media.assetId)throw new Error('请先导入视频');p.motionArrangement=structuredClone(job);});}catch(e){active.delete(id);throw e;}
  void (async()=>{
   try{
    const dir=path.join(repository.projectDir(id),'motion-analysis',job.jobId);await mkdir(dir,{recursive:true});
    const asset=path.join(repository.projectDir(id),'assets',p.media.assetId!);
    if(!p.transcript?.wordCues.length){
     job.stage='本地转录，为动效定位词句（不剪辑视频）';
     const plan=await analyzeMedia(asset,{fps:p.canvas.fps,workDir:dir,runtimeRoot,onProgress:stage=>{job.stage=stage;}});
     if(!plan.wordCues.length)throw new Error('没有识别到可用词句，不能自动编排');
     p=await repository.mutate(id,p.version,'motion.transcribed',next=>{const kept=next.editPlan?.keptRanges??[{startFrame:0,endFrame:plan.sourceDurationFrames}];next.transcript={revision:(next.transcript?.revision??0)+1,wordCues:plan.wordCues.map(w=>({...w,keep:kept.some(r=>w.startFrame<r.endFrame&&w.endFrame>r.startFrame)})),subtitleCues:subtitleCues(plan.wordCues.map(w=>({...w,keep:true})),p.canvas.fps),cutDecisions:[]};});
    }
    job.stage='提取画面参考，规划可用布局空间';
    const kept=p.editPlan?.keptRanges??[{startFrame:0,endFrame:p.canvas.durationFrames}],duration=kept.reduce((n,r)=>n+r.endFrame-r.startFrame,0),count=Math.min(12,Math.max(1,Math.ceil(duration/p.canvas.fps/30)));
    for(let i=0;i<count;i++){
     const frame=editedToSource(Math.min(duration-1,Math.floor(duration*(i+.5)/count)),kept),id=`frame-${i+1}`,file=`${id}.jpg`;
     try{await runMedia(mediaExecutables().ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-y','-ss',String(frame/p.canvas.fps),'-i',asset,'-frames:v','1','-vf','scale=800:-2','-q:v','3',path.join(dir,file)],60_000);job.frames.push({id,frame,file,reason:'保留素材画面参考'});}catch{job.warnings.push(`第 ${i+1} 张画面提取失败，将使用分区布局保护原片`);}
     job.stage=`准备画面 ${i+1}/${count}`;
    }
    job.status=provider==='external'?'awaiting-agent':'running';job.stage=provider==='external'?'材料就绪，等待外部 Agent 编排':'Agent 正在编排讲解场景';
    p=await repository.mutate(id,p.version,'motion.materials_ready',next=>{next.motionArrangement=structuredClone(job);});
    if(provider==='codex'){
     const result=await runCodexScene(p,dir,stage=>{job.stage=stage;});
     p=await repository.mutate(id,p.version,'motion.arranged',next=>{applySceneResult(next,result);});
     Object.assign(job,p.motionArrangement);
    }
   }catch(e){
    job.status='failed';job.stage='编排未完成，已有卡片和视频未被替换';job.error=e instanceof Error?e.message:String(e);job.finishedAt=new Date().toISOString();
    try{const latest=await repository.get(id);if(latest.motionArrangement?.jobId===job.jobId)await repository.mutate(id,latest.version,'motion.arrangement_failed',next=>{next.motionArrangement=structuredClone(job);});}catch{}
   }finally{active.delete(id);}
  })();
  return p;
 };
 const status=async(id:string)=>{
  let p=await repository.get(id);
  if(p.motionArrangement?.status==='running'&&!active.has(id))p=await repository.mutate(id,p.version,'motion.arrangement_interrupted',next=>{next.motionArrangement!.status='failed';next.motionArrangement!.error='服务已重启，编排中断；原有卡片保留，可重新编排';next.motionArrangement!.finishedAt=new Date().toISOString();});
  return {project:p,job:active.get(id)??p.motionArrangement};
 };
 return {start,status};
}

export function motionTask(p:MotionProject,prefix=''){
 if(p.motionArrangement?.status!=='awaiting-agent')throw new Error('项目没有等待外部 Agent 的动效编排任务');
 return sceneRequest(p,prefix);
}
export function submitMotionResult(p:MotionProject,jobId:string,result:unknown){
 if(p.motionArrangement?.status!=='awaiting-agent'||p.motionArrangement.jobId!==jobId)throw new Error('动效任务已变化或已提交');
 return applySceneResult(p,result);
}
