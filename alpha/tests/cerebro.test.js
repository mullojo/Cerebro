import { startServer } from '../server.js';
import { inbox } from '../src/model.js';
import { Store } from '../src/store.js';
import * as path from '../src/paths.js';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import { test as nodeTest } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// Keep the test suite offline and dependency-free as well.
const assert = {
  equal(actual, expected) { if (!Object.is(actual, expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); },
  deepEqual(actual, expected) { this.equal(JSON.stringify(actual), JSON.stringify(expected)); },
  ok(value) { if (!value) throw new Error('Expected a truthy value.'); },
  match(value, pattern) { if (!pattern.test(value)) throw new Error(`Expected ${value} to match ${pattern}`); },
  async rejects(action, pattern) {
    try { await action(); } catch (error) { this.match(error.message, pattern); return; }
    throw new Error('Expected rejection.');
  },
};

const cli = path.fromFileUrl(new URL('../bin/cerebro.js', import.meta.url));

async function fixture(action) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cerebro-node-'));
  let app;
  try {
    app = await startServer({ root, port: 0 });
    const api = async (endpoint, method = 'GET', data, headers = {}) => {
      const response = await fetch(app.url + endpoint, { method,
        headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...headers },
        body: data ? JSON.stringify(data) : undefined });
      return { status: response.status, data: await response.json() };
    };
    const get = async endpoint => {
      const response = await fetch(app.url + endpoint);
      return { status: response.status, text: await response.text(), headers: response.headers };
    };
    const create = (kind = 'task', extras = {}) => api('/api/records', 'POST', {
      kind, actor: 'alex', to: 'sam', title: 'Review café idea', body: 'Evidence + next action', ...extras,
    });
    await action({ ...app, api, get, create, root });
  } finally {
    if (app) await app.close();
    await fs.rm(root, { recursive: true });
  }
}

const test = (name, action) => nodeTest(name, () => fixture(action));

test('handoff lifecycle and recipient acknowledgment', async ({ api, create, store }) => {
  const task = (await create()).data;
  const message = (await create('message')).data;
  assert.equal(inbox((await api('/api/state')).data.records, 'sam').length, 2);
  const update = (record, actor, status) => api(`/api/records/${record.id}`, 'PATCH', { actor, expect: 1, status, reason: 'Reviewed' });
  assert.equal((await update(message, 'alex', 'acknowledged')).status, 403);
  assert.equal((await update(message, 'sam', 'acknowledged')).status, 200);
  assert.equal((await update(task, 'sam', 'done')).status, 200);
  assert.equal(inbox((await api('/api/state')).data.records, 'sam').length, 0);
  assert.equal((await store.history()).length, 4);
});

test('concurrent creates persist all records and stale updates lose no work', async ({ api, create, store }) => {
  const results = await Promise.all(Array.from({ length: 24 }, (_, index) => create('task', { title: `Concurrent ${index}` })));
  assert.ok(results.every(r => r.status === 201));
  assert.equal((await store.history()).length, 24);
  const id = results[0].data.id;
  const updates = await Promise.all(['alex', 'sam'].map(actor => api(`/api/records/${id}`, 'PATCH', {
    actor, expect: 1, status: 'doing', reason: 'Started',
  })));
  assert.deepEqual(updates.map(r => r.status).sort(), [200, 409]);
  const snapshot = (await api('/api/state')).data;
  assert.equal(snapshot.records.find(r => r.id === id).revision, 2);
  assert.equal(snapshot.events.length, 25);
});

test('notes use Markdown files and invalid writes leave no events', async ({ api, create, root, store }) => {
  const note = await api('/api/notes', 'POST', { actor: 'sam', title: '../café <script>', body: '# Findings\nSource: a real conversation.' });
  assert.equal(note.status, 201);
  assert.ok(note.data.id.startsWith('knowledge/'));
  assert.equal(await fs.readFile(path.join(root, note.data.id), 'utf8'), note.data.body);
  assert.equal((await api('/api/state')).data.notes.length, 1);
  assert.equal((await create('unknown')).status, 400);
  assert.equal((await create('task', { actor: 'someone' })).status, 400);
  assert.equal((await create('task', { title: ' ' })).status, 400);
  assert.equal((await store.history()).length, 0);
});

test('loopback origin checks and explicit assets prevent foreign writes and file exposure', async ({ api, get, url, handler }) => {
  assert.equal((await api('/api/state', 'GET', null, { Origin: 'https://elsewhere.example' })).status, 403);
  const foreignHost = await handler(new Request('http://elsewhere.example/api/state'));
  assert.equal(foreignHost.status, 403);
  await foreignHost.text();
  assert.equal((await api('/data/events/anything.json')).status, 404);
  const response = await fetch(url + '/api/records', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' });
  assert.equal(response.status, 415); await response.text();
  const page = await get('/');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /script-src 'self' https:\/\/esm\.sh/);
  assert.match(page.text, /Cerebro/);
  for (const asset of ['/app.js', '/markdown.js', '/drafts.js', '/identity.js', '/src/model.js', '/src/presentation.js', '/src/knowledge.js', '/generated/App.js', '/generated/RecordCard.js', '/generated/EmptyState.js']) assert.equal((await get(asset)).status, 200);
  assert.match(page.text, /@tailwindcss\/browser@4\.3\.5/);
  assert.match((await get('/app.js')).text, /https:\/\/esm\.sh\/vue@3\.5\.45/);
});

