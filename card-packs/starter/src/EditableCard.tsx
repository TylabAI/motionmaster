import {useRef,type PointerEvent} from 'react';
import type {MotionCardInstance} from '@motion-master/schema';
import {cardBox,transformBox,type CardBox} from './card-layout';
export function EditableCard({card,selected,onSelect,onChange,onCommit,onBegin}:{card:MotionCardInstance;selected:boolean;onSelect:()=>void;onBegin?:()=>void;onChange:(layout:MotionCardInstance['layout'])=>void;onCommit:(layout:MotionCardInstance['layout'])=>void}) {
  const drag=useRef<{x:number;y:number;w:number;h:number;box:CardBox;handle:string;layout:MotionCardInstance['layout'];moved:boolean}|null>(null);
  const box=cardBox(card);
  const begin=(event:PointerEvent<HTMLDivElement>,handle:string)=>{
    if(event.button!==0)return;
    event.preventDefault();event.stopPropagation();onSelect();
    const viewport=event.currentTarget.closest('[data-card-controls]')!.getBoundingClientRect();
    drag.current={x:event.clientX,y:event.clientY,w:viewport.width,h:viewport.height,box,handle,layout:card.layout,moved:false};
    event.currentTarget.setPointerCapture(event.pointerId);onBegin?.();
  };
  const update=(event:PointerEvent<HTMLDivElement>)=>{
    const d=drag.current;if(!d)return;
    const dx=(event.clientX-d.x)/d.w*100,dy=(event.clientY-d.y)/d.h*100;
    d.moved=d.moved||Math.abs(dx)+Math.abs(dy)>.05;
    const next={...d.layout,...transformBox(d.box,d.handle,dx,dy),scale:1};
    onChange(next);return next;
  };
  const finish=(event:PointerEvent<HTMLDivElement>)=>{const d=drag.current;if(!d)return;const next=update(event);drag.current=null;if(d.moved&&next)onCommit(next);};
  const cancel=()=>{if(drag.current)onChange(drag.current.layout);drag.current=null;};
  const handles=['n','s','e','w','nw','ne','sw','se'];
  return <div data-edit-card={card.cardId} aria-label="移动动效卡片" onPointerDown={e=>begin(e,'move')} onPointerMove={update} onPointerUp={finish} onPointerCancel={cancel}
    style={{position:'absolute',left:box.x+'%',top:box.y+'%',width:box.width+'%',height:box.height+'%',pointerEvents:'auto',cursor:'move',touchAction:'none',outline:selected?'1px solid #00ded0':undefined}}>
    {selected&&handles.map(h=><div key={h} data-resize-handle={h} aria-label={'调整卡片尺寸 '+h} onPointerDown={e=>begin(e,h)} onPointerMove={e=>{e.stopPropagation();update(e);}} onPointerUp={e=>{e.stopPropagation();finish(e);}} onPointerCancel={cancel}
      style={{position:'absolute',width:8,height:8,background:'#fff',border:'1px solid #00a99e',borderRadius:2,left:h.includes('w')?'0%':h.includes('e')?'100%':'50%',top:h.includes('n')?'0%':h.includes('s')?'100%':'50%',transform:'translate(-50%,-50%)',cursor:h==='n'||h==='s'?'ns-resize':h==='e'||h==='w'?'ew-resize':h==='nw'||h==='se'?'nwse-resize':'nesw-resize',touchAction:'none'}}/>)}
  </div>;
}
