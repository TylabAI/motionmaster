import {z} from 'zod';

export const projectIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{1,63}$/, 'Project ID must use lowercase letters, numbers, and hyphens');

export const canvasSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().int().min(1).max(120),
  durationFrames: z.number().int().positive(),
});

export const productionModeSchema = z.enum(['talking-head', 'product-promo', 'feature-launch', 'tutorial', 'data-report']);
export const narrativeRecipeSchema = z.enum(['auto', 'promo-eight-beat', 'feature-launch', 'tutorial-flow', 'data-story']);
export const targetAspectRatioSchema = z.enum(['16:9', '4:3', '1:1', '9:16']);
const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, 'Brand colors must use six-digit hex values');

export const brandProfileSchema = z.object({
  name: z.string().max(120).default(''),
  tagline: z.string().max(240).default(''),
  sourceUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: hexColorSchema.default('#25d0b1'),
  secondaryColor: hexColorSchema.default('#5b8cff'),
  backgroundColor: hexColorSchema.default('#0b0f14'),
  textColor: hexColorSchema.default('#f5f8ff'),
  fontFamily: z.string().max(200).default('Inter, Microsoft YaHei, sans-serif'),
  radius: z.number().min(0).max(48).default(16),
  iconStyle: z.enum(['outline', 'solid', 'duotone', 'brand']).default('outline'),
  forbiddenStyles: z.array(z.string().min(1).max(120)).max(20).default([]),
}).default({name:'',tagline:'',primaryColor:'#25d0b1',secondaryColor:'#5b8cff',backgroundColor:'#0b0f14',textColor:'#f5f8ff',fontFamily:'Inter, Microsoft YaHei, sans-serif',radius:16,iconStyle:'outline',forbiddenStyles:[]});

export const productionProfileSchema = z.object({
  mode: productionModeSchema.default('talking-head'),
  narrativeRecipe: narrativeRecipeSchema.default('auto'),
  targetAspectRatios: z.array(targetAspectRatioSchema).min(1).max(4).refine(values => new Set(values).size === values.length, 'Target aspect ratios must be unique').default(['16:9']),
  brand: brandProfileSchema,
}).default({mode:'talking-head',narrativeRecipe:'auto',targetAspectRatios:['16:9'],brand:{name:'',tagline:'',primaryColor:'#25d0b1',secondaryColor:'#5b8cff',backgroundColor:'#0b0f14',textColor:'#f5f8ff',fontFamily:'Inter, Microsoft YaHei, sans-serif',radius:16,iconStyle:'outline',forbiddenStyles:[]}});

export const mediaSchema = z.object({
  videoName: z.string().optional(),
  fit: z.enum(['cover', 'contain']).default('cover'),
  scale: z.number().min(0.5).max(2).default(1),
  offsetX: z.number().min(-100).max(100).default(0),
  offsetY: z.number().min(-100).max(100).default(0),
  opacity: z.number().min(0).max(1).default(1),
  muted: z.boolean().default(true),
  assetId: z.string().min(1).optional(),
  mimeType: z.string().min(1).optional(),
  sizeBytes: z.number().int().positive().optional(),
}).default({fit: 'cover', scale: 1, offsetX: 0, offsetY: 0, opacity: 1, muted: true});

export const motionCardInstanceSchema = z.object({
  autoScene:z.object({firstWordId:z.string(),lastWordId:z.string(),assetId:z.string(),followWords:z.boolean().default(true),kind:z.enum(['chapter','steps','comparison','emphasis','summary']),recipeId:z.string().optional(),split:z.boolean(),side:z.enum(['left','right']),items:z.array(z.object({text:z.string(),wordId:z.string(),revealFrame:z.number().int().nonnegative()})).default([])}).optional(),
  sourceId: z.string().optional(),
  cardId: z.string().min(1),
  cardType: z.string().min(1),
  cardVersion: z.string().min(1),
  trackId: z.string().min(1),
  startFrame: z.number().int().nonnegative(),
  durationFrames: z.number().int().positive(),
  content: z.record(z.string(), z.unknown()).default({}),
  layout: z.record(z.string(), z.unknown()).default({}),
  appearance: z.record(z.string(), z.unknown()).default({}),
  motion: z.record(z.string(), z.unknown()).default({}),
  sourceSegmentIds: z.array(z.string()).default([]),
  seg: z.string().optional(),
  dimAt: z.number().int().nonnegative().optional(),
});

