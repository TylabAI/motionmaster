import {describe,expect,it} from 'vitest';
import {createProject,validateProject} from './index';
import {contrastRatio,productionBrief,productionCatalog} from './production-profile';

describe('production profile',()=>{
  it('keeps legacy projects in talking-head mode by default',()=>{
    const project=createProject({projectId:'profile-default',title:'Default'});
    expect(project.productionProfile.mode).toBe('talking-head');
    expect(productionBrief(project).sequence).toEqual([]);
  });

  it('resolves a product promo into the eight-beat narrative sequence',()=>{
    const project=createProject({projectId:'profile-promo',title:'Promo',productionProfile:{mode:'product-promo'}});
    const brief=productionBrief(project);
    expect(brief.narrativeRecipe).toBe('promo-eight-beat');
    expect(brief.sequence.map(scene=>scene.id)).toEqual(['brand-open','problem','capability','process','multi-view','ecosystem','data-proof','cta']);
    expect(brief.missingBrandFields).toEqual(['name','sourceUrl','logoUrl']);
    expect(productionCatalog().recipes.length).toBeGreaterThan(10);
  });

  it('checks brand contrast and repeated motion forms',()=>{
    const project=createProject({projectId:'profile-lint',title:'Lint',productionProfile:{mode:'product-promo',brand:{name:'MotionMaster',sourceUrl:'https://example.com',logoUrl:'https://example.com/logo.svg',backgroundColor:'#777777',textColor:'#777777'}}});
    project.timeline.cards=Array.from({length:5},(_,index)=>({cardId:`c${index}`,cardType:'metric-focus',cardVersion:'1',trackId:'overlay-main',startFrame:index*210,durationFrames:90,content:{title:`Card ${index}`},layout:{},appearance:{},motion:{},sourceSegmentIds:[]}));
    const codes=validateProject(project).map(issue=>issue.code);
    expect(codes).toContain('BRAND_CONTRAST_LOW');
    expect(codes).toContain('CARD_TYPE_REPETITION');
    expect(codes).toContain('MOTION_VARIETY_LOW');
    expect(contrastRatio('#ffffff','#000000')).toBeCloseTo(21,1);
  });
});
