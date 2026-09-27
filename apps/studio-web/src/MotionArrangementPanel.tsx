import {useEffect,useState} from 'react';
import type {MotionProject} from '@motion-master/schema';
export function MotionArrangementPanel({project,onClose,agentUrl}:{project:MotionProject;onClose:()=>void;agentUrl:string}){
 const job=project.motionArrangement!,[now,setNow]=useState(Date.now());
 const waiting=['running','awaiting-agent'].includes(job.status);
 useEffect(()=>{if(!waiting)return;const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id);},[waiting]);
 const seconds=Math.max(0,Math.floor(((job.finishedAt?Date.parse(job.finishedAt):now)-Date.parse(job.startedAt))/1000));
 return <div className="modal-backdrop"><section className="precut-review" role="dialog" aria-modal="true" aria-label="讲解动效自动编排">
  <header><strong>讲解动效自动编排</strong><button onClick={onClose}>{waiting?'后台继续':'返回时间轴'}</button></header>
  <p role="status">{job.stage} · 已用 {Math.floor(seconds/60)} 分 {seconds%60} 秒</p>
  <p>准备保留字幕 → 查看画面 → 选择讲解场景 → 绑定词句并添加到时间轴</p>
  <p>不剪视频、不覆盖已有卡片。场景与已有卡片冲突时跳过，图解空间不足时使用视频与图形分区。</p>
  {waiting&&<p>模型阶段无法准确预测剩余时间。内置 Agent 单次最多等待 12 分钟；可关闭此窗口后通过“编排进度”返回。</p>}
  {job.status==='awaiting-agent'&&<p>材料已就绪，需要外部 Agent 主动接入并提交场景；<a href={agentUrl} target="_blank" rel="noreferrer">查看 Agent 接入说明</a>。项目 {project.projectId}</p>}
  {job.error&&<p role="alert">{job.error}</p>}
  {job.summary&&<p>{job.summary}</p>}
  {!!job.cardIds.length&&<p>新增 {job.cardIds.length} 个场景，可在时间轴选中后调整文字、位置、大小和时长。手动改变时长或位置时间后，该卡片改为手动时间定位。</p>}
  {!!job.warnings.length&&<details><summary>编排说明（{job.warnings.length}）</summary>{job.warnings.map((w,i)=><p key={i}>{w}</p>)}</details>}
 </section></div>;
}
