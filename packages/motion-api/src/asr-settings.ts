import path from 'node:path';
import {readFile,rename,writeFile} from 'node:fs/promises';
import {z} from 'zod';

export const DEFAULT_LOCAL_ASR_MODEL='runtime/models/faster-whisper-large-v3-turbo';
const localDefaults={model:DEFAULT_LOCAL_ASR_MODEL,device:'cpu' as const,computeType:'int8',language:'zh',initialPrompt:''};
const aliyunDefaults={submitUrl:'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription',queryUrl:'https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}',uploadUrl:'https://dashscope.aliyuncs.com/api/v1/uploads',apiKey:'',model:'qwen-audio-3.0-asr-flash-filetrans',language:'zh',enableItn:true,vocabulary:''};
const localSchema=z.object({
  model:z.string().trim().min(1).default(localDefaults.model),
  device:z.enum(['cpu','cuda','auto']).default('cpu'),
  computeType:z.string().trim().min(1).default('int8'),
  language:z.string().trim().default('zh'),
  initialPrompt:z.string().default(''),
});
const aliyunSchema=z.object({
  submitUrl:z.string().trim().url().default(aliyunDefaults.submitUrl),
  queryUrl:z.string().trim().url().refine(value=>value.includes('{task_id}'),'任务查询地址必须包含 {task_id}').default(aliyunDefaults.queryUrl),
  uploadUrl:z.string().trim().url().default(aliyunDefaults.uploadUrl),
  apiKey:z.string().default(''),
  model:z.string().trim().min(1).default('qwen-audio-3.0-asr-flash-filetrans'),
  language:z.string().trim().default('zh'),
  enableItn:z.boolean().default(true),
  vocabulary:z.string().default(''),
});
export const asrSettingsSchema=z.object({
  provider:z.enum(['local-faster-whisper','aliyun-filetrans']).default('local-faster-whisper'),
  local:localSchema.default(localDefaults),
  aliyun:aliyunSchema.default(aliyunDefaults),
}).default({provider:'local-faster-whisper',local:localDefaults,aliyun:aliyunDefaults});
export type AsrSettings=z.infer<typeof asrSettingsSchema>;
export type PublicAsrSettings=Omit<AsrSettings,'aliyun'>&{aliyun:Omit<AsrSettings['aliyun'],'apiKey'>&{apiKeyConfigured:boolean}};

export const defaultAsrSettings=():AsrSettings=>asrSettingsSchema.parse({});

export function asrSettingsStore(dataDir:string){
  const file=path.join(dataDir,'.motion-master-settings.json');
  const read=async():Promise<AsrSettings>=>{
    try{return asrSettingsSchema.parse(JSON.parse(await readFile(file,'utf8')));}
    catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return defaultAsrSettings();throw error;}
  };
  const publicValue=(value:AsrSettings):PublicAsrSettings=>({
    provider:value.provider,
    local:value.local,
    aliyun:{
      submitUrl:value.aliyun.submitUrl,queryUrl:value.aliyun.queryUrl,uploadUrl:value.aliyun.uploadUrl,
      model:value.aliyun.model,language:value.aliyun.language,enableItn:value.aliyun.enableItn,
      vocabulary:value.aliyun.vocabulary,apiKeyConfigured:Boolean(value.aliyun.apiKey),
    },
  });
  const update=async(input:Record<string,unknown>)=>{
    const current=await read();
    const local={...current.local,...(input.local&&typeof input.local==='object'?input.local:{})};
    const aliyunInput=input.aliyun&&typeof input.aliyun==='object'?input.aliyun as Record<string,unknown>:{};
    const apiKey=aliyunInput.clearApiKey===true?'':typeof aliyunInput.apiKey==='string'&&aliyunInput.apiKey.trim()?aliyunInput.apiKey.trim():current.aliyun.apiKey;
    const aliyun={...current.aliyun,...aliyunInput,apiKey};
    delete (aliyun as Record<string,unknown>).clearApiKey;
    const next=asrSettingsSchema.parse({...current,...input,local,aliyun});
    const temporary=`${file}.${process.pid}.tmp`;
    await writeFile(temporary,JSON.stringify(next,null,2),'utf8');
    await rename(temporary,file);
    return publicValue(next);
  };
  return {read,publicValue,get:async()=>publicValue(await read()),update,file};
}
