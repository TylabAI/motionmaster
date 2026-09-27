export type RectLike = {left: number; top: number; right: number; bottom: number};

export const marqueeBounds = (startX: number, startY: number, currentX: number, currentY: number): RectLike => ({
  left: Math.min(startX, currentX),
  top: Math.min(startY, currentY),
  right: Math.max(startX, currentX),
  bottom: Math.max(startY, currentY),
});

export const rectsOverlap = (a: RectLike, b: RectLike) => a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
