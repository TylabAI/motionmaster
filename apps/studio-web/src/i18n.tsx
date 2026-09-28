import {createContext, useContext, useEffect, useMemo, useState, type ReactNode} from 'react';

export type StudioLocale = 'zh-CN' | 'en';

const storageKey = 'motion-master-locale-v01';
const initialLocale = (): StudioLocale => {
  const saved = localStorage.getItem(storageKey);
  if (saved === 'en' || saved === 'zh-CN') return saved;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
};

const messages: Record<string, string> = {
  '编辑台': 'Studio', '动效资产': 'Motion Assets', '字幕 / SRT': 'Captions / SRT', '⚙ 设置': '⚙ Settings',
  '设置': 'Settings', '新建': 'New', '＋ 新建': '＋ New', '删除项目': 'Delete Project', '回收站': 'Trash',
  '项目回收站': 'Project Trash', '删除项目确认': 'Confirm Project Deletion', '关闭': 'Close', '取消': 'Cancel',
  '保存': 'Save', '保存中…': 'Saving…', '保存设置': 'Save Settings', '正在处理…': 'Processing…',
  '返回编辑台': 'Back to Studio', '分析驱动': 'Analysis Driver', 'Codex 自动': 'Codex Auto',
  '通用 Agent（HTTP / MCP）': 'External Agent (HTTP / MCP)', '主题': 'Theme', '暗底': 'Dark', '亮底': 'Light',
  '材质': 'Material', '玻璃': 'Glass', '实色': 'Solid', '骨架': 'Layout', '导入视频': 'Import Video',
  '导出 JSON': 'Export JSON', '导入 JSON': 'Import JSON', '导出 MP4': 'Export MP4', '透明 MOV': 'Transparent MOV',
  '初剪详情': 'Rough Cut Details', '语义精剪': 'Semantic Cut', '开始初剪': 'Start Rough Cut',
  '重新分析初剪': 'Analyze Again', '查看初剪进度': 'View Rough-Cut Progress', '查看并确认方案': 'Review Plan',
  '不剪辑，直接做动效': 'Skip Cut, Add Motion', '进入动效': 'Enter Motion Edit', '自动编排动效': 'Auto-arrange Motion',
  '编排进度': 'Arrangement Progress', '编排详情': 'Arrangement Details', '检查动效': 'Review Motion', '已就绪': 'Ready',
  '动效卡库': 'Motion Library', '资产库 / 收藏': 'Assets / Favorites', '搜索名称、用途、来源': 'Search name, use, or source',
  '类型': 'Type', '用途': 'Use', '形态': 'Form', '全部': 'All', '清空筛选': 'Clear Filters',
  '属性检查器': 'Inspector', '章节导航': 'Chapter Navigation', '运行控制台': 'Runtime Console',
  '清空记录': 'Clear Log', '等待运行事件…': 'Waiting for runtime events…', '播放器': 'Player', '未导入口播视频': 'No video imported',
  '回到开头': 'Go to Start', '播放': 'Play', '暂停': 'Pause', '播放全部': 'Play Full Source', '返回粗剪': 'Back to Cut',
  '鼠标悬停调节音量': 'Hover to adjust volume', '已静音': 'Muted', '已开启声音': 'Sound on',
  '换模板': 'Replace Template', '保留内容、时间和位置': 'Keep content, timing, and position', '选择动效模板': 'Choose Motion Template',
  '关闭模板预览': 'Close Template Preview', '模板列表': 'Template List', '模板': 'Template', '当前': 'Current',
  '没有匹配模板，请调整筛选条件。': 'No matching templates. Adjust the filters.', '暂无匹配模板': 'No matching template',
  '示例内容 · 循环预览': 'Sample content · Looping preview', '悬停或键盘聚焦预览，点击应用': 'Hover or focus to preview; click to apply',
  '保存为预设': 'Save as Preset', '保存为资产预设': 'Save as Asset Preset', 'AI / HTML 重新设计': 'Redesign with AI / HTML',
  '恢复上一版设计': 'Restore Previous Design', '内容': 'Content', '时间': 'Timing', '样式': 'Style', '布局': 'Layout', '动画': 'Motion',
  '出现帧': 'Start Frame', '持续帧': 'Duration', '持续帧数': 'Duration Frames', '主文案': 'Main Copy', '副标题': 'Subtitle',
  '语义强调色': 'Semantic Accent', '青蓝': 'Cyan', '珊瑚': 'Coral', '青柠': 'Lime', '琥珀': 'Amber',
  '粗稿时间轴': 'Rough-Cut Timeline', '动效时间轴': 'Motion Timeline', '粗剪主轨道 · 删除/可恢复': 'Rough-cut main track · removable / recoverable',
  '点击素材后拖动两端调整长度': 'Select an item, then drag either edge to trim', '自动吸附已开启': 'Snapping enabled',
  '自动吸附已关闭': 'Snapping disabled', '撤回': 'Undo', '切分': 'Split', '生成粗剪': 'Render Rough Cut', '批准粗剪': 'Approve Rough Cut',
  '重置布局': 'Reset Layout', '适配': 'Fit', '适配全片': 'Fit Timeline', '缩小时间轴': 'Zoom Out', '放大时间轴': 'Zoom In',
  '时间轴缩放': 'Timeline Zoom', '播放头位置': 'Playhead Position', '按住拖动播放头': 'Drag the playhead',
  '主轨道': 'Main Track', '完整视频素材': 'Full Video', '粗剪后连续素材': 'Continuous Rough Cut', '可恢复轨道': 'Recoverable Track',
  '字幕轨道': 'Caption Track', '隐藏轨道': 'Hide Track', '删除轨道': 'Remove Track', '关闭原声': 'Mute Original Audio',
  '点击选中，拖动两端调整长度': 'Click to select; drag either edge to trim', '拖动卡片可移动或跨轨道': 'Drag to move or change tracks',
  '双击恢复': 'Double-click to restore', '草稿': 'Draft', '已审': 'Approved', '已剪除': 'Removed', '已保留': 'Kept',
  '字幕 / SRT 管理': 'Captions / SRT Manager', '导入、查看和导出当前项目字幕': 'Import, inspect, and export project captions',
  'SRT 文本': 'SRT Text', '填入示例': 'Insert Sample', '载入当前字幕': 'Load Current Captions', '导出 SRT': 'Export SRT',
  '导入并生成编排': 'Import and Generate Arrangement', '当前项目字幕': 'Current Project Captions',
  '在这里粘贴 SRT；导入后将生成字幕段落和动效编排。': 'Paste SRT here. Importing creates caption segments and a motion arrangement.',
  '当前项目还没有字幕。粘贴 SRT 后即可建立字幕与段落。': 'This project has no captions yet. Paste an SRT to create captions and segments.',
  '动效资产管理': 'Motion Asset Manager', '统一浏览模板、预设与收藏，选中即可预览。': 'Browse templates, presets, and favorites in one place. Select any item to preview it.',
  '导入预设': 'Import Preset', '导出已保存预设': 'Export Saved Presets', '全部资产': 'All Assets', '内置模板': 'Built-in Templates',
  '已保存预设': 'Saved Presets', '收藏': 'Favorites', '资产范围': 'Asset Scope', '资产列表': 'Asset List', '资产': 'Asset',
  '没有匹配的资产，请调整分类或搜索条件。': 'No matching assets. Adjust the category or search.', '循环预览': 'Looping Preview',
  '添加到当前项目': 'Add to Project', '☆ 收藏': '☆ Favorite', '★ 取消收藏': '★ Unfavorite', '预设名称': 'Preset Name',
  '导出此预设': 'Export This Preset', '移除已保存预设': 'Remove Saved Preset', '选择一项资产查看预览': 'Select an asset to preview it',
  '模板均可直接使用；“已保存预设”保留你编辑或导入的版本，存储在当前浏览器，可导出备份。': 'All templates are ready to use. Saved Presets stores edited or imported versions in this browser and supports backup export.',
  '语音识别与字幕': 'Speech Recognition & Captions', '控制转录文字、字幕和词句时间定位': 'Configure transcription, captions, and word-level timing',
  '语音识别与字幕设置': 'Speech Recognition & Caption Settings',
  '正在读取设置…': 'Loading settings…', '本地 faster-whisper': 'Local faster-whisper', '百炼文件转写 API': 'Bailian File Transcription API',
  '音频不离开本机；首次启动默认下载 large-v3-turbo。': 'Audio stays on this machine. The first launch downloads large-v3-turbo by default.',
  '提取 16k 单声道音频并上传；原视频不上传。': 'Uploads extracted 16 kHz mono audio; the original video is not uploaded.',
  '本地模型': 'Local Models', '选择已安装模型；未安装模型会先询问是否下载。': 'Choose an installed model. Missing models ask for confirmation before download.',
  '↻ 刷新模型': '↻ Refresh Models', '检查中…': 'Checking…', '默认推荐': 'Recommended', '已安装': 'Installed', '未安装': 'Not Installed',
  '下载中': 'Downloading', '下载失败': 'Download Failed', '文件不完整': 'Incomplete Files', '设备': 'Device', '自动': 'Auto',
  '计算精度': 'Compute Type', '语言': 'Language', '术语提示': 'Terminology Prompt', '百炼异步文件转写': 'Bailian Asynchronous File Transcription',
  '任务提交地址': 'Submit URL', '任务查询地址': 'Query URL', '临时文件上传凭证地址': 'Temporary Upload Credential URL',
  '模型 ID': 'Model ID', '隐藏': 'Hide', '显示': 'Show', '清除': 'Clear', '数字与日期规范化（ITN）': 'Normalize Numbers and Dates (ITN)',
  '专业词 / 热词': 'Terms / Hotwords', '时间轴保护': 'Timeline Protection',
  '项目与语音识别设置': 'Project and Speech Recognition Settings', '项目策略、品牌与语音识别': 'Project strategy, brand, and speech recognition',
  '项目与品牌': 'Project & Brand', '语音识别': 'Speech Recognition', '制作策略': 'Production Strategy', '制作模式': 'Production Mode',
  '口播讲解': 'Talking-head Explainer', '产品宣传片': 'Product Promo', '功能发布视频': 'Feature Launch', '教程讲解': 'Tutorial', '数据报告': 'Data Report',
  '围绕字幕论点添加章节、步骤、对比、强调和总结': 'Add chapters, steps, comparisons, emphasis, and summaries around the spoken argument',
  '从品牌开场到行动号召形成完整产品叙事': 'Build a complete product story from brand opening to call to action',
  '聚焦问题、核心功能、流程、证据和行动号召': 'Focus on the problem, core capability, process, proof, and call to action',
  '围绕目标、步骤、注意事项和结果组织节奏': 'Organize the pace around goals, steps, cautions, and outcomes',
  '围绕指标、变化、比较、洞察和结论组织数据故事': 'Build a data story from metrics, change, comparison, insight, and conclusion',
  '叙事配方': 'Narrative Recipe', '按制作模式自动选择': 'Choose from production mode', '产品宣传八段式': 'Eight-beat Product Promo',
  '功能发布流程': 'Feature Launch Flow', '教程流程': 'Tutorial Flow', '数据故事': 'Data Story', '目标画幅': 'Target Aspect Ratios',
  '品牌档案': 'Brand Profile', '品牌名': 'Brand Name', '品牌标语': 'Tagline', '品牌来源网址': 'Brand Source URL', 'Logo 网址': 'Logo URL',
  '主色': 'Primary', '辅色': 'Secondary', '背景色': 'Background', '文字色': 'Text', '字体': 'Font', '圆角（px）': 'Corner Radius (px)',
  '图标风格': 'Icon Style', '线框': 'Outline', '实心': 'Solid', '双色': 'Duotone', '品牌图标': 'Brand Icons', '禁用风格': 'Forbidden Styles',
  '项目策略与品牌档案已保存': 'Project strategy and brand profile saved',
  '刷新会重新校验固定模型目录和本地 Hugging Face 缓存。手动放入完整模型后无需重复下载。': 'Refresh revalidates the model directory and local Hugging Face cache. Complete manually copied models are not downloaded again.',
  '主视频轨道由视频时长与粗剪保留区间生成。字幕轨道、词句定位和语义粗剪必须使用模型返回的逐词时间戳；如果 API 只返回纯文本或句级时间，分析会明确失败，现有轨道不会被改写。': 'The main video track comes from video duration and retained rough-cut ranges. Captions, word alignment, and semantic cutting require word timestamps returned by the model. If an API returns only plain text or sentence timing, analysis fails explicitly and existing tracks remain unchanged.',
  '资源占用较低，中文识别能力优于基础模型': 'Lower resource use with better Chinese recognition than base models',
  '默认推荐，准确率与速度平衡': 'Recommended default with balanced speed and accuracy',
  '准确率优先，速度与内存占用更高': 'Accuracy first, with higher latency and memory use',
  '准备视频': 'Prepare Video', '本地转录与停顿检测': 'Local Transcription & Pause Detection', '提取关键静帧': 'Extract Key Frames',
  'Agent 分析与结果校验': 'Agent Analysis & Validation', '人工审核确认': 'Human Review', '初剪分析进度': 'Rough-Cut Progress',
  '分析未完成': 'Analysis Incomplete', '已确认执行初剪': 'Rough Cut Applied', '分析已完成，现在可以审核建议': 'Analysis complete. Review the suggestions.',
  '等待外部 Agent 接单并返回结果': 'Waiting for an external Agent', '自动执行，可随时恢复': 'Automatic; recoverable at any time',
  '正在连接进度服务……': 'Connecting to progress service…', '正在分析，完成后自动处理': 'Analyzing; results will be applied automatically',
  '等待分析结果，完成后可审核': 'Waiting for analysis; review when complete', '任务已用时': 'Task elapsed', '本窗口已打开': 'Window open',
  '读取进度失败': 'Could not read progress', '初剪分析与审核': 'Rough-Cut Analysis & Review', '确认初剪方案': 'Confirm Rough-Cut Plan',
  '关闭窗口，后台继续': 'Close and Continue in Background', '暂不执行': 'Not Now', '确认执行初剪': 'Apply Rough Cut',
  '使用模型建议': 'Use Model Suggestions', '全部保留': 'Keep Everything', '尚未分析': 'Not Analyzed', 'Agent 语义精剪': 'Agent Semantic Cut',
  '字幕 + 时间戳 + 关键静帧分析': 'Captions + Timestamps + Key-frame Analysis', '材料已就绪，等待外部 Agent': 'Material ready; waiting for an external Agent',
  'Agent 接入说明': 'Agent Integration Guide', '机器可读协议': 'Machine-readable Protocol', '定位试听': 'Seek and Preview',
  '模型复核：': 'Model Review:', '建议删除': 'Suggest Remove', '建议保留': 'Suggest Keep', '需试听确认': 'Needs Playback Review',
  '待审候选': 'Pending Candidate', '恢复': 'Restore', '剪除此段': 'Remove Segment', '重新分析与高级选项': 'Reanalyze & Advanced Options',
  '重新分析（不执行剪辑）': 'Reanalyze (Do Not Edit)', '导入逐词转录 JSON': 'Import Word-level Transcript JSON',
  '导出精剪任务': 'Export Semantic-Cut Task', '导入精剪建议 JSON': 'Import Semantic-Cut Suggestions JSON',
  '讲解动效自动编排': 'Automatic Explanatory Motion Arrangement', '后台继续': 'Continue in Background', '返回时间轴': 'Back to Timeline',
  'HTML 动效设计': 'HTML Motion Design', 'HTML设计要求': 'HTML Design Request', 'HTML动效JSON': 'HTML Motion JSON',
  '重命名项目': 'Rename Project', '项目名称': 'Project Name', '请输入项目名称': 'Enter a project name', '恢复项目': 'Restore Project',
  '未分类': 'Uncategorized', '自定义': 'Custom', '视觉动效': 'Visual Motion', '背景氛围': 'Background & Atmosphere',
  '结构叙事': 'Structure & Narrative', '文字强调': 'Text Emphasis', '数据信息': 'Data & Information', '科技背景': 'Tech Background',
  '图形氛围': 'Graphic Atmosphere', '章节标题': 'Chapter Title', '流程说明': 'Process Explanation', '观点结论': 'Point & Conclusion',
  '双数对比': 'Two-value Comparison', '数据可视化': 'Data Visualization', '人物信息': 'Person Information',
  '氛围网格': 'Ambient Grid', '核心数字': 'Metric Focus', '左右对比条': 'Side-by-side Comparison',
  '金句逐行': 'Quote Reveal', '信息面板': 'Information Board', '流程节点': 'Process Steps', '人物名条': 'Lower Third',
  '重点词阵列': 'Kinetic Keywords', '划线纠错': 'Strike-through Correction', '数据矩阵': 'Data Grid', '环形指标': 'Radial Gauge',
  '排行列表': 'Ranking List', '里程碑线': 'Milestone Timeline', '验收清单': 'Checklist', '前后对照': 'Before / After',
  '侧边批注': 'Side Callout', '三列架构': 'Three-column Structure', '迷你趋势图': 'Mini Trend Chart', '结论收束': 'Conclusion Card',
  '讲解场景': 'Explanatory Scene', 'HTML 自定义动效': 'Custom HTML Motion', '低干扰背景层与安全区氛围': 'Low-distraction background and safe-area atmosphere',
  '段落切换与论点定位': 'Section transitions and point navigation', '大数字与指标解释': 'Large metric with supporting context',
  '两组数据或观点对比': 'Compare two values or viewpoints', '观点句逐行揭示': 'Reveal a key quote line by line',
  '标题、说明与列表结构': 'Title, description, and list structure', '三至六步流程展示': 'Three-to-six-step process',
  '人物身份与章节补充': 'Speaker identity and chapter context', '关键词节奏强调': 'Rhythmic keyword emphasis',
  '旧观点划除并翻转结论': 'Strike out an old claim and reveal the conclusion', '四组核心数据并列展示': 'Present four core metrics',
  '环形进度与单项指标': 'Circular progress and a single metric', '前三项排序与重点突出': 'Rank and emphasize the top three',
  '阶段节点与时间进度': 'Milestones and timeline progress', '逐项通过的检查清单': 'Step-by-step acceptance checklist',
  '改造前后双栏结论': 'Two-column before-and-after conclusion', '轻量提示与重点补充': 'Lightweight note or emphasis',
  '三层或三方案并列说明': 'Compare three layers or options', '确定性柱状趋势展示': 'Deterministic bar trend',
  '章节总结或行动号召': 'Chapter summary or call to action', '绑定词句的章节、步骤、对比和总结场景': 'Word-bound chapter, step, comparison, and summary scene',
  'Agent生成的可编辑HTML/CSS/SVG动效': 'Agent-generated editable HTML/CSS/SVG motion graphic',
  '本地资产与 MCP 共用项目仓库': 'Local assets and MCP share the same project repository',
  '导入口播视频，或使用人物安全区占位': 'Import a talking-head video or use the speaker safe-area placeholder',
  '人物安全区': 'Speaker Safe Area', '播放 / 暂停（空格键）': 'Play / Pause (Space)',
  '播放完整源视频，包含置灰片段': 'Play the full source video, including dimmed segments', '音量': 'Volume',
  '调整动效卡库宽度': 'Resize Motion Library', '调整属性检查器宽度': 'Resize Inspector',
  '调整章节导航高度': 'Resize Chapter Navigation', '调整运行控制台高度': 'Resize Runtime Console',
  '调整时间轴高度': 'Resize Timeline', '收起': 'Collapse', '展开': 'Expand',
  '导入 SRT 后，这里会按段落显示导航。': 'Import an SRT file to show paragraph navigation here.',
  '未选择': 'Nothing Selected', '从左侧添加卡片，或在时间轴选择卡片。': 'Add a card from the library or select one on the timeline.',
  '项目 Lint': 'Project Checks', '没有发现问题。项目满足当前机器规则。': 'No issues found. The project passes the current validation rules.',
  '将卡片、字幕和视频切点吸附到相邻边界': 'Snap cards, captions, and video cuts to nearby boundaries',
  '撤回（Ctrl+Z）': 'Undo (Ctrl+Z)', '在播放头位置切开所选卡片或视频保留片段': 'Split the selected card or retained video segment at the playhead',
  '吸附': 'Snap', '开': 'On', '关': 'Off', '全部类型': 'All Types', '全部用途': 'All Uses', '全部形态': 'All Forms',
  'L1 类型': 'L1 Type', 'L2 用途': 'L2 Use', 'L3 形态': 'L3 Form',
  '产品演示': 'Product Demo', '场景转场': 'Scene Transition', '动态字幕': 'Animated Captions', '对比分析': 'Comparison',
  '辅助标注': 'Callouts', '关键词强化': 'Keyword Emphasis', '观点纠偏': 'Claim Correction', '观点强化': 'Point Emphasis',
  '架构说明': 'Architecture', '讲解编排': 'Explainer Layout', '镜头聚焦': 'Camera Focus', '镜头收束': 'Camera Close',
  '列表排序': 'Ranked Lists', '媒体展示': 'Media Showcase', '清单说明': 'Checklist', '趋势展示': 'Trend Display',
  '时间脉络': 'Timeline Story', '识别标注': 'Identification', '图表与指标': 'Charts & Metrics', '图表展示': 'Chart Display',
  '文字入场': 'Text Entrance', '信息说明': 'Information', '章节收束': 'Section Close', '章节组织': 'Section Structure',
  '阵列展示': 'Grid Display', '指标展示': 'Metric Display', '重点强调': 'Emphasis', 'HTML 扩展': 'HTML Extensions',
  'HTML Video 全模板': 'HTML Video Templates',
  '播放器 ·': 'Player ·', '重置': 'Reset', '⌁ 吸附': '⌁ Snap', '↶ 撤回': '↶ Undo', '✂ 切分': '✂ Split',
  '资产类型': 'Asset Type', '资产用途': 'Asset Use', '资产形态': 'Asset Form', '搜索资产': 'Search Assets',
  '模糊滑入': 'Blur Slide', '马克笔下划线': 'Marker Underline', '卡片扇展': 'Card Fan', '径向波': 'Radial Wave',
  '主题扫场': 'Theme Wipe', '急推聚焦': 'Crash Zoom', '扫描标注': 'Scan Callout', '拉远孤立': 'Pull-back Focus',
  '渐变标题': 'Gradient Title', '指标卡 Pro': 'Metric Card Pro', '环形数据图': 'Radial Data Chart',
  '前后对比图': 'Before / After Chart', '动效列表': 'Animated List', '高级引言卡': 'Editorial Quote Card',
  '章节标题 Pro': 'Chapter Title Pro', 'Bento 信息格': 'Bento Information Grid', '圆环进度': 'Radial Progress',
  '故障文字': 'Glitch Text', '声音波形': 'Audio Waveform', '脉冲网格': 'Pulse Grid',
  '标题位移、模糊和透明度同曲线收敛': 'Title position, blur, and opacity converge on one motion curve',
  '标题落定后快速描画强调线': 'Draw an emphasis line immediately after the title lands',
  '卡片叠入后一次性展开为扇面': 'Stack cards in, then fan them out in one motion',
  '点阵按到波源距离依次点亮': 'Dots illuminate according to their distance from the wave source',
  '斜向边界扫过完成深浅换肤': 'A diagonal wipe changes the scene theme',
  '一拍从全景急推到目标特写': 'Crash zoom from the wide shot to the subject in one beat',
  '扫描线经过后依次弹出取景框与标签': 'A scan line reveals framing boxes and labels in sequence',
  '镜头拉远并逐层熄灭周边，只留核心结论': 'Pull back while dimming surrounding layers to isolate the conclusion',
  '高对比渐变标题与光泽扫过': 'High-contrast gradient title with a gloss sweep',
  '数字计数、趋势线与数据标签': 'Animated count, trend line, and data labels',
  '分段环形进度与中心指标': 'Segmented radial progress with a center metric',
  '两组数据横向对比与差异强调': 'Compare two datasets horizontally and emphasize the difference',
  '列表项按节奏依次进入': 'List items enter in sequence to the beat',
  '引号、金句和署名的层级动画': 'Layered motion for quotation marks, quote, and attribution',
  '章节编号、横线与标题联动': 'Chapter number, rule, and title animate together',
  '模块化信息块错落进入': 'Modular information blocks enter in a staggered layout',
  '圆环描边、数字和说明同步动画': 'Radial stroke, number, and label animate together',
  'RGB 分离与衰减故障文字': 'RGB separation and decay-style glitch text',
  '节奏型波形装饰与标题': 'Rhythmic waveform decoration with a title',
  '点阵脉冲背景，适合科技口播': 'Pulsing dot-grid background for technology explainers',
};

