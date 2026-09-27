import path from 'node:path';
import {mkdir, rm} from 'node:fs/promises';
import {createProject} from '../packages/motion-core/src/index.ts';
import {renderProjectAlphaMov, renderProjectMp4, renderProjectStills} from '../packages/motion-render/src/render.ts';

const project = createProject({projectId: 'render-smoke', title: '渲染烟测', durationFrames: 24, width: 640, height: 360});
project.timeline.cards = [{cardId: 'title', cardType: 'metric-focus', cardVersion: '2.0.0', trackId: 'overlay-main', startFrame: 0, durationFrames: 24, content: {value: '92.4', suffix: '%', title: '透明导出'}, layout: {side: 'left', scale: 1}, appearance: {accentRole: 'cyan'}, motion: {enterFrames: 6, exitFrames: 6}, sourceSegmentIds: []}];
const directory = path.resolve('tmp/render-smoke');
await rm(directory, {recursive: true, force: true});
await mkdir(directory, {recursive: true});
const result = {stills: await renderProjectStills(project, directory), video: await renderProjectMp4(project, directory), alpha: await renderProjectAlphaMov(project, directory)};
console.log(JSON.stringify(result, null, 2));

