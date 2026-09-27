import {useEffect,useState} from 'react';
import {MotionProjectCanvas} from '@motion-master/cards-starter';
import type {MotionCardDefinition,MotionProject} from '@motion-master/schema';
export function CardPreview({definition,project}:{definition:MotionCardDefinition;project:MotionProject}) {
  const [frame,setFrame]=useState(0);
  const duration=Math.max(1,definition.defaults.durationFrames),fps=project.canvas.fps;
  useEffect(()=>{let handle=0;const start=performance.now();setFrame(0);const tick=(now:number)=>{setFrame(Math.floor((now-start)*fps/1000)%duration);handle=requestAnimationFrame(tick);};handle=requestAnimationFrame(tick);return()=>cancelAnimationFrame(handle);},[definition,fps,duration]);
  const preview:MotionProject={...project,timeline:{...project.timeline,segments:[],cards:[{...definition.defaults,cardId:'catalog-preview',trackId:'overlay-main',startFrame:0,seg:undefined,sourceSegmentIds:[]}]}};
  return <div className="catalog-motion-preview" aria-label={`${definition.displayName} 动效预览`} style={{aspectRatio:`${project.canvas.width} / ${project.canvas.height}`}}><MotionProjectCanvas project={preview} frame={frame}/></div>;
}
