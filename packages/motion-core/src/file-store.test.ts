import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach, describe, expect, it} from 'vitest';
import {createProject, FileProjectRepository, VersionConflictError} from './index.js';

const temporaryDirectories: string[] = [];
const repository = async () => { const directory = await mkdtemp(path.join(tmpdir(), 'motion-master-')); temporaryDirectories.push(directory); return new FileProjectRepository(directory); };
afterEach(async () => { await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, {recursive: true, force: true}))); });

describe('FileProjectRepository', () => {
  it('persists projects and history across instances', async () => {
    const first = await repository(); await first.create(createProject({projectId: 'persist-test', title: 'Persist'}));
    await first.mutate('persist-test', 0, 'title.changed', (project) => { project.title = 'Persisted'; });
    const second = new FileProjectRepository(first.rootDir); expect((await second.get('persist-test')).title).toBe('Persisted');
    expect((await second.history('persist-test')).length).toBe(2);
  });
  it('rejects stale concurrent writes', async () => {
    const store = await repository(); await store.create(createProject({projectId: 'conflict-test', title: 'Conflict'}));
    await store.mutate('conflict-test', 0, 'first', (project) => { project.title = 'First'; });
    await expect(store.mutate('conflict-test', 0, 'stale', (project) => { project.title = 'Stale'; })).rejects.toBeInstanceOf(VersionConflictError);
  });
  it('rejects path traversal project IDs', async () => { const store = await repository(); await expect(store.get('../escape')).rejects.toThrow(); });
  it('writes valid JSON atomically', async () => { const store = await repository(); await store.create(createProject({projectId: 'atomic-test', title: 'Atomic'})); const raw = await readFile(path.join(store.rootDir, 'atomic-test', 'project.motion.json'), 'utf8'); expect(JSON.parse(raw).projectId).toBe('atomic-test'); });
});