const catalogTerms: Array<[string, string]> = [
  ['背景氛围', 'Background & Atmosphere'], ['结构叙事', 'Structure & Narrative'], ['视觉动效', 'Visual Motion'],
  ['文字强调', 'Text Emphasis'], ['数据信息', 'Data & Information'], ['科技背景', 'Tech Background'],
  ['图形氛围', 'Graphic Atmosphere'], ['产品演示', 'Product Demo'], ['媒体展示', 'Media Showcase'],
  ['场景转场', 'Scene Transition'], ['动态字幕', 'Animated Captions'], ['对比分析', 'Comparison'],
  ['辅助标注', 'Callouts'], ['关键词强化', 'Keyword Emphasis'], ['观点纠偏', 'Claim Correction'],
  ['观点强化', 'Point Emphasis'], ['架构说明', 'Architecture'], ['讲解编排', 'Explainer Layout'],
  ['镜头聚焦', 'Camera Focus'], ['镜头收束', 'Camera Close'], ['列表排序', 'Ranked Lists'],
  ['流程说明', 'Process Explanation'], ['清单说明', 'Checklist'], ['趋势展示', 'Trend Display'],
  ['人物信息', 'Person Information'], ['时间脉络', 'Timeline Story'], ['识别标注', 'Identification'],
  ['图表与指标', 'Charts & Metrics'], ['图表展示', 'Chart Display'], ['文字入场', 'Text Entrance'],
  ['信息说明', 'Information'], ['章节收束', 'Section Close'], ['章节组织', 'Section Structure'],
  ['阵列展示', 'Grid Display'], ['指标展示', 'Metric Display'], ['重点强调', 'Emphasis'],
  ['下三分之一', 'Lower Third'], ['运动模糊', 'Motion Blur'], ['路径描边', 'Path Stroke'], ['剪辑时间轴', 'Editing Timeline'],
  ['左右分屏', 'Split Screen'], ['卡拉 OK', 'Karaoke'], ['三维', '3D'], ['之前', 'Before'], ['之后', 'After'],
  ['产品', 'Product'], ['成就', 'Achievement'], ['创意', 'Creative'], ['动态', 'Animated'], ['字幕', 'Captions'],
  ['排名', 'Ranking'], ['列表', 'List'], ['开场', 'Intro'], ['收尾', 'Outro'], ['漏光', 'Light Leak'], ['对比', 'Comparison'],
  ['进度', 'Progress'], ['加载', 'Loading'], ['画廊', 'Gallery'], ['指标', 'Metric'], ['矩阵', 'Matrix'], ['粒子', 'Particles'],
  ['气泡', 'Bubbles'], ['镜头', 'Camera'], ['卡片', 'Card'], ['倒计时', 'Countdown'], ['片尾字幕', 'End Credits'],
  ['图片', 'Image'], ['光圈', 'Iris'], ['流体', 'Fluid'], ['噪点', 'Grain'], ['通知', 'Notification'], ['视差', 'Parallax'],
  ['照片', 'Photo'], ['像素', 'Pixel'], ['旋转', 'Rotate'], ['滑动', 'Slide'], ['聚光', 'Spotlight'], ['星空', 'Starfield'],
  ['关注提醒', 'Follow Reminder'], ['暗角', 'Vignette'], ['甩镜', 'Whip Pan'], ['缩放', 'Zoom'], ['议程', 'Agenda'],
  ['预约', 'Booking'], ['柱状', 'Bar'], ['更新日志', 'Changelog'], ['概念', 'Concept'], ['文化', 'Culture'], ['折扣', 'Discount'],
  ['功能', 'Feature'], ['工作', 'Job'], ['排行榜', 'Leaderboard'], ['课程', 'Course'], ['引导流程', 'Guided Flow'],
  ['支付', 'Payment'], ['组合', 'Composition'], ['定价', 'Pricing'], ['人物资料', 'Profile'], ['房产', 'Real Estate'],
  ['测验', 'Quiz'], ['引言', 'Quote'], ['销售', 'Sales'], ['屏幕', 'Screen'], ['社交', 'Social'], ['嘉宾', 'Guest'],
  ['团队', 'Team'], ['证言', 'Testimonial'], ['开关', 'Toggle'], ['导览', 'Tour'], ['健康', 'Health'], ['代码', 'Code'],
  ['周年', 'Anniversary'], ['矢量', 'Vector'], ['音频', 'Audio'], ['音乐', 'Music'], ['语音', 'Speech'], ['模板', 'Template'],
  ['组件', 'Component'], ['循环', 'Loop'], ['动画', 'Animation'], ['动效', 'Motion'], ['转场', 'Transition'], ['文字', 'Text'],
  ['标题', 'Title'], ['标志', 'Logo'], ['弹跳', 'Bounce'], ['淡化', 'Fade'], ['揭示', 'Reveal'], ['分屏', 'Split Screen'],
  ['故障', 'Glitch'], ['模糊', 'Blur'], ['打字机', 'Typewriter'], ['饼图', 'Pie Chart'], ['图表', 'Chart'], ['波浪', 'Wave'],
  ['视频', 'Video'], ['步骤', 'Steps'], ['标注', 'Callout'], ['背景', 'Background'], ['网格', 'Grid'], ['数据', 'Data'],
  ['流程', 'Process'], ['信息', 'Information'], ['章节', 'Section'], ['科技', 'Technology'], ['人物', 'Person'], ['清单', 'Checklist'],
];

