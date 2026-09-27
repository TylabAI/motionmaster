import {describe,it,expect} from 'vitest';
import {planCut,readWords,normalizeRanges,complement,sourceToEdited,editedToSource} from './index';
describe('independent rough-cut planner',()=>{
  it('keeps frame zero and tail; acoustic cuts leave breathing room',()=>{
    const p=planCut({fps:30,durationFrames:300,silences:[{startFrame:60,endFrame:120}]});
    expect(p.keptRanges).toEqual([{startFrame:0,endFrame:66},{startFrame:114,endFrame:300}]);
    expect(p.removedRanges).toEqual([{startFrame:66,endFrame:114}]);
  });
  it('does not treat missing transcript words as silence',()=>{
    expect(planCut({fps:24,durationFrames:240,words:[{wordId:'1',text:'这个功能',startFrame:50,endFrame:80}]}).removedRanges).toEqual([]);
  });
  it('protects semantic Chinese connectors and emphasizes uncertainty',()=>{
    const p=planCut({fps:30,durationFrames:300,words:['这个','然后','其实','很好','很好'].map((text,i)=>({wordId:String(i),text,startFrame:i*30,endFrame:i*30+15}))});
    expect(p.removedRanges).toEqual([]);expect(p.cutDecisions).toHaveLength(1);expect(p.cutDecisions[0].status).toBe('proposed');
  });
  it('protects speech where acoustic and word evidence conflict',()=>{
    const p=planCut({fps:30,durationFrames:300,silences:[{startFrame:0,endFrame:150}],words:[{wordId:'a',text:'重要',startFrame:40,endFrame:80}]});
    expect(p.removedRanges).toEqual([]);expect(p.cutDecisions[0].status).toBe('proposed');
  });
  it('handles a silent source without deleting virtually everything',()=>{
    const p=planCut({fps:30,durationFrames:300,silences:[{startFrame:0,endFrame:300}]});
    expect(p.keptRanges).toEqual([{startFrame:0,endFrame:300}]);
  });
  it('accepts Hypit and Whisper formats at actual project fps, drops absent times',()=>{
    expect(readWords({passages:[{words:[{text:'好',start_seconds:0,end_seconds:.5},{text:'未知'}]}]},24,240)).toEqual([{wordId:'word-1',text:'好',startFrame:0,endFrame:12,keep:true}]);
  });
  it('has complete disjoint coverage and invertible kept positions',()=>{
    for(let seed=1;seed<100;seed++){
      const ranges=normalizeRanges([{startFrame:seed,endFrame:seed+80},{startFrame:seed+50,endFrame:seed+100}],300);
      expect([...ranges,...complement(ranges,300)].reduce((s,r)=>s+r.endFrame-r.startFrame,0)).toBe(300);
      for(const r of ranges)for(let f=r.startFrame;f<r.endFrame;f++)expect(editedToSource(sourceToEdited(f,ranges),ranges)).toBe(f);
    }
  });
});
