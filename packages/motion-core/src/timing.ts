export type CardTimingDragMode = 'move' | 'resize-start' | 'resize-end';

export const adjustCardTiming = (mode: CardTimingDragMode, startFrame: number, durationFrames: number, deltaFrames: number, timelineDurationFrames: number) => {
  if (mode === 'move') return {startFrame: Math.max(0, Math.min(startFrame + deltaFrames, timelineDurationFrames - durationFrames)), durationFrames};
  if (mode === 'resize-start') {
    const nextStart = Math.max(0, Math.min(startFrame + deltaFrames, startFrame + durationFrames - 1));
    return {startFrame: nextStart, durationFrames: durationFrames + startFrame - nextStart};
  }
  return {startFrame, durationFrames: Math.max(1, Math.min(durationFrames + deltaFrames, timelineDurationFrames - startFrame))};
};
