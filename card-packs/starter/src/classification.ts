import type {MotionCardClassification, MotionCardDefinition} from '@motion-master/schema';

export const cardClassificationByType: Record<string, MotionCardClassification> = {
  'explain-scene': {level1:'结构叙事',level2:'讲解编排',level3:'词句绑定场景'},
  'rve-gradient-title': {level1: '结构叙事', level2: '章节组织', level3: '渐变标题'},
  'rve-chapter-title': {level1: '结构叙事', level2: '章节组织', level3: '章节标题 Pro'},
  'rve-animated-list': {level1: '结构叙事', level2: '流程说明', level3: '动效列表'},
  'rve-metric-card': {level1: '数据信息', level2: '指标展示', level3: '指标卡 Pro'},
  'rve-donut-chart': {level1: '数据信息', level2: '图表展示', level3: '环形数据图'},
  'rve-circular-progress': {level1: '数据信息', level2: '指标展示', level3: '圆环进度'},
  'rve-comparison-chart': {level1: '数据信息', level2: '对比分析', level3: '前后对比图'},
  'rve-bento-grid': {level1: '数据信息', level2: '信息说明', level3: 'Bento 信息格'},
  'rve-quote-card': {level1: '文字强调', level2: '观点强化', level3: '高级引言卡'},
  'rve-glitch-text': {level1: '视觉动效', level2: '文字入场', level3: '故障文字'},
  'rve-sound-wave': {level1: '视觉动效', level2: '图形氛围', level3: '声音波形'},
  'rve-grid-pulse': {level1: '背景氛围', level2: '科技背景', level3: '脉冲网格'},
  'ambient-wash': {level1: '背景氛围', level2: '科技背景', level3: '网格氛围'},
  'section-head': {level1: '结构叙事', level2: '章节组织', level3: '章节标题'},
  'process-steps': {level1: '结构叙事', level2: '流程说明', level3: '步骤节点'},
  'milestone-line': {level1: '结构叙事', level2: '时间脉络', level3: '里程碑线'},
  checklist: {level1: '结构叙事', level2: '清单说明', level3: '验收清单'},
  'conclusion-card': {level1: '结构叙事', level2: '章节收束', level3: '结论卡'},

  'info-board': {level1: '数据信息', level2: '信息说明', level3: '信息面板'},
  'metric-focus': {level1: '数据信息', level2: '指标展示', level3: '核心数字'},
  'stat-grid': {level1: '数据信息', level2: '指标展示', level3: '数据矩阵'},
  'radial-gauge': {level1: '数据信息', level2: '指标展示', level3: '环形进度'},
  'ranking-list': {level1: '数据信息', level2: '列表排序', level3: '排行列表'},
  'mini-chart': {level1: '数据信息', level2: '趋势展示', level3: '柱状趋势'},
  'comparison-bars': {level1: '数据信息', level2: '对比分析', level3: '双条对比'},
  'before-after': {level1: '数据信息', level2: '对比分析', level3: '前后双栏'},
  'three-column': {level1: '数据信息', level2: '架构说明', level3: '三列结构'},

  'quote-lines': {level1: '文字强调', level2: '观点强化', level3: '逐行金句'},
  'kinetic-words': {level1: '文字强调', level2: '关键词强化', level3: '词语阵列'},
  'strike-flip': {level1: '文字强调', level2: '观点纠偏', level3: '划线翻转'},
  'callout-note': {level1: '文字强调', level2: '辅助标注', level3: '侧边批注'},
  'lower-third': {level1: '文字强调', level2: '人物信息', level3: '人物名条'},

  'shotcraft-blur-slide': {level1: '视觉动效', level2: '文字入场', level3: '模糊滑入'},
  'shotcraft-marker-underline': {level1: '视觉动效', level2: '重点强调', level3: '马克笔线'},
  'shotcraft-card-stack': {level1: '视觉动效', level2: '阵列展示', level3: '卡片扇展'},
  'shotcraft-radial-wave': {level1: '视觉动效', level2: '图形氛围', level3: '径向点阵'},
  'shotcraft-theme-sweep': {level1: '视觉动效', level2: '场景转场', level3: '主题扫场'},
  'shotcraft-crash-zoom': {level1: '视觉动效', level2: '镜头聚焦', level3: '急推聚焦'},
  'shotcraft-scanline-focus': {level1: '视觉动效', level2: '识别标注', level3: '扫描框'},
  'shotcraft-pull-back': {level1: '视觉动效', level2: '镜头收束', level3: '拉远孤立'},
};

const legacyFallback: Record<MotionCardDefinition['category'], MotionCardClassification> = {
  ambient: {level1: '背景氛围', level2: '其他背景', level3: '未分类'},
  chapter: {level1: '结构叙事', level2: '其他结构', level3: '未分类'},
  data: {level1: '数据信息', level2: '其他信息', level3: '未分类'},
  comparison: {level1: '数据信息', level2: '其他对比', level3: '未分类'},
  quote: {level1: '文字强调', level2: '其他文字', level3: '未分类'},
};

export const classifyCardDefinition = (definition: MotionCardDefinition): MotionCardDefinition => ({
  ...definition,
  classification: definition.classification ?? cardClassificationByType[definition.cardType] ?? legacyFallback[definition.category],
});
