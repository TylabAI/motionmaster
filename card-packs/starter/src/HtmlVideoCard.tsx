import type {MotionCardInstance} from '@motion-master/schema';
import type {ReactNode} from 'react';
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(x:number)=>1-Math.pow(1-clamp(x),3);
export const parseChartRows=(text:unknown)=>String(text??'').split('\n').filter(Boolean).map(row=>{const [label,value]=row.split('|');return {label,value:Number(value)};}).filter(r=>r.label&&Number.isFinite(r.value));
export const parseTreeRows=(text:unknown)=>String(text??'').split('\n').filter(Boolean).map(row=>{const [id,parent,label]=row.split('|');return {id,parent,label};}).filter(n=>n.id&&n.label);
export function HtmlVideoCard({card,frame:rawFrame,fps=30}:{card:MotionCardInstance;frame:number;fps?:number}){
 const frame=rawFrame*30/fps;
 const kind=card.cardType.replace(/^hv-/,''),c=card.content,a=card.appearance;
 const accent=String(a.accent??'#63e6db'),bg=String(a.background??'#101925'),ink=String(a.ink??'#f5f8ff'),scale=Number(a.textScale??1);
 const title=String(c.title??''),body=String(c.body??''),label=String(c.label??''),items=String(c.items??'').split('\n').filter(Boolean),duration=Math.max(1,card.durationFrames*30/fps),p=clamp(frame/duration),intro=ease(frame/24);
 const entries=card.autoScene?.items;
 const reveal=(i:number)=>entries?.[i]?ease((frame-entries[i].revealFrame*30/fps)/12):ease((frame-i*10)/20);
 const text=(value:string,x:number,y:number,size=40,fill=ink,anchor:'start'|'middle'|'end'='start',weight=650)=> <text x={x} y={y} fill={fill} textAnchor={anchor} fontSize={size*scale} fontWeight={weight} fontFamily={kind==='frame-bold-poster'||kind==='frame-warm-grain'?'Georgia, SimSun, serif':'Microsoft YaHei, Arial, sans-serif'}>{value}</text>;
 const wrap=(value:string,x:number,y:number,width:number,size=38,fill=ink,anchor:'start'|'middle'='start')=>{const max=Math.max(4,Math.floor(width/(size*scale*.85)));const rows=value.split('\n').flatMap(s=>Array.from({length:Math.ceil(s.length/max)},(_,i)=>s.slice(i*max,(i+1)*max)));return <g>{rows.map((row,i)=><g key={i}>{text(row,x,y+i*size*1.35,size,fill,anchor)}</g>)}</g>;};
 const header=<g opacity={intro}>{text(label,50,48,14,accent)}{wrap(title,50,110,880,42)}{wrap(body,50,175,880,22)}</g>;
 const footer=text(String(c.source??''),50,570,15,ink);
 const rows=parseChartRows(c.items),max=Math.max(1,...rows.map(r=>Math.abs(r.value))),span=840/Math.max(1,rows.length);
 let visual:ReactNode;
 if(['frame-data-chart-nyt','frame-data-rollup','frame-pentagram-stat'].includes(kind)){
  const stat=kind==='frame-pentagram-stat';
  visual=<>{stat?<>{text(label,50,48,16,accent)}{text((Number(c.value??0)*intro).toFixed(1)+String(c.suffix??''),50,240,155,accent)}{wrap(title,520,110,430,40)}{wrap(body,520,190,430,22)}</>:header}
   {[0,.25,.5,.75,1].map((v,i)=><g key={i}><line x1={60} x2={950} y1={510-v*(stat?210:270)} y2={510-v*(stat?210:270)} stroke={ink} opacity={.15}/>{!stat&&text((max*v).toFixed(0),45,515-v*270,12,ink,'end')}</g>)}
   {rows.map((r,i)=>{const grow=kind==='frame-data-rollup'?Math.min(1.08,Math.max(0,1-Math.exp(-Math.max(0,frame-i*6)/12)*Math.cos(Math.max(0,frame-i*6)/6))):reveal(i);const h=Math.abs(r.value)/max*(stat?190:235)*grow;return <g key={i}><rect x={80+i*span} y={510-h} width={span*.66} height={h} rx={kind==='frame-data-rollup'?10:0} fill={accent}/>{text((r.value*Math.min(1,grow)).toFixed(1),80+i*span,498-h,Math.min(23,span*.18))}{text(r.label,80+i*span,540,Math.min(20,span*.2))}</g>;})}{footer}</>;
 }else if(kind==='frame-nyt-graph'){
  const points=rows.map((r,i)=>[80+i*840/Math.max(1,rows.length-1),500-r.value/max*260]);
  visual=<>{header}{[0,.5,1].map((v,i)=><line key={i} x1={60} x2={950} y1={500-v*260} y2={500-v*260} stroke={ink} opacity={.2}/>)}<polyline points={points.map(p=>p.join(',')).join(' ')} fill="none" stroke={accent} strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1-ease(frame/65)}/>{points.map(([x,y],i)=><g key={i} opacity={reveal(i)}><circle cx={x} cy={y} r={7} fill={accent}/>{text(String(rows[i].value),x,y-18,22,ink,'middle')}{text(rows[i].label,x,540,18,ink,'middle')}</g>)}{footer}</>;
 }else if(kind==='frame-decision-tree'){
  const nodes=parseTreeRows(c.items),byId=new Map(nodes.map(n=>[n.id,n]));
  const depth=(id:string,seen=new Set<string>()):number=>{if(seen.has(id))return 0;seen.add(id);const n=byId.get(id);return !n||!byId.has(n.parent)?0:Math.min(4,1+depth(n.parent,seen));};
  const depths=nodes.map(n=>depth(n.id)),levels=Math.max(1,...depths)+1;
  const positions=nodes.map((n,i)=>{const siblings=nodes.filter((_,j)=>depths[j]===depths[i]);return {x:500+(siblings.indexOf(n)-(siblings.length-1)/2)*Math.min(260,880/Math.max(1,siblings.length)),y:230+depths[i]*280/Math.max(1,levels-1)};});
  visual=<>{header}{nodes.map((n,i)=>{const j=nodes.findIndex(parent=>parent.id===n.parent),to=positions[i],from=positions[j];return j<0?null:<path key={n.id} d={`M${from.x},${from.y+26} C${from.x},${(from.y+to.y)/2} ${to.x},${(from.y+to.y)/2} ${to.x},${to.y-26}`} stroke={accent} fill="none" strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1-reveal(i)}/>;})}{nodes.map((n,i)=><g key={n.id} opacity={reveal(i)}><rect x={positions[i].x-110} y={positions[i].y-28} width={220} height={56} rx={15} fill={bg} stroke={accent}/>{text(n.label,positions[i].x,positions[i].y+7,20,ink,'middle')}</g>)}{footer}</>;
 }else if(kind==='frame-takram-organic'){
  visual=<>{text(label,50,45,16,accent)}{items.map((item,i)=>{const angle=i/Math.max(1,items.length)*Math.PI*2;const x=500+350*Math.cos(angle),y=310+205*Math.sin(angle);return <g key={i} opacity={reveal(i)}><path d={`M500,310 Q${x},310 ${x},${y}`} stroke={accent} strokeWidth={2} fill="none"/><circle cx={x} cy={y} r={40+Math.sin(frame/25+i)*4} fill={accent} opacity={.18}/>{text(item,x,y+6,18,ink,'middle')}</g>;})}<rect x={305} y={240} width={390} height={140} rx={35} fill={bg} stroke={accent}/>{wrap(title,500,292,350,32,ink,'middle')}{wrap(body,500,530,850,20,ink,'middle')}</>;
 }else if(['frame-product-promo','frame-product-promo-30s','frame-play-mode','frame-kinetic-type'].includes(kind)){
  const scenes=items.length?items:[title,body],index=Math.min(scenes.length-1,Math.floor(p*scenes.length)),local=p*scenes.length-index,enter=ease(local*8),angle=kind==='frame-play-mode'?Math.sin(frame/9)*8:0;
  visual=<><rect x={0} y={0} width={1000} height={8} fill={accent}/><rect x={0} y={0} width={p*1000} height={8} fill={ink}/>{text(label,50,54,16,accent)}{text(`${String(index+1).padStart(2,'0')} / ${scenes.length}`,950,54,18,ink,'end')}
   {kind==='frame-play-mode'&&Array.from({length:7},(_,i)=><circle key={i} cx={100+i*145} cy={330+Math.sin(frame/9+i)*130} r={30+i*3} fill={accent} opacity={.15}/>)}
   {kind.includes('product-promo')&&index>0&&index<scenes.length-1?<g opacity={enter}><rect x={460} y={135} width={490} height={350} rx={18} fill={ink} opacity={.08}/><rect x={480} y={155} width={450} height={32} rx={8} fill={accent}/>{[0,1,2].map(i=><rect key={i} x={490} y={220+i*70} width={(i+2)*90*enter} height={35} rx={6} fill={accent} opacity={.3+i*.2}/>)}{wrap(scenes[index],50,245,365,48)}{wrap(body,50,415,360,22)}</g>:<g transform={`translate(500 310) rotate(${angle}) scale(${.75+.25*enter}) translate(-500 -310)`} opacity={enter}>{wrap(scenes[index],500,260,860,kind==='frame-kinetic-type'?80:62,ink,'middle')}{wrap(index===0?title:body,500,450,850,26,accent,'middle')}</g>}{footer}</>;
 }else if(kind==='frame-logo-outro'){
  visual=<>{Array.from({length:4},(_,i)=>{const x=450+i%2*54,y=125+Math.floor(i/2)*54;return <rect key={i} x={x+(i%2?1:-1)*(1-intro)*300} y={y+(i<2?-1:1)*(1-intro)*120} width={48} height={48} rx={10} fill={accent}/>;})}{wrap(title,500,345,900,65,ink,'middle')}{wrap(body,500,425,850,28,accent,'middle')}{text(label,500,520,18,ink,'middle')}</>;
 }else if(kind==='vfx-text-cursor'){
  const chars=Math.floor(clamp(frame/Math.max(1,duration*.6))*title.length);
  visual=<><rect x={50} y={110} width={900} height={375} rx={22} fill={ink} opacity={.06}/>{text(label,80,155,18,accent)}{wrap('> '+title.slice(0,chars)+(Math.floor(frame/15)%2===0?'▌':''),90,245,810,50)}{wrap(body,90,420,810,23,accent)}{footer}</>;
 }else if(kind==='frame-glitch-title'){
  const j=frame%37<5?Math.sin(frame*7)*13:0;
  visual=<>{Array.from({length:60},(_,i)=><line key={i} x1={0} x2={1000} y1={i*10+frame%10} y2={i*10+frame%10} stroke={accent} opacity={.08}/>)}{text(label,50,65,18,accent)}<g opacity={.5}>{wrap(title,500+j,285,900,90,'#ff387a','middle')}{wrap(title,500-j,290,900,90,'#21ddff','middle')}</g>{wrap(title,500,285,900,90,ink,'middle')}{wrap(body,500,460,850,25,accent,'middle')}</>;
 }else if(kind==='frame-build-minimal'){
  visual=<>{text(label,60,60,17,accent)}{wrap(title.slice(0,Math.ceil(intro*title.length)),500,300,900,72,ink,'middle')}<line x1={500-350*intro} x2={500+350*intro} y1={355} y2={355} stroke={accent}/>{wrap(body,500,425,850,24,ink,'middle')}{footer}</>;
 }else if(kind==='frame-electric-studio'||kind==='frame-creative-voltage'||kind==='frame-vignelli'){
  visual=<><rect x={kind==='frame-vignelli'?650:0} y={kind==='frame-vignelli'?0:kind==='frame-creative-voltage'?150:300} width={1000} height={600*intro} fill={accent}/>{kind==='frame-creative-voltage'&&<rect x={50} y={95} width={620} height={335} fill={bg} stroke={ink} transform="rotate(-3 350 260)"/>}{text(label,50,55,17,ink)}{wrap(title,70,200,830,kind==='frame-vignelli'?110:76)}{wrap(body,70,450,850,32,kind==='frame-electric-studio'?'#ffffff':ink)}{items.map((item,i)=><g key={i} opacity={reveal(i)}>{text(item,70+i*280,550,22,ink)}</g>)}</>;
 }else if(kind==='frame-swiss-grid'){
  visual=<>{[0,1,2,3].map(i=><line key={i} x1={50+i*300} x2={50+i*300} y1={35} y2={560} stroke={ink} opacity={.3}/>)}{[0,1,2].map(i=><line key={i} x1={50} x2={950} y1={60+i*235} y2={60+i*235} stroke={ink} opacity={.3}/>)}{text(label,65,48,14,accent)}{wrap(title,65,135,860,70)}{items.map((item,i)=><g key={i} opacity={reveal(i)}>{text(String(i+1).padStart(2,'0'),65+(i%3)*300,340+Math.floor(i/3)*100,28,accent)}{wrap(item,65+(i%3)*300,382+Math.floor(i/3)*100,260,24)}</g>)}{footer}</>;
 }else if(['frame-liquid-bg-hero','frame-light-leak-cinema','frame-warm-grain'].includes(kind)){
  visual=<>{kind==='frame-liquid-bg-hero'?Array.from({length:4},(_,i)=><ellipse key={i} cx={500+Math.sin(frame/50+i*2)*370} cy={300+Math.cos(frame/60+i)*220} rx={310} ry={210} fill={i%2?accent:'#7164cf'} opacity={.42} style={{filter:'blur(45px)'}}/>):<>{kind==='frame-light-leak-cinema'&&<ellipse cx={900+Math.sin(frame/35)*180} cy={250} rx={400} ry={450} fill={accent} opacity={.18}/>} {Array.from({length:180},(_,i)=><circle key={i} cx={(i*137+Math.floor(frame/3)*11)%1000} cy={(i*71)%600} r={1+(i%3)} fill={ink} opacity={.06}/>)}</>}{text(label,60,65,18,accent)}{wrap(title,500,275,860,72,ink,'middle')}{wrap(body,500,435,840,27,ink,'middle')}{footer}</>;
 }else if(kind==='frame-bold-signal'){
  visual=<><rect x={70} y={60+(1-intro)*300} width={860} height={480} rx={24} fill={accent}/>{text(label,100,110,17,bg)}{wrap(title,100,235,800,100,bg)}{wrap(body,100,440,800,30,bg)}</>;
 }else{
  visual=<>{text(label,50,55,17,accent)}{text('01',940,195,170,accent,'end')}{wrap(title,50,210,800,100)}<line x1={50} x2={50+900*intro} y1={420} y2={420} stroke={ink} strokeWidth={3}/>{wrap(body,50,470,850,28)}{footer}</>;
 }
 return <svg data-hv-template={kind} width="100%" height="100%" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet" style={{display:'block',background:a.transparent?'transparent':bg}}><g>{visual}</g></svg>;
}
