import path from 'node:path';
import type {MotionProject} from '@motion-master/schema';
import {mediaExecutables,runMedia} from '../../semantic-cut/src/media';
export function pickReviewFrames(p:MotionProject) {
 const duration=p.editPlan?.sourceDurationFrames??p.canvas.durationFrames,fps=p.canvas.fps;
 const frames:Array<{id:string;frame:number;file:string;reason:string}>=[];
 const add=(frame:number,reason:string)=>{frame=Math.max(0,Math.min(duration-1,Math.round(frame)));if(frames.some(f=>Math.abs(f.frame-frame)<fps*.5)||frames.length>=16)return;const id=`frame-${frames.length+1}`;frames.push({id,frame,file:`${id}.jpg`,reason});};
 for(const fraction of [.05,.3,.6,.85])add(duration*fraction,'全片画面概览');
 const decisions=p.transcript?.cutDecisions??[];
 for(const d of decisions.filter(d=>d.type==='pause'&&d.endFrame-d.startFrame>=fps*2).sort((a,b)=>(b.endFrame-b.startFrame)-(a.endFrame-a.startFrame)).slice(0,3)){
   add(d.startFrame-fps*.3,`${d.cutId} 前`);add((d.startFrame+d.endFrame)/2,`${d.cutId} 中`);add(d.endFrame+fps*.3,`${d.cutId} 后`);
 }
 for(const d of decisions.filter(d=>d.type==='retake').slice(0,1)){add(d.startFrame,`${d.cutId} 前遍`);add(d.endFrame+fps*.4,`${d.cutId} 后遍`);}
 return frames;
}
export async function extractReviewFrames(file:string,p:MotionProject,workDir:string){
 const frames=pickReviewFrames(p);
 // Bounded sequential extraction keeps long videos from exhausting decoder memory.
 for(const f of frames)await runMedia(mediaExecutables().ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-y','-ss',String(f.frame/p.canvas.fps),'-i',file,'-frames:v','1','-vf','scale=800:-2','-q:v','3',path.join(workDir,f.file)],60_000);
 return frames;
}

