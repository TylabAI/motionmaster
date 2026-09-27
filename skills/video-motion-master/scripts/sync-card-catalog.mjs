import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const endpoint = process.env.MOTION_MASTER_URL ?? 'http://127.0.0.1:4180';
const response = await fetch(`${endpoint}/api/cards`);
if (!response.ok) throw new Error(`Motion Studio returned ${response.status}`);
const cards = await response.json();
const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../references/card-catalog.md');
const lines = ['# Live Card Catalog', '', `Generated from ${endpoint}.`, '', ...cards.map((card) => `- \`${card.cardType}\` — ${card.displayName}: ${card.description}`), ''];
await writeFile(target, lines.join('\n'), 'utf8');
console.log(`Wrote ${cards.length} cards to ${target}`);