export const timelineTrackSchema = z.object({
  trackId: z.string().min(1),
  kind: z.enum(['video', 'motion', 'audio']),
  locked: z.boolean().default(false),
  label: z.string().optional(),
});

export const subtitleSegmentSchema = z.object({
  sourceId: z.string().optional(),
  segmentId: z.string().min(1),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  text: z.string().min(1),
  label: z.string().optional(),
  accent: z.string().optional(),
  groupId: z.string().optional(),
});

export const timelineSchema = z.object({
  timelineId: z.string(),
  tracks: z.array(timelineTrackSchema),
  segments: z.array(subtitleSegmentSchema).default([]),
  cards: z.array(motionCardInstanceSchema),
});

export const editRangeSchema = z.object({
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
}).refine((range) => range.endFrame > range.startFrame, 'Edit range end must be greater than start');

export const editPlanSchema = z.object({
  sourceDurationFrames: z.number().int().positive(),
  keptRanges: z.array(editRangeSchema).min(1),
  removedRanges: z.array(editRangeSchema).default([]),
});

export const editReviewSchema = z.object({
  status: z.enum(['draft', 'approved']).default('draft'),
  revision: z.number().int().nonnegative().default(0),
  approvedAt: z.string().datetime().optional(),
});

export const wordCueSchema = z.object({wordId: z.string().min(1), text: z.string(), startFrame: z.number().int().nonnegative(), endFrame: z.number().int().positive(), keep: z.boolean().default(true), reason: z.string().optional()});
export const subtitleCueSchema = z.object({cueId: z.string().min(1), startFrame: z.number().int().nonnegative(), endFrame: z.number().int().positive(), text: z.string(), wordIds: z.array(z.string()).default([]), status: z.enum(['draft', 'approved']).default('draft')});
export const cutDecisionSchema = z.object({cutId: z.string().min(1), startFrame: z.number().int().nonnegative(), endFrame: z.number().int().positive(), type: z.enum(['pause', 'filler', 'off-topic', 'duplicate', 'retake']), confidence: z.number().min(0).max(1).default(1), sourceWordIds: z.array(z.string()).default([]), evidenceWordIds:z.array(z.string()).default([]), reviewVerdict:z.enum(['remove','keep','review']).optional(), reviewReason:z.string().optional(), status: z.enum(['proposed', 'accepted', 'rejected']).default('proposed'), reason: z.string().optional()});
export const transcriptSchema = z.object({revision: z.number().int().nonnegative().default(0), wordCues: z.array(wordCueSchema).default([]), subtitleCues: z.array(subtitleCueSchema).default([]), cutDecisions: z.array(cutDecisionSchema).default([])});

