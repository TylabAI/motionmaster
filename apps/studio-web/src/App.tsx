import {HtmlDesignPanel} from './HtmlDesignPanel';
import {TemplatePicker} from './TemplatePicker';
import {htmlMotionSchema} from '../../../packages/motion-schema/src/html-motion';
import {MotionArrangementPanel} from './MotionArrangementPanel';
import {sceneVideoBox} from '@motion-master/cards-starter';
import {ProjectName} from './ProjectName';
import {ProjectManagement} from './ProjectManagement';
import {TimelineZoom} from './TimelineZoom';
import {PreCutReview} from './PreCutReview';
import {useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent} from 'react';
import {cardClassificationByType, MotionProjectCanvas, starterCardDefinitions} from '@motion-master/cards-starter';
import {adjustCardTiming, type CardTimingDragMode} from '@motion-master/core/timing';
import type {CardParameterDefinition, MotionCardDefinition, MotionCardInstance, MotionProject} from '@motion-master/schema';

import {AssetManager} from './AssetManager';
import {CardPreview} from './CardPreview';
import {TimelineRuler} from './TimelineRuler';
import {AsrSettingsPanel} from './AsrSettingsPanel';
import {LanguageSwitch} from './i18n';
import {assetStorageKey, createAsset, readAssetLibrary, type AssetLibrary} from './motion-assets';
import {editedToSource, sourceToEdited} from './timeline-coordinates';
import {marqueeBounds, rectsOverlap} from './timeline-selection';

type ProjectSummary = Pick<MotionProject, 'projectId' | 'title' | 'version' | 'status'>;
type LintIssue = {code: string; message: string; cardId?: string; severity?: 'error' | 'warning'};
type TimelineDrag = {cardId: string; mode: CardTimingDragMode; originX: number; laneWidth: number; startFrame: number; durationFrames: number; expectedVersion: number; originTrackId: string};
type MarqueeSelection = {pointerId: number; startX: number; startY: number; currentX: number; currentY: number; additive: boolean; baseIds: string[]; baseRangeIndexes: number[]};
type LibraryPreview = {cardType: string; left: number; top: number};
type ConsoleEntry = {time: string; level: 'info' | 'success' | 'error'; message: string};
type CardFilters = {level1: string; level2: string; level3: string};
type LayoutSizes = {libraryWidth: number; inspectorWidth: number; timelineHeight: number; chapterHeight: number; consoleHeight: number};
type LayoutResize = {kind: keyof LayoutSizes; originX: number; originY: number; sizes: LayoutSizes};
type SubtitleRow = {startFrame: number; endFrame: number; text: string; status: 'draft' | 'approved'};

const defaultLayoutSizes: LayoutSizes = {libraryWidth: 400, inspectorWidth: 420, timelineHeight: 292, chapterHeight: 150, consoleHeight: 116};
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const readLayoutSizes = (): LayoutSizes => {
  try {
    const saved = JSON.parse(localStorage.getItem('motion-master-layout-v03') ?? '{}') as Partial<LayoutSizes>;
    return {
      libraryWidth: clamp(Number(saved.libraryWidth) || defaultLayoutSizes.libraryWidth, 320, 620),
      inspectorWidth: clamp(Number(saved.inspectorWidth) || defaultLayoutSizes.inspectorWidth, 300, 720),
      timelineHeight: clamp(Number(saved.timelineHeight) || defaultLayoutSizes.timelineHeight, 190, 520),
      chapterHeight: clamp(Number(saved.chapterHeight) || defaultLayoutSizes.chapterHeight, 90, 280),
      consoleHeight: clamp(Number(saved.consoleHeight) || defaultLayoutSizes.consoleHeight, 68, 220),
    };
  } catch {
    return defaultLayoutSizes;
  }
};

const extensionPrefix = window.location.pathname.split('/').filter(Boolean)[0];
const apiPrefix = extensionPrefix ? `/${extensionPrefix}` : '';
const request = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${apiPrefix}${url}`, {headers: {'content-type': 'application/json'}, ...options});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `Request failed: ${response.status}`);
  return result as T;
};
const sampleSrt = `1
00:00:00,000 --> 00:00:03,000
首先看完整工作流

2
00:00:09,000 --> 00:00:12,000
制作效率提升 80%

3
00:00:18,000 --> 00:00:22,000
不是每次重新生成，而是直接复用资产

