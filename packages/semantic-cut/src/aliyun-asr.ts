import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
export type AliyunAsrSettings={submitUrl:string;queryUrl:string;uploadUrl:string;apiKey:string;model:string;language:string;enableItn:boolean;vocabulary:string};

type FetchLike=typeof fetch;
const json=async(response:Response,label:string)=>{
  const raw=await response.text();let value:any;
  try{value=raw?JSON.parse(raw):{};}catch{throw new Error(`${label}返回了无效 JSON（HTTP ${response.status}）`);}
  if(!response.ok)throw new Error(`${label}失败（HTTP ${response.status}）：${value.message??value.code??raw.slice(0,300)}`);
  return value;
};

export function normalizeAliyunTranscript(raw:any){
  const transcripts=Array.isArray(raw?.transcripts)?raw.transcripts:[];
  const words=transcripts.flatMap((transcript:any)=>Array.isArray(transcript?.sentences)?transcript.sentences:[]).flatMap((sentence:any)=>Array.isArray(sentence?.words)?sentence.words:[]).flatMap((word:any,index:number)=>{
    const start=Number(word.begin_time),end=Number(word.end_time),text=String(word.text??'').trim()+String(word.punctuation??'').trim();
    return text&&Number.isFinite(start)&&Number.isFinite(end)&&end>start?[{wordId:`aliyun-word-${index+1}`,start:start/1000,end:end/1000,word:text,probability:word.confidence}]:[];
  });
  if(!words.length)throw new Error('云端模型没有返回逐词时间戳。MotionMaster 已停止生成字幕和粗剪时间轴；请改用支持 words[].begin_time/end_time 的文件转写模型。');
  return {provider:'aliyun-filetrans',language:transcripts[0]?.sentences?.[0]?.language??'',words,segments:transcripts.flatMap((item:any)=>item.sentences??[]).map((sentence:any)=>({start:Number(sentence.begin_time)/1000,end:Number(sentence.end_time)/1000,text:String(sentence.text??''),words:(sentence.words??[]).map((word:any)=>({start:Number(word.begin_time)/1000,end:Number(word.end_time)/1000,word:String(word.text??'')+String(word.punctuation??'')}))}))};
}

const vocabularyObject=(source:string)=>Object.fromEntries(source.split(/\r?\n|,/).map(line=>line.trim()).filter(Boolean).map(line=>{const match=/^(.*?)(?:[:：]\s*(\d+))?$/.exec(line)!;return [match[1].trim(),Math.max(1,Math.min(10,Number(match[2]??5)))];}));

export async function transcribeAliyunFile(audioFile:string,settings:AliyunAsrSettings,workDir:string,onProgress?:(stage:string)=>void,fetcher:FetchLike=fetch){
  if(!settings.apiKey)throw new Error('尚未配置百炼 API Key。请在右上角“设置 → 语音识别与字幕”中填写后重试。');
  onProgress?.('正在上传提取后的 16k 单声道音频（原视频不会上传）');
  const policyUrl=new URL(settings.uploadUrl);policyUrl.searchParams.set('action','getPolicy');policyUrl.searchParams.set('model',settings.model);
  const policy=await json(await fetcher(policyUrl,{headers:{Authorization:`Bearer ${settings.apiKey}`,'Content-Type':'application/json'}}),'获取临时上传凭证');
  const p=policy.data??{};for(const field of ['upload_host','upload_dir','oss_access_key_id','policy','signature'])if(!p[field])throw new Error(`上传凭证缺少 ${field}`);
  const key=`${String(p.upload_dir).replace(/\/$/,'')}/${path.basename(audioFile).replace(/[^a-zA-Z0-9._-]/g,'-')}`;
  const form=new FormData();
  form.append('OSSAccessKeyId',String(p.oss_access_key_id));form.append('policy',String(p.policy));form.append('Signature',String(p.signature));
  form.append('key',key);form.append('x-oss-object-acl',String(p.x_oss_object_acl??'private'));form.append('x-oss-forbid-overwrite',String(p.x_oss_forbid_overwrite??'true'));form.append('success_action_status','200');
  form.append('file',new Blob([await readFile(audioFile)]),path.basename(audioFile));
  const upload=await fetcher(String(p.upload_host),{method:'POST',body:form});if(!upload.ok)throw new Error(`上传临时音频失败（HTTP ${upload.status}）`);
  const ossUrl=`oss://${key}`,isQwen3=/^qwen3-asr/i.test(settings.model),vocabulary=vocabularyObject(settings.vocabulary);
  const parameters:any={channel_id:[0],enable_itn:settings.enableItn};
  if(settings.language)parameters[isQwen3?'language':'language_hints']=isQwen3?settings.language:[settings.language];
  if(isQwen3)parameters.enable_words=true;else if(Object.keys(vocabulary).length)parameters.vocabulary=vocabulary;
  onProgress?.(`已上传音频，正在提交 ${settings.model} 转写任务`);
  const submission=await json(await fetcher(settings.submitUrl,{method:'POST',headers:{Authorization:`Bearer ${settings.apiKey}`,'Content-Type':'application/json','X-DashScope-Async':'enable','X-DashScope-OssResourceResolve':'enable'},body:JSON.stringify({model:settings.model,input:isQwen3?{file_url:ossUrl}:{file_urls:[ossUrl]},parameters})}),'提交语音转写任务');
  const taskId=String(submission.output?.task_id??'');if(!taskId)throw new Error('百炼响应中没有 task_id');
  const queryUrl=settings.queryUrl.replace('{task_id}',encodeURIComponent(taskId));let task:any;
  const started=Date.now();let attempt=0;
  while(Date.now()-started<45*60_000){
    if(attempt++)await new Promise(resolve=>setTimeout(resolve,Math.min(5000,1500+attempt*250)));
    task=await json(await fetcher(queryUrl,{headers:{Authorization:`Bearer ${settings.apiKey}`,'Content-Type':'application/json'}}),'查询语音转写任务');
    const status=String(task.output?.task_status??'UNKNOWN');onProgress?.(`云端语音转写中：${status}`);
    if(status==='SUCCEEDED')break;if(status==='FAILED'||status==='UNKNOWN')throw new Error(`百炼转写失败：${task.output?.message??task.output?.code??status}`);
  }
  if(task?.output?.task_status!=='SUCCEEDED')throw new Error('百炼转写超过 45 分钟仍未完成');
  const result=task.output?.results?.find((item:any)=>item.subtask_status==='SUCCEEDED')??task.output?.result;
  const resultUrl=result?.transcription_url;if(!resultUrl)throw new Error(`百炼任务完成但没有 transcription_url：${result?.message??result?.code??'未知原因'}`);
  const raw=await json(await fetcher(String(resultUrl)),'下载转写结果');
  await writeFile(path.join(workDir,'transcript-provider-raw.json'),JSON.stringify(raw,null,2),'utf8');
  return normalizeAliyunTranscript(raw);
}
