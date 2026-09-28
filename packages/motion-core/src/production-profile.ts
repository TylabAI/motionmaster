import type {MotionProject, ProductionProfile} from '@motion-master/schema';

export type ProductionSceneKind='chapter'|'steps'|'comparison'|'emphasis'|'summary';
export type ProductionSceneRecipe={
  id:string;
  label:string;
  purpose:string;
  kind:ProductionSceneKind;
  durationSeconds:[number,number];
  recommendedCardTypes:string[];
  beats:string[];
};

export const productionModes=[
  {id:'talking-head',label:'口播讲解',description:'围绕字幕论点添加章节、步骤、对比、强调和总结。'},
  {id:'product-promo',label:'产品宣传片',description:'从品牌开场到行动号召，形成完整的产品叙事。'},
  {id:'feature-launch',label:'功能发布视频',description:'聚焦问题、核心功能、使用流程、证据和行动号召。'},
  {id:'tutorial',label:'教程讲解',description:'围绕目标、步骤、注意事项和结果组织教学节奏。'},
  {id:'data-report',label:'数据报告',description:'围绕指标、变化、比较、洞察和结论组织数据故事。'},
] as const;

export const productionSceneRecipes:ProductionSceneRecipe[]=[
  {id:'brand-open',label:'品牌开场',purpose:'建立品牌、主题和观看预期',kind:'chapter',durationSeconds:[2,4],recommendedCardTypes:['hv-frame-logo-outro','hv-frame-bold-signal','section-head'],beats:['Logo或品牌名进入','一句定位','核心主题出现']},
  {id:'problem',label:'问题与机会',purpose:'说明用户面对的问题以及为什么现在需要解决',kind:'comparison',durationSeconds:[3,6],recommendedCardTypes:['hv-frame-electric-studio','before-after','strike-flip'],beats:['现状','关键摩擦','目标状态']},
  {id:'capability',label:'核心能力',purpose:'用一个明确动作展示产品最重要的能力',kind:'emphasis',durationSeconds:[3,7],recommendedCardTypes:['hv-frame-build-minimal','info-board','kinetic-words'],beats:['能力名称','输入或触发','可见结果']},
  {id:'process',label:'使用流程',purpose:'展示从开始到结果的主要步骤',kind:'steps',durationSeconds:[4,9],recommendedCardTypes:['hv-frame-swiss-grid','process-steps','milestone-line'],beats:['起点','关键步骤','完成状态']},
  {id:'multi-view',label:'多视图与灵活性',purpose:'展示同一内容的不同视图、形态或应用方式',kind:'comparison',durationSeconds:[3,7],recommendedCardTypes:['hv-frame-takram-organic','three-column','before-after'],beats:['视图切换','差异说明','共同价值']},
  {id:'ecosystem',label:'生态与连接',purpose:'呈现产品、数据、角色或工具之间的关系',kind:'steps',durationSeconds:[3,7],recommendedCardTypes:['hv-frame-swiss-grid','three-column','info-board'],beats:['中心对象','连接扩展','协同结果']},
  {id:'ai',label:'AI 智能',purpose:'展示可验证的 AI 输入、处理和结果，避免夸大',kind:'emphasis',durationSeconds:[3,7],recommendedCardTypes:['hv-frame-creative-voltage','callout-note','info-board'],beats:['输入','处理提示','具体输出']},
  {id:'collaboration',label:'协作与交付',purpose:'展示多人、角色或流程如何共同完成结果',kind:'steps',durationSeconds:[3,7],recommendedCardTypes:['hv-frame-warm-grain','process-steps','three-column'],beats:['参与者','协作动作','交付结果']},
  {id:'data-proof',label:'数据与证据',purpose:'用真实指标、案例或可验证结果支撑主张',kind:'emphasis',durationSeconds:[3,7],recommendedCardTypes:['stat-grid','metric-focus','mini-chart'],beats:['指标来源','数字出现','结论解释']},
  {id:'comparison',label:'前后对比',purpose:'对比旧流程与新流程或两个方案的差异',kind:'comparison',durationSeconds:[3,7],recommendedCardTypes:['comparison-bars','before-after','hv-frame-electric-studio'],beats:['对比对象','关键差异','选择依据']},
  {id:'tutorial-step',label:'教程步骤',purpose:'按可执行顺序讲清操作步骤和检查点',kind:'steps',durationSeconds:[4,10],recommendedCardTypes:['process-steps','checklist','hv-frame-swiss-grid'],beats:['当前目标','操作步骤','检查结果']},
  {id:'insight',label:'洞察解释',purpose:'解释数据变化背后的原因和影响',kind:'emphasis',durationSeconds:[3,8],recommendedCardTypes:['mini-chart','callout-note','conclusion-card'],beats:['观察','解释','影响']},
  {id:'cta',label:'行动号召',purpose:'明确告诉观众下一步做什么',kind:'summary',durationSeconds:[2,5],recommendedCardTypes:['conclusion-card','hv-frame-logo-outro','callout-note'],beats:['核心价值回顾','下一步','品牌或地址']},
  {id:'summary',label:'总结收束',purpose:'回收章节重点并形成明确结论',kind:'summary',durationSeconds:[3,6],recommendedCardTypes:['conclusion-card','checklist','hv-frame-warm-grain'],beats:['重点回顾','最终结论','后续方向']},
];

