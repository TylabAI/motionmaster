import {useEffect,useState} from 'react';
import type {MotionProject} from '@motion-master/schema';

type HistoryEvent={at:string;event:string};
const steps=['准备视频','本地转录与停顿检测','提取关键静帧','Agent 分析与结果校验','人工审核确认'];
export function PreCutProgress({project,historyUrl}:{project:MotionProject;historyUrl:string}) {
 const [history,setHistory]=useState<HistoryEvent[]>([]),[now,setNow]=useState(Date.now()),[opened]=useState(Date.now()),[connected,setConnected]=useState<number>(),[error,setError]=useState('');
 const job=project.preCut!,automatic=job.executionPolicy==='auto-retakes',waiting=job.status==='running'||job.status==='awaiting-agent';
 useEffect(()=>{
  let stopped=false;const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
  const poll=async()=>{try{const response=await fetch(historyUrl,{signal:controller.signal});if(!response.ok)throw Error('读取进度失败');const rows=await response.json() as HistoryEvent[];if(!stopped){setHistory(rows);setConnected(Date.now());setError('');}}catch{if(!stopped)setError('暂时无法连接服务，正在重试；请勿重复启动分析。');}finally{if(!stopped&&waiting)timer=setTimeout(poll,5000);}};
  void poll();return()=>{stopped=true;controller.abort();clearTimeout(timer);};
 },[historyUrl,job.jobId,job.status]);
 useEffect(()=>{if(!waiting)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[waiting]);
 const startIndex=history.map(h=>h.event).lastIndexOf('precut.started');
 const run=startIndex<0?[]:history.slice(startIndex),find=(event:string)=>run.find(h=>h.event===event)?.at;
 const start=find('precut.started'),modelStart=find('precut.frames_prepared');
 const ended=find('precut.awaiting_confirmation')??find('precut.agent_finished')??find('precut.failed')??find('precut.interrupted');
 const duration=(from:number,to:number)=>{const seconds=Math.max(0,Math.floor((to-from)/1000));return `${Math.floor(seconds/60)} 分 ${seconds%60} 秒`;};
 const stage=job.stage;
 const step=job.status==='awaiting-confirmation'||job.status==='completed'?4:job.status==='awaiting-agent'||/Codex|Agent.*分析|模型/.test(stage)?3:/静帧|材料/.test(stage)?2:/转录|停顿|切点|候选|保留片段/.test(stage)?1:0;
 const clock=waiting?now:ended?Date.parse(ended):connected??opened;
 return <section aria-label="初剪分析进度" style={{padding:16,border:'1px solid #347976',borderRadius:10,margin:'16px 0'}}>
  <ol style={{display:'flex',flexWrap:'wrap',gap:16,paddingLeft:20}}>{steps.map((s,i)=><li key={s} aria-current={i===step?'step':undefined} style={{color:i===step?'#5de2d5':i<step?'#b7cecb':'#82908f',fontWeight:i===step?700:400}}>{i<step?'✓ ':''}{i===4&&automatic?'自动执行，可随时恢复':s}</li>)}</ol>
  <strong>{job.status==='failed'?'分析未完成':job.status==='awaiting-agent'?'等待外部 Agent 接单并返回结果':job.status==='awaiting-confirmation'?'分析已完成，现在可以审核建议':job.status==='completed'?'已确认执行初剪':`当前第 ${step+1}/5 阶段：${steps[step]}`}</strong>
  <p>{stage}</p>
  <p>{start?'任务已用时':'本窗口已打开'}：{duration(start?Date.parse(start):opened,clock)}{waiting&&step===3&&modelStart&&job.status!=='awaiting-agent'?` · Agent 阶段已用时：${duration(Date.parse(modelStart),now)}`:''}</p>
  {waiting&&<p role="status">{error|| (connected?`服务可连接 · 最近检查 ${new Date(connected).toLocaleTimeString()}`:'正在连接进度服务……')}</p>}
  {waiting&&<p>{job.status==='awaiting-agent'?'此阶段需要外部 Agent 主动提交分析结果，单纯等待不会自动完成。':step===3?'正在等待 Agent 返回完整决策。模型不提供可靠的完成百分比或剩余时长；单次 Codex 分析最多等待 12 分钟，超时会显示失败原因。':'本地处理耗时取决于视频长度和设备性能；完成后自动进入下一阶段。'}</p>}
  {waiting&&<><p>{automatic?'下一步：分析完成 → 自动剪除明确失败重说 → 返回时间轴。有歧义的内容保留，删除内容可恢复。':'下一步：分析完成 → 试听、勾选删除建议 → 确认执行。当前不会修改轨道，未复核的候选暂不展示。'}</p><button disabled>{automatic?'正在分析，完成后自动处理':'等待分析结果，完成后可审核'}</button><p>可关闭窗口让任务继续；点击“查看初剪进度”即可回来。</p></>}
 </section>;
}
