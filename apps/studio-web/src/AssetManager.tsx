import {useMemo,useState} from 'react';
import type {MotionCardDefinition,MotionProject} from '@motion-master/schema';
import {createAsset,downloadAssets,importAssets,type AssetLibrary} from './motion-assets';
import {CatalogFilters,matchesCatalog,categoryKeys} from './CatalogFilters';
import {CardPreview} from './CardPreview';
type Props={catalog:MotionCardDefinition[];library:AssetLibrary;project:MotionProject;onChange:(value:AssetLibrary)=>void;onAdd:(definition:MotionCardDefinition)=>void;onClose:()=>void};
export const AssetManager=({catalog,library,project,onChange,onAdd,onClose}:Props)=>{
  const [scope,setScope]=useState('all'),[search,setSearch]=useState(''),[levels,setLevels]=useState(['all','all','all']),[selectedId,setSelectedId]=useState(''),[message,setMessage]=useState('');
  const entries=useMemo(()=>[
    ...catalog.map(definition=>({id:`builtin:${definition.cardType}`,saved:false,definition})),
    ...library.assets.flatMap(asset=>{const base=catalog.find(d=>d.cardType===asset.card.cardType);return base?[{id:asset.id,saved:true,definition:{...base,displayName:asset.name,classification:asset.classification,defaults:asset.card}}]:[];}),
  ],[catalog,library.assets]);
  const inScope=(entry:typeof entries[number],value=scope)=>value==='all'||value==='saved'&&entry.saved||value==='builtin'&&!entry.saved||value==='favorites'&&library.favorites.includes(entry.id);
  const scoped=entries.filter(entry=>inScope(entry));
  const filtered=scoped.filter(entry=>matchesCatalog(entry.definition,search,levels));
  const selected=filtered.find(entry=>entry.id===selectedId)??filtered[0];
  const favorite=(id:string)=>onChange({...library,favorites:library.favorites.includes(id)?library.favorites.filter(value=>value!==id):[...library.favorites,id]});
  return <section className="asset-manager" aria-label="动效资产管理">
    <header><div><h1>动效资产</h1><p>统一浏览模板、预设与收藏，选中即可预览。</p></div><div className="asset-actions">
      <label className="button">导入预设<input type="file" hidden accept="application/json,.json" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>5_000_000)throw Error('预设文件请控制在5 MB内');const assets=importAssets(JSON.parse(await file.text()),catalog);onChange({...library,assets:[...library.assets,...assets]});setScope('saved');setSearch('');setLevels(['all','all','all']);setSelectedId(assets[0].id);setMessage(`已导入${assets.length}个预设`);}catch(error){setMessage(error instanceof Error?error.message:String(error));}}}/></label>
      <button disabled={!library.assets.length} onClick={()=>downloadAssets(library.assets)}>导出已保存预设</button><button onClick={onClose}>返回编辑台</button>
    </div></header>
    <div className="asset-storage-note">模板均可直接使用；“已保存预设”保留你编辑或导入的版本，存储在当前浏览器，可导出备份。</div>
    <div className="asset-browser">
      <div className="asset-results"><nav className="asset-scopes" aria-label="资产范围">{[['all','全部资产'],['builtin','内置模板'],['saved','已保存预设'],['favorites','收藏']].map(([value,label])=><button key={value} aria-pressed={scope===value} className={scope===value?'active':''} onClick={()=>{setScope(value);setLevels(['all','all','all']);setSelectedId('');}}>{label}<span>{entries.filter(entry=>inScope(entry,value)).length}</span></button>)}</nav>
        <CatalogFilters catalog={scoped.map(e=>e.definition)} search={search} levels={levels} onSearch={setSearch} onLevels={setLevels} label="资产"/>
        <div className="asset-grid overlay-scroll" aria-label="资产列表">{filtered.map(entry=><article key={entry.id} className={entry.id===selected?.id?'selected':''}>
          <button className="asset-select" aria-pressed={entry.id===selected?.id} onClick={()=>setSelectedId(entry.id)}><strong>{entry.definition.displayName}</strong><small>{Object.values(entry.definition.classification??{}).join(' / ')}</small><small>{entry.saved?'已保存预设':'内置模板'} · {(entry.definition.defaults.durationFrames/project.canvas.fps).toFixed(1)} 秒</small></button>
          <button className="asset-star" aria-label={`${library.favorites.includes(entry.id)?'取消收藏':'收藏'} ${entry.definition.displayName}`} onClick={()=>favorite(entry.id)}>{library.favorites.includes(entry.id)?'★':'☆'}</button>
        </article>)}{!filtered.length&&<p className="empty">没有匹配的资产，请调整分类或搜索条件。</p>}</div>
      </div>
      <aside className="asset-detail overlay-scroll">{selected?<>
        <div className="asset-preview-heading"><h2>{selected.definition.displayName}</h2><small>循环预览 · {project.canvas.fps} fps</small></div>
        <CardPreview definition={selected.definition} project={project}/>
        <p className="asset-category-path">{Object.values(selected.definition.classification??{}).join(' / ')}</p><p>{selected.definition.description}</p>
        <div className="asset-detail-actions"><button className="primary" onClick={()=>{onAdd(selected.definition);setMessage('已请求添加到当前项目，可返回编辑台查看');}}>添加到当前项目</button><button onClick={()=>favorite(selected.id)}>{library.favorites.includes(selected.id)?'★ 取消收藏':'☆ 收藏'}</button>
        {!selected.saved&&<button onClick={()=>{const asset=createAsset(selected.definition.defaults,selected.definition,`${selected.definition.displayName} · 预设`);onChange({...library,assets:[...library.assets,asset]});setScope('saved');setSearch('');setLevels(['all','all','all']);setSelectedId(asset.id);}}>保存为预设</button>}</div>
        {selected.saved&&<div className="saved-preset-fields"><label>预设名称<input key={selected.id} defaultValue={selected.definition.displayName} onBlur={e=>{const name=e.target.value.trim();if(name)onChange({...library,assets:library.assets.map(asset=>asset.id===selected.id?{...asset,name}:asset)});}}/></label>
          {categoryKeys.map((key,index)=><label key={`${selected.id}-${key}`}>{['类型','用途','形态'][index]}<input defaultValue={selected.definition.classification?.[key]} onBlur={e=>{const value=e.target.value.trim();if(value)onChange({...library,assets:library.assets.map(asset=>asset.id===selected.id?{...asset,classification:{...asset.classification,[key]:value}}:asset)});}}/></label>)}
          <button onClick={()=>downloadAssets(library.assets.filter(asset=>asset.id===selected.id))}>导出此预设</button><button onClick={()=>{onChange({assets:library.assets.filter(asset=>asset.id!==selected.id),favorites:library.favorites.filter(id=>id!==selected.id)});setSelectedId('');setMessage('已移除预设，项目中使用的卡片不受影响');}}>移除已保存预设</button>
        </div>}
      </>:<p>选择一项资产查看预览</p>}</aside>
    </div><footer role="status">{message||`共${entries.length}项资产，当前显示${filtered.length}项`}</footer>
  </section>;
};