const recipeSequences:Record<ProductionProfile['narrativeRecipe'],string[]>={
  auto:[],
  'promo-eight-beat':['brand-open','problem','capability','process','multi-view','ecosystem','data-proof','cta'],
  'feature-launch':['brand-open','problem','capability','process','comparison','data-proof','cta'],
  'tutorial-flow':['brand-open','tutorial-step','tutorial-step','comparison','summary'],
  'data-story':['brand-open','data-proof','comparison','insight','summary'],
};

const defaultRecipe:Record<ProductionProfile['mode'],ProductionProfile['narrativeRecipe']>={
  'talking-head':'auto',
  'product-promo':'promo-eight-beat',
  'feature-launch':'feature-launch',
  tutorial:'tutorial-flow',
  'data-report':'data-story',
};

export const resolvedNarrativeRecipe=(profile:ProductionProfile)=>profile.narrativeRecipe==='auto'?defaultRecipe[profile.mode]:profile.narrativeRecipe;

export function productionCatalog(){
  return {version:'motion-production-recipes@1',modes:productionModes,recipes:productionSceneRecipes,sequences:recipeSequences};
}

export function productionBrief(project:MotionProject){
  const profile=project.productionProfile;
  const narrativeRecipe=resolvedNarrativeRecipe(profile);
  const sequenceIds=recipeSequences[narrativeRecipe];
  const sequence=sequenceIds.map(id=>productionSceneRecipes.find(recipe=>recipe.id===id)!).filter(Boolean);
  const brand=profile.brand;
  const missingBrandFields=profile.mode==='talking-head'?[]:[
    !brand.name&&'name',!brand.sourceUrl&&'sourceUrl',!brand.logoUrl&&'logoUrl',!brand.primaryColor&&'primaryColor',
  ].filter((value):value is string=>Boolean(value));
  return {
    format:'motion-production-brief@1',
    mode:profile.mode,
    narrativeRecipe,
    targetAspectRatios:profile.targetAspectRatios,
    brand,
    missingBrandFields,
    sequence,
    rules:[
      'Only use product claims and numbers supported by the brief, transcript, project data, or user-provided evidence.',
      'Treat the sequence as a narrative plan, not a requirement to force every scene into the video.',
      'Use varied visual forms; do not repeat one template or shrink the source video for every scene.',
      'Keep timing bound to measured words or explicit project frames.',
      'Preview every target aspect ratio before delivery; reflow layouts instead of stretching them.',
    ],
  };
}

export function sceneRecipe(id:string|undefined){return productionSceneRecipes.find(recipe=>recipe.id===id);}

const channel=(hex:string)=>Number.parseInt(hex,16)/255;
const luminance=(hex:string)=>{
  const value=hex.replace('#','');
  const rgb=[value.slice(0,2),value.slice(2,4),value.slice(4,6)].map(channel).map(value=>value<=.03928?value/12.92:((value+.055)/1.055)**2.4);
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
};
export function contrastRatio(foreground:string,background:string){
  const values=[luminance(foreground),luminance(background)].sort((a,b)=>b-a);
  return (values[0]+.05)/(values[1]+.05);
}
