// Disposable browser QA server. Never writes the real journal/knowledge folders.
import { startServer } from '../server.js';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cerebro-ui-preview-'));
const app = await startServer({ root, port: 4311 });
try {
  await app.store.addNote({ actor: 'alex', title: 'A shared starting point', body: 'Design preview only.\n\nUseful context belongs here, with sources and one clear next step.' });
  await app.store.addNote({ actor: 'alex', title: 'Email draft', body: 'A draft ready for review.', folder: 'Sample Project/Outreach', tags: 'emails' });
  await app.store.addNote({ actor: 'sam', title: 'DM draft', body: 'A short direct message.', folder: 'Sample Project/Outreach', tags: 'dms' });
  await fs.mkdir(root + '/knowledge/Sample Project/Empty', { recursive: true });
  const task = await app.store.mutate({ kind: 'task', actor: 'alex', to: 'sam', title: 'Review the first idea', body: 'Design preview only. Read the shared context and capture one useful next step.' });
  await app.store.mutate({ actor: 'sam', expect: 1, status: 'doing', reason: 'Preview: reviewing the context.' }, task.id);
  await app.store.mutate({ kind: 'message', actor: 'sam', to: 'alex', title: 'A little context for you', body: 'Design preview only. Here is the context, the evidence, and the next action.' });
  await fs.mkdir(root + '/projects/starter', { recursive: true });
  for (const name of ['index.html', 'app.js', 'view.js']) await fs.copyFile('projects/starter/' + name, root + '/projects/starter/' + name);
  console.log(`Disposable UI preview: ${app.url}/?preview=1\nReal shared data is untouched. Ctrl+C to remove preview files.`);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    try { await app.close(); await fs.rm(root, { recursive: true }); }
    finally { for (const signal of ['SIGINT', 'SIGTERM']) process.removeListener(signal, stop); }
  };
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, stop);
} catch (error) { await app.close(); await fs.rm(root, { recursive: true }); throw error; }
