export function htmlVideoContentError(type:string,content:Record<string,unknown>):string|undefined{
 if(!type.startsWith('hv-'))return;
 const lines=String(content.items??'').split('\n').filter(Boolean);
 if(['hv-frame-data-chart-nyt','hv-frame-data-rollup','hv-frame-nyt-graph','hv-frame-pentagram-stat'].includes(type)){
  if(!lines.length||lines.length>8||lines.some(l=>{const [name,value]=l.split('|');return !name||!value?.trim()||!Number.isFinite(Number(value))||Number(value)<0;}))return '图表需1—8行非负数据，格式为“名称|数值”';
 }
 if(type==='hv-frame-decision-tree'){
  const nodes=lines.map(l=>{const [id,parent,text]=l.split('|');return {id,parent,text};});const map=new Map(nodes.map(n=>[n.id,n]));
  if(!nodes.length||nodes.length>10||map.size!==nodes.length||nodes.some(n=>!n.id||!n.text||n.parent!=='-'&&!map.has(n.parent)))return '决策树需1—10个唯一节点，格式ID|父ID|文字，根节点父ID为-';
  for(const n of nodes){const seen=new Set<string>();let current:typeof n|undefined=n;while(current){if(seen.has(current.id))return '决策树不能循环引用';seen.add(current.id);current=map.get(current.parent);}}
 }
}
