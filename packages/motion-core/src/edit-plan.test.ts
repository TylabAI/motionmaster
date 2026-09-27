import {it,expect} from 'vitest';
import {createProject,applyEditPlan,validateProject} from './index';
const source=()=>{const p=createProject({projectId:'test-cuts',title:'Test',durationFrames:300});p.timeline.segments=[{segmentId:'intro',startFrame:0,endFrame:60,text:'介绍'},{segmentId:'removed',startFrame:80,endFrame:120,text:'可恢复内容'},{segmentId:'ending',startFrame:180,endFrame:240,text:'结论'}];p.timeline.cards=[{cardId:'card',cardType:'quote-lines',cardVersion:'1',trackId:'overlay-main',startFrame:0,durationFrames:250,content:{title:'测试'},appearance:{},layout:{},motion:{},sourceSegmentIds:['intro']}];return p;};
it('does not resurrect a deleted word from a one-frame ASR overlap; restoring brings it back',()=>{
 const p=source();p.transcript={revision:1,subtitleCues:[],wordCues:[{wordId:'a',text:'通',startFrame:99,endFrame:120,keep:true}],cutDecisions:[{cutId:'d',startFrame:100,endFrame:120,type:'retake',sourceWordIds:['a'],evidenceWordIds:[],confidence:.9,status:'proposed'}]};
 const cut=applyEditPlan(p,[{startFrame:0,endFrame:100},{startFrame:120,endFrame:300}]);
 expect(cut.transcript!.wordCues[0].keep).toBe(false);
 expect(applyEditPlan(cut,[{startFrame:0,endFrame:300}]).transcript!.wordCues[0].keep).toBe(true);
});
it('restores removed subtitles, card content, and exact source duration',()=>{
  const p=applyEditPlan(source(),[{startFrame:0,endFrame:60},{startFrame:150,endFrame:300}]);
  expect(validateProject(p).filter(x=>x.severity==='error')).toEqual([]);
  expect(p.timeline.segments.find(s=>s.sourceId==='ending')?.startFrame).toBe(90);
  const again=applyEditPlan(p,p.editPlan!.keptRanges);
  expect(again.timeline).toEqual(p.timeline);
  const restored=applyEditPlan(again,[{startFrame:0,endFrame:300}]);
  expect(restored.canvas.durationFrames).toBe(300);expect(restored.timeline.segments.find(s=>s.segmentId==='removed')?.text).toBe('可恢复内容');
  expect(restored.timeline.cards[0].durationFrames).toBe(250);
});
it('merges overlaps without deleting intentional touching split points',()=>{
  const p=applyEditPlan(source(),[{startFrame:0,endFrame:100},{startFrame:50,endFrame:150},{startFrame:150,endFrame:300}]);
  expect(p.canvas.durationFrames).toBe(300);expect(p.editPlan?.keptRanges).toHaveLength(2);expect(p.editPlan?.removedRanges).toEqual([]);
});
it('lifts manual card changes before applying a second cut',()=>{
  const p=source();p.timeline.cards[0].startFrame=180;p.timeline.cards[0].durationFrames=60;
  const cut=applyEditPlan(p,[{startFrame:150,endFrame:300}]);cut.timeline.cards[0].startFrame=40;cut.timeline.cards[0].content.title='人工修改';
  const restored=applyEditPlan(cut,[{startFrame:0,endFrame:300}]);expect(restored.timeline.cards[0].startFrame).toBe(190);expect(restored.timeline.cards[0].content.title).toBe('人工修改');
});
it('restores clipped card tails and split subtitle references after round trip',()=>{
  let p=source();p.timeline.cards[0].sourceSegmentIds=['ending'];
  p=JSON.parse(JSON.stringify(applyEditPlan(p,[{startFrame:10,endFrame:200}])));
  p=applyEditPlan(p,[{startFrame:0,endFrame:300}]);
  expect(p.timeline.cards[0].startFrame).toBe(0);expect(p.timeline.cards[0].durationFrames).toBe(250);
  expect(p.timeline.segments.find(s=>s.segmentId==='ending')?.endFrame).toBe(240);
});