test('one server owns the journal and original events are preserved', async ({ root, store }) => {
  const another = new Store(root);
  await assert.rejects(() => another.open(), /Another server owns/);
  const record = { id: 'task-legacy', kind: 'task', title: 'Existing work', body: 'Keep this', author: 'alex', to: 'sam', revision: 1, status: 'open' };
  await fs.writeFile(path.join(root, 'data/events', '00000000000000000001-original.json'), JSON.stringify({ schema: 1, at: '2026-11-11T10:00:00+00:00', actor: 'alex', action: 'created', record }));
  const updated = await store.mutate({ actor: 'sam', expect: 1, status: 'done', reason: 'Migrated and reviewed' }, record.id);
  assert.equal(updated.revision, 2);
  assert.equal((await store.history())[0].record.body, 'Keep this');
});

test('Node CLI and browser API see the same persisted state', async ({ url, api, root }) => {
  const noteFile = path.join(root, 'input.md');
  await fs.writeFile(noteFile, 'Unicode café context');
  const run = async args => {
    const result = await promisify(execFile)(process.execPath, [cli, '--url', url, ...args]);
    return result.stdout;
  };
  const [record] = JSON.parse(await run(['message', '--actor', 'alex', '--to', 'sam', '--title', 'Hello', '--body-file', noteFile, '--json']));
  assert.equal(record.body, 'Unicode café context');
  assert.equal((await api('/api/state')).data.records[0].id, record.id);
  assert.equal(JSON.parse(await run(['inbox', 'sam', '--json'])).length, 1);
});

test('browser projects are discovered and served within their allowed directory', async ({ root, api, get }) => {
  const directory = path.join(root, 'projects/demo');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'index.html'), '<title>A local project</title><h1>Demo</h1>');
  await fs.writeFile(path.join(directory, 'app.js'), 'export const ready = true;');
  await fs.writeFile(path.join(root, 'outside.js'), 'secret');
  await fs.symlink(path.join(root, 'outside.js'), path.join(directory, 'escape.js'));
  const snapshot = (await api('/api/state')).data;
  assert.equal(snapshot.projects[0].title, 'A local project');
  assert.equal((await get('/projects/demo/')).status, 200);
  assert.match((await get('/projects/demo/app.js')).text, /ready/);
  assert.equal((await get('/projects/demo/escape.js')).status, 404);
  assert.equal((await get('/projects/demo/%2e%2e%2f%2e%2e%2foutside.js')).status, 404);
});

test('path and Unicode handling survive restart with journal intact', async ({ root, close, create }) => {
  const task = (await create('task', { title: 'Unicode café' })).data;
  const spaced = path.join(root, 'folder with # and %');
  assert.equal(path.resolve(spaced), spaced);
  await close();
  const reopened = new Store(root);
  await reopened.open();
  try {
    assert.equal((await reopened.snapshot()).records[0].id, task.id);
    assert.equal((await reopened.history()).length, 1);
  } finally { await reopened.close(); }
});

test('knowledge preserves nested project folders, tags, and empty folders', async ({ api, root, url }) => {
  await fs.mkdir(path.join(root, 'knowledge/Example Project/Outreach/Empty'), { recursive: true });
  await fs.writeFile(path.join(root, 'knowledge/Example Project/README.md'), '# Example Project\n\nTags: overview\n\nProject context.');
  const saved = await api('/api/notes', 'POST', { actor: 'alex', title: 'Outreach draft', body: 'Review this email.', folder: 'Example Project/Outreach', tags: 'Emails, dms, emails' });
  assert.equal(saved.status, 201);
  assert.deepEqual(saved.data.tags, ['emails', 'dms']);
  assert.ok(saved.data.id.startsWith('knowledge/Example Project/Outreach/'));
  const state = (await api('/api/state')).data;
  assert.deepEqual(state.folders, ['Example Project', 'Example Project/Outreach', 'Example Project/Outreach/Empty']);
  assert.equal(state.notes.find(n => n.title === 'Outreach draft').folder, 'Example Project/Outreach');
  assert.deepEqual(state.notes.find(n => n.title === 'Outreach draft').tags, ['emails','dms']);
  const result = await promisify(execFile)(process.execPath, [cli, '--url', url, 'notes', '--folder', 'Example Project', '--tag', 'emails', '--json']);
  assert.deepEqual(JSON.parse(result.stdout).map(n => n.title), ['Outreach draft']);
});

test('note folder writes reject traversal, symlinks, and invalid tags', async ({ api, root }) => {
  const input = { actor: 'alex', title: 'Safe note', body: 'Context' };
  for (const folder of ['../escape', '/absolute', 'Example/../escape', 'Example\\escape', '.hidden']) {
    assert.equal((await api('/api/notes', 'POST', { ...input, folder })).status, 400);
  }
  assert.equal((await api('/api/notes', 'POST', { ...input, tags: 'emails\nStatus: bad' })).status, 400);
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'cerebro-outside-'));
  try {
    await fs.mkdir(path.join(root, 'knowledge'), { recursive: true });
    await fs.symlink(outside, path.join(root, 'knowledge/shortcut'));
    assert.equal((await api('/api/notes', 'POST', { ...input, folder: 'shortcut/child' })).status, 400);
    assert.deepEqual(await fs.readdir(outside), []);
    assert.equal((await api('/api/state')).data.notes.length, 0);
  } finally { await fs.rm(outside, { recursive: true }); }
});
