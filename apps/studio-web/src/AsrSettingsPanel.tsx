import {useCallback,useEffect,useState} from 'react';

type PublicAsrSettings={
  provider:'local-faster-whisper'|'aliyun-filetrans';
  local:{model:string;device:'cpu'|'cuda'|'auto';computeType:string;language:string;initialPrompt:string};
  aliyun:{submitUrl:string;queryUrl:string;uploadUrl:string;model:string;language:string;enableItn:boolean;vocabulary:string;apiKeyConfigured:boolean};
};
type LocalModel={
  id:'medium'|'large-v3-turbo'|'large-v3';label:string;description:string;downloadSizeGB:number;
  status:'installed'|'missing'|'invalid'|'downloading'|'failed';modelPath:string;directory:string;bytes:number;detail?:string;
};

const statusText=(model:LocalModel)=>model.status==='installed'?'已安装':model.status==='downloading'?'下载中':model.status==='invalid'?'文件不完整':model.status==='failed'?'下载失败':'未安装';
const matchesModel=(configured:string,model:LocalModel)=>configured===model.modelPath||configured===model.id||configured.replaceAll('\\','/').endsWith(`/faster-whisper-${model.id}`);

export function AsrSettingsPanel({request,onClose,onSaved}:{request:<T>(url:string,options?:RequestInit)=>Promise<T>;onClose:()=>void;onSaved:(message:string)=>void}){
  const [value,setValue]=useState<PublicAsrSettings|null>(null);
  const [models,setModels]=useState<LocalModel[]>([]);
  const [apiKey,setApiKey]=useState(''),[showKey,setShowKey]=useState(false),[busy,setBusy]=useState(false),[refreshing,setRefreshing]=useState(false),[error,setError]=useState('');
  const loadModels=useCallback(async()=>{
    setRefreshing(true);
    try{const result=await request<{models:LocalModel[]}>('/api/settings/asr/models');setModels(result.models);return result.models;}
    finally{setRefreshing(false);}
  },[request]);
  useEffect(()=>{Promise.all([request<PublicAsrSettings>('/api/settings/asr'),loadModels()]).then(([settings])=>setValue(settings)).catch(e=>setError(e instanceof Error?e.message:String(e)));},[request,loadModels]);
  useEffect(()=>{
    if(!models.some(model=>model.status==='downloading'))return;
    const timer=window.setInterval(()=>loadModels().catch(e=>setError(e instanceof Error?e.message:String(e))),1500);
    return()=>window.clearInterval(timer);
  },[models,loadModels]);
  const update=<K extends 'local'|'aliyun'>(section:K,patch:Partial<PublicAsrSettings[K]>)=>setValue(current=>current?{...current,[section]:{...current[section],...patch}}:current);
  const selectModel=async(model:LocalModel)=>{
    setError('');
    if(model.status==='installed'){update('local',{model:model.modelPath});return;}
    if(model.status==='downloading')return;
    const repair=model.status==='invalid';
    if(!window.confirm(`${repair?'检测到模型文件不完整，是否修复下载':'尚未下载该模型，是否现在下载'}？\n\n${model.label} · 约 ${model.downloadSizeGB.toFixed(2)} GB\n保存位置：runtime/models/faster-whisper-${model.id}`))return;
    setBusy(true);
    try{
      await request<LocalModel>('/api/settings/asr/models/download',{method:'POST',body:JSON.stringify({model:model.id,confirm:true})});
      const next=await loadModels();
      const chosen=next.find(item=>item.id===model.id);
      if(chosen?.status==='installed')update('local',{model:chosen.modelPath});
      else onSaved(`${model.label} 已开始下载，可以关闭设置；完成后点击“刷新模型”`);
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  };
  const save=async()=>{if(!value)return;setBusy(true);setError('');try{
    if(value.provider==='local-faster-whisper'){
      const selected=models.find(model=>matchesModel(value.local.model,model));
      if(!selected||selected.status!=='installed')throw new Error('请先选择一个状态为“已安装”的本地模型');
    }
    const next=await request<PublicAsrSettings>('/api/settings/asr',{method:'PATCH',body:JSON.stringify({provider:value.provider,local:value.local,aliyun:{...value.aliyun,...(apiKey.trim()?{apiKey:apiKey.trim()}:{})}})});
    setValue(next);setApiKey('');onSaved(`语音识别已切换为${next.provider==='aliyun-filetrans'?next.aliyun.model:models.find(model=>matchesModel(next.local.model,model))?.label??'本地 faster-whisper'}`);onClose();
  }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}};
  const clearKey=async()=>{if(!value)return;setBusy(true);try{const next=await request<PublicAsrSettings>('/api/settings/asr',{method:'PATCH',body:JSON.stringify({aliyun:{clearApiKey:true}})});setValue(next);setApiKey('');}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}};
  return <div className="modal-backdrop" onPointerDown={event=>{if(event.target===event.currentTarget)onClose();}}><section className="asr-settings" role="dialog" aria-modal="true" aria-label="语音识别与字幕设置">
    <header><div><strong>语音识别与字幕</strong><span>控制转录文字、字幕和词句时间定位</span></div><button onClick={onClose}>×</button></header>
    {!value?<div className="settings-loading">{error||'正在读取设置…'}</div>:<div className="asr-settings-body">
      <section className="asr-engine-choice"><label className={value.provider==='local-faster-whisper'?'selected':''}><input type="radio" checked={value.provider==='local-faster-whisper'} onChange={()=>setValue({...value,provider:'local-faster-whisper'})}/><strong>本地 faster-whisper</strong><span>音频不离开本机；首次启动默认下载 large-v3-turbo。</span></label><label className={value.provider==='aliyun-filetrans'?'selected':''}><input type="radio" checked={value.provider==='aliyun-filetrans'} onChange={()=>setValue({...value,provider:'aliyun-filetrans'})}/><strong>百炼文件转写 API</strong><span>提取 16k 单声道音频并上传；原视频不上传。</span></label></section>
      {value.provider==='local-faster-whisper'?<section className="settings-form local-model-form"><div className="settings-title-row"><div><h3>本地模型</h3><small>选择已安装模型；未安装模型会先询问是否下载。</small></div><button type="button" className="refresh-models" disabled={refreshing} onClick={()=>loadModels().catch(e=>setError(e instanceof Error?e.message:String(e)))}>{refreshing?'检查中…':'↻ 刷新模型'}</button></div><div className="local-model-list">{models.map(model=>{const selected=matchesModel(value.local.model,model);return <button type="button" key={model.id} className={`local-model-option ${selected?'selected':''} status-${model.status}`} onClick={()=>selectModel(model)} disabled={model.status==='downloading'}><span className="model-radio" aria-hidden="true">{selected?'●':'○'}</span><span className="model-copy"><strong>{model.label}{model.id==='large-v3-turbo'&&<em>默认推荐</em>}</strong><small>{model.description} · 约 {model.downloadSizeGB.toFixed(2)} GB</small>{model.detail&&<small className="model-detail">{model.detail}</small>}</span><span className="model-status">{statusText(model)}</span></button>;})}</div><small className="model-scan-hint">刷新会重新校验固定模型目录和本地 Hugging Face 缓存。手动放入完整模型后无需重复下载。</small><label>设备<select value={value.local.device} onChange={e=>update('local',{device:e.target.value as PublicAsrSettings['local']['device']})}><option value="cpu">CPU</option><option value="cuda">NVIDIA CUDA</option><option value="auto">自动</option></select></label><label>计算精度<input value={value.local.computeType} onChange={e=>update('local',{computeType:e.target.value})} placeholder="int8 / float16"/></label><label>语言<input value={value.local.language} onChange={e=>update('local',{language:e.target.value})} placeholder="zh；留空自动检测"/></label><label className="field-wide">术语提示<textarea value={value.local.initialPrompt} onChange={e=>update('local',{initialPrompt:e.target.value})} placeholder="例如：PipClaw、MotionMaster、Remotion"/></label></section>:<section className="settings-form"><h3>百炼异步文件转写</h3><label className="field-wide">任务提交地址<input value={value.aliyun.submitUrl} onChange={e=>update('aliyun',{submitUrl:e.target.value})}/></label><label className="field-wide">任务查询地址<input value={value.aliyun.queryUrl} onChange={e=>update('aliyun',{queryUrl:e.target.value})}/><small>必须保留 {'{task_id}'} 占位符。</small></label><label className="field-wide">临时文件上传凭证地址<input value={value.aliyun.uploadUrl} onChange={e=>update('aliyun',{uploadUrl:e.target.value})}/></label><label className="field-wide">API Key<div className="secret-input"><input type={showKey?'text':'password'} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder={value.aliyun.apiKeyConfigured?'已保存；留空保持不变':'请输入 sk-...'} autoComplete="new-password"/><button type="button" onClick={()=>setShowKey(show=>!show)}>{showKey?'隐藏':'显示'}</button>{value.aliyun.apiKeyConfigured&&<button type="button" onClick={clearKey}>清除</button>}</div></label><label>模型 ID<input value={value.aliyun.model} onChange={e=>update('aliyun',{model:e.target.value})}/></label><label>语言<input value={value.aliyun.language} onChange={e=>update('aliyun',{language:e.target.value})} placeholder="zh；留空自动检测"/></label><label className="toggle-row"><input type="checkbox" checked={value.aliyun.enableItn} onChange={e=>update('aliyun',{enableItn:e.target.checked})}/>数字与日期规范化（ITN）</label><label className="field-wide">专业词 / 热词<textarea value={value.aliyun.vocabulary} onChange={e=>update('aliyun',{vocabulary:e.target.value})} placeholder={'每行一个，例如：\nPipClaw:8\nMotionMaster:8'}/><small>Qwen-Audio-3.0-ASR-Flash-Filetrans 支持行尾填写 1–10 权重。</small></label></section>}
      <aside className="timestamp-contract"><strong>时间轴保护</strong><p>主视频轨道由视频时长与粗剪保留区间生成。字幕轨道、词句定位和语义粗剪必须使用模型返回的逐词时间戳；如果 API 只返回纯文本或句级时间，分析会明确失败，现有轨道不会被改写。</p></aside>
      {error&&<p className="settings-error">{error}</p>}
    </div>}
    <footer><button onClick={onClose}>取消</button><button className="primary" disabled={!value||busy} onClick={save}>{busy?'正在处理…':'保存设置'}</button></footer>
  </section></div>;
}
