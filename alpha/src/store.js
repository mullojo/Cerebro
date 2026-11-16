// Node-only persistence adapter. Browser and CLI writes use the same local API.
import * as fs from 'node:fs/promises';
import * as path from './paths.js';
import { loadWorkspace } from './config.js';
import { noteTags, normalizeTags, folderPath } from './knowledge.js';
import { createRecord, updateRecord, project, person, ValidationError } from './model.js';

async function entries(directory) {
  return (await fs.readdir(directory, { withFileTypes: true })).map(entry => ({
    name: entry.name, isFile: entry.isFile(), isDirectory: entry.isDirectory(),
  }));
}

export class Store {
  constructor(root) {
    this.root = path.resolve(root);
    this.eventsDir = path.join(this.root, 'data/events');
    this.lockDir = path.join(this.root, 'data/.writer-lock');
    this.queue = Promise.resolve();
    this.owned = false;
  }

  async open() {
    this.workspace = await loadWorkspace(this.root);
    this.people = this.workspace.people.map(p => p.id);
    await fs.mkdir(this.eventsDir, { recursive: true });
    try { await fs.mkdir(this.lockDir); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      throw new Error(`Another server owns ${this.lockDir}. Stop it first. After a crash, inspect owner.json and follow README recovery instructions.`);
    }
    this.owned = true;
    try {
      await fs.writeFile(path.join(this.lockDir, 'owner.json'), JSON.stringify({ pid: process.pid, runtime: 'node', started: new Date().toISOString() }));
      await this.history();
    } catch (error) { await this.close(); throw error; }
  }

  async close() {
    await this.queue;
    if (this.owned) {
      await fs.rm(this.lockDir, { recursive: true });
      this.owned = false;
    }
  }

  async history() {
    const names = (await entries(this.eventsDir)).filter(e => e.isFile && e.name.endsWith('.json')).map(e => e.name).sort();
    return await Promise.all(names.map(async name => {
      const event = JSON.parse(await fs.readFile(path.join(this.eventsDir, name), 'utf8'));
      if (event.schema !== 1 || !event.record?.id || !event.record.revision) throw new Error(`Invalid journal event: ${name}`);
      return event;
    }));
  }

  async atomicWrite(directory, name, content) {
    await fs.mkdir(directory, { recursive: true });
    const temporary = path.join(directory, `.pending-${crypto.randomUUID()}`);
    try {
      const file = await fs.open(temporary, 'wx');
      try {
        await file.writeFile(content, 'utf8');
        await file.sync();
      } finally { await file.close(); }
      await fs.rename(temporary, path.join(directory, name));
      const folder = await fs.open(directory, 'r');
      try { await folder.sync(); } finally { await folder.close(); }
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }

  serialize(action) {
    const next = this.queue.then(() => {
      if (!this.owned) throw new Error('Store is not open for writing.');
      return action();
    });
    this.queue = next.catch(() => {});
    return next;
  }

  async mutate(input, id) {
    return this.serialize(async () => {
      const events = await this.history();
      const previous = id && project(events).find(r => r.id === id);
      if (id && !previous) throw new ValidationError('Record not found.', 404);
      const record = id ? updateRecord(previous, input, this.people) : createRecord(input, crypto.randomUUID(), this.people);
      const event = { schema: 1, at: new Date().toISOString(), actor: input.actor,
        action: id ? 'updated' : 'created', record };
      const lastSequence = (await entries(this.eventsDir)).filter(e => e.isFile && e.name.endsWith('.json'))
        .reduce((max, e) => Math.max(max, Number(e.name.split('-')[0]) || 0), 0);
      const filename = `${String(lastSequence + 1).padStart(20, '0')}-${crypto.randomUUID()}.json`;
      await this.atomicWrite(this.eventsDir, filename, JSON.stringify(event, null, 2) + '\n');
      return record;
    });
  }

  async knowledge() {
    const folders = [];
    const base = path.join(this.root, 'knowledge');
    const collect = async directory => {
      let children;
      try { children = await entries(directory); }
      catch (error) { if (error.code === 'ENOENT') return []; throw error; }
      const groups = await Promise.all(children.map(async entry => {
        const filename = path.join(directory, entry.name);
        if (entry.name.startsWith('.')) return [];
        if (entry.isDirectory) { folders.push(path.relative(base, filename)); return collect(filename); }
        if (!entry.isFile || !entry.name.endsWith('.md')) return [];
        const body = await fs.readFile(filename, 'utf8');
        return [{ id: path.relative(this.root, filename), title: body.match(/^#\s+(.+)$/m)?.[1] || entry.name, body, folder: path.relative(base, directory), tags: noteTags(body) }];
      }));
      return groups.flat();
    };
    const notes = (await collect(base)).sort((a, b) => a.id.localeCompare(b.id));
    return { notes, folders: folders.sort((a,b) => a.localeCompare(b)) };
  }

  async notes() { return (await this.knowledge()).notes; }

  async addNote(input) {
    return this.serialize(async () => {
      person(input.actor, this.people);
      if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 240 ||
          typeof input.body !== 'string' || !input.body.trim() || input.body.length > 100000) {
        throw new ValidationError('A title and Markdown details are required (240 / 100,000 character limits).');
      }
      let folder, tags;
      try { folder = folderPath(input.folder); tags = normalizeTags(input.tags); }
      catch (error) { throw new ValidationError(error.message); }
      // Check every existing component before descending; never write through symlinks.
      let directory = this.root;
      for (const part of ['knowledge', ...folder.split('/').filter(Boolean)]) {
        directory = path.join(directory, part);
        try { await fs.mkdir(directory); } catch (error) { if (error.code !== 'EEXIST') throw error; }
        const info = await fs.lstat(directory);
        if (!info.isDirectory() || info.isSymbolicLink()) throw new ValidationError('Knowledge folders must be real local directories.');
      }
      const date = new Date().toISOString().slice(0, 10);
      const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) || 'note';
      const filename = `${date}-${input.actor}-${slug}-${crypto.randomUUID()}.md`;
      const content = `# ${input.title.trim().replace(/[\r\n]/g, ' ')}\n\nAuthor: ${input.actor} · Date: ${date} (UTC)\nStatus: draft\n${tags.length ? 'Tags: ' + tags.join(', ') + '\n' : ''}\n${input.body}\n`;
      await this.atomicWrite(directory, filename, content);
      return { id: ['knowledge', folder, filename].filter(Boolean).join('/'), title: input.title, body: content, folder, tags };
    });
  }

  async snapshot() {
    const [events, knowledge] = await Promise.all([this.history(), this.knowledge()]);
    return { records: project(events), ...knowledge, events, people: this.workspace.people };
  }
}
