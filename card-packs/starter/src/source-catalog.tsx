import type {CSSProperties} from 'react';
import type {MotionCardDefinition, MotionCardInstance, MotionProject} from '@motion-master/schema';

type Family = 'rve' | 'locomotion' | 'remotion-resource' | 'motion-canvas' | 'captions-kit' | 'lottiefiles';
type Entry = {family: Family; slug: string; name?: string; sourceUrl?: string; count?: number};
type VisualKind = 'text' | 'data' | 'transition' | 'ambient' | 'gallery' | 'flow' | 'profile' | 'caption';

const rveSlugs = `animated-list animated-text area-chart blinds-transition bokeh-circles bounce-text bubble-pop-text camera-shake card-flip chapter-title chart-animation cinematic-title-intro circular-progress clock-wipe comparison-chart countdown-intro countdown-timer credits-roll cross-dissolve donut-chart end-card fade-through-black film-burn floating-bubble-text gallery-grid geometric-patterns glitch-text gradient-shift grid-pulse image-carousel image-comparison-slider image-zoom-reveal iris-transition ken-burns letterbox-reveal line-chart liquid-wave logo-blur-reveal logo-bounce-drop logo-fade-reveal logo-glitch-reveal logo-scale-rotate logo-spin-reveal logo-split-reveal logo-stroke-draw logo-typewriter lower-third masonry-gallery matrix-rain morph-transition noise-grain notification-pop parallax-pan particle-explosion photo-stack picture-in-picture pie-chart pixel-transition polaroid-frame popping-text progress-bars progress-steps pulsing-text push-transition quote-card rotating-carousel slide-text slide-wipe sound-wave split-screen spotlight-reveal starfield stat-counter subscribe-reminder text-highlight title-split typewriter-subtitle vignette-pulse whip-pan zoom-pulse zoom-through`.split(' ');

const locomotionSlugs = `achievement-unlock agenda-reveal app-feature-callout appointment-booking bar-chart-reveal before-after bento-grid bold-text-punch cart-animation changelog collab-card concept-breakdown countdown-timer culture-reel day-summary discount-countdown drag-drop-demo fade-slide-up feature-showcase flashcard-flip gradient-text intro-outro job-posting launch-day leaderboard lesson-intro level-up listing-card logo-reveal meme-card metric-card milestone-counter modal-explainer onboarding-flow patient-journey payment-flow portfolio-breakdown pricing-comparison product-hunt product-reveal profile-card property-tour quiz-result quote-card saas-hero sales-card screen-showcase social-post speaker-card spring-scale-in staggered-words stats-dashboard step-explainer stock-ticker team-intro testimonial-card toggle-switch typewriter-reveal ui-walkthrough virtual-walkthrough wellness-stats`.split(' ');

const captionEntries: Entry[] = [
  ['karaoke-fill', '卡拉 OK 填充'], ['kinetic-slam', '动感重击字幕'], ['pill-karaoke', '胶囊卡拉 OK'],
  ['weight-shift', '字重切换字幕'], ['neon-glow', '霓虹高亮字幕'], ['editorial-emphasis', '编辑式强调字幕'],
].map(([slug, name]) => ({family: 'captions-kit', slug, name}));

const motionCanvasEntries: Entry[] = [
  ['asset-code', '代码资产拆解'], ['anniversary', '周年叙事动画'], ['smooth-parallax', '平滑视差讲解'],
  ['motion-canvas', '矢量流程讲解'], ['deferred-lighting', '延迟光照分解'], ['logo', '矢量标志绘制'],
].map(([slug, name]) => ({family: 'motion-canvas', slug, name}));

