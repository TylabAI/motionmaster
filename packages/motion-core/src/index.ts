import {htmlVideoContentError} from '../../motion-schema/src/html-video-validation';
import {htmlMotionSchema,validateHtmlValues} from '../../motion-schema/src/html-motion';
import {appendFile, mkdir, open, readFile, readdir, rename, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {motionProjectSchema, projectIdSchema, type EditRange, type MotionCardInstance, type MotionProject} from '@motion-master/schema';
export {adjustCardTiming, type CardTimingDragMode} from './timing';

export class VersionConflictError extends Error {
  constructor(public readonly expected: number, public readonly actual: number) {
    super(`Version conflict: expected ${expected}, actual ${actual}`);
  }
}

export class ProjectNotFoundError extends Error {}
export type ProjectValidationIssue = {code: string; message: string; cardId?: string; severity?: 'error' | 'warning'};
export type ProjectSummary = Pick<MotionProject, 'projectId' | 'title' | 'version' | 'status' | 'updatedAt'>;

const now = () => new Date().toISOString();
const clone = <T>(value: T): T => structuredClone(value);

export const upgradeProject = (project: MotionProject): MotionProject => {
  const next = clone(project);
  next.schemaVersion = '0.2.0';
  next.editReview = next.editReview ?? {status: 'draft', revision: 0};
  const tracks = new Map(next.timeline.tracks.map((track) => [track.trackId, track]));
  if (!tracks.has('video-base')) next.timeline.tracks.unshift({trackId: 'video-base', kind: 'video', locked: true, label: '口播视频'});
  if (!tracks.has('overlay-main')) next.timeline.tracks.push({trackId: 'overlay-main', kind: 'motion', locked: false, label: '主卡'});
  if (!tracks.has('overlay-ambient')) next.timeline.tracks.push({trackId: 'overlay-ambient', kind: 'motion', locked: false, label: '氛围层'});
  next.timeline.tracks = next.timeline.tracks.map((track) => ({...track, label: track.label ?? (track.trackId === 'video-base' ? '口播视频' : track.trackId === 'overlay-main' ? '主卡' : track.trackId === 'overlay-ambient' ? '氛围层' : track.trackId)}));
  next.timeline.cards = next.timeline.cards.map((card) => card.cardType === 'ambient-wash' ? {...card, trackId: 'overlay-ambient', appearance: {...card.appearance, accentRole: card.appearance.accentRole ?? 'cyan'}} : {...card, appearance: {...card.appearance, accentRole: card.appearance.accentRole ?? 'coral'}, layout: {side: 'left', scale: 1, ...card.layout}});
  return motionProjectSchema.parse(next);
};

export const createProject = (input: {projectId: string; title: string; width?: number; height?: number; fps?: number; durationFrames?: number}): MotionProject => {
  const timestamp = now();
  return motionProjectSchema.parse({
    schemaVersion: '0.2.0',
    projectId: input.projectId,
    version: 0,
    title: input.title,
    canvas: {width: input.width ?? 1920, height: input.height ?? 1080, fps: input.fps ?? 30, durationFrames: input.durationFrames ?? 5400},
    theme: 'dark',
    skin: 'glass',
    style: 'hud',
    font: 'Inter, Microsoft YaHei, sans-serif',
    lintOff: [],
    editReview: {status: 'draft', revision: 0},
    media: {fit: 'cover', scale: 1, offsetX: 0, offsetY: 0, opacity: 1, muted: true},
    styleProfileId: 'obsidian-hud',
    status: 'editable',
    createdAt: timestamp,
    updatedAt: timestamp,
    timeline: {
      timelineId: 'timeline-main',
      tracks: [
        {trackId: 'video-base', kind: 'video', locked: true, label: '口播视频'},
        {trackId: 'overlay-main', kind: 'motion', locked: false, label: '主卡'},
        {trackId: 'overlay-ambient', kind: 'motion', locked: false, label: '氛围层'},
      ],
      segments: [],
      cards: [],
    },
  });
};

export const createSampleProject = (): MotionProject => createProject({projectId: 'sample-project', title: '口播动效示例', durationFrames: 5400});

export const moveSegmentGroup = (project: MotionProject, groupId: string, requestedDeltaFrames: number): number => {
  const segments = project.timeline.segments.filter((segment) => (segment.groupId ?? segment.segmentId) === groupId);
  if (!segments.length) throw new Error(`Segment group not found: ${groupId}`);
  const segmentIds = new Set(segments.map((segment) => segment.segmentId));
  const cards = project.timeline.cards.filter((card) => card.seg === groupId || card.sourceSegmentIds.some((id) => segmentIds.has(id)));
  const starts = [...segments.map((segment) => segment.startFrame), ...cards.map((card) => card.startFrame)];
  const ends = [...segments.map((segment) => segment.endFrame), ...cards.map((card) => card.startFrame + card.durationFrames)];
  const deltaFrames = Math.max(-Math.min(...starts), Math.min(requestedDeltaFrames, project.canvas.durationFrames - Math.max(...ends)));
  for (const segment of segments) { segment.startFrame += deltaFrames; segment.endFrame += deltaFrames; }
  for (const card of cards) card.startFrame += deltaFrames;
  return deltaFrames;
};

export {applyEditPlan} from './edit-plan';

export const validateProject = (project: MotionProject): ProjectValidationIssue[] => {
  const result = motionProjectSchema.safeParse(project);
  if (!result.success) return result.error.issues.map((issue) => ({code: 'SCHEMA_INVALID', message: issue.message, severity: 'error'}));
  const issues: ProjectValidationIssue[] = [];
  const cardIds = new Set<string>();
  const trackIds = new Set(project.timeline.tracks.map((track) => track.trackId));
  const primaryCards = project.timeline.cards.filter((card) => card.trackId === 'overlay-main').sort((a, b) => a.startFrame - b.startFrame);
  for (const card of project.timeline.cards) {
    if (cardIds.has(card.cardId)) issues.push({code: 'CARD_ID_DUPLICATE', cardId: card.cardId, message: 'Card ID is duplicated', severity: 'error'});
    cardIds.add(card.cardId);
    if (!trackIds.has(card.trackId)) issues.push({code: 'TRACK_NOT_FOUND', cardId: card.cardId, message: `Track not found: ${card.trackId}`, severity: 'error'});
    if (card.startFrame + card.durationFrames > project.canvas.durationFrames) issues.push({code: 'CARD_OUTSIDE_TIMELINE', cardId: card.cardId, message: 'Card exceeds project duration', severity: 'error'});
    if (!project.lintOff.includes('TEXT_TOO_LONG') && String(card.content.title ?? '').length > 48) issues.push({code: 'TEXT_TOO_LONG', cardId: card.cardId, message: '卡片主文案超过 48 个字符，建议拆分或精简', severity: 'warning'});
    if (!card.cardType.startsWith('hv-') && !project.lintOff.includes('FREE_HEX_COLOR') && typeof card.appearance.accent === 'string' && String(card.appearance.accent).startsWith('#')) issues.push({code: 'FREE_HEX_COLOR', cardId: card.cardId, message: '请使用 accentRole 语义色，不要在卡片中写自由十六进制颜色', severity: 'warning'});
  }
  for (let index = 1; index < primaryCards.length; index += 1) {
    const previous = primaryCards[index - 1];
    const current = primaryCards[index];
    if (!project.lintOff.includes('CARD_TOO_FREQUENT') && current.startFrame - previous.startFrame < project.canvas.fps * 6) issues.push({code: 'CARD_TOO_FREQUENT', cardId: current.cardId, message: '主卡出现过密，建议至少间隔 6 秒', severity: 'warning'});
  }
  if (!project.lintOff.includes('VIDEO_MUST_COVER') && project.media.fit !== 'cover') issues.push({code: 'VIDEO_MUST_COVER', message: '口播视频建议使用 cover 裁剪，避免画面拉伸或黑边', severity: 'warning'});
  for (const segment of project.timeline.segments) {
    if (segment.endFrame <= segment.startFrame) issues.push({code: 'SEGMENT_RANGE_INVALID', message: `Invalid subtitle segment: ${segment.segmentId}`, severity: 'error'});
  }
  return issues;
};

export class MotionProjectStore {
  private project: MotionProject;
  constructor(initialProject: MotionProject = createSampleProject()) { this.project = upgradeProject(motionProjectSchema.parse(clone(initialProject))); }
  get(): MotionProject { return clone(this.project); }
  addCard(card: MotionCardInstance, expectedVersion: number): MotionProject { return this.mutate(expectedVersion, (project) => { if (project.timeline.cards.some((item) => item.cardId === card.cardId)) throw new Error(`Card already exists: ${card.cardId}`); project.timeline.cards.push(clone(card)); }); }
  updateCard(cardId: string, patch: Partial<MotionCardInstance>, expectedVersion: number): MotionProject { return this.mutate(expectedVersion, (project) => { const index = project.timeline.cards.findIndex((item) => item.cardId === cardId); if (index === -1) throw new Error(`Card not found: ${cardId}`); project.timeline.cards[index] = {...project.timeline.cards[index], ...clone(patch), cardId}; }); }
  removeCard(cardId: string, expectedVersion: number): MotionProject { return this.mutate(expectedVersion, (project) => { const next = project.timeline.cards.filter((item) => item.cardId !== cardId); if (next.length === project.timeline.cards.length) throw new Error(`Card not found: ${cardId}`); project.timeline.cards = next; }); }
  replaceTimeline(timeline: MotionProject['timeline'], expectedVersion: number): MotionProject { return this.mutate(expectedVersion, (project) => { project.timeline = clone(timeline); project.status = 'project_compiled'; }); }
  applyStyle(styleProfileId: string, expectedVersion: number): MotionProject { return this.mutate(expectedVersion, (project) => { project.styleProfileId = styleProfileId; }); }
  private mutate(expectedVersion: number, apply: (project: MotionProject) => void): MotionProject { if (expectedVersion !== this.project.version) throw new VersionConflictError(expectedVersion, this.project.version); const next = clone(this.project); apply(next); next.version += 1; next.updatedAt = now(); this.project = motionProjectSchema.parse(next); return this.get(); }
}

export class FileProjectRepository {
  constructor(public readonly rootDir: string) {}

  async initialize(): Promise<void> { await mkdir(this.rootDir, {recursive: true}); }

  async list(): Promise<ProjectSummary[]> {
    await this.initialize();
    const entries = await readdir(this.rootDir, {withFileTypes: true});
    const projects: ProjectSummary[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || !projectIdSchema.safeParse(entry.name).success) continue;
      try { const project = await this.get(entry.name); projects.push({projectId: project.projectId, title: project.title, version: project.version, status: project.status, updatedAt: project.updatedAt}); } catch {}
    }
    return projects.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  }

  async create(project: MotionProject): Promise<MotionProject> {
    const parsed = motionProjectSchema.parse(project);
    const file = this.projectFile(parsed.projectId);
    try { await readFile(file, 'utf8'); throw new Error(`Project already exists: ${parsed.projectId}`); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    await this.writeProject(parsed, 'project.created', {title: parsed.title});
    return clone(parsed);
  }

  async get(projectId: string, includeDeleted=false): Promise<MotionProject> {
    const file = this.projectFile(projectId);
    try { const project=upgradeProject(motionProjectSchema.parse(JSON.parse(await readFile(file, 'utf8'))));if(project.deletedAt&&!includeDeleted)throw new ProjectNotFoundError('项目已移入回收站');return project; } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new ProjectNotFoundError(`Project not found: ${projectId}`); throw error; }
  }

  async trashList() {
    await this.initialize();const items:Array<ProjectSummary&{deletedAt:string}>=[];
    for(const entry of await readdir(this.rootDir,{withFileTypes:true})){
      if(!entry.isDirectory()||!projectIdSchema.safeParse(entry.name).success)continue;
      try{const p=await this.get(entry.name,true);if(p.deletedAt)items.push({projectId:p.projectId,title:p.title,version:p.version,status:p.status,updatedAt:p.updatedAt,deletedAt:p.deletedAt});}catch{}
    }
    return items.sort((a,b)=>b.deletedAt.localeCompare(a.deletedAt));
  }

  async softDelete(projectId:string,expectedVersion:number){
    return this.mutate(projectId,expectedVersion,'project.deleted',next=>{
      if(next.preCut?.status==='running'||next.motionArrangement?.status==='running')throw new Error('项目正在分析，请等待任务结束后再删除');
      next.deletedAt=now();
    });
  }

  async restore(projectId:string,expectedVersion:number){
    return this.withProjectLock(projectId,async()=>{
      const p=await this.get(projectId,true);
      if(p.version!==expectedVersion)throw new VersionConflictError(expectedVersion,p.version);
      if(!p.deletedAt)throw new Error('项目不在回收站');
      delete p.deletedAt;p.version++;p.updatedAt=now();
      await this.writeProject(p,'project.restored',{});return clone(p);
    });
  }

  async mutate(projectId: string, expectedVersion: number, event: string, apply: (project: MotionProject) => void, details: Record<string, unknown> = {}): Promise<MotionProject> {
    return this.withProjectLock(projectId, async () => {
      const project = await this.get(projectId);
      if (project.version !== expectedVersion) throw new VersionConflictError(expectedVersion, project.version);
      const next = clone(project);
      apply(next);
      // A deliberate timing drag takes ownership away from automatic word timing.
      if(['card.updated','segment.moved','timeline.plan_applied'].includes(event))for(const c of next.timeline.cards){const old=project.timeline.cards.find(o=>o.cardId===c.cardId);if(c.autoScene&&old&&(c.startFrame!==old.startFrame||c.durationFrames!==old.durationFrames))c.autoScene.followWords=false;}
      next.version += 1;
      next.updatedAt = now();
      for(const c of next.timeline.cards){const error=htmlVideoContentError(c.cardType,c.content);if(error)throw Error(error);}
      for(const c of next.timeline.cards)if(c.cardType==='html-motion'){const spec=htmlMotionSchema.parse(c.content.htmlSpec);validateHtmlValues(spec,c.content.htmlValues);}
      const parsed = motionProjectSchema.parse(next);
      const issues = validateProject(parsed).filter((issue) => issue.severity !== 'warning');
      if (issues.length) throw new Error(`Project validation failed: ${issues.map((issue) => issue.code).join(', ')}`);
      await this.writeProject(parsed, event, details);
      return clone(parsed);
    });
  }

  async history(projectId: string, limit = 100): Promise<unknown[]> {
    const file = path.join(this.projectDir(projectId), 'history', 'events.jsonl');
    try { const lines = (await readFile(file, 'utf8')).trim().split(/\r?\n/).filter(Boolean); return lines.slice(-Math.max(1, Math.min(limit, 500))).map((line) => JSON.parse(line)); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  }

  projectDir(projectId: string): string { projectIdSchema.parse(projectId); const resolved = path.resolve(this.rootDir, projectId); const root = path.resolve(this.rootDir) + path.sep; if (!resolved.startsWith(root)) throw new Error('Project path escapes data directory'); return resolved; }
  private projectFile(projectId: string): string { return path.join(this.projectDir(projectId), 'project.motion.json'); }

  private async withProjectLock<T>(projectId: string, action: () => Promise<T>): Promise<T> {
    const lockFile = path.join(this.projectDir(projectId), '.write.lock');
    let handle;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try { handle = await open(lockFile, 'wx'); break; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; await new Promise((resolve) => setTimeout(resolve, 25)); }
    }
    if (!handle) throw new Error(`Project write lock timed out: ${projectId}`);
    try { return await action(); } finally { await handle.close(); await unlink(lockFile).catch(() => undefined); }
  }

  private async writeProject(project: MotionProject, event: string, details: Record<string, unknown>): Promise<void> {
    const projectDir = this.projectDir(project.projectId);
    const historyDir = path.join(projectDir, 'history');
    await mkdir(historyDir, {recursive: true});
    await mkdir(path.join(projectDir, 'assets'), {recursive: true});
    await mkdir(path.join(projectDir, 'renders'), {recursive: true});
    const target = this.projectFile(project.projectId);
    const temporary = `${target}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(project, null, 2)}\n`, 'utf8');
    // Windows readers may briefly hold the destination without delete sharing.
    // Retry the atomic replacement; never remove the saved project first.
    for (let attempt = 0; ; attempt += 1) {
      try {
        await rename(temporary, target);
        break;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (attempt >= 8 || !['EPERM', 'EACCES', 'EBUSY'].includes(code ?? '')) throw error;
        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
      }
    }
    await appendFile(path.join(historyDir, 'events.jsonl'), `${JSON.stringify({at: now(), event, version: project.version, details})}\n`, 'utf8');
  }
}

export const defaultDataDir = () => path.resolve(process.env.MOTION_MASTER_DATA_DIR ?? path.join(process.cwd(), 'projects'));
