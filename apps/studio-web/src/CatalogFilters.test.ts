import {expect,it} from 'vitest';
import {starterCardDefinitions} from '@motion-master/cards-starter';
import {changeCategory,matchesCatalog} from './CatalogFilters';
it('combines all three categories with trimmed case-insensitive source search',()=>{
  const base=starterCardDefinitions[0];
  const card={...base,source:{...base.source,author:'Example Author'},classification:{level1:'文字',level2:'标题',level3:'逐字'}} as typeof base;
  expect(matchesCatalog(card,' example AUTHOR ',['文字','标题','逐字'])).toBe(true);
  expect(matchesCatalog(card,'example',['文字','标题','计数'])).toBe(false);
  expect(matchesCatalog(card,'不存在',['all','all','all'])).toBe(false);
  expect(changeCategory(['文字','标题','逐字'],0,'数据')).toEqual(['数据','all','all']);
  expect(changeCategory(['文字','标题','逐字'],1,'字幕')).toEqual(['文字','字幕','all']);
});
