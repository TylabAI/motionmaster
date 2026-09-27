import type {MotionCardInstance} from '@motion-master/schema';
export type CardBox={x:number;y:number;width:number;height:number};
export const bounded=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function cardBox(card:MotionCardInstance):CardBox {
  const l=card.layout,scale=Number(l.scale??1);
  const width=bounded(Number(l.width??(card.cardType==='ambient-wash'?100:34))*scale,4,100);
  const height=bounded(Number(l.height??(card.cardType==='ambient-wash'?100:card.cardType==='lower-third'?12:28))*scale,4,100);
  const x=Number(l.x??(l.side==='right'?94.8-width-Number(l.offsetX??0):5.2+Number(l.offsetX??0)));
  const y=Number(l.y??(50+Number(l.offsetY??0)-height/2));
  return {x:bounded(x,0,100-width),y:bounded(y,0,100-height),width,height};
}
export function transformBox(box:CardBox,handle:string,dx:number,dy:number):CardBox {
  if(handle==='move')return {...box,x:bounded(box.x+dx,0,100-box.width),y:bounded(box.y+dy,0,100-box.height)};
  let left=box.x,top=box.y,right=box.x+box.width,bottom=box.y+box.height;
  if(handle.includes('w'))left=bounded(left+dx,0,right-4);
  if(handle.includes('e'))right=bounded(right+dx,left+4,100);
  if(handle.includes('n'))top=bounded(top+dy,0,bottom-4);
  if(handle.includes('s'))bottom=bounded(bottom+dy,top+4,100);
  return {x:left,y:top,width:right-left,height:bottom-top};
}
