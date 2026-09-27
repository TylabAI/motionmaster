import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import type {MotionProject} from '@motion-master/schema';
import {mediaExecutables,inspectMedia,runMedia} from '../../semantic-cut/src/media';
export function roughCutKey(project:MotionProject){return createHash('sha256').update(JSON.stringify({asset:project.media.assetId,fps:project.canvas.fps,ranges:project.editPlan?.keptRanges})).digest('hex').slice(0,20);}
export async function findRoughCut(project:MotionProject,directory:string){
  const folder=path.join(directory,'renders',`rough-cut-${roughCutKey(project)}`);
  const manifest=JSON.parse(await readFile(path.join(folder,'manifest.json'),'utf8'));
  const output=path.join(folder,'rough-cut.mp4');await stat(output);return output;
}
export async function renderProjectRoughCut(project:MotionProject,directory:string,source:string){
  if(!project.editPlan)throw new Error('请先生成初剪计划');
  const key=roughCutKey(project),folder=path.join(directory,'renders',`rough-cut-${key}`);
  await mkdir(folder,{recursive:true});
  const output=path.join(folder,'rough-cut.mp4'),script=path.join(folder,'filters.txt');
  const info=await inspectMedia(source);const {fps}=project.canvas;
  const filters:string[]=[],inputs:string[]=[];
  // Normalize the video clock once, then partition it. Continuous audio is encoded once.
  const ranges=project.editPlan.keptRanges;
  filters.push(`[0:v:0]fps=${fps},split=${ranges.length}${ranges.map((_,i)=>`[s${i}]`).join('')}`);
  if(info.hasAudio)filters.push(`[0:a:0]aresample=48000,asplit=${ranges.length}${ranges.map((_,i)=>`[a${i}]`).join('')}`);
  ranges.forEach((r,i)=>{
    filters.push(`[s${i}]trim=start_frame=${r.startFrame}:end_frame=${r.endFrame},setpts=PTS-STARTPTS[v${i}]`);
    if(info.hasAudio)filters.push(`[a${i}]atrim=start=${r.startFrame/fps}:end=${r.endFrame/fps},asetpts=PTS-STARTPTS,apad,atrim=duration=${(r.endFrame-r.startFrame)/fps}[b${i}]`);
    inputs.push(`[v${i}]${info.hasAudio?`[b${i}]`:''}`);
  });
  filters.push(`${inputs.join('')}concat=n=${ranges.length}:v=1:a=${info.hasAudio?1:0}[v]${info.hasAudio?'[a]':''}`);
  await writeFile(script,filters.join(';\n'));
  const durationFrames=ranges.reduce((s,r)=>s+r.endFrame-r.startFrame,0);
  await runMedia(mediaExecutables().ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-y','-i',source,'-filter_complex_script',script,'-map','[v]',...(info.hasAudio?['-map','[a]','-c:a','aac','-b:a','192k']:[]),'-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-frames:v',String(durationFrames),'-movflags','+faststart',output]);
  const {stdout}=await runMedia(mediaExecutables().ffprobe,['-v','error','-show_streams','-show_format','-of','json',output]);
  const probe=JSON.parse(stdout),video=probe.streams.find((s:any)=>s.codec_type==='video');
  if(Number(video?.nb_frames)!==durationFrames)throw new Error('粗剪输出帧数与剪辑计划不一致');
  const manifest={renderId:key,projectId:project.projectId,version:project.version,editRevision:project.editReview?.revision??0,kind:'rough-cut',status:'completed',outputPaths:[output],durationFrames,createdAt:new Date().toISOString()};
  await writeFile(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2));return manifest;
}
