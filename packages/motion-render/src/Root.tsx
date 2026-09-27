import {Composition} from 'remotion';
import {z} from 'zod';
import {MotionTimelineComposition} from '@motion-master/cards-starter';
import {motionProjectSchema} from '@motion-master/schema';

const sample = motionProjectSchema.parse({
  schemaVersion: '0.1.0', projectId: 'render-sample', version: 0, title: 'Render Sample', styleProfileId: 'graphite-light', status: 'editable',
  canvas: {width: 1080, height: 1920, fps: 30, durationFrames: 300},
  timeline: {timelineId: 'timeline-main', tracks: [{trackId: 'overlay-main', kind: 'motion', locked: false}], segments: [], cards: []},
});

export const RemotionRoot = () => (
  <Composition
    id={'MotionProject'}
    component={MotionTimelineComposition}
    schema={z.object({project: motionProjectSchema, videoSrc: z.string().optional()})}
    defaultProps={{project: sample}}
    durationInFrames={sample.canvas.durationFrames}
    fps={sample.canvas.fps}
    width={sample.canvas.width}
    height={sample.canvas.height}
    calculateMetadata={({props}) => ({
      durationInFrames: props.project.canvas.durationFrames,
      fps: props.project.canvas.fps,
      width: props.project.canvas.width,
      height: props.project.canvas.height,
    })}
  />
);