const remotionResourceEntries: Entry[] = [
  ['audiogram', '音频节目卡'], ['music-visualization', '音乐可视化'], ['text-to-speech', '语音合成口播'],
  ['react-three-fiber', '三维场景卡'], ['skia', 'Skia 绘图动效'], ['video-editor-timeline', '剪辑时间轴演示'],
  ['clippkit-components', 'Clippkit 组件'], ['remotion-bits', 'Remotion Bits'], ['swiftclip-templates', 'SwiftClip 模板'],
  ['rendercomp-free', 'RenderComp 模板'], ['lexington-motion', '循环宣传动效'], ['motion-blur', '运动模糊'],
  ['noise-effect', '噪点质感'], ['path-animation', '路径描边动画'], ['glitch-effect', '故障效果'],
  ['remotion-animated', '通用缓动组件'], ['transition-series', '连续转场'], ['animate-text', '文字编排动画'],
  ['subtitle-styles', '字幕样式组件'], ['github-unwrapped', '年度数据回顾'], ['podcast-maker', '播客视频卡'],
  ['stargazer', '星标增长可视化'], ['mockoops', '产品界面演示'], ['product-hunt-today', '产品发布榜单'],
  ['remotion-weather', '天气信息卡'], ['conference-speaker-card', '会议嘉宾卡'], ['datavids', '数据视频'],
  ['bar-race-chart', '动态排名柱图'], ['tone-music', '音乐节奏动画'], ['glb-animation', 'GLB 模型动画'],
  ['typewriter', '打字机文字'], ['d3-visualization', 'D3 数据可视化'], ['greenscreen', '绿幕抠除'],
  ['noise-visualization', '噪声可视化'], ['audio-visualization', '音频波形可视化'], ['3d-text', '三维文字'],
  ['wavy-tiktok', '波浪短视频文字'], ['spring-loaded', '弹簧发布动效'], ['three-particles', '三维粒子'],
  ['text-morphing', '文字变形'], ['text-warping', '文字扭曲'], ['gltf-animation', 'GLTF 模型展示'],
  ['opengl-transitions', 'OpenGL 转场'], ['twitch-stinger', '直播遮罩转场'], ['animejs', 'Anime.js 编排'],
  ['shader', '着色器动效'], ['jump-cuts', '跳切衔接'], ['light-leak', '电影漏光转场'],
  ['remocn', 'Remocn 组件'], ['remotionui', 'RemotionUI 组件'], ['onda-components', 'Onda 动效组件'],
  ['tiktok-text-box', '短视频文本框'], ['snapcn', '软件界面演示组件'],
].map(([slug, name]) => ({family: 'remotion-resource', slug, name}));

const lottieEntries: Entry[] = [
  ['loading-6', '加载动画包', 6], ['people-dance', '人物舞蹈动画包', 3], ['decision-choice', '决策选择动画包', 4],
  ['creative-thinking', '创意思考动画包', 4], ['meteorology', '气象动画包', 20], ['loading-50', '加载动画大全', 50],
  ['text', '文字动画包', 3], ['marine', '海洋动画包', 15], ['law', '法律动画包', 45],
  ['engineering-system', '工程系统动画包', 4], ['teamwork', '团队协作动画包', 17], ['job-occupations', '职业角色动画包', 11],
  ['brain-innovation', '大脑创新动画包', 4], ['factory-manufacturing', '工厂制造动画包', 9], ['small-business', '小型商业动画包', 5],
].map(([slug, name, count]) => ({family: 'lottiefiles', slug: String(slug), name: String(name), count: Number(count)}));

const represented = new Set([
  'rve:animated-list', 'rve:chapter-title', 'rve:circular-progress', 'rve:comparison-chart', 'rve:donut-chart',
  'rve:glitch-text', 'rve:gradient-shift', 'rve:grid-pulse', 'rve:quote-card', 'rve:sound-wave', 'rve:stat-counter',
  'locomotion:bento-grid',
]);

const entries: Entry[] = [
  ...rveSlugs.map(slug => ({family: 'rve' as const, slug})),
  ...locomotionSlugs.map(slug => ({family: 'locomotion' as const, slug})),
  ...captionEntries, ...motionCanvasEntries, ...remotionResourceEntries, ...lottieEntries,
].filter(entry => !represented.has(`${entry.family}:${entry.slug}`));

const familyLabel: Record<Family, string> = {
  rve: 'React Video Editor', locomotion: 'Locomotion', 'remotion-resource': 'Remotion 官方资源',
  'motion-canvas': 'Motion Canvas', 'captions-kit': 'Captions Kit', lottiefiles: 'LottieFiles',
};

