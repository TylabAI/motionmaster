import {useState} from 'react';

export function ProjectName({title,disabled,onRename}:{title:string;disabled:boolean;onRename:(name:string)=>Promise<void>}) {
  const [open,setOpen]=useState(false),[name,setName]=useState(title),[saving,setSaving]=useState(false),[error,setError]=useState('');
  const close=()=>{if(!saving)setOpen(false);};
  return <>
    <button className="project-name-button" title="重命名项目" aria-label="重命名项目" disabled={disabled} onClick={()=>{setName(title);setError('');setOpen(true);}}>
      <b>{title}</b><span aria-hidden="true">✎</span>
    </button>
    {open&&<div className="modal-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget)close();}}>
      <form className="project-rename-dialog" role="dialog" aria-modal="true" aria-label="重命名项目" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}
        onSubmit={async e=>{e.preventDefault();if(saving)return;const value=name.trim();if(!value){setError('请输入项目名称');return;}if(value===title){close();return;}setSaving(true);setError('');try{await onRename(value);setOpen(false);}catch(err){setError(err instanceof Error?err.message:String(err));}finally{setSaving(false);}}}>
        <h2>重命名项目</h2>
        <label htmlFor="project-name-input">项目名称</label>
        <input id="project-name-input" autoFocus maxLength={100} value={name} disabled={saving} onFocus={e=>e.currentTarget.select()} onChange={e=>setName(e.target.value)} />
        {error&&<p role="alert">{error}</p>}
        <footer><button type="button" disabled={saving} onClick={close}>取消</button><button type="submit" disabled={saving||!name.trim()}>{saving?'保存中…':'保存'}</button></footer>
      </form>
    </div>}
  </>;
}
