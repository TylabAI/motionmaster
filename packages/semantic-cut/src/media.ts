import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {planCut,readWords,transcriptQualityWarnings,type Decision,type Range} from './index';
import {transcribeAliyunFile,type AliyunAsrSettings} from './aliyun-asr';

export type AsrRuntimeSettings={
  provider:'local-faster-whisper'|'aliyun-filetrans';
  local:{model:string;device:'cpu'|'cuda'|'auto';computeType:string;language:string;initialPrompt:string};
  aliyun:AliyunAsrSettings;
};

const require=createRequire(import.meta.url);
export function mediaExecutables() {
  const compositor=path.dirname(require.resolve('@remotion/compositor-win32-x64-msvc'));
  const bundled=path.join(process.env.PIPCLAW_EXTENSION_ROOT??process.cwd(),'runtime','ffmpeg.exe');
  return {ffmpeg:process.env.MOTION_MASTER_FFMPEG ?? (existsSync(bundled)?bundled:path.join(compositor,'ffmpeg.exe')),ffprobe:process.env.MOTION_MASTER_FFPROBE ?? path.join(compositor,'ffprobe.exe')};
}
export const runMedia=(executable:string,args:string[],timeoutMs=30*60_000) => new Promise<{stdout:string;stderr:string}>((resolve,reject)=>{
  const child=spawn(executable,args,{windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
  const timer=setTimeout(()=>{child.kill();reject(new Error('处理超时，原始素材未改动'));},timeoutMs);
  child.stdout.on('data',chunk=>{stdout+=chunk;});child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-2_000_000);});
  child.on('error',error=>{clearTimeout(timer);reject(error);});
  child.on('close',code=>{clearTimeout(timer);code===0?resolve({stdout,stderr}):reject(new Error(stderr.slice(-1600)||`处理进程退出：${code}`));});
});
export async function inspectMedia(file:string) {
  const {stdout}=await runMedia(mediaExecutables().ffprobe,['-v','error','-show_format','-show_streams','-of','json',file],60_000);
  const raw=JSON.parse(stdout);const video=raw.streams?.find((s:any)=>s.codec_type==='video'&&!s.disposition?.attached_pic);
  if(!video)throw new Error('素材中没有视频轨道');
  const duration=Number(video.duration ?? raw.format?.duration);
  if(!Number.isFinite(duration)||duration<=0)throw new Error('无法读取视频时长');
  return {duration,width:Number(video.width),height:Number(video.height),hasAudio:raw.streams.some((s:any)=>s.codec_type==='audio')};
}
export function parseSilences(stderr:string,fps:number,duration:number):Range[] {
  const spans:Range[]=[];let start:number|undefined;
  for(const match of stderr.matchAll(/silence_(start|end):\s*([\d.]+)/g)) {
    if(match[1]==='start') start=Number(match[2]);
    else if(start!==undefined) {spans.push({startFrame:Math.ceil(start*fps),endFrame:Math.min(duration,Math.floor(Number(match[2])*fps))});start=undefined;}
  }
  if(start!==undefined)spans.push({startFrame:Math.ceil(start*fps),endFrame:duration});
  return spans.filter(r=>r.endFrame>r.startFrame);
}
export function resolveLocalAsrModel(configured:string,runtimeRoot:string,cwd=process.cwd()) {
  if(path.isAbsolute(configured))return configured;
  const normalized=configured.replace(/^runtime[\\/]/,'');
  if(/^models[\\/]/.test(normalized))return path.join(runtimeRoot,normalized);
  if(/[\\/]/.test(configured)){
    const resolved=path.resolve(cwd,configured);
    if(existsSync(resolved))return resolved;
  }
  return configured;
}
export async function analyzeMedia(file:string,options:{fps:number;workDir:string;runtimeRoot:string;asrSettings?:AsrRuntimeSettings;transcript?:unknown;decisions?:Decision[];onProgress?:(stage:string)=>void}) {
  const media=await inspectMedia(file),durationFrames=Math.ceil(media.duration*options.fps);
  await mkdir(options.workDir,{recursive:true});let silences:Range[]=[];let transcript=options.transcript;const warnings:string[]=[];
  const {ffmpeg}=mediaExecutables();
  if(media.hasAudio) {
    options.onProgress?.('正在检测停顿与安全切点');
    const result=await runMedia(ffmpeg,['-hide_banner','-nostdin','-i',file,'-vn','-af','silencedetect=noise=-38dB:d=0.9','-f','null','-']);
    silences=parseSilences(result.stderr,options.fps,durationFrames);
    if(!transcript) {
      const audio=path.join(options.workDir,'speech.wav');
      await runMedia(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-y','-i',file,'-vn','-ac','1','-ar','16000',audio]);
      if(options.asrSettings?.provider==='aliyun-filetrans'){
        options.onProgress?.('正在使用云端文件转写生成逐词字幕');
        transcript=await transcribeAliyunFile(audio,options.asrSettings.aliyun,options.workDir,options.onProgress);
      } else {
      const python=process.env.MOTION_ASR_PYTHON ?? path.join(options.runtimeRoot,'asr-env','Scripts','python.exe');
      const runner=path.join(options.runtimeRoot,'semantic-cut-asr.py');
      const configured=process.env.MOTION_ASR_MODEL ?? options.asrSettings?.local.model ?? 'runtime/models/faster-whisper-large-v3-turbo';
      const model=resolveLocalAsrModel(configured,options.runtimeRoot);
      if(existsSync(python)&&existsSync(runner)&&(existsSync(model)||!path.isAbsolute(configured))) {
        try {
          options.onProgress?.('正在本地转录并定位词句');
          const output=path.join(options.workDir,'transcript.json');
          const local=options.asrSettings?.local;
          await runMedia(python,[runner,'--audio',audio,'--model',model,'--download-root',path.join(options.runtimeRoot,'models'),'--output',output,'--device',local?.device??'cpu','--compute-type',local?.computeType??'int8','--language',local?.language??'zh','--initial-prompt',local?.initialPrompt??'']);
          transcript=JSON.parse(await readFile(output,'utf8'));
        } catch(error) {warnings.push(`词级转录未完成，仅应用停顿初剪：${error instanceof Error?error.message:String(error)}`);}
      } else warnings.push('本地转录模型尚未准备：本次仅做停顿初剪。可导入逐词转录 JSON 后重新分析。');
      }
    }
  } else warnings.push('视频没有音轨，保留完整素材；可继续手工剪辑。');
  options.onProgress?.('正在生成保留片段与可恢复片段');
  const plan=planCut({fps:options.fps,durationFrames,words:transcript?readWords(transcript,options.fps,durationFrames):[],silences,decisions:options.decisions});
  plan.warnings.push(...warnings);
  if(transcript)plan.warnings.push(...transcriptQualityWarnings(plan.wordCues,options.fps,durationFrames));
  if(!plan.removedRanges.length)plan.warnings.push('未找到符合当前保守规则的可自动删除片段，原片完整保留。');
  await writeFile(path.join(options.workDir,'analysis.json'),JSON.stringify({...plan,sourcePath:file},null,2));
  return {...plan,media,mode:plan.wordCues.length?'transcript-and-acoustic':'acoustic-only'};
}