const wordMap: Record<string, string> = {animated: '动态', animation: '动画', area: '面积', bar: '柱状', chart: '图表', title: '标题', text: '文字', transition: '转场', image: '图片', logo: '标志', reveal: '揭示', progress: '进度', countdown: '倒计时', timer: '计时器', card: '卡片', gallery: '画廊', grid: '网格', blur: '模糊', bounce: '弹跳', bubble: '气泡', camera: '镜头', cinematic: '电影感', circular: '圆环', comparison: '对比', credits: '片尾字幕', dissolve: '溶解', end: '结尾', fade: '淡化', film: '胶片', floating: '漂浮', geometric: '几何', glitch: '故障', gradient: '渐变', iris: '光圈', line: '折线', liquid: '流体', lower: '下三分之一', third: '名条', matrix: '矩阵', morph: '变形', noise: '噪点', notification: '通知', parallax: '视差', particle: '粒子', photo: '照片', pie: '饼图', pixel: '像素', polaroid: '拍立得', popping: '弹出', pulsing: '脉冲', quote: '引言', rotating: '旋转', slide: '滑动', sound: '声音', split: '分屏', spotlight: '聚光', starfield: '星空', stat: '指标', subscribe: '关注提醒', typewriter: '打字机', vignette: '暗角', whip: '甩镜', zoom: '缩放', achievement: '成就', agenda: '议程', appointment: '预约', before: '之前', after: '之后', bento: '便当格', changelog: '更新日志', concept: '概念', culture: '文化', dashboard: '仪表盘', discount: '折扣', feature: '功能', flashcard: '闪卡', intro: '开场', outro: '收尾', leaderboard: '排行榜', lesson: '课程', metric: '指标', milestone: '里程碑', onboarding: '引导流程', payment: '支付', portfolio: '组合', pricing: '定价', product: '产品', profile: '人物资料', property: '房产', quiz: '测验', saas: 'SaaS', sales: '销售', screen: '屏幕', social: '社交', speaker: '嘉宾', staggered: '错落', steps: '步骤', stock: '行情', team: '团队', testimonial: '证言', toggle: '开关', walkthrough: '导览', wellness: '健康'};
const friendly = (entry: Entry) => entry.name ?? entry.slug.split('-').map(word => wordMap[word] ?? word.replace(/^./, char => char.toUpperCase())).join(' · ');

const inferKind = (entry: Entry): VisualKind => {
  const value = entry.slug;
  if (entry.family === 'captions-kit' || /subtitle|caption|karaoke|tiktok-text/.test(value)) return 'caption';
  if (/transition|wipe|dissolve|whip|iris|leak|burn|zoom-through|stinger/.test(value)) return 'transition';
  if (/chart|stat|metric|counter|progress|dashboard|ticker|pricing|sales|wellness|datavid|visualization/.test(value)) return 'data';
  if (/gallery|photo|image|screen|walkthrough|showcase|product|mock|gltf|glb|three/.test(value)) return 'gallery';
  if (/flow|steps|agenda|concept|breakdown|journey|process|timeline|onboarding|path/.test(value)) return 'flow';
  if (/profile|speaker|testimonial|social|team|job|listing|appointment|conference/.test(value)) return 'profile';
  if (/noise|star|particle|gradient|matrix|bokeh|wave|parallax|lighting|shader|grain|geometric|ambient/.test(value)) return 'ambient';
  return 'text';
};
const categoryFor = (kind: VisualKind): MotionCardDefinition['category'] => kind === 'data' ? 'data' : kind === 'profile' ? 'quote' : kind === 'flow' ? 'chapter' : kind === 'text' || kind === 'caption' ? 'quote' : 'ambient';
const classificationFor = (kind: VisualKind, name: string) => kind === 'data' ? {level1: '数据信息', level2: '图表与指标', level3: name} : kind === 'caption' ? {level1: '文字强调', level2: '动态字幕', level3: name} : kind === 'transition' ? {level1: '视觉动效', level2: '场景转场', level3: name} : kind === 'ambient' ? {level1: '背景氛围', level2: '图形氛围', level3: name} : kind === 'gallery' ? {level1: '产品演示', level2: '媒体展示', level3: name} : kind === 'flow' ? {level1: '结构叙事', level2: '流程说明', level3: name} : kind === 'profile' ? {level1: '文字强调', level2: '人物信息', level3: name} : {level1: '视觉动效', level2: '文字入场', level3: name};

