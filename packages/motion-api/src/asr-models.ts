import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {readdir,stat} from 'node:fs/promises';
import path from 'node:path';

export type LocalAsrModelId='medium'|'large-v3-turbo'|'large-v3';
export type LocalAsrModelState={
  id:LocalAsrModelId;label:string;description:string;downloadSizeGB:number;
  status:'installed'|'missing'|'invalid'|'downloading'|'failed';
  modelPath:string;directory:string;bytes:number;detail?:string;
};

const definitions:Array<Omit<LocalAsrModelState,'status'|'modelPath'|'directory'|'bytes'|'detail'>&{cacheRepository:string}>=[
  {id:'medium',label:'Medium',description:'资源占用较低，中文识别能力优于基础模型',downloadSizeGB:1.53,cacheRepository:'Systran--faster-whisper-medium'},
  {id:'large-v3-turbo',label:'Large V3 Turbo',description:'默认推荐，准确率与速度平衡',downloadSizeGB:1.62,cacheRepository:'mobiuslabsgmbh--faster-whisper-large-v3-turbo'},
  {id:'large-v3',label:'Large V3',description:'准确率优先，速度与内存占用更高',downloadSizeGB:3.09,cacheRepository:'Systran--faster-whisper-large-v3'},
];
const requiredFiles=['config.json','model.bin','tokenizer.json'];

export async function inspectModelDirectory(directory:string){
  try{
    const missing=[] as string[],sizes=await Promise.all(requiredFiles.map(async name=>{try{return (await stat(path.join(directory,name))).size;}catch{missing.push(name);return 0;}}));
    if(sizes[1]>0&&sizes[1]<100_000_000)missing.push('model.bin 文件不完整');
    return {valid:missing.length===0,bytes:(await Promise.all((await readdir(directory,{withFileTypes:true})).filter(item=>item.isFile()).map(async item=>(await stat(path.join(directory,item.name))).size))).reduce((sum,size)=>sum+size,0),missing};
  }catch{return {valid:false,bytes:0,missing:['模型目录不存在']};}
}

async function cacheSnapshots(modelsRoot:string,repository:string){
  const root=path.join(modelsRoot,`models--${repository}`,'snapshots');
  try{return (await readdir(root,{withFileTypes:true})).filter(item=>item.isDirectory()).map(item=>path.join(root,item.name));}catch{return [];}
}
const portablePath=(directory:string,runtimeRoot:string)=>{
  const relative=path.relative(runtimeRoot,directory);
  return relative&&!relative.startsWith('..')&&!path.isAbsolute(relative)?path.join('runtime',relative).replaceAll('\\','/'):directory;
};

export async function discoverLocalAsrModels(runtimeRoot:string,jobs:Map<LocalAsrModelId,{status:'downloading'|'failed';detail?:string}>=new Map()):Promise<LocalAsrModelState[]>{
  const modelsRoot=path.join(runtimeRoot,'models');
  return Promise.all(definitions.map(async definition=>{
    const fixed=path.join(modelsRoot,`faster-whisper-${definition.id}`),manual=path.join(modelsRoot,definition.id);
    const candidates=[fixed,manual,...await cacheSnapshots(modelsRoot,definition.cacheRepository)];
    let invalid:{directory:string;bytes:number;missing:string[]}|undefined;
    for(const directory of candidates){
      if(!existsSync(directory))continue;
      const checked=await inspectModelDirectory(directory);
      if(checked.valid)return {...definition,status:'installed' as const,modelPath:portablePath(directory,runtimeRoot),directory,bytes:checked.bytes};
      invalid??={directory,bytes:checked.bytes,missing:checked.missing};
    }
    const job=jobs.get(definition.id);
    if(job)return {...definition,status:job.status,modelPath:portablePath(fixed,runtimeRoot),directory:fixed,bytes:invalid?.bytes??0,detail:job.detail};
    if(invalid)return {...definition,status:'invalid' as const,modelPath:portablePath(invalid.directory,runtimeRoot),directory:invalid.directory,bytes:invalid.bytes,detail:`缺少或损坏：${invalid.missing.join('、')}`};
    return {...definition,status:'missing' as const,modelPath:portablePath(fixed,runtimeRoot),directory:fixed,bytes:0};
  }));
}

export function asrModelService(runtimeRoot:string){
  const jobs=new Map<LocalAsrModelId,{status:'downloading'|'failed';detail?:string}>();
  const list=()=>discoverLocalAsrModels(runtimeRoot,jobs);
  const download=async(input:Record<string,unknown>)=>{
    const id=String(input.model??'') as LocalAsrModelId;
    if(!definitions.some(item=>item.id===id))throw new Error('不支持的本地语音模型');
    if(input.confirm!==true)throw new Error('下载模型前必须由用户确认');
    const before=(await list()).find(item=>item.id===id)!;
    if(before.status==='installed')return {...before,reused:true};
    if(before.status==='downloading')return before;
    const python=process.env.MOTION_ASR_PYTHON??path.join(runtimeRoot,'asr-env',process.platform==='win32'?'Scripts/python.exe':'bin/python');
    const runner=path.join(runtimeRoot,'prepare-semantic-asr.py');
    if(!existsSync(python))throw new Error('本地 ASR Python 环境不存在，请先重新启动程序完成环境准备');
    if(!existsSync(runner))throw new Error('模型下载脚本不存在，请运行 npm run bootstrap:asr 修复运行环境');
    jobs.set(id,{status:'downloading'});
    const target=path.join(runtimeRoot,'models',`faster-whisper-${id}`);
    const child=spawn(python,[runner,'--model',id,'--output-dir',target],{cwd:runtimeRoot,env:{...process.env,HF_HUB_DISABLE_SYMLINKS_WARNING:'1'},windowsHide:true,stdio:['ignore','ignore','pipe']});
    let error='';child.stderr.on('data',chunk=>{error=(error+String(chunk)).slice(-6000);});
    child.on('error',failure=>jobs.set(id,{status:'failed',detail:failure.message}));
    child.on('exit',code=>{if(code===0)jobs.delete(id);else jobs.set(id,{status:'failed',detail:error.trim()||`下载进程退出：${code}`});});
    return (await list()).find(item=>item.id===id)!;
  };
  return {list,download};
}
