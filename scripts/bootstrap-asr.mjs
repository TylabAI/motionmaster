import {spawn,spawnSync} from 'node:child_process';
import {copyFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_MODEL='large-v3-turbo';
const root=process.cwd();
const runtimeRoot=path.resolve(process.env.MOTION_MASTER_RUNTIME_ROOT??path.join(root,'runtime'));
const model=process.env.MOTION_ASR_BOOTSTRAP_MODEL?.trim()||DEFAULT_MODEL;
const modelDirectory=path.join(runtimeRoot,'models',`faster-whisper-${model.replaceAll('/','--')}`);
const venvPython=path.join(runtimeRoot,'asr-env',process.platform==='win32'?'Scripts/python.exe':'bin/python');
const strict=process.argv.includes('--strict');

const run=(command,args,options={})=>new Promise((resolve,reject)=>{
  const child=spawn(command,args,{cwd:root,env:{...process.env,HF_HUB_DISABLE_SYMLINKS_WARNING:'1'},stdio:'inherit',windowsHide:true,...options});
  child.on('error',reject);
  child.on('exit',code=>code===0?resolve():reject(new Error(`${command} exited with ${code}`)));
});
const works=(command,args=[])=>{
  const result=spawnSync(command,[...args,'-c','import sys; print(sys.executable)'],{encoding:'utf8',windowsHide:true});
  return result.status===0;
};
const findBootstrapPython=()=>{
  const configured=process.env.MOTION_ASR_BOOTSTRAP_PYTHON?.trim();
  if(configured&&works(configured))return {command:configured,args:[]};
  if(process.platform==='win32'&&works('py',['-3']))return {command:'py',args:['-3']};
  if(works('python'))return {command:'python',args:[]};
  if(works('python3'))return {command:'python3',args:[]};
  throw new Error('未找到 Python 3。请安装 Python 3.10–3.13，或设置 MOTION_ASR_BOOTSTRAP_PYTHON。');
};

async function bootstrap(){
  await mkdir(runtimeRoot,{recursive:true});
  if(!existsSync(venvPython)){
    const bootstrap=findBootstrapPython();
    console.log('[ASR] 首次启动：正在创建独立 Python 环境 runtime/asr-env');
    await run(bootstrap.command,[...bootstrap.args,'-m','venv',path.join(runtimeRoot,'asr-env')]);
  }
  const importCheck=spawnSync(venvPython,['-c','import faster_whisper, huggingface_hub'],{stdio:'ignore',windowsHide:true});
  if(importCheck.status!==0){
    console.log('[ASR] 正在安装 faster-whisper 1.2.1 及其本地运行依赖');
    await run(venvPython,['-m','pip','install','--disable-pip-version-check','faster-whisper==1.2.1']);
  }
  await copyFile(path.join(root,'scripts','semantic-cut-asr.py'),path.join(runtimeRoot,'semantic-cut-asr.py'));
  await copyFile(path.join(root,'scripts','prepare-semantic-asr.py'),path.join(runtimeRoot,'prepare-semantic-asr.py'));
  console.log(`[ASR] 检查默认模型 ${model}；首次启动约下载 1.62 GB`);
  await run(venvPython,[path.join(root,'scripts','prepare-semantic-asr.py'),'--model',model,'--output-dir',modelDirectory]);
  console.log(`[ASR] 默认模型已就绪：${modelDirectory}`);
}

try{await bootstrap();}
catch(error){
  console.error(`[ASR] 首次准备未完成：${error instanceof Error?error.message:String(error)}`);
  console.error('[ASR] 编辑台仍可启动；联网后运行 npm run bootstrap:asr 重试。');
  if(strict)process.exitCode=1;
}
