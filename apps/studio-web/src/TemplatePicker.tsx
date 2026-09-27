import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {MotionCardInstance,MotionCardDefinition,MotionProject} from '@motion-master/schema';
import {CatalogFilters,matchesCatalog} from './CatalogFilters';
import {CardPreview} from './CardPreview';

export function TemplatePicker({card,currentName,catalog,project,onSelect}:{card:MotionCardInstance;currentName:string;catalog:MotionCardDefinition[];project:MotionProject;onSelect:(type:string)=>void}){
  const [open,setOpen]=useState(false),[hovered,setHovered]=useState(card.cardType),[search,setSearch]=useState(''),[levels,setLevels]=useState(['all','all','all']);
  const [position,setPosition]=useState({top:16,left:16,width:940,height:620});
  const trigger=useRef<HTMLButtonElement>(null),popup=useRef<HTMLDivElement>(null);
  const filtered=catalog.filter(d=>matchesCatalog(d,search,levels));
  const definition=filtered.find(d=>d.cardType===hovered)??filtered[0];
  const close=()=>{setOpen(false);trigger.current?.focus();};
  useEffect(()=>{setOpen(false);setHovered(card.cardType);},[card.cardId,card.cardType]);
  useEffect(()=>{if(!open)return;const dismiss=(e:PointerEvent)=>{if(!popup.current?.contains(e.target as Node)&&!trigger.current?.contains(e.target as Node))setOpen(false);};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}};const resize=()=>setOpen(false);document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape,true);window.addEventListener('resize',resize);popup.current?.querySelector<HTMLInputElement>('input')?.focus();return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape,true);window.removeEventListener('resize',resize);};},[open]);
  return <div className="template-picker"><label>换模板 <small>保留内容、时间和位置</small></label><button ref={trigger} className="template-trigger" aria-label={`换模板：${currentName}`} aria-haspopup="dialog" aria-expanded={open} onClick={()=>{if(open){close();return;}const r=trigger.current!.getBoundingClientRect(),width=Math.min(1040,window.innerWidth-32),height=Math.min(620,window.innerHeight-32);setPosition({width,height,left:Math.max(16,Math.min(r.right-width,window.innerWidth-width-16)),top:Math.max(16,Math.min(r.bottom+6,window.innerHeight-height-16))});setHovered(card.cardType);setSearch('');setLevels(['all','all','all']);setOpen(true);}}><strong>{currentName}</strong><span>⌄</span></button>
  {open&&createPortal(<div ref={popup} className="template-popover" role="dialog" aria-label="选择动效模板" style={position}>
    <header><strong>选择动效模板 <small>{filtered.length} / {catalog.length}</small></strong><button aria-label="关闭模板预览" onClick={close}>×</button></header>
    <div className="template-browser"><div className="template-catalog"><CatalogFilters catalog={catalog} search={search} levels={levels} onSearch={setSearch} onLevels={setLevels} label="模板"/>
      <div className="template-options overlay-scroll" aria-label="模板列表">{filtered.map(d=><button key={d.cardType} aria-pressed={d.cardType===card.cardType} className={d.cardType===definition?.cardType?'previewing':''} onMouseEnter={()=>setHovered(d.cardType)} onFocus={()=>setHovered(d.cardType)} onClick={()=>{if(d.cardType!==card.cardType)onSelect(d.cardType);close();}}><span>{d.displayName}<small>{d.classification?.level1} / {d.classification?.level2}</small></span>{d.cardType===card.cardType&&<small>当前</small>}</button>)}{!filtered.length&&<p className="empty">没有匹配模板，请调整筛选条件。</p>}</div>
    </div><div className="template-detail overlay-scroll">{definition?<><CardPreview definition={definition} project={project}/><strong>{definition.displayName}</strong><p>{Object.values(definition.classification??{}).join(' / ')}</p><p>{definition.description}</p>{definition.cardType.startsWith('hv-')&&(definition.category==='data'||definition.cardType==='hv-frame-decision-tree')&&<p>切换前请在当前卡片的条目中填写：{definition.parameterSchema.find(f=>f.path==='content.items')?.label}。格式不符时会保留当前设计。</p>}<small>示例内容 · 循环预览<br/>悬停或键盘聚焦预览，点击应用</small></>:<p>暂无匹配模板</p>}</div></div>
  </div>,document.body)}</div>;
}