export const motionProjectSchema = z.object({
  htmlDesign:z.object({jobId:z.string(),cardId:z.string(),prompt:z.string(),fingerprint:z.string(),status:z.enum(['running','awaiting-agent','completed','failed']),provider:z.enum(['codex','external']),stage:z.string(),startedAt:z.string(),error:z.string().optional()}).optional(),
  schemaVersion: z.enum(['0.1.0', '0.2.0']),
  projectId: projectIdSchema,
  version: z.number().int().nonnegative(),
  title: z.string().min(1),
  canvas: canvasSchema,
  theme: z.enum(['dark', 'light']).default('dark'),
  skin: z.enum(['glass', 'solid']).default('glass'),
  style: z.enum(['hud', 'editorial']).default('hud'),
  font: z.string().default('Inter, Microsoft YaHei, sans-serif'),
  lintOff: z.array(z.string()).default([]),
  productionProfile: productionProfileSchema,
  editPlan: editPlanSchema.optional(),
  editReview: editReviewSchema.default({status: 'draft', revision: 0}),
  transcript: transcriptSchema.optional(),
  semanticReview: z.object({reviewer:z.string(),summary:z.string(),limitations:z.array(z.string()),reviewedAt:z.string(),fingerprint:z.string(),decisionIds:z.array(z.string())}).optional(),
  sourceTimeline: timelineSchema.optional(),
  preCut: z.object({jobId:z.string(), executionPolicy:z.enum(['review','auto-retakes']).optional(), status:z.enum(['running','awaiting-agent','awaiting-confirmation','completed','failed']), stage:z.string(), mode:z.string().optional(), warnings:z.array(z.string()).default([]), error:z.string().optional(), removedFrames:z.number().optional()}).optional(),
  motionArrangement:z.object({jobId:z.string(),status:z.enum(['running','awaiting-agent','completed','failed']),stage:z.string(),startedAt:z.string(),finishedAt:z.string().optional(),provider:z.enum(['codex','external']),error:z.string().optional(),summary:z.string().optional(),warnings:z.array(z.string()).default([]),cardIds:z.array(z.string()).default([]),frames:z.array(z.object({id:z.string(),frame:z.number().int(),file:z.string(),reason:z.string()})).default([])}).optional(),
  preCutDraft:z.object({jobId:z.string(),baseEditKey:z.string(),confirmationFingerprint:z.string().optional(),decisionIds:z.array(z.string()),recommendedIds:z.array(z.string()),frames:z.array(z.object({id:z.string(),frame:z.number().int().nonnegative(),file:z.string(),reason:z.string()})).default([])}).optional(),
  media: mediaSchema,
  styleProfileId: z.string().default('obsidian-hud'),
  timeline: timelineSchema,
  status: z.enum(['project_compiled', 'editable', 'preview_verified', 'render_ready', 'rendered']),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  deletedAt: z.string().datetime().optional(),
});

export const renderJobSchema = z.object({
  renderId: z.string().min(1),
  projectId: projectIdSchema,
  kind: z.enum(['stills', 'mp4', 'alpha-mov']),
  status: z.enum(['queued', 'running', 'completed', 'failed']),
  outputPaths: z.array(z.string()).default([]),
  error: z.string().optional(),
});

export const cardParameterSchema = z.object({
  key: z.string().min(1),
  path: z.string().min(1),
  label: z.string().min(1),
  group: z.enum(['content', 'timing', 'style', 'layout', 'motion']),
  control: z.enum(['text', 'textarea', 'number', 'range', 'select', 'color', 'toggle']),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  options: z.array(z.object({label: z.string(), value: z.union([z.string(), z.number(), z.boolean()])})).optional(),
});

export type MotionCardInstance = z.infer<typeof motionCardInstanceSchema>;
export type SubtitleSegment = z.infer<typeof subtitleSegmentSchema>;
export type Timeline = z.infer<typeof timelineSchema>;
export type EditRange = z.infer<typeof editRangeSchema>;
export type EditPlan = z.infer<typeof editPlanSchema>;
export type EditReview = z.infer<typeof editReviewSchema>;
export type Transcript = z.infer<typeof transcriptSchema>;
export type ProductionProfile = z.infer<typeof productionProfileSchema>;
export type BrandProfile = z.infer<typeof brandProfileSchema>;
export type MotionProject = z.infer<typeof motionProjectSchema>;
export type RenderJob = z.infer<typeof renderJobSchema>;
export type CardParameterDefinition = z.infer<typeof cardParameterSchema>;

export type MotionCardClassification = {
  level1: string;
  level2: string;
  level3: string;
};

export type MotionCardDefinition = {
  source?: {sourceUrl: string; author?: string; license?: string; originalFormat?: string; adaptationNotes?: string};
  cardType: string;
  version: string;
  displayName: string;
  description: string;
  category: 'ambient' | 'chapter' | 'data' | 'comparison' | 'quote';
  /**
   * Three-level library taxonomy. Optional for third-party packs so older packs
   * remain loadable; the built-in catalog always supplies all three levels.
   */
  classification?: MotionCardClassification;
  tags: string[];
  capabilities: string[];
  parameterSchema: CardParameterDefinition[];
  defaults: Omit<MotionCardInstance, 'cardId' | 'trackId' | 'startFrame'>;
};

