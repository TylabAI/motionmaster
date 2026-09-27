import {readFile} from 'node:fs/promises';

const input = process.argv[2];
if (!input) throw new Error('Usage: node verify-overlay.mjs <overlay-json>');
const project = JSON.parse(await readFile(input, 'utf8'));
const allowed = new Set(['coral', 'cyan', 'lime', 'amber']);
const errors = [];
if (project.schemaVersion !== '0.2.0') errors.push('schemaVersion must be 0.2.0');
if (project.media?.fit !== 'cover') errors.push('media.fit must be cover');
if (!Array.isArray(project.timeline?.cards)) errors.push('timeline.cards must be an array');
for (const card of project.timeline?.cards ?? []) {
  if (!card.cardId || !card.cardType) errors.push('Every card needs cardId and cardType');
  if (!allowed.has(card.appearance?.accentRole)) errors.push(`${card.cardId}: invalid semantic accent`);
  if (JSON.stringify(card.appearance ?? {}).match(/#[0-9a-f]{3,8}/i)) errors.push(`${card.cardId}: free hex color is forbidden`);
  if (card.startFrame < 0 || card.durationFrames < 1) errors.push(`${card.cardId}: invalid timing`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Overlay preflight passed: ${project.timeline.cards.length} cards`);

