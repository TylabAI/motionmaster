import {it,expect} from 'vitest';
import {transcriptQualityWarnings} from './index';
it('flags sparse recognition in long video without claiming missing words are silence',()=>{
  expect(transcriptQualityWarnings([{wordId:'w',text:'test',startFrame:100,endFrame:124}],30,26756)[0]).toContain('识别覆盖不足');
});
it('allows short speech and detects empty recognition',()=>{
  expect(transcriptQualityWarnings([{wordId:'w',text:'test',startFrame:0,endFrame:240}],30,300)).toEqual([]);
  expect(transcriptQualityWarnings([],30,300)[0]).toContain('没有识别到');
});
