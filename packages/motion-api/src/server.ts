import {htmlDesignService} from './html-design';
import {htmlDesignTask,applyHtmlDesign,restyleCard,restoreDesign,replaceHtmlCard} from '../../motion-core/src/html-design';
import {htmlMotionInstructions,htmlMotionSchema} from '../../motion-schema/src/html-motion';
import {z} from 'zod';
import {motionArrangementService,motionTask,submitMotionResult} from './motion-arrangement';
import {randomUUID} from 'node:crypto';
import {inspectMedia} from '../../semantic-cut/src/media';
import {preCutService} from './precut';
import {semanticReviewRequest,importSemanticReview} from '../../motion-core/src/semantic-review';
import {confirmPreCut} from '../../motion-core/src/precut-confirm';
import {agentProtocol,agentTask,finishAgentReview,resultSchema,agentInstructions} from '../../motion-core/src/agent-protocol';
import {complement,normalizeRanges} from '../../semantic-cut/src/index';
import {createReadStream} from 'node:fs';
import {mkdir, readdir, stat, writeFile, readFile} from 'node:fs/promises';
import {createServer, type IncomingMessage, type ServerResponse, type Server} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {starterCardDefinitions} from '@motion-master/cards-starter';
import {compileSrtMotionPlan} from '@motion-master/compiler';
import {applyEditPlan, createProject, defaultDataDir, FileProjectRepository, moveSegmentGroup, productionBrief, productionCatalog, ProjectNotFoundError, upgradeProject, validateProject, VersionConflictError} from '@motion-master/core';
import {findRoughCut, renderProjectAlphaMov, renderProjectMp4, renderProjectRoughCut, renderProjectStills} from '@motion-master/render';
import {motionProjectSchema, productionProfileSchema, type MotionCardInstance} from '@motion-master/schema';
import {asrSettingsStore} from './asr-settings';
import {asrModelService} from './asr-models';

const port = Number(process.env.PIPCLAW_EXTENSION_PORT ?? process.env.MOTION_MASTER_PORT ?? 4180);
const prefix = process.env.PIPCLAW_EXTENSION_TOKEN ? `/${process.env.PIPCLAW_EXTENSION_TOKEN}` : '';
const extensionRoot = process.env.PIPCLAW_EXTENSION_ROOT;
if(process.env.PIPCLAW_EXTENSION_DATA) process.env.MOTION_MASTER_DATA_DIR=process.env.PIPCLAW_EXTENSION_DATA;
const repository = new FileProjectRepository(defaultDataDir());
const asrSettings=asrSettingsStore(repository.rootDir);
const runtimeRoot=path.resolve(process.env.MOTION_MASTER_RUNTIME_ROOT??(extensionRoot ? path.join(extensionRoot,'runtime') : path.resolve('runtime')));
const asrModels=asrModelService(runtimeRoot);
const htmlDesign=htmlDesignService(repository);
const preCut = preCutService(repository,runtimeRoot,asrSettings.read);
const arrangement=motionArrangementService(repository,runtimeRoot);
const studioDist = extensionRoot ? path.join(extensionRoot,'ui') : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../apps/studio-web/dist');

const send = (response: ServerResponse, status: number, value: unknown) => {
  response.writeHead(status, {'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*'});
  response.end(JSON.stringify(value));
};

const body = async (request: IncomingMessage): Promise<Record<string, unknown>> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
};

const rawBody = async (request: IncomingMessage): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
};

const streamMedia = async (request: IncomingMessage, response: ServerResponse, filePath: string, mimeType: string) => {
  const info = await stat(filePath);
  const range = request.headers.range;
  if (!range) { response.writeHead(200, {'content-type': mimeType, 'content-length': info.size, 'cache-control': 'no-store', 'accept-ranges': 'bytes'}); return createReadStream(filePath).pipe(response); }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) { response.writeHead(416, {'content-range': `bytes */${info.size}`}); return response.end(); }
  const start = match[1] ? Number(match[1]) : Math.max(0, info.size - Number(match[2] || 0));
  const end = match[1] && match[2] ? Number(match[2]) : info.size - 1;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= info.size) { response.writeHead(416, {'content-range': `bytes */${info.size}`}); return response.end(); }
  const boundedEnd = Math.min(end, info.size - 1);
  response.writeHead(206, {'content-type': mimeType, 'content-length': boundedEnd - start + 1, 'content-range': `bytes ${start}-${boundedEnd}/${info.size}`, 'cache-control': 'no-store', 'accept-ranges': 'bytes'});
  return createReadStream(filePath, {start, end: boundedEnd}).pipe(response);
};

