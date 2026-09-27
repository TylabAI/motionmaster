import {expect,it} from 'vitest';
import {starterCardDefinitions} from '@motion-master/cards-starter';
import {createProject} from './index';
import {restyleCard,restoreDesign} from './html-design';

it('switches every registered template while preserving timeline, placement and authored content',()=>{
  for(const target of starterCardDefinitions){
    const original=starterCardDefinitions.find(d=>d.cardType!==target.cardType)!;
    const p=createProject({projectId:'restyle-all',title:'验收',durationFrames:1000});
    const card={...structuredClone(original.defaults),cardId:'keep-id',trackId:'overlay-main',startFrame:73,durationFrames:141};
    card.content={...card.content,title:'用户标题',body:'用户说明',items:'甲|10\n乙|20'};
    card.layout={...card.layout,x:12,y:17,scale:.25};
    p.timeline.cards=[card];const before=structuredClone(card);
    restyleCard(p,card.cardId,target.cardType);
    expect(card.cardType,target.cardType).toBe(target.cardType);
    expect([card.cardId,card.trackId,card.startFrame,card.durationFrames,card.layout]).toEqual([before.cardId,before.trackId,before.startFrame,before.durationFrames,before.layout]);
    expect(card.content.title).toBe('用户标题');
    for(const key of ['visualKind','variant','sourceCount'])expect(card.content[key]).toEqual(target.defaults.content[key]);
    restoreDesign(p,card.cardId);
    const {designHistory,...restoredContent}=card.content;
    expect(restoredContent).toEqual(before.content);
    expect(card.cardType).toBe(before.cardType);
  }
});

it('does not mutate a card when the requested template is absent',()=>{
  const p=createProject({projectId:'restyle-unknown',title:'验收',durationFrames:1000});
  p.timeline.cards=[{...structuredClone(starterCardDefinitions[0].defaults),cardId:'c',trackId:'overlay-main',startFrame:0}];
  const before=structuredClone(p);
  expect(()=>restyleCard(p,'c','unknown-template')).toThrow(/不存在/);
  expect(p).toEqual(before);
});