const sourceFor = (entry: Entry) => {
  if (entry.sourceUrl) return entry.sourceUrl;
  if (entry.family === 'rve') return `https://github.com/reactvideoeditor/remotion-templates/blob/main/templates/${entry.slug}.tsx`;
  if (entry.family === 'locomotion') return `https://github.com/locomotion-pro/locomotion/tree/main/src/templates/${entry.slug}`;
  if (entry.family === 'captions-kit') return `https://github.com/Fats403/remotion-captions-kit/blob/main/src/presets/${entry.slug}.tsx`;
  if (entry.family === 'motion-canvas') return `https://github.com/motion-canvas/examples/tree/master/examples/${entry.slug}`;
  if (entry.family === 'lottiefiles') return 'https://lottiefiles.com/categories/motion-graphic';
  return 'https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/resources.mdx';
};

const commonSchema: MotionCardDefinition['parameterSchema'] = [
  {key: 'title', path: 'content.title', label: '主文案', group: 'content', control: 'textarea'},
  {key: 'body', path: 'content.body', label: '补充文案', group: 'content', control: 'textarea'},
  {key: 'value', path: 'content.value', label: '数值', group: 'content', control: 'number', min: 0, max: 100},
  {key: 'startFrame', path: 'startFrame', label: '出现帧', group: 'timing', control: 'number', min: 0, step: 1},
  {key: 'durationFrames', path: 'durationFrames', label: '持续帧', group: 'timing', control: 'number', min: 1, step: 1},
  {key: 'scale', path: 'layout.scale', label: '卡片缩放', group: 'layout', control: 'range', min: .1, max: 1.5, step: .05},
];