function translateCatalogName(value: string): string {
  let translated = value;
  for (const [source, target] of catalogTerms) translated = translated.replaceAll(source, target);
  return translated;
}

const rules: Array<[RegExp, (...values: string[]) => string]> = [
  [/^已选 (\d+) 个素材$/, n => `${n} items selected`],
  [/^(\d+) 张卡$/, n => `${n} cards`], [/^(\d+) 张卡片$/, n => `${n} cards`],
  [/^(\d+) 条可视轨道$/, n => `${n} visible tracks`], [/^(\d+) 条字幕$/, n => `${n} captions`],
  [/^(\d+) 个逐词时间点$/, n => `${n} word timestamps`], [/^(\d+) 个段落$/, n => `${n} segments`],
  [/^主卡 (\d+)$/, n => `Motion ${n}`], [/^片段 (\d+)$/, n => `Segment ${n}`],
  [/^已选中主轨道片段 (\d+)$/, n => `Selected main-track segment ${n}`],
  [/^已删除 (\d+) 个素材$/, n => `Deleted ${n} items`],
  [/^共(\d+)项资产，当前显示(\d+)项$/, (all, shown) => `${all} assets · ${shown} shown`],
  [/^已导入(\d+)个预设$/, n => `Imported ${n} presets`],
  [/^(\d+) 分 (\d+) 秒$/, (m, s) => `${m}m ${s}s`],
  [/^当前第 (\d+)\/5 阶段：(.+)$/, (step, name) => `Stage ${step}/5: ${translateUiText(name, 'en')}`],
  [/^播放器 · (.+)$/, name => `Player · ${name}`],
  [/^(v[^·]+) · 本地资产与 MCP 共用项目仓库$/, version => `${version} · Local assets and MCP share the same project repository`],
  [/^(.+) 张$/, n => `${n} cards`],
  [/^(.+) 秒$/, seconds => `${seconds} sec`],
  [/^(.+) · 约 (.+) GB$/, (description, size) => `${translateUiText(description, 'en')} · about ${size} GB`],
  [/^收藏 (.+)$/, name => `Favorite ${translateCatalogName(name)}`],
  [/^取消收藏 (.+)$/, name => `Unfavorite ${translateCatalogName(name)}`],
  [/^换模板：(.+)$/, name => `Replace template: ${translateCatalogName(name)}`],
  [/^添加 (.+)$/, name => `Add ${translateCatalogName(name)}`],
  [/^(.+) · 来源目录的通用示例样式$/, name => `${translateCatalogName(name)} · generic catalog preview`],
  [/^(.+) · 素材包入口与通用示例，包内动画尚未下载$/, name => `${translateCatalogName(name)} · asset-pack entry with a generic preview; animations not downloaded`],
  [/^搜索(.+)$/, label => `Search ${label}`],
  [/^恢复项目 (.+)$/, name => `Restore project ${name}`],
  [/^(.+) 动效预览$/, name => `${translateCatalogName(name)} motion preview`],
  [/^已添加 (.+)$/, name => `Added ${translateCatalogName(name)}`],
  [/^已创建 (.+)$/, name => `Created ${name}`],
  [/^(.+) 已从视图移除$/, name => `${name} removed from view`],
  [/^已在 (.+) 切分卡片$/, time => `Split card at ${time}`],
  [/^已在 (.+) 切分主轨道$/, time => `Split main track at ${time}`],
  [/^已在 (.+) 切分视频轨道$/, time => `Split video track at ${time}`],
  [/^删除 (.+) 至 (.+)$/, (from, to) => `Remove ${from} to ${to}`],
];

