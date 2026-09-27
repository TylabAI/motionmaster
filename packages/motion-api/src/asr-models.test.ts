import {afterEach,describe,expect,it} from 'vitest';
import {mkdir,mkdtemp,open,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {asrModelService,discoverLocalAsrModels} from './asr-models';

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
const root=async()=>{const value=await mkdtemp(path.join(os.tmpdir(),'motion-asr-models-'));roots.push(value);return value;};
async function createModel(directory:string,complete=true){
  await mkdir(directory,{recursive:true});
  await writeFile(path.join(directory,'config.json'),'{}');
  await writeFile(path.join(directory,'tokenizer.json'),'{}');
  const model=await open(path.join(directory,'model.bin'),'w');
  await model.truncate(complete?100_000_001:1024);await model.close();
}

describe('managed ASR models',()=>{
  it('discovers a complete model manually placed in the simple model directory',async()=>{
    const runtime=await root();await createModel(path.join(runtime,'models','medium'));
    const model=(await discoverLocalAsrModels(runtime)).find(item=>item.id==='medium')!;
    expect(model.status).toBe('installed');
    expect(model.modelPath.replaceAll('\\','/')).toBe('runtime/models/medium');
  });
  it('marks a truncated manual model as incomplete',async()=>{
    const runtime=await root();await createModel(path.join(runtime,'models','faster-whisper-large-v3'),false);
    const model=(await discoverLocalAsrModels(runtime)).find(item=>item.id==='large-v3')!;
    expect(model.status).toBe('invalid');expect(model.detail).toContain('model.bin');
  });
  it('reuses an installed model without starting a download process',async()=>{
    const runtime=await root();await createModel(path.join(runtime,'models','faster-whisper-large-v3-turbo'));
    const result=await asrModelService(runtime).download({model:'large-v3-turbo',confirm:true});
    expect(result.status).toBe('installed');expect((result as typeof result&{reused?:boolean}).reused).toBe(true);
  });
  it('requires explicit confirmation before any download',async()=>{
    const runtime=await root();
    await expect(asrModelService(runtime).download({model:'medium'})).rejects.toThrow('用户确认');
  });
});
