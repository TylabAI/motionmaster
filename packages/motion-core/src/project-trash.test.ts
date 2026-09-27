import {it,expect} from 'vitest';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {FileProjectRepository,createProject} from './index';
it('trash hides projects, blocks access, preserves assets and restores after restart',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'motion-trash-'));
 try{const repo=new FileProjectRepository(root);const p=await repo.create(createProject({projectId:'trash-test',title:'保留素材'}));const asset=path.join(repo.projectDir(p.projectId),'assets','test.bin');await writeFile(asset,'original');
 await expect(repo.softDelete(p.projectId,999)).rejects.toThrow(/Version/);expect((await repo.list()).length).toBe(1);
 await repo.softDelete(p.projectId,p.version);expect(await repo.list()).toEqual([]);await expect(repo.get(p.projectId)).rejects.toThrow(/回收站/);expect(await readFile(asset,'utf8')).toBe('original');
 const reboot=new FileProjectRepository(root),trash=await reboot.trashList();expect(trash).toHaveLength(1);const restored=await reboot.restore(p.projectId,trash[0].version);expect(restored.deletedAt).toBeUndefined();expect((await reboot.list())[0].title).toBe('保留素材');expect(await readFile(asset,'utf8')).toBe('original');await expect(reboot.restore(p.projectId,restored.version)).rejects.toThrow(/不在/);
 }finally{await rm(root,{recursive:true,force:true});}
});
it('running analysis cannot be deleted and stale restores are rejected',async()=>{const root=await mkdtemp(path.join(os.tmpdir(),'motion-trash-'));try{const r=new FileProjectRepository(root),p=createProject({projectId:'busy-test',title:'Busy'});p.preCut={jobId:'job',status:'running',stage:'处理中',warnings:[]};await r.create(p);await expect(r.softDelete(p.projectId,0)).rejects.toThrow(/正在分析/);const ready=await r.mutate(p.projectId,0,'test',n=>{n.preCut!.status='awaiting-agent';});await r.softDelete(p.projectId,ready.version);await expect(r.restore(p.projectId,0)).rejects.toThrow(/Version/);}finally{await rm(root,{recursive:true,force:true});}});
