import {useLayoutEffect,useRef,useState} from 'react';

export function TimelineZoom({viewKey}:{viewKey:string}) {
  const ref=useRef<HTMLDivElement>(null);
  const [level,setLevel]=useState(0);
  const zoom=2**(level/10);
  const previous=useRef({width:0,viewKey});
  useLayoutEffect(()=>{
    const scroll=ref.current?.closest('.timeline')?.querySelector<HTMLElement>('.timeline-scroll');
    if(!scroll)return;
    const resize=()=>{
      const visible=Math.max(1,scroll.clientWidth-18-123);
      const width=visible*zoom;
      const old=previous.current;
      const ruler=scroll.parentElement?.querySelector('[aria-label="播放头位置"]');
      const frame=Number(ruler?.getAttribute('aria-valuenow')??0);
      const duration=Number(ruler?.getAttribute('aria-valuemax')??0)+1;
      const position=frame/duration;
      const pixel=position*old.width-scroll.scrollLeft;
      const anchorPixel=old.width&&pixel>=0&&pixel<=visible?pixel:visible/2;
      const anchor=old.width?(scroll.scrollLeft+anchorPixel)/old.width:0;
      scroll.style.setProperty('--timeline-row-width',`${width+123}px`);
      scroll.scrollLeft=zoom===1||old.viewKey!==viewKey?0:Math.max(0,anchor*width-anchorPixel);
      previous.current={width,viewKey};
    };
    const observer=new ResizeObserver(resize);observer.observe(scroll);resize();
    return()=>observer.disconnect();
  },[zoom,viewKey]);
  return <div className="timeline-zoom" ref={ref} role="group" aria-label="时间轴缩放">
    <button aria-label="适配全片" title="适配全片" disabled={level===0} onClick={()=>setLevel(0)}>适配</button>
    <button aria-label="缩小时间轴" title="缩小时间轴" disabled={level===0} onClick={()=>setLevel(v=>Math.max(0,v-10))}>−</button>
    <input aria-label="时间轴缩放" type="range" min="0" max="60" step="1" value={level} onChange={e=>setLevel(Number(e.target.value))}/>
    <button aria-label="放大时间轴" title="放大时间轴" disabled={level===60} onClick={()=>setLevel(v=>Math.min(60,v+10))}>＋</button>
    <output>{zoom.toFixed(zoom<10?1:0)}×</output>
  </div>;
}
