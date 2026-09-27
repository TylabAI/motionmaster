import type {MotionCardDefinition,CardParameterDefinition} from '@motion-master/schema';
export const htmlVideoVariants=[
 ['frame-bold-poster','宣言海报','巨型衬线文字与编辑式编号','quote'],
 ['frame-bold-signal','强信号标题','暗底色块与逐行大字','chapter'],
 ['frame-build-minimal','极简留白','逐字揭示与金色细线','chapter'],
 ['frame-creative-voltage','创意电压','错位分区、描边字和手写批注','quote'],
 ['frame-data-chart-nyt','编辑式柱图','刻度、逐柱增长与数据来源','data'],
 ['frame-data-rollup','数字增长','逐项计数与弹性柱形增长','data'],
 ['frame-decision-tree','决策树','父子节点与分支路径绘制','chapter'],
 ['frame-electric-studio','双色金句','上下双色展开与逐行金句','quote'],
 ['frame-glitch-title','故障标题','RGB错位、扫描线与抖动','chapter'],
 ['frame-kinetic-type','动态排字','多段缩放、滑入与文字交替','quote'],
 ['frame-light-leak-cinema','电影漏光','暖色漏光与确定性胶片颗粒','ambient'],
 ['frame-liquid-bg-hero','流体渐变','流动光团与封面标题','ambient'],
 ['frame-logo-outro','品牌收尾','分块标记聚合与品牌口号','chapter'],
 ['frame-nyt-graph','编辑式折线','折线路径与数据点标注','data'],
 ['frame-pentagram-stat','巨型指标','网格、主指标和迷你柱图','data'],
 ['frame-play-mode','弹性玩趣','弹跳形状、开场与数据段落','quote'],
 ['frame-product-promo','产品展示','开场、功能展示与结尾多段组合','chapter'],
 ['frame-product-promo-30s','产品短片 · 30秒','问题、品牌、优势、界面、支柱、基础与行动号召','chapter'],
 ['frame-swiss-grid','瑞士网格','网格结构与编排式信息块','chapter'],
 ['frame-takram-organic','有机关系图','中心节点、曲线连接与周边节点','chapter'],
 ['frame-vignelli','红黑大字','纵向红色分区与强对比排字','quote'],
 ['frame-warm-grain','暖纸颗粒','纸感、圆形图案与编辑式排版','ambient'],
 ['vfx-text-cursor','终端打字','逐字输入与闪烁光标','quote'],
] as const;
export type HtmlVideoVariant=typeof htmlVideoVariants[number][0];
const field=(key:string,label:string,control:CardParameterDefinition['control']='textarea'):CardParameterDefinition=>({key,path:'content.'+key,label,group:'content',control});
export const hvCommonFields:CardParameterDefinition[]=[field('title','标题'),field('body','说明'),field('label','标签','text'),
 {key:'startFrame',path:'startFrame',label:'出现帧',group:'timing',control:'number',min:0,step:1},
 {key:'durationFrames',path:'durationFrames',label:'持续帧',group:'timing',control:'number',min:1,step:1},
 ...['x','y','width','height'].map((key,i)=>({key,path:'layout.'+key,label:['水平位置（%）','垂直位置（%）','宽度（%）','高度（%）'][i],group:'layout' as const,control:'number' as const,min:i<2?0:4,max:100,step:.5})),
 {key:'scale',path:'layout.scale',label:'卡片缩放',group:'layout',control:'range',min:.1,max:1.3,step:.05},
 {key:'accent',path:'appearance.accent',label:'强调色',group:'style',control:'color'},
 {key:'background',path:'appearance.background',label:'背景色',group:'style',control:'color'},
 {key:'ink',path:'appearance.ink',label:'文字色',group:'style',control:'color'},
 {key:'transparent',path:'appearance.transparent',label:'透明背景',group:'style',control:'toggle'},
 {key:'textScale',path:'appearance.textScale',label:'文字缩放',group:'style',control:'range',min:.5,max:1.6,step:.05},
];
export const htmlVideoCardDefinitions:MotionCardDefinition[]=htmlVideoVariants.map(([id,name,description,category])=>{
 const palette:Record<string,string>={'frame-bold-signal':'#ff8c42','frame-build-minimal':'#ae8b51','frame-creative-voltage':'#4467ed','frame-electric-studio':'#2858d9','frame-light-leak-cinema':'#f69745','frame-vignelli':'#e53432','frame-warm-grain':'#ad7253'};
 const data=category==='data',paper=['frame-bold-poster','frame-build-minimal','frame-data-chart-nyt','frame-nyt-graph','frame-pentagram-stat','frame-takram-organic','frame-warm-grain','frame-swiss-grid'].includes(id);
 return {cardType:'hv-'+id,version:'1',displayName:name,description,category,tags:['html-video',id,'可编辑'],classification:{level1:data?'数据信息':category==='ambient'?'背景氛围':category==='quote'?'文字强调':'结构叙事',level2:'HTML Video 全模板',level3:name},capabilities:['clock-safe','alpha','landscape','portrait','word-bound'],
 parameterSchema:[...hvCommonFields,field('items',data?'数据（每行 名称|数值）':id==='frame-decision-tree'?'节点（每行 ID|父ID，根填- |文字）':id.includes('product-promo')?'分镜文案（每行一段）':'条目 / 逐段文案（每行一项）'),field('source','来源 / 落款','text'),field('value','主指标','number'),field('suffix','指标单位','text')],
 defaults:{cardType:'hv-'+id,cardVersion:'1',durationFrames:id==='frame-product-promo-30s'?900:id.includes('product-promo')?450:180,content:{title:name,body:'替换成你的讲解内容',label:'MOTION MASTER',items:data?'第一阶段|24\n第二阶段|56\n第三阶段|82':id==='frame-decision-tree'?'root|-|开始\nleft|root|方案一\nright|root|方案二':id==='frame-product-promo-30s'?'遇到什么问题\n从卡片到品牌\n认识我们的产品\n关键优势\n工作界面\n核心能力\n可靠基础\n立即开始':'理解问题\n选择方法\n完成验证',source:data?'示例数据 · 请替换':'',value:82,suffix:'%'},layout:{x:5,y:8,width:90,height:78,scale:1},appearance:{accent:palette[id]??(paper?'#d95536':'#63e6db'),background:paper?'#f2eddf':'#101925',ink:paper?'#18212b':'#f5f8ff',transparent:false,textScale:1},motion:{enterFrames:12,exitFrames:12},sourceSegmentIds:[]}};
});
