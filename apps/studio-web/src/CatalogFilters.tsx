import type {MotionCardDefinition} from '@motion-master/schema';
export const categoryKeys = ['level1','level2','level3'] as const;
export const matchesCatalog = (d:MotionCardDefinition,search:string,levels:string[]) =>
  [d.displayName,d.description,...d.tags,...Object.values(d.classification??{}),d.source?.author??''].join(' ').toLowerCase().includes(search.trim().toLowerCase()) &&
  levels.every((value,i)=>value==='all'||d.classification?.[categoryKeys[i]]===value);
export const changeCategory = (levels:string[],index:number,value:string)=>levels.map((old,i)=>i===index?value:i>index?'all':old);
export function CatalogFilters({catalog,search,levels,onSearch,onLevels,label}:{catalog:MotionCardDefinition[];search:string;levels:string[];onSearch:(value:string)=>void;onLevels:(value:string[])=>void;label:string}) {
  return <div className="catalog-filters">
    <input aria-label={`搜索${label}`} placeholder="搜索名称、用途、来源" value={search} onChange={e=>onSearch(e.target.value)}/>
    <div className="catalog-classifications">{categoryKeys.map((key,i)=><label key={key}><span>{['类型','用途','形态'][i]}</span><select aria-label={`${label}${['类型','用途','形态'][i]}`} value={levels[i]} onChange={e=>onLevels(changeCategory(levels,i,e.target.value))}>
      <option value="all">全部</option>{[...new Set(catalog.filter(d=>levels.slice(0,i).every((v,j)=>v==='all'||d.classification?.[categoryKeys[j]]===v)).map(d=>d.classification?.[key]).filter((v):v is string=>Boolean(v)))].sort((a,b)=>a.localeCompare(b,'zh-CN')).map(value=><option key={value} value={value}>{value}</option>)}
    </select></label>)}</div>
    <button className="catalog-reset" onClick={()=>{onSearch('');onLevels(['all','all','all']);}}>清空筛选</button>
  </div>;
}
