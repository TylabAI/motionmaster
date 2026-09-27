import type {EditRange} from '@motion-master/schema';

export const sourceToEdited = (frame: number, ranges?: EditRange[]) => ranges
  ? ranges.reduce((sum, range) => sum + Math.max(0, Math.min(frame, range.endFrame) - range.startFrame), 0)
  : frame;

export const editedToSource = (frame: number, ranges?: EditRange[], edge: 'start' | 'end' = 'start') => {
  if (!ranges?.length) return frame;
  let remaining = Math.max(0, frame);
  for (const range of ranges) {
    const length = range.endFrame - range.startFrame;
    if (remaining < length || (edge === 'end' && remaining === length)) return range.startFrame + remaining;
    remaining -= length;
  }
  return ranges[ranges.length - 1].endFrame;
};
