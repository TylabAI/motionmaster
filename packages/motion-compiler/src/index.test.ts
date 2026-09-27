import {describe, expect, it} from 'vitest';
import {compileSrtMotionPlan, parseSrt} from './index.js';

const srt = `1
00:00:00,000 --> 00:00:02,000
首先看整体架构

2
00:00:11,000 --> 00:00:13,000
效率提升 80%

3
00:00:22,000 --> 00:00:24,000
不是重复制作，而是复用资产`;

describe('SRT compiler', () => {
  it('parses timestamps into frames', () => { const segments = parseSrt(srt, 30); expect(segments[1].startFrame).toBe(330); });
  it('creates deterministic spaced cards', () => { const plan = compileSrtMotionPlan(srt, 30); expect(plan.cards.map((card) => card.cardType)).toEqual(['ambient-wash', 'section-head', 'metric-focus', 'strike-flip']); expect(plan.cards[0].durationFrames).toBe(plan.durationFrames); });
  it('adds production grouping and semantic color metadata', () => { const plan = compileSrtMotionPlan(srt, 30); expect(plan.segments[0].groupId).toBe('segment-group-01'); expect(plan.cards[1].appearance.accentRole).toBeTruthy(); expect(plan.cards[1].seg).toBeTruthy(); });
  it('rejects malformed blocks', () => { expect(() => parseSrt('missing timing', 30)).toThrow(/no timing/); });
});
