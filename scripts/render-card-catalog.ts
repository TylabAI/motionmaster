import {mkdir, rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {starterCardDefinitions} from '@motion-master/cards-starter';
import {createProject} from '@motion-master/core';

const outputDirectory = path.resolve('docs/verification/card-catalog');
await rm(outputDirectory, {recursive: true, force: true});
await mkdir(outputDirectory, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../packages/motion-render/src/entry.tsx')});
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
for (const definition of starterCardDefinitions) {
  const project = createProject({projectId: 'catalog-smoke', title: definition.displayName, durationFrames: 45, width: 640, height: 360});
  project.timeline.cards = [{...structuredClone(definition.defaults), cardId: `verify-${definition.cardType}`, trackId: definition.cardType === 'ambient-wash' ? 'overlay-ambient' : 'overlay-main', startFrame: 0}];
  const inputProps = {project};
  const composition = await selectComposition({serveUrl, id: 'MotionProject', inputProps, browserExecutable, chromeMode: 'chrome-for-testing'});
  await renderStill({composition, serveUrl, inputProps, frame: 22, output: path.join(outputDirectory, `${definition.cardType}.png`), imageFormat: 'png', browserExecutable, chromeMode: 'chrome-for-testing'});
}
console.log(`Rendered ${starterCardDefinitions.length} card verification images to ${outputDirectory}`);

