import {useState} from 'react';
import type {MotionProject} from '@motion-master/schema';
type TrashItem={projectId:string;title:string;version:number;deletedAt:string};
export function ProjectManagement({project,request,onChanged}:{project:MotionProject|null;request:<T>(url:string,options?:RequestInit)=>Promise<T>;onChanged:(restoredId?:string)=>Promise<void>}){
 const [dialog,setDialog]=useState<'delete'|'trash'|null>(null),[items,setItems]=useState<TrashItem[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const run=async(work:()=>Promise<void>)=>{setBusy(true);setError('');try{await work();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}};
 return <><button disabled={!project||project.preCut?.status==='running'||busy} onClick={()=>{setError('');setDialog('delete');}}>删除项目</button><button onClick={()=>{setDialog('trash');void run(async()=>setItems(await request<TrashItem[]>('/api/trash')));}}>回收站</button>
 {dialog&&<div className="modal-backdrop"><section className="precut-review" role="dialog" aria-modal="true" aria-label={dialog==='delete'?'删除项目确认':'项目回收站'} style={{maxWidth:620}}>
 <header><strong>{dialog==='delete'?'删除项目':'项目回收站'}</strong><button disabled={busy} onClick={()=>setDialog(null)}>关闭</button></header>
 {error&&<p role="alert">{error}</p>}
 {dialog==='delete'&&project?<><p>将项目「<strong>{project.title}</strong>」移入回收站？</p><p>项目会从列表中移除。原视频、字幕、动效和剪辑记录都会保留，可在回收站恢复；不会释放素材占用的磁盘空间。</p><div className="precut-actions"><button disabled={busy} onClick={()=>setDialog(null)}>取消</button><button disabled={busy} onClick={()=>void run(async()=>{await request(`/api/projects/${project.projectId}`,{method:'DELETE',body:JSON.stringify({expectedVersion:project.version})});setDialog(null);await onChanged();})}>确认移入回收站</button></div></>:null}
 {dialog==='trash'&&<><p>恢复后可继续编辑原项目，素材和时间轴保持原样。</p>{items.map(item=><article key={item.projectId} style={{padding:12,borderBottom:'1px solid #405052',display:'flex',justifyContent:'space-between',gap:16}}><div><strong>{item.title}</strong><p>{new Date(item.deletedAt).toLocaleString()}</p></div><button disabled={busy} aria-label={`恢复项目 ${item.title}`} onClick={()=>void run(async()=>{await request(`/api/projects/${item.projectId}/restore`,{method:'POST',body:JSON.stringify({expectedVersion:item.version})});setDialog(null);await onChanged(item.projectId);})}>恢复项目</button></article>)}{!items.length&&!busy&&<p>回收站为空。</p>}</>}
 </section></div>}</>;
}
