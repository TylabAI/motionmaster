import {describe, expect, it} from 'vitest';
import {adjustCardTiming, MotionProjectStore, VersionConflictError, createSampleProject, moveSegmentGroup, validateProject} from './index';

const card = {
  cardId: 'card-1', cardType: 'section-head', cardVersion: '1.0.0', trackId: 'overlay-main',
  startFrame: 10, durationFrames: 60, content: {title: 'Test'}, layout: {}, appearance: {}, motion: {}, sourceSegmentIds: [],
};

describe('MotionProjectStore', () => {
  it('creates the v0.2 production contract with landscape defaults', () => {
    const project = createSampleProject();
    expect(project.schemaVersion).toBe('0.2.0');
    expect(project.canvas).toMatchObject({width: 1920, height: 1080});
    expect(project).toMatchObject({theme: 'dark', skin: 'glass', style: 'hud'});
    expect(project.timeline.tracks.map((track) => track.trackId)).toContain('overlay-ambient');
  });
  it('increments version after a card write', () => {
    const store = new MotionProjectStore();
    expect(store.addCard(card, 0).version).toBe(1);
  });

  it('rejects stale writes', () => {
    const store = new MotionProjectStore();
    store.addCard(card, 0);
    expect(() => store.updateCard('card-1', {durationFrames: 30}, 0)).toThrow(VersionConflictError);
  });

  it('reports a card outside the timeline', () => {
    const project = createSampleProject();
    project.timeline.cards.push({...card, startFrame: project.canvas.durationFrames - 10, durationFrames: 60});
    expect(validateProject(project)[0]?.code).toBe('CARD_OUTSIDE_TIMELINE');
  });

  it('warns when cards bypass semantic colors', () => {
    const project = createSampleProject();
    project.timeline.cards.push({...card, appearance: {accent: '#ff0000'}});
    expect(validateProject(project).some((issue) => issue.code === 'FREE_HEX_COLOR')).toBe(true);
  });

  it('moves a segment and its cards as one scene block', () => {
    const project = createSampleProject();
    project.timeline.segments.push({segmentId: 'seg-1', groupId: 'scene-1', startFrame: 30, endFrame: 90, text: 'Scene'});
    project.timeline.cards.push({...card, startFrame: 35, seg: 'scene-1', sourceSegmentIds: ['seg-1']});
    expect(moveSegmentGroup(project, 'scene-1', 15)).toBe(15);
    expect(project.timeline.segments[0].startFrame).toBe(45);
    expect(project.timeline.cards[0].startFrame).toBe(50);
  });

  it('clamps timeline drag and both resize handles', () => {
    expect(adjustCardTiming('move', 10, 30, -99, 100)).toEqual({startFrame: 0, durationFrames: 30});
    expect(adjustCardTiming('move', 10, 30, 99, 100)).toEqual({startFrame: 70, durationFrames: 30});
    expect(adjustCardTiming('resize-start', 10, 30, 12, 100)).toEqual({startFrame: 22, durationFrames: 18});
    expect(adjustCardTiming('resize-start', 10, 30, 99, 100)).toEqual({startFrame: 39, durationFrames: 1});
    expect(adjustCardTiming('resize-end', 10, 30, -99, 100)).toEqual({startFrame: 10, durationFrames: 1});
    expect(adjustCardTiming('resize-end', 10, 30, 99, 100)).toEqual({startFrame: 10, durationFrames: 90});
  });
});