export const translateUiText = (value: string, locale: StudioLocale): string => {
  if (locale === 'zh-CN' || !/[\u3400-\u9fff]/.test(value)) return value;
  const leading = value.match(/^\s*/)?.[0] ?? '';
  const trailing = value.match(/\s*$/)?.[0] ?? '';
  const text = value.trim();
  if (!text) return value;
  const exact = messages[text];
  if (exact) return `${leading}${exact}${trailing}`;
  for (const [pattern, render] of rules) {
    const match = text.match(pattern);
    if (match) return `${leading}${render(...match.slice(1))}${trailing}`;
  }
  if (text.includes(' · ') || text.includes(' / ') || /(?:模板|组件|动画|动效|卡片|转场|图表|字幕|网格|标题|文字|流程|揭示|面板|清单|进度|数据|视差|粒子|场景|导览|名条)$/.test(text)) {
    const translated = translateCatalogName(text);
    if (translated !== text) return `${leading}${translated}${trailing}`;
  }
  return value;
};

type LanguageContextValue = {locale: StudioLocale; setLocale: (locale: StudioLocale) => void};
const LanguageContext = createContext<LanguageContextValue>({locale: 'zh-CN', setLocale: () => undefined});
const originalText = new WeakMap<Text, string>();
const renderedText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const renderedAttributes = new WeakMap<Element, Map<string, string>>();
const attributes = ['aria-label', 'placeholder', 'title'];

