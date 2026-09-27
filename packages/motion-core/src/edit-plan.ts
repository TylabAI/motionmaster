import {motionProjectSchema,type MotionProject,type EditRange} from '@motion-master/schema';
import {normalizeRanges,complement,sourceToEdited,editedToSource} from '../../semantic-cut/src/index';
import {bindSourceScenes,resolveSceneItems} from './scene-timing';

type Item={autoScene?:{followWords?:boolean};startFrame:number;endFrame?:number;durationFrames?:number;sourceId?:string;cardId?:string;segmentId?:string;dimAt?:number;sourceSegmentIds?:string[]};
const end=(item:Item)=>item.endFrame??item.startFrame+(item.durationFrames??0);
const id=(item:Item)=>item.sourceId??item.cardId??item.segmentId!;
const withSpan=<T extends Item>(item:T,start:number,finish:number):T=>({...item,startFrame:start,...('endFrame'in item?{endFrame:finish}:{}),...('durationFrames'in item?{durationFrames:finish-start}:{})});
const stable=(value:any):string=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,k==='sourceSegmentIds'?[...new Set(v[k].map((id:string)=>id.split('::part:')[0]))]:v[k]])):v);

function projectItems<T extends Item>(items:T[],ranges:EditRange[]):T[] {
  return items.flatMap(item=>{
    const pieces=ranges.flatMap(range=>{
      const start=Math.max(item.startFrame,range.startFrame),finish=Math.min(end(item),range.endFrame);
      if(finish<=start)return [];
      const mapped=withSpan(item,sourceToEdited(start,ranges),sourceToEdited(finish,ranges));
      if(item.dimAt!==undefined)mapped.dimAt=sourceToEdited(item.dimAt,ranges);
      return [mapped];
    });
    // Word-bound scenes stay continuous across removed source footage.
    if(item.autoScene?.followWords&&pieces.length>1)return [{...withSpan(pieces[0],pieces[0].startFrame,end(pieces[pieces.length-1])),sourceId:id(item)} as T];
    return pieces.map((piece,index)=>({...piece,sourceId:id(item),...(item.cardId?{cardId:pieces.length>1?`${id(item)}::part:${index}`:id(item)}:{}),...(item.segmentId?{segmentId:pieces.length>1?`${id(item)}::part:${index}`:id(item)}:{})} as T));
  });
}
/** Lift edits made on the current cut back to source before projecting a new plan. */
function reconcile<T extends Item>(saved:T[],current:T[],oldRanges:EditRange[]):T[] {
  const result:T[]=[];const seen=new Set<string>();
  for(const source of saved) {
    const visible=current.filter(item=>id(item)===id(source));
    const wasVisible=projectItems([source],oldRanges).length>0;
    if(!visible.length){if(!wasVisible)result.push(source);continue;}
    seen.add(id(source));
    const expected=projectItems([source],oldRanges);
    const unchanged=stable(visible)===stable(expected);
    if(unchanged){result.push(source);continue;}
    const first=visible[0];
    const start=Math.min(...visible.map(item=>editedToSource(item.startFrame,oldRanges)));
    const finish=Math.max(...visible.map(item=>editedToSource(end(item),oldRanges,'end')));
    const lifted=withSpan({...source,...first,cardId:source.cardId,segmentId:source.segmentId,sourceId:undefined},start,finish);
    if(first.dimAt!==undefined)lifted.dimAt=editedToSource(first.dimAt,oldRanges,'end');
    result.push(lifted);
  }
  for(const item of current) if(!seen.has(id(item))&&!saved.some(s=>id(s)===id(item))) {
    result.push(withSpan({...item,sourceId:undefined},editedToSource(item.startFrame,oldRanges),editedToSource(end(item),oldRanges,'end')));
  }
  return result;
}

export function applyEditPlan(project:MotionProject,keptRanges:EditRange[]):MotionProject {
  const sourceDurationFrames=project.editPlan?.sourceDurationFrames??project.canvas.durationFrames;
  // Overlap is merged; touching ranges remain split for the editor's split tool.
  const ranges=normalizeRanges(keptRanges,sourceDurationFrames,false);
  if(!ranges.length)throw new Error('至少保留一个素材片段');
  const next=structuredClone(project);
  const source=structuredClone(project.sourceTimeline??project.timeline);
  if(project.editPlan&&project.sourceTimeline){
    source.cards=reconcile(source.cards,project.timeline.cards,project.editPlan.keptRanges);
    source.segments=reconcile(source.segments,project.timeline.segments,project.editPlan.keptRanges);
  } else if(project.editPlan&&!project.sourceTimeline) {
    source.cards=reconcile([],project.timeline.cards,project.editPlan.keptRanges);
    source.segments=reconcile([],project.timeline.segments,project.editPlan.keptRanges);
  }
  source.cards=bindSourceScenes(project,source.cards);
  next.sourceTimeline=source;
  next.editPlan={sourceDurationFrames,keptRanges:ranges,removedRanges:complement(ranges,sourceDurationFrames)};
  next.canvas.durationFrames=ranges.reduce((sum,r)=>sum+r.endFrame-r.startFrame,0);
  next.timeline.cards=projectItems(source.cards,ranges);
  next.timeline.segments=projectItems(source.segments,ranges);
  const ids=new Map<string,string[]>();
  for(const seg of next.timeline.segments){const key=seg.sourceId??seg.segmentId;ids.set(key,[...(ids.get(key)??[]),seg.segmentId]);}
  for(const card of next.timeline.cards)card.sourceSegmentIds=card.sourceSegmentIds.flatMap(key=>ids.get(key)??[key]);
  next.editReview={status:'draft',revision:(project.editReview?.revision??0)+1};
  if(next.transcript) {
    next.transcript.cutDecisions=next.transcript.cutDecisions.map(d=>({...d,status:next.editPlan!.removedRanges.some(r=>r.startFrame<=d.startFrame&&r.endFrame>=d.endFrame)?'accepted':d.status==='accepted'?'rejected':d.status}));
    const deletedWords=new Set(next.transcript.cutDecisions.filter(d=>d.status==='accepted').flatMap(d=>d.sourceWordIds));
    next.transcript.wordCues=next.transcript.wordCues.map(w=>({...w,keep:!deletedWords.has(w.wordId)&&ranges.some(r=>w.startFrame<r.endFrame&&w.endFrame>r.startFrame)}));
  }
  next.timeline.cards=resolveSceneItems(next,next.timeline.cards);
  return motionProjectSchema.parse(next);
}
