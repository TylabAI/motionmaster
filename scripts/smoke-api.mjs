import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import process from 'node:process';

const dataDir = await mkdtemp(path.join(tmpdir(), 'motion-api-'));
const port = 4191;
const child = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'packages/motion-api/src/server.ts'], {cwd: process.cwd(), env: {...process.env, MOTION_MASTER_DATA_DIR: dataDir, MOTION_MASTER_PORT: String(port)}, stdio: ['ignore', 'pipe', 'pipe']});
const api = async (pathname, options) => { const response = await fetch(`http://127.0.0.1:${port}${pathname}`, {headers: {'content-type': 'application/json'}, ...options}); const value = await response.json(); return {response, value}; };
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) { try { await api('/api/system'); ready = true; break; } catch { await new Promise((resolve) => setTimeout(resolve, 100)); } }
  if (!ready) throw new Error('API did not start');
  await api('/api/projects', {method: 'POST', body: JSON.stringify({projectId: 'api-smoke', title: 'API 烟测', durationFrames: 900})});
  const imported = await api('/api/projects/api-smoke/import-srt', {method: 'POST', body: JSON.stringify({expectedVersion: 0, srt: '1\n00:00:00,000 --> 00:00:02,000\n首先看完整工作流\n\n2\n00:00:11,000 --> 00:00:13,000\n效率提升 80%'})});
  const groupId = imported.value.project.timeline.segments[0].groupId;
  const moved = await api(`/api/projects/api-smoke/segments/${encodeURIComponent(groupId)}/move`, {method: 'POST', body: JSON.stringify({expectedVersion: imported.value.project.version, deltaFrames: 6})});
  const editableCard = moved.value.project.timeline.cards.find((card) => card.trackId === 'overlay-main');
  const timing = await api(`/api/projects/api-smoke/cards/${editableCard.cardId}`, {method: 'PATCH', body: JSON.stringify({expectedVersion: moved.value.project.version, patch: {startFrame: editableCard.startFrame + 3, durationFrames: editableCard.durationFrames - 3}})});
  const stale = await api('/api/projects/api-smoke/style', {method: 'POST', body: JSON.stringify({expectedVersion: 0, styleProfileId: 'stale'})});
  const validation = await api('/api/projects/api-smoke/validate', {method: 'POST', body: '{}'});
  const updatedCard = timing.value.timeline.cards.find((card) => card.cardId === editableCard.cardId);
  const result = {version: timing.value.version, segments: imported.value.plan.segments.length, cards: imported.value.plan.cards.length, segmentMove: moved.value.appliedDeltaFrames, timingStart: updatedCard.startFrame, timingDuration: updatedCard.durationFrames, staleStatus: stale.response.status, issues: validation.value.issues.length};
  console.log(JSON.stringify(result, null, 2));
  if (result.segmentMove !== 6 || result.timingStart !== editableCard.startFrame + 3 || result.timingDuration !== editableCard.durationFrames - 3 || result.staleStatus !== 409 || result.issues !== 0) process.exitCode = 1;
} finally {
  if (child.exitCode === null) child.kill();
  await Promise.race([new Promise((resolve) => child.once('exit', resolve)), new Promise((resolve) => setTimeout(resolve, 1500))]);
  await rm(dataDir, {recursive: true, force: true});
}
