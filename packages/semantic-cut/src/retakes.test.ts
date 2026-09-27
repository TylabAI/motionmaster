import {it,expect} from 'vitest';
import {detectRetakes,planCut,type Word} from './index';
import recordedRestarts from './fixtures/restart-fragments.json';
const make=(text:string,start:number,prefix:string):Word[]=>[...text].map((text,i)=>({wordId:prefix+i,text,startFrame:start+i*5,endFrame:start+i*5+5}));
const first='大家可以看到当下载器下载完成以后就会';
const later='大家可以看到当下载器下载完成之后就会自动进入到安装的这个流程';
it('removes the earlier unfinished take and preserves the extended restart',()=>{
  const old=make(first,384,'a'),second=make(later,522,'b');
  const plan=planCut({fps:30,durationFrames:1200,words:[...old,...second]});
  const cut=plan.cutDecisions.find(d=>d.type==='retake')!;
  expect(cut.status).toBe('accepted');expect(cut.sourceWordIds).toEqual(old.map(w=>w.wordId));
  expect(cut.endFrame).toBeLessThan(second[0].startFrame);
  expect(plan.wordCues.filter(w=>w.wordId.startsWith('b')).every(w=>w.keep)).toBe(true);
  expect(plan.wordCues.filter(w=>w.wordId.startsWith('a')).every(w=>!w.keep)).toBe(true);
});
it('does not automatically remove an intentional complete repeated sentence',()=>{
  const a=make('大家一定要注意保护自己的隐私。',0,'a');
  const b=make('大家一定要注意保护自己的隐私。接下来解释具体原因',150,'b');
  expect(detectRetakes([...a,...b],30).every(d=>d.status!=='accepted')).toBe(true);
});
it('ignores short emphasis and distant similar openings',()=>{
  expect(detectRetakes([...make('非常非常重要',0,'a'),...make('非常非常重要请大家认真听',100,'b')],30)).toEqual([]);
  expect(detectRetakes([...make(first,0,'a'),...make(later,1200,'b')],30)).toEqual([]);
});
it('works across different ASR word segmentation',()=>{
  const a:Word[]=[{wordId:'a',text:first,startFrame:384,endFrame:506}];
  const b=make(later,522,'b');
  // Detection also accepts a sentence as one measured word, without requiring token count.
  expect(detectRetakes([...a,...b],30).length).toBe(1);
});
it('recalls the two reported real ASR restarts without cutting the preceding clause',()=>{
 const decisions=detectRetakes(recordedRestarts,30);
 const changedSubject=decisions.find(d=>d.sourceWordIds[0]==='word-217');
 expect(changedSubject?.sourceWordIds.at(-1)).toBe('word-221');
 const midClause=decisions.find(d=>d.sourceWordIds[0]==='word-446');
 expect(midClause?.sourceWordIds).toEqual(['word-446','word-447','word-448','word-449']);
 for(const d of [changedSubject!,midClause!]){expect(d.status).toBe('proposed');expect(d.endFrame).toBeLessThanOrEqual(d===midClause?274.83*30:208.23*30);}
});
it('keeps short restart candidates review-only in a standalone cut plan',()=>{
 const a=make('通过不同的',100,'a'),b=make('通过AI模拟不同的岗位进行协作',160,'b');
 const plan=planCut({fps:30,durationFrames:500,words:[...a,...b]});
 expect(plan.cutDecisions.some(d=>d.type==='retake')).toBe(true);
 expect(plan.removedRanges).toEqual([]);
});
it('does not confuse complete clauses or shared connectors with abandoned takes',()=>{
 for(const [a,b] of [['通过不同的渠道收集数据','通过AI模拟不同的岗位进行协作'],['所以我们选择便宜的','所以大家需要确认质量'],['大家都知道','大家一定要保护自己的隐私']]){
  expect(detectRetakes([...make(a,0,'a'),...make(b,150,'b')],30)).toEqual([]);
 }
});