const safeExtension = (fileName: string, mimeType: string) => {
  const extension = path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, '');
  if (extension && extension.length <= 8) return extension;
  if (mimeType.includes('webm')) return '.webm';
  if (mimeType.includes('quicktime')) return '.mov';
  return '.mp4';
};

const routeApi = async (request: IncomingMessage, response: ServerResponse, pathname: string) => {
  const method = request.method ?? 'GET';
  if (method === 'OPTIONS') return send(response, 204, {});
  if(pathname==='/api/agent/protocol'&&method==='GET')return send(response,200,agentProtocol(prefix));
  if(pathname==='/api/agent/result-schema'&&method==='GET')return send(response,200,resultSchema());
  if(pathname==='/api/agent/tasks'&&method==='GET'){
    const tasks=[];
    for(const summary of await repository.list()){try{const p=await repository.get(summary.projectId);if(p.htmlDesign?.status==='awaiting-agent')tasks.push({kind:'html-design',projectId:p.projectId,title:p.title,jobId:p.htmlDesign.jobId,version:p.version,taskUrl:`${prefix}/api/projects/${p.projectId}/html-design/task`});if(p.motionArrangement?.status==='awaiting-agent')tasks.push({kind:'motion-arrangement',projectId:p.projectId,title:p.title,jobId:p.motionArrangement.jobId,version:p.version,taskUrl:`${prefix}/api/projects/${p.projectId}/motion-arrangement/task`});if(p.preCut?.status==='awaiting-agent'&&p.preCutDraft)tasks.push({projectId:p.projectId,title:p.title,jobId:p.preCutDraft.jobId,version:p.version,taskUrl:`${prefix}/api/projects/${p.projectId}/precut/agent-task`});}catch{}}
    return send(response,200,{protocol:'motion-master-agent/1',tasks});
  }
  if(pathname==='/api/html-motion/protocol')return send(response,200,{format:'motion-html-design@1',instructions:htmlMotionInstructions,specSchema:z.toJSONSchema(htmlMotionSchema,{io:'output'}),start:`${prefix}/api/projects/{id}/html-design`,task:`${prefix}/api/projects/{id}/html-design/task`,submit:`${prefix}/api/projects/{id}/html-design/result`});
  if(pathname==='/api/trash'&&method==='GET')return send(response,200,await repository.trashList());
  if (pathname === '/api/system') return send(response, 200, {version: '1.7.0-production-workflow', dataDir: repository.rootDir, capabilities: {productionProfiles:true,brandProfiles:true,sceneRecipes:true,multiAspectTargets:true,qualityGates:true,configurableAsr:true,managedAsrModels:true,requiredWordTimestamps:true,defaultAsrModel:'large-v3-turbo',htmlMotionBridge: true, htmlVideoTemplates: 23, editableHtmlFields: true, restorableCardDesign: true, automaticPreCut: false, semanticMotionArrangement: true, wordBoundScenes: true, agentMotionProtocol: true, manualPreCut: true, recoverableCuts: true, projectEditing: true, srtImport: true, timelineEditing: true, schemaDrivenCards: true, realVideoPreview: true, jsonRoundTrip: true, lint: true, stillRender: true, mp4Export: true, alphaExport: true}});
  if(pathname==='/api/production/recipes'&&method==='GET')return send(response,200,productionCatalog());
  if(pathname==='/api/settings/asr'&&method==='GET')return send(response,200,await asrSettings.get());
  if(pathname==='/api/settings/asr'&&method==='PATCH')return send(response,200,await asrSettings.update(await body(request)));
  if(pathname==='/api/settings/asr/models'&&method==='GET')return send(response,200,{models:await asrModels.list()});
  if(pathname==='/api/settings/asr/models/download'&&method==='POST')return send(response,202,await asrModels.download(await body(request)));
  if (pathname === '/api/cards') return send(response, 200, starterCardDefinitions);
  if (pathname === '/api/projects' && method === 'GET') return send(response, 200, await repository.list());
  if (pathname === '/api/projects' && method === 'POST') {
    const input = await body(request);
    return send(response, 201, await repository.create(createProject({projectId: String(input.projectId ?? ''), title: String(input.title ?? ''), durationFrames: Number(input.durationFrames ?? 5400), width: Number(input.width ?? 1920), height: Number(input.height ?? 1080),productionProfile:input.productionProfile?productionProfileSchema.parse(input.productionProfile):undefined})));
  }
  const match = /^\/api\/projects\/([^/]+)(?:\/(.*))?$/.exec(pathname);
  if (!match) return send(response, 404, {error: 'Route not found'});
  const projectId = decodeURIComponent(match[1]);
  const action = match[2] ?? '';
  if (!action && method === 'GET') return send(response, 200, await repository.get(projectId));
  if(action==='production-brief'&&method==='GET')return send(response,200,productionBrief(await repository.get(projectId)));
  if(action==='profile'&&method==='PATCH'){
    const input=await body(request),profile=productionProfileSchema.parse(input.profile);
    return send(response,200,await repository.mutate(projectId,Number(input.expectedVersion),'production.profile_updated',next=>{next.productionProfile=profile;},{mode:profile.mode,narrativeRecipe:profile.narrativeRecipe,targetAspectRatios:profile.targetAspectRatios}));
  }
  if(!action&&method==='DELETE'){const input=await body(request);await repository.softDelete(projectId,Number(input.expectedVersion));return send(response,200,{projectId,deleted:true,recoverable:true});}
  if(action==='html-design'&&method==='POST'){const input=await body(request);if(!['codex','external'].includes(String(input.provider)))throw Error('无效驱动');return send(response,202,await htmlDesign.start(projectId,Number(input.expectedVersion),String(input.cardId),String(input.prompt??''),input.provider as 'codex'|'external'));}
  if(action==='html-design'&&method==='GET')return send(response,200,await htmlDesign.status(projectId));
  if(action==='html-design/task'&&method==='GET')return send(response,200,htmlDesignTask(await repository.get(projectId)));
  if(action==='html-design/result'&&method==='POST'){const input=await body(request);return send(response,200,await repository.mutate(projectId,Number(input.expectedVersion),'html.design_applied',next=>applyHtmlDesign(next,input.result)));}
  if(action==='html-design/cancel'&&method==='POST'){const input=await body(request);return send(response,200,await repository.mutate(projectId,Number(input.expectedVersion),'html.design_cancelled',next=>{if(next.htmlDesign?.status!=='awaiting-agent')throw Error('仅可取消等待外部Agent的任务');next.htmlDesign.status='failed';next.htmlDesign.stage='已取消，原卡片保留';}));}
  if(action==='card-design'&&method==='POST'){const input=await body(request);return send(response,200,await repository.mutate(projectId,Number(input.expectedVersion),'card.design_changed',next=>{if(input.spec){const c=next.timeline.cards.find(c=>c.cardId===String(input.cardId));if(!c)throw Error('卡片不存在');replaceHtmlCard(c,input.spec);}else if(input.restore===true)restoreDesign(next,String(input.cardId));else restyleCard(next,String(input.cardId),String(input.cardType));}));}
  if(action==='motion-arrangement'&&method==='POST'){const input=await body(request);if(input.provider!==undefined&&!['codex','external'].includes(String(input.provider)))throw new Error('无效分析驱动');return send(response,202,await arrangement.start(projectId,Number(input.expectedVersion),input.provider==='external'?'external':'codex'));}
  if(action==='motion-arrangement'&&method==='GET')return send(response,200,await arrangement.status(projectId));
  if(action==='motion-arrangement/task'&&method==='GET')return send(response,200,motionTask(await repository.get(projectId),prefix));
  if(action==='motion-arrangement/result'&&method==='POST'){const input=await body(request);return send(response,200,await repository.mutate(projectId,Number(input.expectedVersion),'motion.arranged',next=>{submitMotionResult(next,String(input.jobId),input.result);}));}
  if(action.startsWith('motion-arrangement/frame/')&&method==='GET'){
   const p=await repository.get(projectId),job=p.motionArrangement,f=job?.frames.find(f=>f.id===action.split('/').at(-1));
   if(!job||!f||!/^[a-zA-Z0-9-]+$/.test(job.jobId)||!/^frame-\d+\.jpg$/.test(f.file))throw new Error('画面不可用');
   return streamMedia(request,response,path.join(repository.projectDir(projectId),'motion-analysis',job.jobId,f.file),'image/jpeg');
  }
  if(action==='restore'&&method==='POST'){const input=await body(request);return send(response,200,await repository.restore(projectId,Number(input.expectedVersion)));}
  if (!action && method === 'PATCH') {
    const input = await body(request);
    const patch = input.patch as Record<string, unknown>;
    const project = await repository.mutate(projectId, Number(input.expectedVersion), 'project.updated', (next) => {
      const candidate = motionProjectSchema.parse({...next, ...patch, projectId: next.projectId, version: next.version});
      Object.assign(next, candidate);
    }, {fields: Object.keys(patch ?? {})});
    return send(response, 200, project);
  }
  if (action === 'history' && method === 'GET') return send(response, 200, await repository.history(projectId));
  if (action === 'workflow/start-editing' && method === 'POST') {
    const input = await body(request);
    const project = await repository.mutate(projectId, Number(input.expectedVersion), 'workflow.editing_started', () => undefined, {source: 'studio-web'});
    return send(response, 200, project);
  }
  if (action === 'diagnostics' && method === 'GET') {
    const project = await repository.get(projectId);
    const assetId = project.media.assetId;
    const assetPath = assetId ? path.join(repository.rootDir, projectId, 'assets', assetId) : null;
    let assetExists = false;
    let assetSizeBytes = 0;
    if (assetPath) { try { const info = await stat(assetPath); assetExists = info.isFile(); assetSizeBytes = info.size; } catch {} }
    return send(response, 200, {projectId, projectVersion: project.version, dataDir: repository.rootDir, media: {videoName: project.media.videoName ?? null, assetId: assetId ?? null, assetExists, assetSizeBytes, mimeType: project.media.mimeType ?? null}});
  }
  if (action === 'media' && method === 'GET') {
    const project = await repository.get(projectId);
    const assetId = project.media.assetId;
    if (!assetId) return send(response, 404, {error: 'Project has no video asset'});
    const assetPath = path.join(repository.rootDir, projectId, 'assets', assetId);
    return streamMedia(request, response, assetPath, project.media.mimeType ?? 'video/mp4');
  }
  if (action === 'rough-cut-render' && method === 'POST') {
    const project = await repository.get(projectId);
    if (!project.media.assetId) return send(response, 400, {error: 'Upload a source video first'});
    const sourcePath = path.join(repository.rootDir, projectId, 'assets', project.media.assetId);
    return send(response, 200, await renderProjectRoughCut(project, path.join(repository.rootDir, projectId), sourcePath));
  }
  if (action === 'rough-cut-media' && method === 'GET') {
    const project = await repository.get(projectId);
    const filePath = await findRoughCut(project,repository.projectDir(projectId));
    return streamMedia(request, response, filePath, 'video/mp4');
  }
  if (action === 'rendered-media' && method === 'GET') {
    const project = await repository.get(projectId);
    const manifestPath = path.join(repository.rootDir, projectId, 'renders', 'latest.json');
    const manifest = JSON.parse((await readFile(manifestPath, 'utf8')).replace(/^\uFEFF/, '')) as {outputPaths?: string[]};
    const output = manifest.outputPaths?.[0];
    if (!output) return send(response, 404, {error: 'No rendered media available'});
    return streamMedia(request, response, output, output.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4');
  }
  if(action === 'precut' && method === 'GET') return send(response,200,await preCut.status(projectId));
  if(action==='precut/agent-task'&&method==='GET')return send(response,200,agentTask(await repository.get(projectId),prefix));
  if(action==='precut/agent-result'&&method==='POST'){
    const input=await body(request);
    return send(response,200,await repository.mutate(projectId,Number(input.expectedVersion),'agent.result_submitted',next=>{finishAgentReview(next,String(input.jobId),input.result);}));
  }
  if(action === 'precut/confirm' && method === 'POST') {
    const input=await body(request);
    const project=await repository.mutate(projectId,Number(input.expectedVersion),'precut.confirmed',next=>{confirmPreCut(next,String(input.jobId),input.cutIds as string[]);});
    return send(response,200,project);
  }
  if(action.startsWith('precut/frame/')&&method==='GET'){
    const project=await repository.get(projectId),draft=project.preCutDraft;
    const frame=draft?.frames.find(f=>f.id===action.slice('precut/frame/'.length));
    if(!draft||!frame)return send(response,404,{error:'静帧不存在或分析方案已失效'});
    if(!/^[a-zA-Z0-9-]+$/.test(draft.jobId)||!/^frame-\d+\.jpg$/.test(frame.file))return send(response,400,{error:'无效静帧路径'});
    return streamMedia(request,response,path.join(repository.projectDir(projectId),'analysis',draft.jobId,frame.file),'image/jpeg');
  }
  if(action === 'semantic-review' && method === 'GET') return send(response,200,semanticReviewRequest(await repository.get(projectId)));
  if(action === 'semantic-review' && method === 'POST') {
    const input=await body(request);
    return send(response,200,await repository.mutate(projectId,Number(input.expectedVersion),'semantic.review_imported',next=>{if(next.preCutDraft)throw new Error('当前分析方案由自动流程管理，请确认或重新分析');importSemanticReview(next,input.result);}));
  }
  if(action === 'precut/decision' && method === 'POST') {
    const input=await body(request);
    const project=await repository.mutate(projectId,Number(input.expectedVersion),'precut.decision',next=>{
      if(next.preCut?.status==='running')throw new Error('请等待初剪完成');
      if(next.preCutDraft)throw new Error('请在确认弹窗勾选建议，然后点击确认执行初剪');
      const decision=next.transcript?.cutDecisions.find(c=>c.cutId===input.cutId);
      if(!decision||!next.editPlan)throw new Error('未找到剪辑候选');
      const duration=next.editPlan.sourceDurationFrames;
      const removed=input.accept===true?normalizeRanges([...next.editPlan.removedRanges,decision],duration):next.editPlan.removedRanges.flatMap(r=>{
        if(r.endFrame<=decision.startFrame||r.startFrame>=decision.endFrame)return [r];
        return [{startFrame:r.startFrame,endFrame:Math.min(r.endFrame,decision.startFrame)},{startFrame:Math.max(r.startFrame,decision.endFrame),endFrame:r.endFrame}].filter(p=>p.endFrame>p.startFrame);
      });
      decision.status=input.accept===true?'accepted':'rejected';
      Object.assign(next,applyEditPlan(next,complement(removed,duration)));
    },{cutId:input.cutId,accept:input.accept});
    return send(response,200,project);
  }
  if(action === 'precut' && method === 'POST') {
    const input=await body(request);
    const provider=input.provider??'codex';if(provider!=='codex'&&provider!=='external')return send(response,400,{error:'Unknown analysis provider'});
    return send(response,202,await preCut.start(projectId,Number(input.expectedVersion),input.transcript,input.decisions as any,provider));
  }
  if (action === 'media' && method === 'POST') {
    if(['running','awaiting-agent'].includes((await repository.get(projectId)).motionArrangement?.status??''))return send(response,409,{error:'当前项目正在编排动效，请先完成当前任务'});
    if(preCut.running(projectId))return send(response,409,{error:'当前项目正在初剪，请等待完成'});
    const bytes = await rawBody(request);
    if (!bytes.length) return send(response, 400, {error: 'Video upload is empty'});
    const fileName = decodeURIComponent(String(request.headers['x-motion-filename'] ?? 'source-video.mp4'));
    const mimeType = String(request.headers['content-type'] ?? 'video/mp4').split(';')[0];
    const assetId = `source-${randomUUID()}${safeExtension(fileName, mimeType)}`;
    const assetDirectory = path.join(repository.rootDir, projectId, 'assets');
    await mkdir(assetDirectory, {recursive: true});
    await writeFile(path.join(assetDirectory, assetId), bytes);
    const measured=await inspectMedia(path.join(assetDirectory,assetId));
    const previous=await repository.get(projectId);
    if(previous.media.assetId)await writeFile(path.join(repository.projectDir(projectId),`before-import-${previous.version}.json`),JSON.stringify(previous,null,2));
    const project = await repository.mutate(projectId, Number(request.headers['x-motion-version'] ?? 0), 'media.uploaded', (next) => {
      next.media = {...next.media, videoName: fileName, assetId, mimeType, sizeBytes: bytes.length, muted:false};
      next.canvas={...next.canvas,width:measured.width,height:measured.height,durationFrames:Math.ceil(measured.duration*next.canvas.fps)};
      next.timeline={...next.timeline,segments:[],cards:[]};delete next.sourceTimeline;delete next.transcript;delete next.preCut;delete next.editPlan;delete next.semanticReview;delete next.preCutDraft;delete next.motionArrangement;
      Object.assign(next,applyEditPlan(next,[{startFrame:0,endFrame:next.canvas.durationFrames}]));
    }, {assetId, fileName, sizeBytes: bytes.length});
    return send(response, 200, project);
  }
  if (action === 'validate' && method === 'POST') return send(response, 200, {issues: validateProject(await repository.get(projectId))});
  if (action === 'render-stills' && method === 'POST') return send(response, 200, await renderProjectStills(await repository.get(projectId), path.join(repository.rootDir, projectId)));
  if (action === 'edit-plan' && method === 'POST') {
    const input = await body(request);
    const ranges = input.keptRanges as Array<{startFrame: number; endFrame: number}>;
    const project = await repository.mutate(projectId, Number(input.expectedVersion), 'edit.plan_applied', (next) => Object.assign(next, applyEditPlan(next, ranges)), {keptRanges: ranges});
    return send(response, 200, project);
  }
  if (action === 'edit-review/approve' && method === 'POST') {
    const input = await body(request);
    const project = await repository.mutate(projectId, Number(input.expectedVersion), 'edit.review_approved', (next) => {
      if (!next.editPlan) throw new Error('Create a rough-cut edit plan before approval');
      next.editReview = {...(next.editReview ?? {revision: 0}), status: 'approved', approvedAt: new Date().toISOString()};
    });
    return send(response, 200, project);
  }
  if (action === 'render-mp4' && method === 'POST') {
    const project = await repository.get(projectId);
    if (project.editPlan && project.editReview?.status !== 'approved') return send(response, 409, {error: 'Approve the rough cut before final motion render', code: 'EDIT_REVIEW_REQUIRED'});
    const videoSrc = project.media.assetId ? `http://127.0.0.1:${port}${prefix}/api/projects/${projectId}/media` : undefined;
    return send(response, 200, await renderProjectMp4(project, path.join(repository.rootDir, projectId), videoSrc));
  }
  if (action === 'render-alpha-mov' && method === 'POST') return send(response, 200, await renderProjectAlphaMov(await repository.get(projectId), path.join(repository.rootDir, projectId)));
  if (action === 'import-srt' && method === 'POST') {
    const input = await body(request); const current = await repository.get(projectId);
    const plan = compileSrtMotionPlan(String(input.srt ?? ''), current.canvas.fps);
    const project = await repository.mutate(projectId, Number(input.expectedVersion), 'timeline.srt_imported', (next) => {
      const ranges=next.editPlan?.keptRanges;
      const sourceDuration=next.editPlan?.sourceDurationFrames??(next.media.assetId?next.canvas.durationFrames:plan.durationFrames);
      next.timeline.segments=plan.segments.filter(s=>s.startFrame<sourceDuration).map(s=>({...s,endFrame:Math.min(s.endFrame,sourceDuration)}));
      next.timeline.cards=plan.cards.filter(c=>c.startFrame<sourceDuration).map(c=>({...c,durationFrames:Math.min(c.durationFrames,sourceDuration-c.startFrame)}));
      next.canvas.durationFrames=sourceDuration;delete next.sourceTimeline;delete next.transcript;delete next.editPlan;
      if(ranges)Object.assign(next,applyEditPlan(next,ranges));next.status='project_compiled';
    }, {segments: plan.segments.length, cards: plan.cards.length});
    return send(response, 200, {project, plan});
  }
  if (action === 'import-json' && method === 'POST') {
    const input = await body(request);
    const imported = upgradeProject(motionProjectSchema.parse(input.project));
    const project = await repository.mutate(projectId, Number(input.expectedVersion), 'project.json_imported', (next) => {
      Object.assign(next, imported, {projectId: next.projectId, version: next.version, createdAt: next.createdAt});
    }, {sourceVersion: imported.version, schemaVersion: imported.schemaVersion});
    return send(response, 200, project);
  }
  if (action === 'cards' && method === 'POST') {
    const input = await body(request); const card = input.card as MotionCardInstance;
    const project = await repository.mutate(projectId, Number(input.expectedVersion), 'card.added', (next) => {
      if (next.timeline.cards.some((item) => item.cardId === card.cardId)) throw new Error(`Card already exists: ${card.cardId}`); next.timeline.cards.push(card);
    }, {cardId: card.cardId});
    return send(response, 200, project);
  }
  const cardMatch = /^cards\/([^/]+)$/.exec(action);
  if (cardMatch && method === 'PATCH') {
    const cardId = decodeURIComponent(cardMatch[1]); const input = await body(request);
    const project = await repository.mutate(projectId, Number(input.expectedVersion), 'card.updated', (next) => {
      const index = next.timeline.cards.findIndex((item) => item.cardId === cardId); if (index < 0) throw new Error(`Card not found: ${cardId}`);
      next.timeline.cards[index] = {...next.timeline.cards[index], ...(input.patch as Partial<MotionCardInstance>), cardId};
    }, {cardId});
    return send(response, 200, project);
  }
  if (cardMatch && method === 'DELETE') {
    const cardId = decodeURIComponent(cardMatch[1]); const input = await body(request);
    const project = await repository.mutate(projectId, Number(input.expectedVersion), 'card.removed', (next) => { const cards = next.timeline.cards.filter((item) => item.cardId !== cardId); if (cards.length === next.timeline.cards.length) throw new Error(`Card not found: ${cardId}`); next.timeline.cards = cards; }, {cardId});
    return send(response, 200, project);
  }
  const segmentMoveMatch = /^segments\/([^/]+)\/move$/.exec(action);
  if (segmentMoveMatch && method === 'POST') {
    const groupId = decodeURIComponent(segmentMoveMatch[1]); const input = await body(request);
    const requestedDeltaFrames = Number(input.deltaFrames ?? 0); let appliedDeltaFrames = 0;
    const project = await repository.mutate(projectId, Number(input.expectedVersion), 'segment.moved', (next) => { appliedDeltaFrames = moveSegmentGroup(next, groupId, requestedDeltaFrames); }, {groupId, requestedDeltaFrames});
    return send(response, 200, {project, appliedDeltaFrames});
  }
  if (action === 'style' && method === 'POST') {
    const input = await body(request);
    return send(response, 200, await repository.mutate(projectId, Number(input.expectedVersion), 'style.applied', (next) => { next.styleProfileId = String(input.styleProfileId); }, {styleProfileId: input.styleProfileId}));
  }
  return send(response, 404, {error: 'Route not found'});
};

const serveStudio = async (response: ServerResponse, pathname: string) => {
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const candidate = path.resolve(studioDist, relative);
  const safePath = candidate.startsWith(studioDist + path.sep) || candidate === path.join(studioDist, 'index.html') ? candidate : path.join(studioDist, 'index.html');
  let file = safePath;
  try { if (!(await stat(file)).isFile()) file = path.join(studioDist, 'index.html'); } catch { file = path.join(studioDist, 'index.html'); }
  const extension = path.extname(file);
  const contentType = extension === '.html' ? 'text/html; charset=utf-8' : extension === '.js' ? 'text/javascript; charset=utf-8' : extension === '.css' ? 'text/css; charset=utf-8' : 'application/octet-stream';
  response.writeHead(200, {'content-type': contentType}); createReadStream(file).pipe(response);
};

await repository.initialize();
if ((await repository.list()).length === 0&&(await repository.trashList()).length===0) await repository.create(createProject({projectId: 'sample-project', title: '口播动效示例', durationFrames: 900}));

createServer(async (request, response) => {
  const urlPath = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`).pathname;
  if(prefix && !urlPath.startsWith(prefix+'/') && urlPath!==prefix)return send(response,403,{error:'Forbidden'});
  const pathname=prefix?(urlPath.slice(prefix.length)||'/'):urlPath;
  try {
    if(pathname==='/.well-known/agent.json')return send(response,200,agentProtocol(prefix));
    if(pathname==='/agent.md'){response.writeHead(200,{'content-type':'text/markdown; charset=utf-8'});return response.end(agentInstructions);}
    if (pathname.startsWith('/api/')) await routeApi(request, response, pathname); else await serveStudio(response, pathname);
  }
  catch (error) {
    if (error instanceof VersionConflictError) return send(response, 409, {error: error.message, code: 'VERSION_CONFLICT', expected: error.expected, actual: error.actual});
    if (error instanceof ProjectNotFoundError) return send(response, 404, {error: error.message, code: 'PROJECT_NOT_FOUND'});
    send(response, 400, {error: error instanceof Error ? error.message : String(error)});
  }
}).listen(port, '127.0.0.1', function(this:Server){ const address=this.address(); console.log(JSON.stringify({type:'ready',port:typeof address==='object'?address?.port:port})); });