const skipped = (element: Element | null) => Boolean(element?.closest('[data-i18n-skip],script,style,code,pre,textarea,[contenteditable="true"]'));

const translateTextNode = (node: Text, locale: StudioLocale) => {
  if (skipped(node.parentElement)) return;
  const current = node.nodeValue ?? '';
  const rendered = renderedText.get(node);
  if (current !== rendered && /[\u3400-\u9fff]/.test(current)) originalText.set(node, current);
  const original = originalText.get(node);
  if (!original) return;
  const next = translateUiText(original, locale);
  renderedText.set(node, next);
  if (current !== next) node.nodeValue = next;
};

const translateElement = (element: Element, locale: StudioLocale) => {
  if (skipped(element)) return;
  let originals = originalAttributes.get(element);
  let rendered = renderedAttributes.get(element);
  if (!originals) { originals = new Map(); originalAttributes.set(element, originals); }
  if (!rendered) { rendered = new Map(); renderedAttributes.set(element, rendered); }
  for (const name of attributes) {
    const current = element.getAttribute(name);
    if (!current) continue;
    if (current !== rendered.get(name) && /[\u3400-\u9fff]/.test(current)) originals.set(name, current);
    const original = originals.get(name);
    if (!original) continue;
    const next = translateUiText(original, locale);
    rendered.set(name, next);
    if (current !== next) element.setAttribute(name, next);
  }
};