export const sourceCatalogDefinitions: MotionCardDefinition[] = entries.map((entry, index) => {
  const name = friendly(entry); const kind = inferKind(entry); const cardType = `catalog-${entry.family}-${entry.slug}`;
  return {
    cardType, version: '1.0.0', displayName: name,
    description: `${familyLabel[entry.family]} 来源的 ${name}${entry.count ? `，素材包含 ${entry.count} 个动画` : ''}`,
    category: categoryFor(kind), classification: classificationFor(kind, name),
    tags: [familyLabel[entry.family], kind, ...entry.slug.split('-')],
    capabilities: ['clock-safe', 'alpha', 'landscape', 'portrait'], parameterSchema: commonSchema,
    defaults: {cardType, cardVersion: '1.0.0', durationFrames: kind === 'transition' ? 45 : 120, content: {title: name, body: familyLabel[entry.family], value: 72, sourceCount: entry.count ?? 1, visualKind: kind, variant: index}, layout: {side: 'left', scale: 1}, appearance: {accentRole: index % 3 === 0 ? 'cyan' : index % 3 === 1 ? 'coral' : 'lime'}, motion: {enterFrames: 16, exitFrames: 12}, sourceSegmentIds: []},
    source: {sourceUrl: sourceFor(entry), author: familyLabel[entry.family], license: entry.family === 'rve' || entry.family === 'captions-kit' || entry.family === 'motion-canvas' ? 'MIT' : undefined, originalFormat: entry.family === 'motion-canvas' ? 'motion-canvas' : entry.family === 'lottiefiles' ? 'lottie/dotlottie' : 'remotion'},
  };
});

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const hash = (value: string) => [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
const splitLines = (value: unknown) => String(value ?? '').split(/\n+/).map(line => line.trim()).filter(Boolean);

export const SourceCatalogCardView = ({card, frame, theme}: {card: MotionCardInstance; frame: number; theme: MotionProject['theme']}) => {
  const entry = entries.find(item => `catalog-${item.family}-${item.slug}` === card.cardType); if (!entry) return null;
  const seed = hash(card.cardType); const hue = seed % 360; const hue2 = (hue + 54 + seed % 73) % 360;
  const accent = `hsl(${hue} 82% ${theme === 'light' ? '42%' : '62%'})`; const accent2 = `hsl(${hue2} 84% ${theme === 'light' ? '46%' : '66%'})`;
  const text = theme === 'light' ? '#101319' : '#f8fafc'; const muted = theme === 'light' ? '#596170' : '#9aa7b8'; const panel = theme === 'light' ? 'rgba(255,255,255,.9)' : 'rgba(10,15,24,.88)'; const line = theme === 'light' ? 'rgba(15,23,42,.14)' : 'rgba(255,255,255,.15)';
  const enter = clamp(frame / Math.max(1, Number(card.motion.enterFrames ?? 16))); const exit = clamp((card.durationFrames - frame) / Math.max(1, Number(card.motion.exitFrames ?? 12))); const amount = Math.min(enter, exit); const scale = Number(card.layout.scale ?? 1);
  const kind = String(card.content.visualKind ?? inferKind(entry)) as VisualKind; const title = String(card.content.title ?? friendly(entry)); const body = String(card.content.body ?? familyLabel[entry.family]); const value = Math.max(0, Math.min(100, Number(card.content.value ?? 72)));
  const base: CSSProperties = {position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: text, fontFamily: 'inherit', opacity: amount, transform: `scale(${scale * (.96 + amount * .04)})`, transformOrigin: 'center'};
  const plate: CSSProperties = {width: '68%', maxWidth: 760, padding: 34, borderRadius: 24, border: `1px solid ${line}`, background: panel, boxShadow: '0 28px 90px rgba(0,0,0,.28)', backdropFilter: 'blur(18px)'};
  const sourceTag = <div style={{fontSize: 13, letterSpacing: 2.4, color: accent, fontWeight: 800, textTransform: 'uppercase'}}>{familyLabel[entry.family]}</div>;

  if (kind === 'transition') return <div style={{...base, overflow: 'hidden'}}><div style={{position: 'absolute', inset: 0, background: `linear-gradient(${70 + seed % 80}deg, ${accent}, ${accent2})`, transform: `translateX(${(1 - amount) * (seed % 2 ? 100 : -100)}%)`, clipPath: seed % 3 === 0 ? `circle(${amount * 78}% at 50% 50%)` : seed % 3 === 1 ? `polygon(0 0, ${amount * 130}% 0, ${amount * 90}% 100%, 0 100%)` : undefined}}/><div style={{position: 'relative', fontSize: 48, fontWeight: 850, letterSpacing: -1}}>{title}</div></div>;
  if (kind === 'data') return <div style={base}><div style={{...plate, display: 'grid', gridTemplateColumns: '.8fr 1.2fr', gap: 30, alignItems: 'end'}}><div>{sourceTag}<div style={{fontSize: 70, fontWeight: 900, marginTop: 16}}>{Math.round(value * amount)}<span style={{fontSize: 26, color: muted}}>%</span></div><div style={{fontSize: 20, marginTop: 8}}>{title}</div></div><div style={{display: 'flex', alignItems: 'end', gap: 9, height: 150}}>{Array.from({length: 9}, (_, i) => <i key={i} style={{flex: 1, height: `${Math.max(8, ((seed >> (i % 7)) % 72 + 22) * amount)}%`, background: i === 8 ? accent2 : `color-mix(in srgb, ${accent} ${42 + i * 5}%, transparent)`, borderRadius: '8px 8px 2px 2px'}}/>)}</div></div></div>;
  if (kind === 'caption') { const words = splitLines(title.replace(/\s+/g, '\n')); const active = Math.min(words.length - 1, Math.floor(amount * words.length)); return <div style={base}><div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, width: '78%', padding: '22px 28px', borderRadius: entry.slug.includes('pill') ? 999 : 18, background: entry.slug.includes('pill') ? panel : 'transparent'}}>{words.map((word, i) => <span key={`${word}-${i}`} style={{fontSize: 42, fontWeight: i === active ? 900 : 620, color: i === active ? accent : text, transform: `scale(${i === active ? 1.12 : 1})`, textShadow: entry.slug.includes('glow') && i === active ? `0 0 22px ${accent}` : undefined}}>{word}</span>)}</div></div>; }
  if (kind === 'ambient') return <div style={{...base, overflow: 'hidden', background: `radial-gradient(circle at ${30 + seed % 40}% ${30 + (seed >> 3) % 40}%, color-mix(in srgb, ${accent} 42%, transparent), transparent 46%)`}}><div style={{position: 'absolute', inset: -80, backgroundImage: `radial-gradient(circle, ${accent2} 1.6px, transparent 1.8px)`, backgroundSize: `${24 + seed % 18}px ${24 + seed % 18}px`, transform: `rotate(${frame * .08 + seed % 20}deg) scale(${.9 + amount * .15})`, opacity: .55}}/><div style={{position: 'relative', textAlign: 'center'}}>{sourceTag}<div style={{fontSize: 48, fontWeight: 850, marginTop: 14}}>{title}</div></div></div>;
  if (kind === 'gallery') return <div style={base}><div style={{...plate, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}><div style={{gridRow: 'span 2', minHeight: 220, borderRadius: 16, background: `linear-gradient(145deg, ${accent}, ${accent2})`, display: 'grid', placeItems: 'center', fontSize: 60}}>▶</div>{[0, 1].map(i => <div key={i} style={{minHeight: 100, borderRadius: 14, border: `1px solid ${line}`, background: `linear-gradient(${120 + i * 30}deg, ${panel}, color-mix(in srgb, ${i ? accent2 : accent} 18%, transparent))`, transform: `translateX(${(1 - amount) * (22 + i * 12)}px)`}}/>)}<div style={{gridColumn: 'span 2'}}>{sourceTag}<div style={{fontSize: 30, fontWeight: 800, marginTop: 8}}>{title}</div></div></div></div>;
  if (kind === 'flow') { const nodes = splitLines(body).length > 1 ? splitLines(body).slice(0, 4) : ['输入', '处理', '验证', '输出']; return <div style={base}><div style={plate}>{sourceTag}<div style={{fontSize: 34, fontWeight: 820, margin: '10px 0 28px'}}>{title}</div><div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>{nodes.map((node, i) => <div key={node} style={{display: 'contents'}}><div style={{padding: '16px 18px', minWidth: 104, textAlign: 'center', borderRadius: 14, background: i === nodes.length - 1 ? accent : line, color: i === nodes.length - 1 ? '#081017' : text, fontWeight: 760, transform: `translateY(${(1 - clamp((frame - i * 5) / 14)) * 18}px)`, opacity: clamp((frame - i * 5) / 14)}}>{node}</div>{i < nodes.length - 1 && <span style={{color: accent2, fontSize: 24}}>→</span>}</div>)}</div></div></div>; }
  if (kind === 'profile') return <div style={base}><div style={{...plate, display: 'flex', gap: 24, alignItems: 'center'}}><div style={{width: 112, height: 112, borderRadius: seed % 2 ? 24 : '50%', background: `linear-gradient(145deg, ${accent}, ${accent2})`, display: 'grid', placeItems: 'center', fontSize: 42, fontWeight: 900}}>{title.slice(0, 1)}</div><div style={{flex: 1}}>{sourceTag}<div style={{fontSize: 36, fontWeight: 830, marginTop: 10}}>{title}</div><div style={{color: muted, fontSize: 18, marginTop: 10}}>{body}</div></div></div></div>;
  return <div style={base}><div style={{...plate, background: seed % 2 ? panel : `linear-gradient(135deg, color-mix(in srgb, ${accent} 22%, ${panel}), ${panel})`}}>{sourceTag}<div style={{fontSize: 54, lineHeight: 1.04, fontWeight: 900, letterSpacing: -1.5, marginTop: 18, transform: `translateY(${(1 - amount) * 28}px)`}}>{title}</div><div style={{height: 4, width: `${amount * 100}%`, maxWidth: 360, background: `linear-gradient(90deg, ${accent}, ${accent2})`, marginTop: 24}}/><div style={{color: muted, fontSize: 18, marginTop: 16}}>{body}{entry.count ? ` · ${entry.count} 个素材` : ''}</div></div></div>;
};

export const sourceCatalogStats = {
  reactVideoEditor: rveSlugs.length,
  locomotion: locomotionSlugs.length,
  captionsKit: captionEntries.length,
  motionCanvas: motionCanvasEntries.length,
  remotionResources: remotionResourceEntries.length,
  lottiePacks: lottieEntries.length,
  generatedDefinitions: sourceCatalogDefinitions.length,
};