4
00:00:29,000 --> 00:00:34,000
三层各管一件事，卡片库是资产，编排层是大脑，工作台是出口`;
const groups: Array<CardParameterDefinition['group']> = ['content', 'timing', 'style', 'layout', 'motion'];
const groupNames = {content: '内容', timing: '时间', style: '样式', layout: '布局', motion: '动画'};
const getPath = (value: unknown, path: string) => path.split('.').reduce<unknown>((current, key) => current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined, value);
const setPath = <T,>(value: T, path: string, nextValue: unknown): T => {
  const clone = structuredClone(value) as Record<string, unknown>;
  const keys = path.split('.');
  let cursor = clone;
  for (const key of keys.slice(0, -1)) {
    const child = cursor[key];
    cursor[key] = child && typeof child === 'object' ? {...child as Record<string, unknown>} : {};
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[keys.at(-1)!] = nextValue;
  return clone as T;
};
const timecode = (frame: number, fps: number) => {
  const seconds = Math.max(0, frame / fps);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}.${String(Math.floor((seconds % 1) * 10))}`;
};
const srtTimecode = (frame: number, fps: number) => {
  const milliseconds = Math.max(0, Math.round(frame / fps * 1000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor(milliseconds % 3_600_000 / 60_000);
  const seconds = Math.floor(milliseconds % 60_000 / 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds % 1000).padStart(3, '0')}`;
};
const subtitleRowsForProject = (project: MotionProject): SubtitleRow[] => {
  if (!project.transcript?.wordCues.length && project.transcript?.subtitleCues.length) return project.transcript.subtitleCues.map((cue) => ({startFrame: cue.startFrame, endFrame: cue.endFrame, text: cue.text, status: cue.status}));
  if (!project.transcript?.wordCues.length && project.timeline.segments.length) return project.timeline.segments.map((segment) => ({startFrame: editedToSource(segment.startFrame,project.editPlan?.keptRanges), endFrame: editedToSource(segment.endFrame,project.editPlan?.keptRanges,'end'), text: segment.text, status: 'draft'}));
  const rows: SubtitleRow[] = [];
  const removedWordIds=new Set(project.transcript?.cutDecisions.filter(d=>project.editPlan?.removedRanges.some(r=>r.startFrame<=d.startFrame&&r.endFrame>=d.endFrame)).flatMap(d=>d.sourceWordIds)??[]);
  let current: SubtitleRow | null = null;
  for (const word of project.transcript?.wordCues ?? []) {
    if(word.keep===false||removedWordIds.has(word.wordId)){if(current){rows.push(current);current=null;}continue;}
    const text = word.text.trim();
    if (!text) continue;
    const gap: number = current === null ? 0 : word.startFrame - current.endFrame;
    if (current && (gap > project.canvas.fps * .6 || current.text.length >= 28 || /[。！？!?；;]$/.test(current.text))) {
      rows.push(current); current = null;
    }
    if (!current) current = {startFrame: word.startFrame, endFrame: word.endFrame, text, status: 'draft'};
    else {
      const existing: SubtitleRow = current;
      const spacedLatin: boolean = /[a-z0-9]$/i.test(existing.text) && /^[a-z0-9]/i.test(text);
      current = {startFrame: existing.startFrame, endFrame: word.endFrame, status: existing.status, text: `${existing.text}${spacedLatin ? ' ' : ''}${text}`};
    }
  }
  if (current) rows.push(current);
  return rows;
};

export const App = () => {
  const [preCutOpen,setPreCutOpen]=useState(false);
  const [arrangementOpen,setArrangementOpen]=useState(false);
  const [analysisProvider,setAnalysisProvider]=useState<'codex'|'external'>(()=>localStorage.getItem('motion-analysis-provider')==='external'?'external':'codex');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [project, setProject] = useState<MotionProject | null>(null);
  const [catalog, setCatalog] = useState<MotionCardDefinition[]>(starterCardDefinitions);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [mediaMode, setMediaMode] = useState<'source' | 'rough-cut' | 'final'>('source');
  const [previewAllTracks, setPreviewAllTracks] = useState(false);
  const [workflowStage, setWorkflowStage] = useState<'idle' | 'video-ready' | 'editing' | 'review'>('idle');
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [srt, setSrt] = useState('');
  const [srtOpen, setSrtOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [assetLibrary, setAssetLibrary] = useState<AssetLibrary>(readAssetLibrary);
  const saveAssetLibrary = (next: AssetLibrary) => { try { localStorage.setItem(assetStorageKey, JSON.stringify(next)); setAssetLibrary(next); } catch { setNotice('资产保存失败：浏览器存储空间不足，请导出备份后重试'); } };
  const saveSelectedAsset = () => { if (!selectedCard || !selectedDefinition) return; const asset = createAsset(selectedCard, selectedDefinition, `${selectedDefinition.displayName} · 我的预设`); saveAssetLibrary({...assetLibrary, assets:[...assetLibrary.assets, asset]}); setAssetsOpen(true); setNotice('已将当前卡片参数保存为预设'); };
  const [search, setSearch] = useState('');
  const [cardFilters, setCardFilters] = useState<CardFilters>({level1: 'all', level2: 'all', level3: 'all'});
  const [lintIssues, setLintIssues] = useState<LintIssue[]>([]);
  const [notice, setNotice] = useState('正在连接 Motion Core…');
  const [busy, setBusy] = useState(false);
  const [volume, setVolume] = useState(1);
  const [timelineDrag, setTimelineDrag] = useState<TimelineDrag | null>(null);
  const [marqueeSelection, setMarqueeSelection] = useState<MarqueeSelection | null>(null);
  const [libraryPreview, setLibraryPreview] = useState<LibraryPreview | null>(null);
  const [timelineView, setTimelineView] = useState<'rough' | 'effects'>('rough');
  const [selectedRoughRange, setSelectedRoughRange] = useState<number | null>(null);
  const [selectedRoughRanges, setSelectedRoughRanges] = useState<number[]>([]);
  const [chaptersOpen, setChaptersOpen] = useState(true);
  const [hiddenTracks, setHiddenTracks] = useState<string[]>([]);
  const [snapEnabled, setSnapEnabled] = useState(() => localStorage.getItem('motion-master-snap-v01') !== 'off');
  const [layoutSizes, setLayoutSizes] = useState<LayoutSizes>(readLayoutSizes);
  const [layoutResize, setLayoutResize] = useState<LayoutResize | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const clockRef = useRef({frame: 0, at: 0});
  const undoRef = useRef<MotionProject[]>([]);
  const pushUndo = () => { if (project) undoRef.current = [...undoRef.current.slice(-19), structuredClone(project)]; };
  const undo = () => { const previous=undoRef.current.at(-1);if(previous&&project)void run(async()=>{const next=await request<MotionProject>(`/api/projects/${project.projectId}/import-json`,{method:'POST',body:JSON.stringify({expectedVersion:project.version,project:{...previous,version:project.version}})});undoRef.current.pop();setProject(next);setPreviewMedia(`${apiPrefix}/api/projects/${next.projectId}/media?asset=${next.media.assetId}`,'source',false);setNotice('已撤回并保存');}); };

  const selectedCard = useMemo(() => project?.timeline.cards.find((card) => card.cardId === selectedCardId) ?? null, [project, selectedCardId]);
  const [htmlDesignOpen,setHtmlDesignOpen]=useState(false);
  const selectedDefinition = useMemo(() => {const d=catalog.find(item=>item.cardType===selectedCard?.cardType);if(!d)return null;if(selectedCard?.cardType!=='html-motion')return d;const parsed=htmlMotionSchema.safeParse(selectedCard.content.htmlSpec);return {...d,parameterSchema:[...(parsed.success?parsed.data.fields.map(f=>({key:f.key,path:'content.htmlValues.'+f.key,label:f.label,group:'content' as const,control:f.type==='text'?'textarea' as const:f.type==='color'?'color' as const:'number' as const})):[]),...d.parameterSchema]};},[catalog,selectedCard]);
  useEffect(()=>{if(!project||!['running','awaiting-agent'].includes(project.htmlDesign?.status??''))return;let stopped=false;let timer:ReturnType<typeof setTimeout>;const id=project.projectId;const poll=async()=>{try{const next=await request<MotionProject>(`/api/projects/${id}/html-design`);if(stopped)return;setProject(next);if(!['running','awaiting-agent'].includes(next.htmlDesign?.status??''))return;}catch(e){if(!stopped)setNotice('HTML设计状态连接中断，将重试');}if(!stopped)timer=setTimeout(poll,2000);};void poll();return()=>{stopped=true;clearTimeout(timer);};},[project?.projectId,project?.htmlDesign?.jobId,project?.htmlDesign?.status]);

  const selectedSegment = useMemo(() => project?.timeline.segments.find((segment) => (segment.groupId ?? segment.segmentId) === selectedSegmentId) ?? null, [project, selectedSegmentId]);
  const taxonomyOptions = useMemo(() => {
    const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    const level1 = unique(catalog.map((item) => item.classification?.level1 ?? '未分类'));
    const level2Pool = catalog.filter((item) => cardFilters.level1 === 'all' || item.classification?.level1 === cardFilters.level1);
    const level2 = unique(level2Pool.map((item) => item.classification?.level2 ?? '未分类'));
    const level3Pool = level2Pool.filter((item) => cardFilters.level2 === 'all' || item.classification?.level2 === cardFilters.level2);
    const level3 = unique(level3Pool.map((item) => item.classification?.level3 ?? '未分类'));
    return {level1, level2, level3};
  }, [catalog, cardFilters.level1, cardFilters.level2]);
  const filteredCatalog = useMemo(() => catalog.filter((item) => {
    const classification = item.classification;
    const matchesTaxonomy = (cardFilters.level1 === 'all' || classification?.level1 === cardFilters.level1)
      && (cardFilters.level2 === 'all' || classification?.level2 === cardFilters.level2)
      && (cardFilters.level3 === 'all' || classification?.level3 === cardFilters.level3);
    const haystack = `${item.displayName}${item.description}${item.tags.join('')}${classification?.level1 ?? ''}${classification?.level2 ?? ''}${classification?.level3 ?? ''}`.toLowerCase();
    return matchesTaxonomy && haystack.includes(search.trim().toLowerCase());
  }), [catalog, cardFilters, search]);
  const visualTracks = useMemo(() => { if (!project) return []; const out: Array<{track: typeof project.timeline.tracks[number]; lane: number; cards: MotionCardInstance[]}> = []; for (const track of project.timeline.tracks.filter((item) => item.kind === 'motion' && !hiddenTracks.includes(item.trackId))) { const cards = project.timeline.cards.filter(c => c.trackId === track.trackId).sort((a,b)=>a.startFrame-b.startFrame); const lanes: MotionCardInstance[][] = []; for (const card of cards) { let lane = lanes.findIndex(items => { const last=items.at(-1); return !last || last.startFrame+last.durationFrames <= card.startFrame; }); if (lane<0) { lane=lanes.length; lanes.push([]); } lanes[lane].push(card); } (lanes.length?lanes:[[]]).forEach((items,lane)=>out.push({track,lane,cards:items})); } return out; }, [project, hiddenTracks]);

  const appendConsole = (level: ConsoleEntry['level'], message: string) => setConsoleEntries((current) => [...current.slice(-79), {time: new Date().toLocaleTimeString(), level, message}]);
  const setPreviewMedia = (url: string, mode: 'source' | 'rough-cut' | 'final', allTracks: boolean) => {
    setPreviewAllTracks(allTracks);
    setMediaMode(mode);
    setVideoUrl(url);
    requestAnimationFrame(() => videoRef.current?.load());
  };
  useEffect(() => { if (videoRef.current) videoRef.current.volume = volume; }, [volume, videoUrl]);
  useEffect(()=>{
    if(!project||!['running','awaiting-agent'].includes(project.preCut?.status??''))return;
    let stopped=false;let timer:ReturnType<typeof setTimeout>;
    const id=project.projectId;
    const poll=async()=>{
      try{
        const result=await request<{job?:MotionProject['preCut'];project:MotionProject}>(`/api/projects/${id}/precut`);
        if(stopped)return;
        setNotice(result.job?.stage??'正在初剪');
        if(result.job?.status==='running'||result.job?.status==='awaiting-agent')setProject(current=>current?.projectId===id?{...result.project,preCut:result.job}:current);
        if(result.job?.status!=='running'&&result.job?.status!=='awaiting-agent'){
          setProject({...result.project,preCut:result.job??result.project.preCut});setTimelineView('rough');setWorkflowStage('editing');
          setNotice(result.job?.error??result.job?.stage??'分析完成');
          appendConsole(result.job?.status==='failed'?'error':'success',result.job?.error||result.job?.stage||'分析完成');
          setPreCutOpen(result.job?.status!=='completed');return;
        }
        timer=setTimeout(poll,result.job?.status==='awaiting-agent'?3000:1200);
      }catch(error){if(!stopped){setNotice(`初剪状态连接中断，将重试：${String(error)}`);timer=setTimeout(poll,3000);}}
    };void poll();return()=>{stopped=true;clearTimeout(timer);};
  },[project?.projectId,project?.preCut?.jobId,project?.preCut?.status]);

  useEffect(()=>{
    if(!project||!['running','awaiting-agent'].includes(project.motionArrangement?.status??''))return;
    const id=project.projectId;let stopped=false;let timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{try{const result=await request<{project:MotionProject;job:MotionProject['motionArrangement']}>(`/api/projects/${id}/motion-arrangement`);if(stopped)return;setProject({...result.project,motionArrangement:result.job});setNotice(result.job?.error??result.job?.stage??'');if(['completed','failed'].includes(result.job?.status??'')){if(result.job?.status==='completed'){setTimelineView('effects');setWorkflowStage('editing');}return;}}catch(e){if(!stopped)setNotice(`编排状态连接中断，将重试：${String(e)}`);}if(!stopped)timer=setTimeout(poll,2000);};void poll();return()=>{stopped=true;clearTimeout(timer);};
  },[project?.projectId,project?.motionArrangement?.jobId,project?.motionArrangement?.status]);
  const run = async (action: () => Promise<void>) => { setBusy(true); try { await action(); } catch (error) { const message = error instanceof Error ? error.message : String(error); setNotice(message); appendConsole('error', message); } finally { setBusy(false); } };
  const refreshProjects = async () => setProjects(await request<ProjectSummary[]>('/api/projects'));
  const validate = async (projectId: string) => setLintIssues((await request<{issues: LintIssue[]}>(`/api/projects/${projectId}/validate`, {method: 'POST'})).issues);
  const loadProject = async (projectId: string) => {
    const next = await request<MotionProject>(`/api/projects/${projectId}`);
    undoRef.current=[];
    const pageUrl = new URL(window.location.href); pageUrl.searchParams.set('project', projectId); window.history.replaceState(null, '', pageUrl);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const approved = false; // Load the source with virtual cuts; approval is not proof of a final render.
    setPreviewMedia(next.media.assetId ? (approved ? `${apiPrefix}/api/projects/${next.projectId}/rendered-media?v=${next.version}` : `${apiPrefix}/api/projects/${next.projectId}/media?asset=${encodeURIComponent(next.media.assetId)}`) : '', approved ? 'final' : 'source', false);
    setMediaMode(approved ? 'final' : 'source');
    setWorkflowStage(next.media.assetId ? (next.preCut ? 'editing' : 'video-ready') : 'idle');
    setTimelineView(next.editReview?.status==='approved'?'effects':'rough');
    setProject(next); setCurrentFrame(0); setPlaying(false);
    setPreCutOpen(next.preCut?.status==='awaiting-confirmation');
    const firstCardId = next.timeline.cards.find((card) => card.trackId === 'overlay-main')?.cardId ?? next.timeline.cards[0]?.cardId ?? null;
    setSelectedCardId(firstCardId); setSelectedCardIds(firstCardId ? [firstCardId] : []); setSelectedRoughRange(null); setSelectedRoughRanges([]);
    try {
      const diagnostics = await request<{media: {assetExists: boolean; assetSizeBytes: number}}>(`/api/projects/${projectId}/diagnostics`);
      if(next.media.assetId)appendConsole(diagnostics.media.assetExists ? 'success' : 'error', diagnostics.media.assetExists ? `视频资产已同步：${diagnostics.media.assetSizeBytes} bytes` : '项目记录了视频，但资产文件不存在');
      else appendConsole('info','尚未导入视频，请点击“导入视频”。');
      const history = await request<Array<{at: string; event: string; details?: Record<string, unknown>}>>(`/api/projects/${projectId}/history?limit=20`);
      history.slice(-10).forEach((event) => appendConsole('info', `服务端：${event.event}`));
    } catch (error) { appendConsole('error', error instanceof Error ? error.message : String(error)); }
    await validate(projectId);
  };

  useEffect(() => { Promise.all([request<MotionCardDefinition[]>('/api/cards'), request<ProjectSummary[]>('/api/projects'), request<{version:string}>('/api/system')]).then(async ([cards, list, system]) => { setCatalog(cards.map((card) => ({...card, parameterSchema: card.parameterSchema.map((field) => field.path === 'layout.scale' ? {...field, min: 0.1} : field), classification: card.classification ?? cardClassificationByType[card.cardType]}))); setProjects(list); const requestedProjectId = new URLSearchParams(window.location.search).get('project'); const initialProject = list.find((item) => item.projectId === requestedProjectId) ?? list[0]; if (initialProject) await loadProject(initialProject.projectId); setNotice('v' + system.version + ' · 本地资产与 MCP 共用项目仓库'); }).catch((error) => setNotice(error.message)); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editingText = target?.matches('input, textarea, select, [contenteditable="true"]');
      if ((event.key === 'Delete' || event.key === 'Backspace') && !editingText && !assetsOpen && !srtOpen && !busy && (selectedCardIds.length || selectedRoughRanges.length) && project) {
        event.preventDefault();
        const rangeIndexes=new Set(selectedRoughRanges);
        const keptRanges=project.editPlan?.keptRanges.filter((_,index)=>!rangeIndexes.has(index));
        if(selectedRoughRanges.length&&(!project.editPlan||!keptRanges?.length)){setNotice('主轨道至少需要保留一个视频片段');return;}
        pushUndo();
        run(async () => {
          let next = project;
          for (const id of selectedCardIds) next = await request<MotionProject>(`/api/projects/${next.projectId}/cards/${id}`, {method: 'DELETE', body: JSON.stringify({expectedVersion: next.version})});
          if(selectedRoughRanges.length)next=await request<MotionProject>(`/api/projects/${next.projectId}/edit-plan`,{method:'POST',body:JSON.stringify({expectedVersion:next.version,keptRanges})});
          const count=selectedCardIds.length+selectedRoughRanges.length;
          setProject(next); setSelectedCardIds([]); setSelectedCardId(null); setSelectedRoughRange(null); setSelectedRoughRanges([]); setNotice(`已删除 ${count} 个素材`);
          await validate(next.projectId);
        });
      }
      if (event.key === 'Escape' && assetsOpen) setAssetsOpen(false);
      if (event.key === 'Escape' && srtOpen) setSrtOpen(false);
      if (event.key === 'Escape' && settingsOpen) setSettingsOpen(false);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !editingText) { event.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedCardIds, selectedRoughRanges, project, srtOpen, settingsOpen, assetsOpen, busy]);
  useEffect(() => {
    if (!layoutResize) return;
    const onPointerMove = (event: PointerEvent) => {
      if (layoutResize.kind === 'libraryWidth') {
        setLayoutSizes((current) => ({...current, libraryWidth: clamp(layoutResize.sizes.libraryWidth + event.clientX - layoutResize.originX, 320, Math.min(620, window.innerWidth * .42))}));
      } else if (layoutResize.kind === 'inspectorWidth') {
        setLayoutSizes((current) => ({...current, inspectorWidth: clamp(layoutResize.sizes.inspectorWidth - event.clientX + layoutResize.originX, 300, Math.max(300, Math.min(720, window.innerWidth - layoutResize.sizes.libraryWidth - 490)))}));
      } else if (layoutResize.kind === 'timelineHeight') {
        setLayoutSizes((current) => ({...current, timelineHeight: clamp(layoutResize.sizes.timelineHeight - event.clientY + layoutResize.originY, 190, Math.min(520, window.innerHeight - 230))}));
      } else if (layoutResize.kind === 'chapterHeight') {
        setLayoutSizes((current) => ({...current, chapterHeight: clamp(layoutResize.sizes.chapterHeight + event.clientY - layoutResize.originY, 90, 280)}));
      } else {
        setLayoutSizes((current) => ({...current, consoleHeight: clamp(layoutResize.sizes.consoleHeight + event.clientY - layoutResize.originY, 68, 220)}));
      }
    };
    const onPointerUp = () => setLayoutResize(null);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, {once: true});
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [layoutResize]);
  useEffect(() => { localStorage.setItem('motion-master-layout-v03', JSON.stringify(layoutSizes)); }, [layoutSizes]);
  useEffect(() => {
    if (!playing || !project) return;
    let requestId = 0;
    const tick = () => {
      const video = videoRef.current;
      const videoFrame = video && !video.paused ? Math.round(video.currentTime * project.canvas.fps) : clockRef.current.frame + Math.round((Date.now() - clockRef.current.at) * project.canvas.fps / 1000);
      let next = video && !video.paused ? (mediaMode === 'source' ? videoFrame : sourceFrameForEdited(videoFrame)) : videoFrame;
      if(mediaMode==='source'&&!previewAllTracks&&project.editPlan){
        const range=project.editPlan.keptRanges.find(r=>next<r.endFrame);
        if(!range){setPlaying(false);video?.pause();setCurrentFrame(project.editPlan.keptRanges.at(-1)!.endFrame-1);return;}
        if(next<range.startFrame){next=range.startFrame;if(video)video.currentTime=next/project.canvas.fps;clockRef.current={frame:next,at:Date.now()};}
      }
      if(video?.ended){setPlaying(false);return;}
      if (next >= sourceDurationFrames) { setCurrentFrame(sourceDurationFrames - 1); setPlaying(false); video?.pause(); return; }
      setCurrentFrame(next); requestId = requestAnimationFrame(tick);
    };
    requestId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(requestId);
  }, [playing, project, mediaMode,previewAllTracks]);
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const saveProjectPatch = (patch: Partial<MotionProject>, message: string) => project && run(async () => {
    const next = await request<MotionProject>(`/api/projects/${project.projectId}`, {method: 'PATCH', body: JSON.stringify({expectedVersion: project.version, patch})});
    setProject(next); setNotice(message); await Promise.all([refreshProjects(), validate(next.projectId)]);
  });
  const createNewProject = () => run(async () => {
    const suffix = String(Date.now()).slice(-6);
    const created = await request<MotionProject>('/api/projects', {method: 'POST', body: JSON.stringify({projectId: `motion-${suffix}`, title: `口播项目 ${suffix}`, durationFrames: 5400, width: 1920, height: 1080})});
    await refreshProjects(); await loadProject(created.projectId); setNotice(`已创建 ${created.title}`);
  });
  const addCard = (definition: MotionCardDefinition) => project && run(async () => {
    const trackId = definition.category === 'ambient' ? 'overlay-ambient' : 'overlay-main';
    const durationFrames = Math.min(Math.round(definition.defaults.durationFrames*(definition.cardType.startsWith('hv-')||definition.cardType==='html-motion'?project.canvas.fps/30:1)), project.canvas.durationFrames);
    const card: MotionCardInstance = {...definition.defaults, cardId: `manual-${Date.now()}`, trackId, startFrame: Math.min(project.canvas.durationFrames - durationFrames, editedFrameForSource(currentFrame)), durationFrames};
    const next = await request<MotionProject>(`/api/projects/${project.projectId}/cards`, {method: 'POST', body: JSON.stringify({expectedVersion: project.version, card})});
    setProject(next); setSelectedCardId(card.cardId); setSelectedCardIds([card.cardId]); setNotice(`已添加 ${definition.displayName}`); await Promise.all([refreshProjects(), validate(next.projectId)]);
  });
  const updateLocalCard = (path: string, value: unknown) => setProject((current) => current ? {...current, timeline: {...current.timeline, cards: current.timeline.cards.map((card) => card.cardId === selectedCardId ? setPath(card, path, value) : card)}} : current);
  const saveCard = () => project && selectedCard && run(async () => {
    const next = await request<MotionProject>(`/api/projects/${project.projectId}/cards/${selectedCard.cardId}`, {method: 'PATCH', body: JSON.stringify({expectedVersion: project.version, patch: selectedCard})});
    setProject(next); setNotice('卡片参数已保存'); await Promise.all([refreshProjects(), validate(next.projectId)]);
  });
  const splitAtPlayhead = () => project && run(async () => {
    const sourceFrame = currentFrame;
    const editedFrame = editedFrameForSource(sourceFrame);
    if (timelineView === 'effects' && selectedRoughRange !== null && project.editPlan) {
      const ranges = project.editPlan.keptRanges; const range = ranges[selectedRoughRange];
      // The ruler stores the canonical source frame; split exactly at that frame.
      const sourceCut = sourceFrame;
      if (!range || sourceCut <= range.startFrame || sourceCut >= range.endFrame) throw new Error('播放头必须位于当前主轨道片段内部才能切分');
      pushUndo(); const keptRanges = ranges.flatMap((item, index) => index === selectedRoughRange ? [{startFrame: item.startFrame, endFrame: sourceCut}, {startFrame: sourceCut, endFrame: item.endFrame}] : [item]);
      const next = await request<MotionProject>(`/api/projects/${project.projectId}/edit-plan`, {method: 'POST', body: JSON.stringify({expectedVersion: project.version, keptRanges})});
      setProject(next); setSelectedRoughRange(selectedRoughRange + 1); setSelectedRoughRanges([selectedRoughRange+1]); setSelectedCardId(null); setSelectedCardIds([]); setNotice(`已在 ${timecode(sourceFrame, project.canvas.fps)} 切分主轨道`); await validate(next.projectId); return;
    }
    if (selectedCard) {
      const start = selectedCard.startFrame;
      const end = start + selectedCard.durationFrames;
      if (editedFrame <= start || editedFrame >= end) throw new Error('播放头必须位于所选卡片内部才能切分');
      const leftDuration = editedFrame - start;
      const rightCard: MotionCardInstance = {...selectedCard, cardId: `split-${Date.now()}`, startFrame: editedFrame, durationFrames: end - editedFrame};
      const first = await request<MotionProject>(`/api/projects/${project.projectId}/cards/${selectedCard.cardId}`, {method: 'PATCH', body: JSON.stringify({expectedVersion: project.version, patch: {durationFrames: leftDuration}})});
      const next = await request<MotionProject>(`/api/projects/${project.projectId}/cards`, {method: 'POST', body: JSON.stringify({expectedVersion: first.version, card: rightCard})});
      setProject(next); setSelectedCardId(rightCard.cardId); setSelectedCardIds([rightCard.cardId]); setNotice(`已在 ${timecode(sourceFrame, project.canvas.fps)} 切分卡片`); await validate(next.projectId); return;
    }
    if (!project.editPlan) throw new Error('请先生成粗剪方案，再切分视频素材');
    const keptRanges = project.editPlan.keptRanges.flatMap((range) => sourceFrame > range.startFrame && sourceFrame < range.endFrame ? [{startFrame: range.startFrame, endFrame: sourceFrame}, {startFrame: sourceFrame, endFrame: range.endFrame}] : [range]);
    if (keptRanges.length === project.editPlan.keptRanges.length) throw new Error('播放头必须位于保留视频片段内部才能切分');
    const next = await request<MotionProject>(`/api/projects/${project.projectId}/edit-plan`, {method: 'POST', body: JSON.stringify({expectedVersion: project.version, keptRanges})});
    setProject(next); setNotice(`已在 ${timecode(sourceFrame, project.canvas.fps)} 切分视频轨道`); await validate(next.projectId);
  });
  const trimVideoRange = (event: ReactPointerEvent<HTMLElement>, range: {startFrame: number; endFrame: number}, edge: 'start' | 'end') => {
    if (!project?.editPlan) return;
    event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    const lane = event.currentTarget.closest('.track-lane')?.getBoundingClientRect(); if (!lane?.width) return;
    pushUndo();
    const original = project.editPlan.keptRanges; const originX = event.clientX; let latestRanges = original;
    const update = (clientX: number) => {
      const delta = Math.round((clientX - originX) / lane.width * (timelineView==='effects'?project.canvas.durationFrames:sourceDurationFrames));
      const nextRange = edge === 'start' ? {startFrame: clamp(range.startFrame + delta, 0, range.endFrame - 1), endFrame: range.endFrame} : {startFrame: range.startFrame, endFrame: clamp(range.endFrame + delta, range.startFrame + 1, sourceDurationFrames)};
      latestRanges = original.map((item) => item.startFrame === range.startFrame && item.endFrame === range.endFrame ? nextRange : item);
      setProject((current) => current?.editPlan ? {...current, editPlan: {...current.editPlan, keptRanges: latestRanges}} : current);
    };
    const onMove = (move: PointerEvent) => update(move.clientX);
    const onUp = async (up: PointerEvent) => {
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
      try { const next = await request<MotionProject>(`/api/projects/${project.projectId}/edit-plan`, {method: 'POST', body: JSON.stringify({expectedVersion: project.version, keptRanges: latestRanges})}); setProject(next); setNotice('视频片段边缘已调整'); } catch (error) { setNotice(error instanceof Error ? error.message : String(error)); setProject(project); }
    };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp, {once: true}); update(event.clientX);
  };
  const deleteCard = () => project && selectedCard && run(async () => {
    const next = await request<MotionProject>(`/api/projects/${project.projectId}/cards/${selectedCard.cardId}`, {method: 'DELETE', body: JSON.stringify({expectedVersion: project.version})});
    const firstCardId = next.timeline.cards.find((card) => card.trackId === 'overlay-main')?.cardId ?? next.timeline.cards[0]?.cardId ?? null;
    setProject(next); setSelectedCardId(firstCardId); setSelectedCardIds(firstCardId ? [firstCardId] : []); setNotice('卡片已删除'); await validate(next.projectId);
  });
  const importSrt = () => project && run(async () => {
    const result = await request<{project: MotionProject; plan: {segments: unknown[]; cards: unknown[]}}>(`/api/projects/${project.projectId}/import-srt`, {method: 'POST', body: JSON.stringify({expectedVersion: project.version, srt})});
    const firstCardId = result.project.timeline.cards.find((card) => card.trackId === 'overlay-main')?.cardId ?? result.project.timeline.cards[0]?.cardId ?? null;
    setProject(result.project); setSelectedCardId(firstCardId); setSelectedCardIds(firstCardId ? [firstCardId] : []); setNotice(`已编排 ${result.plan.segments.length} 段字幕 / ${result.plan.cards.length} 张卡`); await Promise.all([refreshProjects(), validate(result.project.projectId)]);
  });
  const moveSelectedSegment = (deltaFrames: number) => project && selectedSegmentId && run(async () => {
    const result = await request<{project: MotionProject; appliedDeltaFrames: number}>(`/api/projects/${project.projectId}/segments/${encodeURIComponent(selectedSegmentId)}/move`, {method: 'POST', body: JSON.stringify({expectedVersion: project.version, deltaFrames})});
    setProject(result.project); setNotice(`段落整体移动 ${result.appliedDeltaFrames} 帧`); await validate(result.project.projectId);
  });
  const importJson = (file: File) => project && run(async () => {
    const imported = JSON.parse(await file.text());
    const next = await request<MotionProject>(`/api/projects/${project.projectId}/import-json`, {method: 'POST', body: JSON.stringify({expectedVersion: project.version, project: imported})});
    setProject(next); setNotice('overlay JSON 已导入并通过 Schema 校验'); await validate(next.projectId);
  });
  const exportJson = () => {
    if (!project) return;
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(project, null, 2)}\n`], {type: 'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = `${project.projectId}.overlay.json`; link.click(); URL.revokeObjectURL(url);
  };
  const importVideo = (file: File) => project && run(async () => {
    setNotice(`正在上传 ${file.name}（${(file.size/1024/1024).toFixed(0)} MB），上传后可选择初剪或直接做动效`);
    appendConsole('info',`开始上传：${file.name}，完成后由你选择是否初剪`);
    const next=await new Promise<MotionProject>((resolve,reject)=>{
      const xhr=new XMLHttpRequest();xhr.open('POST',`${apiPrefix}/api/projects/${project.projectId}/media`);
      xhr.setRequestHeader('content-type',file.type||'video/mp4');xhr.setRequestHeader('x-motion-filename',encodeURIComponent(file.name));xhr.setRequestHeader('x-motion-version',String(project.version));
      xhr.upload.onprogress=e=>{if(e.lengthComputable)setNotice(e.loaded===e.total?'上传完成，正在校验素材…':`正在上传 ${file.name}：${Math.round(e.loaded/e.total*100)}%`);};
      xhr.onerror=()=>reject(new Error('视频上传连接中断，请重试'));
      xhr.onload=()=>{try{const data=JSON.parse(xhr.responseText);xhr.status>=200&&xhr.status<300?resolve(data):reject(new Error(data.error||`上传失败：${xhr.status}`));}catch{reject(new Error('视频上传响应无效'));}};
      xhr.send(file);
    });
    setPreviewMedia(`${apiPrefix}/api/projects/${next.projectId}/media?asset=${encodeURIComponent(next.media.assetId ?? '')}`, 'source', false);
    setTimelineView('rough');
    setProject(next); setCurrentFrame(0); setPlaying(false); setWorkflowStage('video-ready'); setPreCutOpen(false); appendConsole('success', `视频上传完成：${file.name}，已写入项目 assets`);
    await Promise.all([refreshProjects(), validate(next.projectId)]);
    setNotice(`视频已导入：${file.name}。请选择“开始初剪”或“不剪辑，直接做动效”。`);
  });

  const analyzeAgain=(transcript?:unknown)=>project&&run(async()=>{
    pushUndo();
    const next=await request<MotionProject>(`/api/projects/${project.projectId}/precut`,{method:'POST',body:JSON.stringify({expectedVersion:project.version,transcript,provider:analysisProvider})});
    setProject(next);setTimelineView('rough');setPreCutOpen(true);setNotice(next.preCut?.executionPolicy==='auto-retakes'?'正在分析，明确失败重说将自动剪除，可随时恢复':'正在分析，完成后确认方案');
  });
  const decideCut=(cutId:string,accept:boolean)=>project&&run(async()=>{
    pushUndo();
    const next=await request<MotionProject>(`/api/projects/${project.projectId}/precut/decision`,{method:'POST',body:JSON.stringify({expectedVersion:project.version,cutId,accept})});
    setProject(next);setPreviewMedia(`${apiPrefix}/api/projects/${next.projectId}/media?asset=${next.media.assetId}`,'source',false);
  });
  const arrangeMotion=()=>project&&run(async()=>{
    if(['running','awaiting-agent'].includes(project.motionArrangement?.status??'')){setArrangementOpen(true);return;}
    pushUndo();const next=await request<MotionProject>(`/api/projects/${project.projectId}/motion-arrangement`,{method:'POST',body:JSON.stringify({expectedVersion:project.version,provider:analysisProvider})});setProject(next);setArrangementOpen(true);setNotice('开始编排讲解动效，已有卡片保留');
  });
  const directMotion = () => project && run(async () => {
    const next = await request<MotionProject>(`/api/projects/${project.projectId}/edit-review/approve`, {method:'POST',body:JSON.stringify({expectedVersion:project.version})});
    setProject(next);setTimelineView('effects');setWorkflowStage('editing');
    setNotice('已进入动效处理，沿用当前视频片段，不执行初剪');
    appendConsole('success','已选择直接做动效');
  });
  const confirmCut=(cutIds:string[])=>project?.preCutDraft&&run(async()=>{
    pushUndo();
    const next=await request<MotionProject>(`/api/projects/${project.projectId}/precut/confirm`,{method:'POST',body:JSON.stringify({expectedVersion:project.version,jobId:project.preCutDraft!.jobId,cutIds})});
    setProject(next);setTimelineView('rough');setPreCutOpen(false);setCurrentFrame(0);
    setPreviewMedia(`${apiPrefix}/api/projects/${next.projectId}/media?asset=${next.media.assetId}`,'source',false);
    setNotice(next.preCut?.stage??'初剪已执行');
  });
  const exportSemanticTask=()=>project&&run(async()=>{
    const task=await request(`/api/projects/${project.projectId}/semantic-review`);
    const url=URL.createObjectURL(new Blob([JSON.stringify(task,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=`${project.projectId}.semantic-task.json`;link.click();URL.revokeObjectURL(url);
    setNotice('语义精剪任务已导出。请在 Codex 中要求分析本项目；导出本身不会调用模型。');
  });
  const importSemanticResult=(result:unknown)=>project&&run(async()=>{
    const next=await request<MotionProject>(`/api/projects/${project.projectId}/semantic-review`,{method:'POST',body:JSON.stringify({expectedVersion:project.version,result})});
    setProject(next);setNotice(`语义精剪已返回 ${next.semanticReview?.decisionIds.length??0} 条建议，可在初剪详情试听采用`);
  });
  useEffect(()=>{
    if(!preCutOpen||!project||busy)return;
    let stopped=false;const id=project.projectId;
    const timer=setInterval(()=>{request<MotionProject>(`/api/projects/${id}`).then(next=>{if(!stopped)setProject(current=>current?.projectId===id&&next.version>current.version?next:current);}).catch(()=>{});},2500);
    return()=>{stopped=true;clearInterval(timer);};
  },[preCutOpen,project?.projectId,busy]);
  const startMotionReview = () => { setWorkflowStage('review'); const firstCard = project?.timeline.cards.find((card) => card.trackId === 'overlay-main'); if (firstCard) { setSelectedCardId(firstCard.cardId); setSelectedCardIds([firstCard.cardId]); seek(sourceFrameForEdited(firstCard.startFrame)); } document.querySelector('.stage-wrap')?.scrollIntoView({behavior: 'smooth', block: 'center'}); setNotice('已进入动效检查：逐段检查卡片与口播画面是否遮挡'); appendConsole('info', '检查动效：已定位第一个动效卡'); };
  const renderRoughCut = () => project && run(async () => {
    if (!project.editPlan) throw new Error('Please create an edit-plan before rendering a rough cut');
    await request(`/api/projects/${project.projectId}/rough-cut-render`, {method: 'POST'});
    setPreviewMedia(`${apiPrefix}/api/projects/${project.projectId}/rough-cut-media?v=${project.version}`, 'rough-cut', false); setWorkflowStage('editing'); setCurrentFrame(0);
    setNotice(`Rough cut ready: ${timecode(project.canvas.durationFrames, project.canvas.fps)}`); appendConsole('success', 'Rough cut preview generated');
  });
  const approveEdit = () => project && run(async () => {
    const next = await request<MotionProject>(`/api/projects/${project.projectId}/edit-review/approve`, {method: 'POST', body: JSON.stringify({expectedVersion: project.version})});
    setProject(next); setWorkflowStage('review'); setPreviewMedia(`${apiPrefix}/api/projects/${next.projectId}/media?asset=${next.media.assetId}`, 'source', false); setNotice('粗剪已确认，可以继续编排动效'); appendConsole('success', `Edit review approved revision ${next.editReview?.revision ?? 0}`);
  });
  const renderFinalMp4 = () => project && run(async () => {
    if (project.editPlan && project.editReview?.status !== 'approved') throw new Error('Approve the rough cut first');
    await request(`/api/projects/${project.projectId}/render-mp4`, {method: 'POST'}); setPreviewMedia(`${apiPrefix}/api/projects/${project.projectId}/rendered-media?v=${Date.now()}`, 'final', false); setNotice('Final MP4 is now available in the page'); appendConsole('success', 'Final media loaded');
  });
  const restoreRemovedRange = (range: {startFrame: number; endFrame: number}) => project?.editPlan && run(async () => {
    pushUndo();
    const keptRanges = [...project.editPlan!.keptRanges, range].sort((a, b) => a.startFrame - b.startFrame).reduce<Array<{startFrame: number; endFrame: number}>>((merged, current) => {
      const previous = merged[merged.length - 1];
      if (previous && current.startFrame <= previous.endFrame) previous.endFrame = Math.max(previous.endFrame, current.endFrame);
      else merged.push({...current});
      return merged;
    }, []);
    const next = await request<MotionProject>(`/api/projects/${project.projectId}/edit-plan`, {method: 'POST', body: JSON.stringify({expectedVersion: project.version, keptRanges})});
    setProject(next); setPreviewMedia(`${apiPrefix}/api/projects/${next.projectId}/media?asset=${encodeURIComponent(next.media.assetId ?? '')}`, 'source', true); setWorkflowStage('editing');
    setNotice('已恢复一个删除区间，粗剪稿回到 draft；请重新生成并审核'); appendConsole('info', `Restored source range ${range.startFrame}-${range.endFrame}`);
  });
  const sourceDurationFrames = project?.editPlan?.sourceDurationFrames ?? project?.canvas.durationFrames ?? 1;
  const editedFrameForSource = (frame: number) => sourceToEdited(frame, project?.editPlan?.keptRanges);
  const sourceFrameForEdited = (frame: number, edge: 'start' | 'end' = 'start') => editedToSource(frame, project?.editPlan?.keptRanges, edge);
  const editedSpanStyle = (start: number, end: number) => ({left: `${sourceFrameForEdited(start) / sourceDurationFrames * 100}%`, width: `${Math.max(0, sourceFrameForEdited(end, 'end') - sourceFrameForEdited(start)) / sourceDurationFrames * 100}%`});
  const sourceSpanStyle = (start:number,end:number) => timelineView==='effects'?editedCardSpanStyle(editedFrameForSource(start),editedFrameForSource(end)):{left:`${start/sourceDurationFrames*100}%`,width:`${Math.max(0,end-start)/sourceDurationFrames*100}%`};
  const editedMainSpanStyle = (index: number, range: {startFrame: number; endFrame: number}) => { const ranges = project?.editPlan?.keptRanges ?? []; const total = project?.canvas.durationFrames ?? (ranges.reduce((sum, item) => sum + item.endFrame - item.startFrame, 0) || 1); const left = ranges.slice(0, index).reduce((sum, item) => sum + item.endFrame - item.startFrame, 0); return {left: `${left / total * 100}%`, width: `${(range.endFrame - range.startFrame) / total * 100}%`}; };
  const editedCardSpanStyle = (start: number, end: number) => ({left: `${start / (project?.canvas.durationFrames ?? 1) * 100}%`, width: `${Math.max(0, end - start) / (project?.canvas.durationFrames ?? 1) * 100}%`});
  const previewDeletedRange = (range: {startFrame: number; endFrame: number}) => {
    if (!project) return;
     setPreviewMedia(`${apiPrefix}/api/projects/${project.projectId}/media?asset=${encodeURIComponent(project.media.assetId ?? '')}`, 'source', true); setPlaying(false); videoRef.current?.pause(); setCurrentFrame(range.startFrame); clockRef.current = {frame: range.startFrame, at: Date.now()};
     requestAnimationFrame(() => { if (videoRef.current) { videoRef.current.load(); videoRef.current.currentTime = range.startFrame / project.canvas.fps; } });
    setNotice('已切换到原片试听：当前为置灰片段'); appendConsole('info', `Preview deleted range ${range.startFrame}-${range.endFrame}`);
  };
  const toggleFullTrackPlayback = async () => {
    if (!project) return;
     setPreviewMedia(`${apiPrefix}/api/projects/${project.projectId}/media?asset=${encodeURIComponent(project.media.assetId ?? '')}`, 'source', true);
     const next = !playing; setPlaying(next); requestAnimationFrame(async () => { if (videoRef.current) { videoRef.current.currentTime = currentFrame / project.canvas.fps; if (next) await videoRef.current.play(); else videoRef.current.pause(); } });
  };
  const togglePlayback = async () => {
    if (!project) return;
    if(previewAllTracks)return toggleFullTrackPlayback();

    setPreviewAllTracks(false);
    const next = !playing;
    if (next) clockRef.current = {frame: currentFrame, at: Date.now()};
    setPlaying(next);
    if (videoRef.current) { videoRef.current.currentTime = (mediaMode === 'source' ? currentFrame : editedFrameForSource(currentFrame)) / project.canvas.fps; if (next) await videoRef.current.play(); else videoRef.current.pause(); }
  };
  useEffect(() => {
    const onSpace = (event: KeyboardEvent) => {
      if ((event.code !== 'Space' && event.key !== ' ') || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.isComposing) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="dialog"]') || assetsOpen || srtOpen || preCutOpen || arrangementOpen || htmlDesignOpen || busy || !project) return;
      event.preventDefault();
      if (event.repeat) return;
      void togglePlayback().catch(error => { setPlaying(false); setNotice(`无法播放：${error instanceof Error ? error.message : String(error)}`); });
    };
    window.addEventListener('keydown', onSpace);
    return () => window.removeEventListener('keydown', onSpace);
  });
  const seek = (frame: number) => { const bounded = Math.max(0, Math.min(frame, sourceDurationFrames - 1)); setCurrentFrame(bounded); clockRef.current = {frame: bounded, at: Date.now()}; if (videoRef.current) videoRef.current.currentTime = (mediaMode === 'source' ? bounded : editedFrameForSource(bounded)) / (project?.canvas.fps ?? 30); };
  const beginMarqueeSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button, input, .track-name, .timeline-card, .rough-block, .segment-block, .deleted-block')) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = {pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, currentX: event.clientX, currentY: event.clientY, additive: event.ctrlKey || event.metaKey, baseIds: event.ctrlKey || event.metaKey ? selectedCardIds : [], baseRangeIndexes:event.ctrlKey||event.metaKey?selectedRoughRanges:[]};
    setMarqueeSelection(next);
    if (!next.additive) { setSelectedCardIds([]); setSelectedCardId(null); setSelectedRoughRange(null); setSelectedRoughRanges([]); }
  };
  const updateMarqueeSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!marqueeSelection || marqueeSelection.pointerId !== event.pointerId) return;
    event.preventDefault();
    const next = {...marqueeSelection, currentX: event.clientX, currentY: event.clientY};
    setMarqueeSelection(next);
    const selection = marqueeBounds(next.startX, next.startY, next.currentX, next.currentY);
    const hits = [...event.currentTarget.querySelectorAll<HTMLElement>('.timeline-card[data-card-id]')].filter(element => rectsOverlap(selection, element.getBoundingClientRect())).map(element => element.dataset.cardId!).filter(Boolean);
    const rangeHits = [...event.currentTarget.querySelectorAll<HTMLElement>('.rough-block[data-range-index]')].filter(element => rectsOverlap(selection, element.getBoundingClientRect())).map(element => Number(element.dataset.rangeIndex)).filter(Number.isInteger);
    const selected = [...new Set([...next.baseIds, ...hits])];
    const selectedRanges=[...new Set([...next.baseRangeIndexes,...rangeHits])];
    setSelectedCardIds(selected); setSelectedCardId(selected.at(-1) ?? null);
    setSelectedRoughRanges(selectedRanges);setSelectedRoughRange(selectedRanges.at(-1)??null);
  };
  const finishMarqueeSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!marqueeSelection || marqueeSelection.pointerId !== event.pointerId) return;
    event.preventDefault();
    const moved = Math.hypot(event.clientX - marqueeSelection.startX, event.clientY - marqueeSelection.startY) >= 4;
    if (!moved && !marqueeSelection.additive) { setSelectedCardIds([]); setSelectedCardId(null); setSelectedRoughRange(null);setSelectedRoughRanges([]); }
    setMarqueeSelection(null);
  };
  const toggleMute = () => { if (!project) return; const muted = !project.media.muted; setProject({...project, media: {...project.media, muted}}); if (videoRef.current) videoRef.current.muted = muted; setNotice(muted ? '已静音' : '已开启声音'); };
  const selectTaxonomy = (level: keyof CardFilters, value: string) => setCardFilters((current) => {
    if (level === 'level1') return {level1: value, level2: 'all', level3: 'all'};
    if (level === 'level2') return {...current, level2: value, level3: 'all'};
    return {...current, level3: value};
  });
  const beginLayoutResize = (kind: keyof LayoutSizes, event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    setLayoutResize({kind, originX: event.clientX, originY: event.clientY, sizes: layoutSizes});
  };
  const resetLayout = () => { setLayoutSizes(defaultLayoutSizes); setNotice('编辑台区域尺寸已恢复默认'); };
  const dragTiming = (drag: TimelineDrag, clientX: number) => {
    // A selection click must not snap time or detach a scene's word anchors.
    if(Math.abs(clientX-drag.originX)<3)return {startFrame:drag.startFrame,durationFrames:drag.durationFrames};
    const anchor = drag.mode === 'resize-end' ? drag.startFrame + drag.durationFrames : drag.startFrame;
    const sourceAnchor = sourceFrameForEdited(anchor, drag.mode === 'resize-end' ? 'end' : 'start');
    // Card timing is stored in the edited timeline coordinate space. Do not
    // remap the pointer delta through source/rough-cut ranges a second time.
    const delta = Math.round((clientX - drag.originX) / drag.laneWidth * (project?.canvas.durationFrames ?? sourceDurationFrames));
    const timing = adjustCardTiming(drag.mode, drag.startFrame, drag.durationFrames, delta, project?.canvas.durationFrames ?? 1);
    if (!snapEnabled || !project) return timing;
    const points = [...project.timeline.cards.flatMap((card) => [card.startFrame, card.startFrame + card.durationFrames]), ...project.timeline.segments.flatMap((segment) => [segment.startFrame, segment.endFrame]), ...(project.editPlan?.keptRanges ?? []).flatMap((range) => [sourceToEdited(range.startFrame, project.editPlan?.keptRanges), sourceToEdited(range.endFrame, project.editPlan?.keptRanges)])];
    const target = drag.mode === 'resize-end' ? timing.startFrame + timing.durationFrames : timing.startFrame;
    const nearest = points.filter((point) => point !== drag.startFrame && point !== drag.startFrame + drag.durationFrames).sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0];
    if (nearest === undefined || Math.abs(nearest - target) > Math.max(4, Math.round((project.canvas.durationFrames ?? 1) / 1000))) return timing;
    if (drag.mode === 'resize-end') return {...timing, durationFrames: Math.max(1, nearest - timing.startFrame)};
    if (drag.mode === 'resize-start') return {startFrame: nearest, durationFrames: Math.max(1, timing.durationFrames + timing.startFrame - nearest)};
    return {...timing, startFrame: nearest};
  };
  const startTimelineDrag = (event: ReactPointerEvent<HTMLElement>, card: MotionCardInstance, mode: CardTimingDragMode) => {
    if (!project || busy || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    const lane = event.currentTarget.closest('.track-lane')?.getBoundingClientRect();
    if (!lane?.width) return;
    setPlaying(false); videoRef.current?.pause(); setSelectedCardId(card.cardId); setSelectedCardIds((current) => event.ctrlKey ? (current.includes(card.cardId) ? current : [...current, card.cardId]) : [card.cardId]);
    if(!event.ctrlKey&&!event.metaKey){setSelectedRoughRange(null);setSelectedRoughRanges([]);}
    setTimelineDrag({cardId: card.cardId, mode, originX: event.clientX, laneWidth: lane.width, startFrame: card.startFrame, durationFrames: card.durationFrames, expectedVersion: project.version, originTrackId: card.trackId});
  };
  const updateTimelineDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!timelineDrag || !project) return;
    event.preventDefault(); event.stopPropagation();
    const timing = dragTiming(timelineDrag, event.clientX);
    setProject({...project, timeline: {...project.timeline, cards: project.timeline.cards.map((card) => card.cardId === timelineDrag.cardId ? {...card, ...timing} : card)}});
  };
  const finishTimelineDrag = async (event: ReactPointerEvent<HTMLElement>) => {
    if (!timelineDrag || !project) return;
    event.preventDefault(); event.stopPropagation();
    const drag = timelineDrag; const timing = dragTiming(drag, event.clientX); const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('.track-lane'); const destination = project.timeline.tracks.find((track) => track.trackId === hit?.dataset.trackId && track.kind === 'motion' && !track.locked); const trackId = drag.mode === 'move' ? destination?.trackId ?? drag.originTrackId : drag.originTrackId; setTimelineDrag(null);
    if (timing.startFrame === drag.startFrame && timing.durationFrames === drag.durationFrames && trackId === drag.originTrackId) return;
    setBusy(true);
    try {
      const next = await request<MotionProject>(`/api/projects/${project.projectId}/cards/${drag.cardId}`, {method: 'PATCH', body: JSON.stringify({expectedVersion: drag.expectedVersion, patch: {...timing, trackId}})});
      setProject(next); setNotice(trackId === drag.originTrackId ? `时间轴已更新：${timing.startFrame} 帧 / ${timing.durationFrames} 帧` : `卡片已移动到 ${next.timeline.tracks.find((track) => track.trackId === trackId)?.label ?? trackId}`); await Promise.all([refreshProjects(), validate(next.projectId)]);
    } catch (error) { setNotice(error instanceof Error ? error.message : String(error)); await loadProject(project.projectId); } finally { setBusy(false); }
  };
  const cancelTimelineDrag = () => { if (!timelineDrag || !project) return; const drag = timelineDrag; setTimelineDrag(null); setProject({...project, timeline: {...project.timeline, cards: project.timeline.cards.map((card) => card.cardId === drag.cardId ? {...card, startFrame: drag.startFrame, durationFrames: drag.durationFrames} : card)}}); };
  const selectVideoRange=(event:ReactPointerEvent<HTMLElement>,index:number)=>{
    event.stopPropagation();
    const additive=event.ctrlKey||event.metaKey;
    if(!additive){setSelectedCardId(null);setSelectedCardIds([]);}
    const next=additive?(selectedRoughRanges.includes(index)?selectedRoughRanges.filter(value=>value!==index):[...selectedRoughRanges,index]):[index];
    setSelectedRoughRanges(next);
    setSelectedRoughRange(next.includes(index)?index:next.at(-1)??null);
  };

  const projectListChanged=async(restoredId?:string)=>{
    const list=await request<ProjectSummary[]>('/api/projects');setProjects(list);
    setPreCutOpen(false);setPlaying(false);videoRef.current?.pause();undoRef.current=[];
    if(restoredId||list.length){await loadProject(restoredId??list[0].projectId);setNotice(restoredId?'项目已恢复':'项目已移入回收站');}
    else{setProject(null);setPreviewMedia('','source',false);setNotice('暂无项目，可以新建或从回收站恢复');const url=new URL(window.location.href);url.searchParams.delete('project');window.history.replaceState(null,'',url);}
  };
  const videoBox=project&&timelineView!=='rough'?sceneVideoBox(project,editedFrameForSource(currentFrame)):{x:0,y:0,width:100,height:100,radius:0};
  const projectManagement=<ProjectManagement project={project} request={request} onChanged={projectListChanged}/>;
  if (!project) return <main className="loading"><p>{notice}</p><button onClick={createNewProject}>＋ 新建项目</button>{projectManagement}</main>;
  const subtitleRows = subtitleRowsForProject(project);
  const projectSrt = subtitleRows.map((row, index) => `${index + 1}\n${srtTimecode(editedFrameForSource(row.startFrame), project.canvas.fps)} --> ${srtTimecode(editedFrameForSource(row.endFrame), project.canvas.fps)}\n${row.text}`).join('\n\n');
  const exportSrt = () => {
    const url = URL.createObjectURL(new Blob([`${projectSrt}\n`], {type: 'application/x-subrip;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = `${project.projectId}.srt`; link.click(); URL.revokeObjectURL(url);
  };
  const paletteClass = `theme-${project.theme} skin-${project.skin}`;
  const hoveredLibraryDefinition = libraryPreview ? catalog.find(item => item.cardType === libraryPreview.cardType) : null;
  const studioStyle = {
    '--library-width': `${layoutSizes.libraryWidth}px`,
    '--inspector-width': `min(${layoutSizes.inspectorWidth}px, max(300px, calc(100vw - ${layoutSizes.libraryWidth + 490}px)))`,
    '--timeline-height': `${layoutSizes.timelineHeight}px`,
    '--chapter-height': `${layoutSizes.chapterHeight}px`,
    '--console-height': `${layoutSizes.consoleHeight}px`,
  } as CSSProperties;
  return <main className={`studio ${paletteClass} ${layoutResize ? 'is-resizing' : ''}`} style={studioStyle}>
    <header className="topbar">
      <div className="brand"><span className="brand-mark">M</span><strong>MOTION MASTER</strong><span>v0.3 Studio</span></div>
      <nav><button className={!assetsOpen ? "active" : ""} onClick={() => setAssetsOpen(false)}>编辑台</button><button className={assetsOpen ? "active" : ""} onClick={() => { setPlaying(false); videoRef.current?.pause(); setAssetsOpen(true); }}>动效资产</button></nav>
      <div className="project-status"><ProjectName key={project.projectId} title={project.title} disabled={busy||project.preCut?.status==='running'} onRename={async title=>{
        const next=await request<MotionProject>(`/api/projects/${project.projectId}`,{method:'PATCH',body:JSON.stringify({expectedVersion:project.version,patch:{title}})});
        setProject(next);await refreshProjects();setNotice(`项目已重命名为“${next.title}”`);
      }}/><span>{timecode(currentFrame, project.canvas.fps)} / {timecode(sourceDurationFrames, project.canvas.fps)}</span><span>{project.timeline.cards.length} 张卡</span></div>
      <div className="top-actions">
        <LanguageSwitch />
        <button className={srtOpen ? 'active' : ''} onClick={() => setSrtOpen(true)}>字幕 / SRT</button>
        <button className={settingsOpen ? 'active' : ''} onClick={() => setSettingsOpen(true)}>⚙ 设置</button>
        <button onClick={() => validate(project.projectId)}>Lint</button>
        <button onClick={exportJson}>导出 JSON</button>
        <label className="button">导入 JSON<input hidden type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && importJson(event.target.files[0])} /></label>
        <button onClick={renderFinalMp4}>导出 MP4</button>
        <button className="primary" onClick={() => run(async () => { await request(`/api/projects/${project.projectId}/render-alpha-mov`, {method: 'POST'}); setNotice('透明 MOV 已渲染并通过 Alpha 检测'); })}>透明 MOV</button>
      </div>
    </header>

    {assetsOpen && <AssetManager catalog={catalog} library={assetLibrary} project={project} onChange={saveAssetLibrary} onAdd={addCard} onClose={() => setAssetsOpen(false)} />}
    <section className="globalbar">
      <select value={project.projectId} onChange={(event) => loadProject(event.target.value)}>{projects.map((item) => <option key={item.projectId} value={item.projectId}>{item.title} · v{item.version}</option>)}</select>
      <button onClick={createNewProject}>＋ 新建</button>
      {projectManagement}
      <label>分析驱动<select aria-label="分析驱动" value={analysisProvider} disabled={busy||project.preCut?.status==='running'} onChange={e=>{const value=e.target.value as 'codex'|'external';setAnalysisProvider(value);localStorage.setItem('motion-analysis-provider',value);}}><option value="codex">Codex 自动</option><option value="external">通用 Agent（HTTP / MCP）</option></select></label>
      <label>主题<select value={project.theme} onChange={(event) => saveProjectPatch({theme: event.target.value as MotionProject['theme']}, '主题已切换')}><option value="dark">暗底</option><option value="light">亮底</option></select></label>
      <label>材质<select value={project.skin} onChange={(event) => saveProjectPatch({skin: event.target.value as MotionProject['skin']}, '材质已切换')}><option value="glass">玻璃</option><option value="solid">实色</option></select></label>
      <label>骨架<select value={project.style} onChange={(event) => saveProjectPatch({style: event.target.value as MotionProject['style']}, '骨架已切换')}><option value="hud">HUD</option><option value="editorial">Editorial</option></select></label>
      <button disabled={busy||!project.media.assetId} onClick={()=>setPreCutOpen(true)}>{project.preCut?.status==='running'||project.preCut?.status==='awaiting-agent'?'查看初剪进度':'初剪详情'}</button><button disabled={busy||!project.transcript?.wordCues.length||project.preCut?.status==='running'} onClick={()=>setPreCutOpen(true)}>语义精剪</button><label className="video-import">导入视频<input disabled={busy||project.preCut?.status==='running'} type="file" accept="video/*" onChange={(event) => event.target.files?.[0] && importVideo(event.target.files[0])} /></label>
      {project.media.assetId && <div className="workflow-actions"><span className="workflow-status">● 已就绪</span><button disabled={busy} onClick={()=>['running','awaiting-agent','awaiting-confirmation'].includes(project.preCut?.status??'')?setPreCutOpen(true):analyzeAgain()}>{project.preCut?.status==='running'||project.preCut?.status==='awaiting-agent'?'查看初剪进度':project.preCut?.status==='awaiting-confirmation'?'查看并确认方案':project.preCut?'重新分析初剪':'开始初剪'}</button><button disabled={busy||project.preCut?.status==='running'} onClick={directMotion}>{project.preCut||project.editPlan?.removedRanges.length?'进入动效':'不剪辑，直接做动效'}</button><button disabled={busy||project.preCut?.status==='running'} onClick={arrangeMotion}>{['running','awaiting-agent'].includes(project.motionArrangement?.status??'')?'编排进度':'自动编排动效'}</button>{project.motionArrangement&&<button onClick={()=>setArrangementOpen(true)}>编排详情</button>}<button className={workflowStage === 'review' ? 'active' : ''} onClick={startMotionReview}>检查动效</button></div>}
      <span className="notice">{notice}</span>
    </section>

    <section className="workspace">
      <aside className="library panel">
        <div className="panel-title"><span>动效卡库</span><button className="library-assets-link" onClick={() => setAssetsOpen(true)}>资产库 / 收藏</button><b>{filteredCatalog.length} / {catalog.length}</b></div>
        <div className="library-search"><span>⌕</span><input className="search" placeholder="搜索名称、用途或标签" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <div className="taxonomy-panel">
          <label><span>L1 类型</span><select value={cardFilters.level1} onChange={(event) => selectTaxonomy('level1', event.target.value)}><option value="all">全部类型</option>{taxonomyOptions.level1.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>L2 用途</span><select value={cardFilters.level2} onChange={(event) => selectTaxonomy('level2', event.target.value)}><option value="all">全部用途</option>{taxonomyOptions.level2.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>L3 形态</span><select value={cardFilters.level3} onChange={(event) => selectTaxonomy('level3', event.target.value)}><option value="all">全部形态</option>{taxonomyOptions.level3.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <button className="filter-reset" onClick={() => { setCardFilters({level1: 'all', level2: 'all', level3: 'all'}); setSearch(''); }}>重置</button>
        </div>
        <div className="card-list">{filteredCatalog.map((definition) => <button key={definition.cardType} onMouseEnter={(event) => { const box=event.currentTarget.getBoundingClientRect(); setLibraryPreview({cardType:definition.cardType,left:box.right+8,top:clamp(box.top,50,window.innerHeight-250)}); }} onMouseLeave={() => setLibraryPreview(current => current?.cardType === definition.cardType ? null : current)} onFocus={(event) => { const box=event.currentTarget.getBoundingClientRect(); setLibraryPreview({cardType:definition.cardType,left:box.right+8,top:clamp(box.top,50,window.innerHeight-250)}); }} onBlur={() => setLibraryPreview(null)} onClick={() => addCard(definition)} title={`添加 ${definition.displayName}`}><span className="card-icon">{definition.displayName.slice(0, 1)}</span><span className="card-copy"><strong>{definition.displayName}</strong><small>{definition.description}</small><em>{definition.classification?.level1} / {definition.classification?.level2} / {definition.classification?.level3}</em></span><b>＋</b></button>)}</div>
        {hoveredLibraryDefinition&&libraryPreview&&<aside className="library-hover-preview" style={{left:libraryPreview.left,top:libraryPreview.top}} aria-live="polite"><CardPreview definition={hoveredLibraryDefinition} project={project}/><strong>{hoveredLibraryDefinition.displayName}</strong><span>{hoveredLibraryDefinition.description}</span><small>点击卡片添加到播放头位置</small></aside>}
      </aside>

      <div className="splitter splitter-column" role="separator" aria-label="调整动效卡库宽度" onPointerDown={(event) => beginLayoutResize('libraryWidth', event)} onDoubleClick={resetLayout} />

      <section className="center-column">
        <div className="stage-toolbar"><span className="stage-title">播放器 · {project.media.videoName ?? '未导入口播视频'}</span><span>{project.canvas.width} × {project.canvas.height} · {project.canvas.fps}fps</span><button onClick={() => seek(0)}>回到开头</button></div>
        <div className="stage-wrap">
          <div className="stage" style={{aspectRatio: `${project.canvas.width}/${project.canvas.height}`, background: project.theme === 'dark' ? '#07090d' : '#eeeae1'}}>
            {videoUrl ? <video key={videoUrl} ref={videoRef} src={videoUrl} preload="metadata" muted={project.media.muted} playsInline onLoadedMetadata={() => appendConsole('success', `Video metadata loaded: ${Math.round((videoRef.current?.duration ?? 0) * project.canvas.fps)} frames`)} onCanPlay={() => appendConsole('info', `Video ready: ${mediaMode}`)} onError={() => appendConsole('error', `Video load failed: ${videoUrl}`)} style={{left:videoBox.x+'%',top:videoBox.y+'%',width:videoBox.width+'%',height:videoBox.height+'%',borderRadius:videoBox.radius,objectFit: videoBox.width<99.9?'contain':project.media.fit, opacity: project.media.opacity, transform: `translate(${project.media.offsetX}%,${project.media.offsetY}%) scale(${project.media.scale})`}} /> : <div className="speaker-placeholder"><div className="head"/><div className="body"/><span>导入口播视频，或使用人物安全区占位</span></div>}
            <MotionProjectCanvas project={timelineView === 'rough' ? {...project, timeline: {...project.timeline, cards: []}} : project} frame={editedFrameForSource(currentFrame)} selectedCardId={selectedCardId} onSelectCard={(cardId) => { setSelectedCardId(cardId); setSelectedCardIds([cardId]); }} onBeginLayout={()=>{pushUndo();setPlaying(false);videoRef.current?.pause();}} onLayoutChange={(cardId,layout)=>setProject(current=>current?{...current,timeline:{...current.timeline,cards:current.timeline.cards.map(c=>c.cardId===cardId?{...c,layout}:c)}}:current)} onLayoutCommit={(cardId,layout)=>void run(async()=>{
              try{const next=await request<MotionProject>(`/api/projects/${project.projectId}/cards/${encodeURIComponent(cardId)}`,{method:'PATCH',body:JSON.stringify({expectedVersion:project.version,patch:{layout}})});setProject(next);setNotice('卡片位置与尺寸已保存');}catch(error){const latest=await request<MotionProject>(`/api/projects/${project.projectId}`);setProject(latest);throw error;}
            })} />
            {(() => { const cue = subtitleRows.find(row => currentFrame >= row.startFrame && currentFrame < row.endFrame); return cue ? <div className="preview-subtitle">{cue.text}</div> : null; })()}
            {!videoUrl&&<div className="safe-zone"><span>人物安全区</span></div>}
          </div>
        </div>
        <div className="transport">
          <span className="transport-time current">{timecode(currentFrame, project.canvas.fps)}</span>
          <span className="transport-time">/ {timecode(project.editPlan ? sourceDurationFrames : project.canvas.durationFrames, project.canvas.fps)}</span>
          <button className="play-button" title="播放 / 暂停（空格键）" aria-label={playing ? '暂停' : '播放'} aria-keyshortcuts="Space" onClick={togglePlayback}>{playing ? 'Ⅱ' : '▶'}</button>
          {previewAllTracks&&<button className="transport-action" onClick={()=>{setPreviewAllTracks(false);setNotice('已返回粗剪播放');}}>返回粗剪</button>}<button className="transport-action" onClick={toggleFullTrackPlayback} title="播放完整源视频，包含置灰片段">播放全部</button>
          <div className="volume-control"><button onClick={toggleMute} title="鼠标悬停调节音量">{project.media.muted ? '🔇' : '🔊'}</button><input aria-label="音量" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); if (next > 0 && project.media.muted) toggleMute(); }} /></div>
        </div>
      </section>

      <div className="splitter splitter-column" role="separator" aria-label="调整属性检查器宽度" onPointerDown={(event) => beginLayoutResize('inspectorWidth', event)} onDoubleClick={resetLayout} />

      <aside className={`inspector panel ${chaptersOpen ? '' : 'chapters-collapsed'}`}>
        <section className="inspector-section chapter-navigation">
          <div className="section-heading"><span>章节导航</span><b>{subtitleRows.length}</b><button className="collapse-button" onClick={() => setChaptersOpen(open => !open)}>{chaptersOpen ? '收起' : '展开'}</button></div>
          {chaptersOpen && <div className="chapter-list">{subtitleRows.length ? subtitleRows.map((row, index) => <button key={`${row.startFrame}-${index}`} className={currentFrame >= row.startFrame && currentFrame < row.endFrame ? 'active' : ''} onClick={() => seek(row.startFrame)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{row.text}</strong><time>{timecode(row.startFrame, project.canvas.fps)}</time></button>) : <p>导入 SRT 后，这里会按段落显示导航。</p>}</div>}
        </section>

        <div className="splitter splitter-row" role="separator" aria-label="调整章节导航高度" onPointerDown={(event) => beginLayoutResize('chapterHeight', event)} onDoubleClick={resetLayout} />

        <details className="console-panel inspector-section"><summary><span>运行控制台</span><b>{consoleEntries.length}</b></summary><div className="console-toolbar"><button onClick={() => setConsoleEntries([])}>清空记录</button></div><div className="console-output">{consoleEntries.length ? consoleEntries.map((entry, index) => <div key={`${entry.time}-${index}`} className={`console-line ${entry.level}`}><time>{entry.time}</time><span>{entry.message}</span></div>) : <div className="console-empty">等待运行事件…</div>}</div></details>

        <div className="splitter splitter-row" role="separator" aria-label="调整运行控制台高度" onPointerDown={(event) => beginLayoutResize('consoleHeight', event)} onDoubleClick={resetLayout} />

        <section className="inspector-section properties-panel">
          <div className="section-heading"><span>属性检查器</span><b>{selectedCardIds.length > 1 ? `${selectedCardIds.length} 张` : selectedCard?.cardType ?? '未选择'}</b></div>
          {selectedSegment && <section className="segment-inspector"><h3>段落场景</h3><strong>{selectedSegment.label ?? selectedSegment.groupId ?? selectedSegment.segmentId}</strong><p>{selectedSegment.text}</p><div><button onClick={() => moveSelectedSegment(-15)}>← 15帧</button><button onClick={() => moveSelectedSegment(15)}>15帧 →</button></div></section>}
          {selectedCard && selectedDefinition ? <>
            <section className="design-toolbar">
              <TemplatePicker catalog={catalog} project={project} card={selectedCard} currentName={selectedDefinition.displayName} onSelect={cardType=>void run(async()=>{const next=await request<MotionProject>(`/api/projects/${project.projectId}/card-design`,{method:'POST',body:JSON.stringify({expectedVersion:project.version,cardId:selectedCard.cardId,cardType})});setProject(next);setNotice('样式已切换，原设计可恢复');})}/>
              <div className="design-actions"><button onClick={()=>setHtmlDesignOpen(true)}>AI / HTML 重新设计</button><button disabled={!Array.isArray(selectedCard.content.designHistory)||!selectedCard.content.designHistory.length} onClick={()=>run(async()=>setProject(await request<MotionProject>(`/api/projects/${project.projectId}/card-design`,{method:'POST',body:JSON.stringify({expectedVersion:project.version,cardId:selectedCard.cardId,restore:true})})))}>恢复上一版设计</button></div>
            </section>
            <button className="save-asset-button" onClick={saveSelectedAsset}>☆ 保存为预设</button><div className="selected-name"><strong>{selectedDefinition.displayName}</strong><small>{selectedDefinition.classification?.level1} / {selectedDefinition.classification?.level2} / {selectedDefinition.classification?.level3}</small></div>
            {groups.map((group) => {
              const fields = selectedDefinition.parameterSchema.filter((field) => field.group === group);
              if (!fields.length) return null;
              const paletteFields = group === 'style' ? fields.filter(field => ['appearance.accent', 'appearance.background', 'appearance.ink', 'appearance.transparent'].includes(field.path)) : [];
              const renderField = (field: CardParameterDefinition) => <Field key={field.key} field={field} value={getPath(selectedCard, field.path)??(selectedCard.cardType==='html-motion'?(selectedCard.content.htmlSpec as any)?.fields?.find((f:any)=>f.key===field.key)?.default:undefined)} onChange={(value) => updateLocalCard(field.path, value)} />;
              return <section className="field-group" key={group}><h3>{groupNames[group]}</h3><div className="field-grid">{paletteFields.length > 0 && <div className="palette-row">{paletteFields.map(renderField)}</div>}{fields.filter(field => !paletteFields.includes(field)).map(renderField)}</div></section>;
            })}

            <div className="inspector-actions"><button onClick={saveCard}>保存修改</button><button className="danger" onClick={deleteCard}>删除</button></div>
          </> : <div className="empty">从左侧添加卡片，或在时间轴选择卡片。</div>}
          <section className="project-lint"><h3>项目 Lint <b>{lintIssues.length}</b></h3>{lintIssues.length ? lintIssues.map((issue) => <button key={`${issue.code}-${issue.cardId ?? ''}`} onClick={() => { if (issue.cardId) { setSelectedCardId(issue.cardId); setSelectedCardIds([issue.cardId]); } }}><strong>{issue.code}</strong><span>{issue.message}</span></button>) : <p>没有发现问题。项目满足当前机器规则。</p>}</section>
        </section>
      </aside>
    </section>

    <section className="timeline panel">
      <div className="timeline-resizer" role="separator" aria-label="调整时间轴高度" onPointerDown={(event) => beginLayoutResize('timelineHeight', event)} onDoubleClick={resetLayout}><i /></div>
      <div className="timeline-toolbar"><strong>{timelineView === 'rough' ? '粗稿时间轴' : '动效时间轴'}</strong><div className="timeline-tabs"><button className={timelineView === 'rough' ? 'active' : ''} onClick={() => setTimelineView('rough')}>粗稿时间轴</button><button className={timelineView === 'effects' ? 'active' : ''} onClick={() => setTimelineView('effects')}>动效时间轴</button></div><span>{timelineView === 'rough' ? '粗剪主轨道 · 删除/可恢复' : `${visualTracks.length + 1} 条可视轨道`}</span><span>{selectedCardIds.length+selectedRoughRanges.length ? `已选 ${selectedCardIds.length+selectedRoughRanges.length} 个素材` : '点击素材后拖动两端调整长度'}</span><div className="timeline-actions"><button className={`snap-action ${snapEnabled ? 'active' : ''}`} onClick={() => { const next = !snapEnabled; setSnapEnabled(next); localStorage.setItem('motion-master-snap-v01', next ? 'on' : 'off'); setNotice(next ? '自动吸附已开启' : '自动吸附已关闭'); }} title="将卡片、字幕和视频切点吸附到相邻边界">⌁ 吸附 {snapEnabled ? '开' : '关'}</button><button className="undo-action" onClick={undo} disabled={!undoRef.current.length} title="撤回（Ctrl+Z）">↶ 撤回</button><button className="split-action" onClick={splitAtPlayhead} title="在播放头位置切开所选卡片或视频保留片段">✂ 切分</button>{timelineView === 'rough' && project.editPlan && <><button onClick={renderRoughCut}>生成粗剪</button><button onClick={approveEdit}>批准粗剪</button></>}<button onClick={resetLayout}>重置布局</button></div><TimelineZoom viewKey={`${project.projectId}:${timelineView}`} /></div>
      <TimelineRuler frame={timelineView === 'effects' ? editedFrameForSource(currentFrame) : currentFrame} durationFrames={timelineView === 'effects' ? project.canvas.durationFrames : sourceDurationFrames} fps={project.canvas.fps} viewKey={`${project.projectId}:${timelineView}`} onSeek={(frame) => seek(timelineView === 'effects' ? sourceFrameForEdited(frame) : frame)} />
      <div className="timeline-scroll" onPointerDown={beginMarqueeSelection} onPointerMove={updateMarqueeSelection} onPointerUp={finishMarqueeSelection} onPointerCancel={() => setMarqueeSelection(null)}>
        {timelineView === 'rough' && project.editPlan && <div className="track-row rough-row"><div className="track-name"><strong>粗剪主轨道</strong><small>保留素材</small><div className="track-controls"><button title="隐藏轨道" onClick={() => setHiddenTracks((current) => current.includes("video-base") ? current.filter((id) => id !== "video-base") : [...current, "video-base"])}>◉</button><button title="关闭原声" onClick={toggleMute}>{project.media.muted ? "🔇" : "🔊"}</button><button title="删除轨道" onClick={() => { setHiddenTracks((current) => [...new Set([...current, "video-base"])]); setNotice("粗剪视频轨道已隐藏，可重新显示"); }}>⌫</button></div></div><div className="track-lane rough-lane" data-track-id="video-base">{project.editPlan.keptRanges.map((range, index) => <button key={`${range.startFrame}-${range.endFrame}`} data-range-index={index} aria-pressed={selectedRoughRanges.includes(index)} className={`rough-block ${selectedRoughRanges.includes(index) ? 'selected' : ''}`} style={{left: `${range.startFrame / sourceDurationFrames * 100}%`, width: `${(range.endFrame - range.startFrame) / sourceDurationFrames * 100}%`}} onPointerDown={(event) => selectVideoRange(event,index)} onClick={(event) => { event.stopPropagation(); setNotice(`已选中粗剪片段 ${index + 1}`); }} title="点击选中素材；拖动边缘调整长度"> <i className="material-edge material-edge-left" onPointerDown={(event) => trimVideoRange(event, range, 'start')} /><span>片段 {index + 1}</span><i className="material-edge material-edge-right" onPointerDown={(event) => trimVideoRange(event, range, 'end')} /></button>)}</div></div>}
        {timelineView === 'rough' && project.editPlan && <div className="track-row deleted-row"><div className="track-name"><strong>删除 / 可恢复</strong><small>双击恢复</small><div className="track-controls"><button title="隐藏轨道" onClick={() => setHiddenTracks((current) => current.includes("deleted") ? current.filter((id) => id !== "deleted") : [...current, "deleted"])}>◉</button><button title="删除轨道" onClick={() => setHiddenTracks((current) => [...new Set([...current, "deleted"])] )}>⌫</button></div></div><div className="track-lane deleted-lane">{project.editPlan.removedRanges.map((range) => <button key={`${range.startFrame}-${range.endFrame}`} className="deleted-block" style={{left: `${range.startFrame / sourceDurationFrames * 100}%`, width: `${(range.endFrame - range.startFrame) / sourceDurationFrames * 100}%`}} onPointerDown={(event) => event.stopPropagation()} onDoubleClick={() => restoreRemovedRange(range)} title={`${project.transcript?.cutDecisions.filter(c=>c.startFrame<range.endFrame&&c.endFrame>range.startFrame&&c.status==='accepted').map(c=>c.reason??c.type).join('；')??''} · 双击恢复`}>{timecode(range.startFrame, project.canvas.fps)} - {timecode(range.endFrame, project.canvas.fps)}</button>)}</div></div>}
        {timelineView === 'effects' && subtitleRows.length > 0 && <div className="track-row segment-row"><div className="track-name"><strong>字幕轨道</strong><small>{subtitleRows.length} 条字幕</small></div><div className="track-lane">{subtitleRows.map((row, index) => <button key={`${row.startFrame}-${index}`} className={`segment-block ${currentFrame >= row.startFrame && currentFrame < row.endFrame ? 'selected' : ''}`} style={sourceSpanStyle(row.startFrame, row.endFrame)} onClick={(event) => event.stopPropagation()} title={row.text}><span>{row.text}</span></button>)}</div></div>}
        {timelineView === 'effects' && <div className="track-row effect-primary-row"><div className="track-name"><strong>主轨道</strong><small>{project.editPlan?.removedRanges.length?'粗剪后连续素材':'完整视频素材'}</small></div><div className="track-lane rough-lane">{project.editPlan?.keptRanges.map((range, index) => <button key={`${range.startFrame}-${range.endFrame}`} data-range-index={index} aria-pressed={selectedRoughRanges.includes(index)} className={`rough-block ${selectedRoughRanges.includes(index) ? 'selected' : ''}`} style={editedMainSpanStyle(index, range)} onPointerDown={(event) => selectVideoRange(event,index)} onClick={(event) => { event.stopPropagation(); setNotice(`已选中主轨道片段 ${index + 1}`); }} title="点击选中，拖动两端调整长度"><i className="material-edge material-edge-left" onPointerDown={(event) => trimVideoRange(event, range, 'start')} /><span>{index + 1}</span><i className="material-edge material-edge-right" onPointerDown={(event) => trimVideoRange(event, range, 'end')} /></button>)}</div></div>}
        {timelineView === 'effects' && visualTracks.map(({track, lane, cards}) => <div className="track-row" key={`${track.trackId}-${lane}`}><div className="track-name"><strong>{track.label ?? track.trackId}{track.kind === 'motion' ? ` ${String(lane + 1).padStart(2, '0')}` : ''}</strong><small>{track.kind === 'motion' ? `${cards.length} 张卡片` : track.kind}</small><div className="track-controls"><button title="隐藏轨道" onClick={() => setHiddenTracks((current) => current.includes(track.trackId) ? current.filter((id) => id !== track.trackId) : [...current, track.trackId])}>◉</button><button title="删除轨道" onClick={() => { setHiddenTracks((current) => [...new Set([...current, track.trackId])]); setNotice(`${track.label ?? track.trackId} 已从视图移除`); }}>⌫</button></div></div><div className="track-lane" data-track-id={track.trackId}>{cards.map((card) => { const definition = catalog.find((item) => item.cardType === card.cardType); return <button key={card.cardId} data-card-id={card.cardId} aria-pressed={selectedCardIds.includes(card.cardId)} className={`timeline-card ${selectedCardIds.includes(card.cardId) ? 'selected' : ''} ${timelineDrag?.cardId === card.cardId ? 'dragging' : ''}`} style={editedCardSpanStyle(card.startFrame, card.startFrame + card.durationFrames)} onPointerDown={(event) => startTimelineDrag(event, card, 'move')} onPointerMove={updateTimelineDrag} onPointerUp={finishTimelineDrag} onPointerCancel={cancelTimelineDrag} onClick={(event) => { event.stopPropagation(); setSelectedCardId(card.cardId); setSelectedCardIds((current) => event.ctrlKey ? (current.includes(card.cardId) ? current : [...current, card.cardId]) : [card.cardId]); }} title={`${definition?.displayName ?? card.cardType} · 拖动卡片可移动或跨轨道`}><i className="timeline-handle handle-left" onPointerDown={(event) => startTimelineDrag(event, card, 'resize-start')} /><span>{definition?.displayName ?? card.cardType}</span><i className="timeline-handle handle-right" onPointerDown={(event) => startTimelineDrag(event, card, 'resize-end')} /></button>; })}</div></div>)}
        {marqueeSelection&&<div className="timeline-marquee" style={{left:Math.min(marqueeSelection.startX,marqueeSelection.currentX),top:Math.min(marqueeSelection.startY,marqueeSelection.currentY),width:Math.abs(marqueeSelection.currentX-marqueeSelection.startX),height:Math.abs(marqueeSelection.currentY-marqueeSelection.startY)}} />}
      </div>
    </section>

    {arrangementOpen&&project.motionArrangement&&<MotionArrangementPanel project={project} onClose={()=>setArrangementOpen(false)} agentUrl={`${apiPrefix}/agent.md`}/>}
    {preCutOpen&&<PreCutReview project={project} busy={busy||project.preCut?.status==='running'} onClose={()=>setPreCutOpen(false)} onSeek={frame=>{setPreCutOpen(false);previewDeletedRange({startFrame:frame,endFrame:frame+1});}} onDecision={decideCut} onAnalyze={analyzeAgain} onSemanticExport={exportSemanticTask} onSemanticImport={importSemanticResult} onConfirm={confirmCut} imageBase={`${apiPrefix}/api/projects/${project.projectId}/precut/frame`}/>}
    {htmlDesignOpen&&selectedCard&&<HtmlDesignPanel card={selectedCard} project={project} onClose={()=>setHtmlDesignOpen(false)} onStart={async prompt=>{pushUndo();setProject(await request<MotionProject>(`/api/projects/${project.projectId}/html-design`,{method:'POST',body:JSON.stringify({expectedVersion:project.version,cardId:selectedCard.cardId,prompt,provider:analysisProvider})}));}} onCancel={async()=>setProject(await request<MotionProject>(`/api/projects/${project.projectId}/html-design/cancel`,{method:'POST',body:JSON.stringify({expectedVersion:project.version})}))} onImport={async spec=>{pushUndo();const next=await request<MotionProject>(`/api/projects/${project.projectId}/card-design`,{method:'POST',body:JSON.stringify({expectedVersion:project.version,cardId:selectedCard.cardId,spec})});setProject(next);setNotice('HTML动效已校验并应用');}}/>}
    {settingsOpen&&<AsrSettingsPanel request={request} onClose={()=>setSettingsOpen(false)} onSaved={message=>{setNotice(message);appendConsole('success',message);}}/>}
    {srtOpen && <div className="modal-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setSrtOpen(false); }}>
      <section className="srt-manager" role="dialog" aria-modal="true" aria-label="字幕与 SRT 管理">
        <header><div><strong>字幕 / SRT 管理</strong><span>导入、查看和导出当前项目字幕</span></div><button onClick={() => setSrtOpen(false)}>×</button></header>
        <div className="srt-stats"><span><b>{subtitleRows.length}</b> 条字幕</span><span><b>{project.transcript?.wordCues.length ?? 0}</b> 个逐词时间点</span><span><b>{project.timeline.segments.length}</b> 个段落</span></div>
        <div className="srt-content">
          <section><label>SRT 文本<textarea value={srt} placeholder="在这里粘贴 SRT；导入后将生成字幕段落和动效编排。" onChange={(event) => setSrt(event.target.value)} /></label><div className="srt-actions"><button onClick={() => setSrt(sampleSrt)}>填入示例</button><button onClick={() => setSrt(projectSrt)} disabled={!projectSrt}>载入当前字幕</button><button onClick={exportSrt} disabled={!projectSrt}>导出 SRT</button><button className="primary" disabled={!srt.trim()} onClick={importSrt}>导入并生成编排</button></div></section>
          <section className="subtitle-list"><div className="section-heading"><span>当前项目字幕</span><b>{subtitleRows.length}</b></div>{subtitleRows.length ? subtitleRows.map((row, index) => <div className="subtitle-row" key={`${row.startFrame}-${index}`}><time>{timecode(row.startFrame, project.canvas.fps)}</time><p>{row.text}</p><span>{row.status === 'approved' ? '已审' : '草稿'}</span></div>) : <div className="empty">当前项目还没有字幕。粘贴 SRT 后即可建立字幕与段落。</div>}</section>
        </div>
      </section>
    </div>}
  </main>;
};

const Field = ({field, value, onChange}: {field: CardParameterDefinition; value: unknown; onChange: (value: unknown) => void}) => {
  if (field.control === 'select') return <label>{field.label}<select value={String(value ?? '')} onChange={(event) => onChange(event.target.value)}>{field.options?.map((option) => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}</select></label>;
  if (field.control === 'textarea') return <label className="field-wide">{field.label}<textarea value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} /></label>;
  if (field.control === 'toggle') return <label className="toggle">{field.label}<input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} /></label>;
  if (field.control === 'range') return <label className="field-wide">{field.label}<div className="range"><input type="range" min={field.min} max={field.max} step={field.step} value={Number(value ?? field.min ?? 0)} onChange={(event) => onChange(Number(event.target.value))} /><output>{Number(value ?? 0).toFixed(2)}</output></div></label>;
  if (field.control === 'number') return <label>{field.label}<input type="number" min={field.min} max={field.max} step={field.step} value={Number(value ?? 0)} onChange={(event) => onChange(Number(event.target.value))} /></label>;
  return <label>{field.label}<input value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} /></label>;
};





