import {PreCutProgress} from './PreCutProgress';
import type {MotionProject} from '@motion-master/schema';
import {useEffect,useState} from 'react';
export function PreCutReview({project,busy,onClose,onSeek,onDecision,onAnalyze,onSemanticExport,onSemanticImport,onConfirm,imageBase}:{project:MotionProject;busy:boolean;onClose:()=>void;onSeek:(frame:number)=>void;onDecision:(id:string,accept:boolean)=>void;onAnalyze:(transcript?:unknown)=>void;onSemanticExport:()=>void;onSemanticImport:(result:unknown)=>void;onConfirm:(ids:string[])=>void;imageBase:string}) {
 const [error,setError]=useState(''),[selected,setSelected]=useState<string[]>([]);
 const draft=project.preCutDraft,ready=project.preCut?.status==='awaiting-confirmation';
 const waiting=project.preCut?.status==='running'||project.preCut?.status==='awaiting-agent';
 useEffect(()=>{let saved:string[]|undefined;try{saved=JSON.parse(sessionStorage.getItem(`precut-selection-${project.projectId}-${draft?.jobId}`)??'null')??undefined;}catch{}setSelected(saved?.filter(id=>draft?.decisionIds.includes(id))??draft?.recommendedIds??[]);},[draft?.jobId,ready]);
 const choose=(ids:string[])=>{setSelected(ids);sessionStorage.setItem(`precut-selection-${project.projectId}-${draft?.jobId}`,JSON.stringify(ids));};
 const fps=project.canvas.fps,plan=project.editPlan,label=(f:number)=>`${(f/fps).toFixed(2)}s`;
 const decisions=[...(project.transcript?.cutDecisions??[])].filter(c=>!draft||draft.decisionIds.includes(c.cutId)).sort((a,b)=>Number(b.cutId.startsWith('semantic-review-'))-Number(a.cutId.startsWith('semantic-review-'))||a.startFrame-b.startFrame);
 let end=0,frames=0;for(const d of decisions.filter(d=>selected.includes(d.cutId)).sort((a,b)=>a.startFrame-b.startFrame)){frames+=Math.max(0,d.endFrame-Math.max(end,d.startFrame));end=Math.max(end,d.endFrame);}
 return <div className="modal-backdrop"><section className="precut-review" role="dialog" aria-modal="true" aria-label="初剪详情">
   <header><strong>{ready?'确认初剪方案':'初剪分析与审核'}</strong><button onClick={onClose}>{waiting?'关闭窗口，后台继续':ready?'暂不执行':'关闭'}</button></header>
   {ready&&<div className="precut-actions" style={{position:'sticky',top:0,background:'#182528',padding:12,zIndex:2}}><strong>勾选 {selected.length} 项 · 预计再剪 {label(frames)}</strong><button disabled={busy} onClick={()=>choose(draft?.recommendedIds??[])}>使用模型建议</button><button disabled={busy} onClick={()=>choose([])}>全部保留</button><button disabled={busy} onClick={()=>onConfirm(selected)}>确认执行初剪</button></div>}
   <p>{project.preCut?.stage??'尚未分析'} · 原片 {label(plan?.sourceDurationFrames??project.canvas.durationFrames)} · 当前轨道 {label(project.canvas.durationFrames)}</p>
   <p>{project.preCut?.executionPolicy==='auto-retakes'?'明确失败重说自动移入可恢复轨道；有歧义的内容保留，无需逐条确认。':draft||project.preCut?.status==='running'?'分析和勾选均不会改变轨道；确认后才将删除内容放入可恢复轨道。':'保留素材在主轨道，删除素材在可恢复轨道，可随时恢复。'}</p>
   {project.preCut?.error&&<p role="alert">{project.preCut.error}</p>}
   {project.preCut?.warnings.map((w,i)=><p key={i} className="precut-warning">{w}</p>)}
   {project.preCut&&<PreCutProgress key={project.preCut.jobId} project={project} historyUrl={`${imageBase.replace(/\/precut\/frame$/,'')}/history?limit=200`}/>}
   <section aria-label="Agent 语义精剪" style={{padding:16,border:'1px solid #347976',borderRadius:10,margin:'16px 0'}}>
     <strong>字幕 + 时间戳 + 关键静帧分析</strong>
     <p>MotionMaster 负责本地转录与抽帧，分析由所选 Agent 完成。Codex 是内置驱动；其他 Agent 可通过 HTTP / MCP 获取材料、提交决策，无需 Codex 账号。</p>
     {project.preCut?.status==='awaiting-agent'&&<div role="status"><strong>材料已就绪，等待外部 Agent</strong><p>让你的 Agent 读取下面的接入说明并处理本项目。收到结果后会按本次任务的执行方式处理。</p><a href={`${imageBase.replace(/\/api\/projects\/.*$/,'')}/agent.md`} target="_blank" rel="noreferrer">Agent 接入说明</a> · <a href={`${imageBase.replace(/\/api\/projects\/.*$/,'')}/.well-known/agent.json`} target="_blank" rel="noreferrer">机器可读协议</a><p>项目 ID：{project.projectId} · 任务 ID：{draft?.jobId}</p></div>}
     <p>静帧用于辅助判断操作演示是否需要保留，不能代替连续视频和音频。点击候选“定位试听”后可播放原片核对。</p>
     {!waiting&&project.semanticReview?<><p>{project.semanticReview.reviewer} · {new Date(project.semanticReview.reviewedAt).toLocaleString()}</p><p>{project.semanticReview.summary}</p>{project.semanticReview.limitations.map((t,i)=><p key={i} className="precut-warning">{t}</p>)}</>:null}
     {!!draft?.frames.length&&<details><summary>查看分析所用的 {draft.frames.length} 张静帧</summary><div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8}}>{draft.frames.map(f=><figure key={f.id} style={{margin:0}}><img loading="lazy" src={`${imageBase}/${f.id}?job=${draft.jobId}`} alt={`${label(f.frame)} ${f.reason}`} style={{width:'100%'}}/><figcaption>{label(f.frame)} · {f.reason.replace(/^[a-f0-9-]{36}-/,'')}</figcaption></figure>)}</div></details>}
   </section>
   {!waiting&&project.preCut?.status!=='failed'&&<div className="precut-decisions">{decisions.map(c=><article key={c.cutId}>
     {ready&&<label><input type="checkbox" aria-label={`删除 ${label(c.startFrame)} 至 ${label(c.endFrame)}`} checked={selected.includes(c.cutId)} disabled={busy} onChange={e=>choose(e.target.checked?[...selected,c.cutId]:selected.filter(id=>id!==c.cutId))}/> 删除此段</label>}
     <button onClick={()=>onSeek(c.startFrame)}>{label(c.startFrame)}–{label(c.endFrame)} · 定位试听</button>
     <p>{c.reason??c.type}</p>{c.reviewReason&&<p><strong>模型复核：</strong>{c.reviewReason}</p>}
     <span>{draft?(c.reviewVerdict==='remove'?'建议删除':c.reviewVerdict==='keep'?'建议保留':'需试听确认'):(c.status==='accepted'?'已剪除':c.status==='rejected'?'已保留':'待审候选')}</span>
     {!draft&&<button disabled={busy} onClick={()=>onDecision(c.cutId,c.status!=='accepted')}>{c.status==='accepted'?'恢复':'剪除此段'}</button>}
   </article>)}{!decisions.length&&<p>{project.preCut?.status==='running'?'正在准备候选……':'没有额外删减建议，可以保留当前素材。'}</p>}</div>}
   <details style={{marginTop:16}}><summary>重新分析与高级选项</summary><div className="precut-actions"><button disabled={busy||waiting} onClick={()=>onAnalyze()}>重新分析（不执行剪辑）</button><label>导入逐词转录 JSON<input disabled={busy||waiting} type="file" accept=".json" onChange={async e=>{const f=e.target.files?.[0];if(f){try{onAnalyze(JSON.parse(await f.text()));}catch{setError('转录文件不是有效的 JSON');}}}}/></label></div>
     {!draft&&<div className="precut-actions"><button disabled={busy||!project.transcript?.wordCues.length} onClick={onSemanticExport}>导出精剪任务</button><label>导入精剪建议 JSON<input disabled={busy||waiting} type="file" accept=".json" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{setError('');onSemanticImport(JSON.parse(await f.text()));}catch{setError('建议文件不是有效的 JSON');}e.target.value='';}}/></label></div>}
     {error&&<p role="alert">{error}</p>}
   </details>
 </section></div>;
}