const translateTree = (root: Node, locale: StudioLocale) => {
  if (root.nodeType === Node.TEXT_NODE) { translateTextNode(root as Text, locale); return; }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE) translateElement(root as Element, locale);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text, locale);
    else translateElement(node as Element, locale);
  }
};

export function LanguageProvider({children}: {children: ReactNode}) {
  const [locale, setLocaleState] = useState<StudioLocale>(initialLocale);
  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale: next => {localStorage.setItem(storageKey, next); setLocaleState(next);},
  }), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === 'en' ? 'MotionMaster — Motion Design Studio' : 'MotionMaster — 视频动效工作台';
    translateTree(document.body, locale);
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') translateTextNode(mutation.target as Text, locale);
        else if (mutation.type === 'attributes') translateElement(mutation.target as Element, locale);
        else mutation.addedNodes.forEach(node => translateTree(node, locale));
      }
    });
    observer.observe(document.body, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes});
    const nativeConfirm = window.confirm.bind(window);
    const nativeAlert = window.alert.bind(window);
    window.confirm = message => nativeConfirm(translateUiText(String(message), locale));
    window.alert = message => nativeAlert(translateUiText(String(message), locale));
    return () => {observer.disconnect(); window.confirm = nativeConfirm; window.alert = nativeAlert;};
  }, [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);

export function LanguageSwitch() {
  const {locale, setLocale} = useLanguage();
  return <label className="language-switch" data-i18n-skip aria-label="Language / 语言">
    <span aria-hidden="true">◎</span>
    <select value={locale} onChange={event => setLocale(event.target.value as StudioLocale)}>
      <option value="zh-CN">中文</option>
      <option value="en">English</option>
    </select>
  </label>;
}
