import {createHash} from 'node:crypto';
import type {MotionProject} from '@motion-master/schema';
import {applyEditPlan} from './edit-plan';
import {complement,normalizeRanges,subtitleCues} from '../../semantic-cut/src/index';
import {semanticReviewRequest} from './semantic-review';

export function editKey(p:MotionProject){return createHash('sha256').update(JSON.stringify({asset:p.media.assetId,fps:p.canvas.fps,edit:p.editPlan??{duration:p.canvas.durationFrames}})).digest('hex');}
export function confirmPreCut(p:MotionProject,jobId:string,ids:string[]) {
 const draft=p.preCutDraft;
 if(!draft||draft.jobId!==jobId||p.preCut?.status!=='awaiting-confirmation')throw new Error('没有可确认的分析方案，或方案已执行');
 if(editKey(p)!==draft.baseEditKey||semanticReviewRequest(p).fingerprint!==draft.confirmationFingerprint)throw new Error('素材、字幕或剪辑已变化，请重新分析');
 if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>!draft.decisionIds.includes(id)))throw new Error('选中的建议不属于本次分析');
 const decisions=p.transcript!.cutDecisions.filter(d=>ids.includes(d.cutId));
 const duration=p.editPlan?.sourceDurationFrames??p.canvas.durationFrames;
 const removed=normalizeRanges([...(p.editPlan?.removedRanges??[]),...decisions],duration);
 const evidence=new Set(decisions.flatMap(d=>d.evidenceWordIds??[]));
 if(p.transcript!.wordCues.some(w=>evidence.has(w.wordId)&&removed.some(r=>r.startFrame<w.endFrame-1&&r.endFrame>w.startFrame+1)))throw new Error('选中的片段包含另一条建议的保留依据，请取消冲突项');
 const kept=complement(removed,duration);
 if(kept.reduce((sum,r)=>sum+r.endFrame-r.startFrame,0)<Math.min(duration,Math.ceil(p.canvas.fps*.5)))throw new Error('方案几乎删除整片，请保留更多内容');
 // Populate measured subtitles only for a previously empty transcript timeline.
 if(!p.timeline.segments.length&&!p.sourceTimeline?.segments.length){
   Object.assign(p,applyEditPlan(p,[{startFrame:0,endFrame:duration}]));
   const segments=subtitleCues(p.transcript!.wordCues.map(w=>({...w,keep:true})),p.canvas.fps).map(c=>({segmentId:c.cueId,startFrame:c.startFrame,endFrame:c.endFrame,text:c.text}));
   p.timeline.segments=structuredClone(segments);p.sourceTimeline!.segments=segments;
 }
 for(const d of p.transcript!.cutDecisions)if(draft.decisionIds.includes(d.cutId))d.status=ids.includes(d.cutId)?'accepted':'rejected';
 Object.assign(p,applyEditPlan(p,kept));
 p.preCut={...p.preCut!,status:'completed',stage:`初剪已执行：采用 ${ids.length} 条建议`,removedFrames:removed.reduce((sum,r)=>sum+r.endFrame-r.startFrame,0)};
 delete p.preCutDraft;
}
