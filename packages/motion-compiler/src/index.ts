import {subtitleSegmentSchema, type MotionCardInstance, type SubtitleSegment} from '@motion-master/schema';

const timestampToMs = (value: string): number => {
  const match = /^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/.exec(value);
  if (!match) throw new Error(`Invalid SRT timestamp: ${value}`);
  return (((Number(match[1]) * 60 + Number(match[2])) * 60 + Number(match[3])) * 1000) + Number(match[4]);
};

export const parseSrt = (source: string, fps: number): SubtitleSegment[] => {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  let activeGroup = 'segment-group-01';
  let groupIndex = 1;
  return normalized.split(/\n{2,}/).map((block, index) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex === -1) throw new Error(`SRT block ${index + 1} has no timing line`);
    const [start, end] = lines[timingIndex].split('-->').map((part) => part.trim());
    const text = lines.slice(timingIndex + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    if (!text) throw new Error(`SRT block ${index + 1} has no subtitle text`);
    const isChapter = /^(首先|其次|最后|第[一二三四五六七八九十]|接下来|总结|然后)/.test(text);
    if (isChapter && index > 0) activeGroup = `segment-group-${String(++groupIndex).padStart(2, '0')}`;
    return subtitleSegmentSchema.parse({
      segmentId: `segment-${String(index + 1).padStart(4, '0')}`,
      startFrame: Math.max(0, Math.floor(timestampToMs(start) * fps / 1000)),
      endFrame: Math.max(1, Math.ceil(timestampToMs(end) * fps / 1000)),
      text,
      label: isChapter ? `CHAPTER ${String(groupIndex).padStart(2, '0')}` : undefined,
      accent: /\d/.test(text) ? 'cyan' : isChapter ? 'coral' : 'lime',
      groupId: activeGroup,
    });
  });
};

const classify = (text: string): MotionCardInstance['cardType'] => {
  if (/^(首先|其次|最后|第[一二三四五六七八九十]|章节|接下来|总结|然后)/.test(text)) return 'section-head';
  if (/(不是|而是|相比|对比|错误|正确|改成|替代|不要)/.test(text)) return 'strike-flip';
  if (/(\d+[.%倍万亿]?|百分之|数据|增长|下降|提升|效率|转化)/.test(text)) return 'metric-focus';
  if (/(步骤|流程|第一步|第二步|第三步|六步|十步)/.test(text)) return 'process-steps';
  if (text.length > 28) return 'info-board';
  return 'quote-lines';
};

const cardContent = (cardType: string, segment: SubtitleSegment): Record<string, unknown> => {
  if (cardType === 'section-head') return {label: segment.label ?? 'CHAPTER', title: segment.text};
  if (cardType === 'metric-focus') {
    const value = segment.text.match(/\d+(?:\.\d+)?/)?.[0] ?? '80';
    const suffix = segment.text.includes('%') || segment.text.includes('百分') ? '%' : '';
    return {value, suffix, title: segment.text};
  }
  if (cardType === 'strike-flip') {
    const [oldText, title] = segment.text.split(/，|,|而是/).map((part) => part.trim());
    return {oldText: oldText || '旧方法', title: title || segment.text};
  }
  if (cardType === 'process-steps') return {title: 'PROCESS', body: segment.text.replace(/[，,；;]/g, '\n')};
  if (cardType === 'info-board') return {title: '本段重点', body: segment.text.replace(/[，,；;]/g, '\n')};
  return {title: segment.text.replace(/[，,；;]/g, '\n')};
};

export type CompiledMotionPlan = {segments: SubtitleSegment[]; cards: MotionCardInstance[]; durationFrames: number};

export const compileSrtMotionPlan = (source: string, fps: number): CompiledMotionPlan => {
  const segments = parseSrt(source, fps);
  const durationFrames = Math.max(fps * 10, ...segments.map((segment) => segment.endFrame + fps * 2));
  const cards: MotionCardInstance[] = [{
    cardId: 'generated-ambient', cardType: 'ambient-wash', cardVersion: '2.0.0', trackId: 'overlay-ambient',
    startFrame: 0, durationFrames, content: {}, layout: {}, appearance: {accentRole: 'cyan', intensity: .45}, motion: {}, sourceSegmentIds: [],
  }];
  let lastPrimaryStart = -fps * 8;
  for (const segment of segments) {
    if (segment.startFrame - lastPrimaryStart < fps * 8) continue;
    const cardType = classify(segment.text);
    const duration = Math.min(fps * 5, Math.max(fps * 2.8, segment.endFrame - segment.startFrame + fps));
    cards.push({
      cardId: `generated-${String(cards.length).padStart(3, '0')}`,
      cardType,
      cardVersion: '2.0.0',
      trackId: 'overlay-main',
      startFrame: segment.startFrame,
      durationFrames: Math.min(Math.round(duration), durationFrames - segment.startFrame),
      content: cardContent(cardType, segment),
      layout: {side: cards.length % 2 === 0 ? 'right' : 'left', scale: 1},
      appearance: {accentRole: segment.accent ?? 'coral'},
      motion: {enterFrames: 18, exitFrames: 12},
      sourceSegmentIds: [segment.segmentId],
      seg: segment.groupId,
      dimAt: segment.endFrame,
    });
    lastPrimaryStart = segment.startFrame;
  }
  return {segments, cards, durationFrames};
};
