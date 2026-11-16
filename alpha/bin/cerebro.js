#!/usr/bin/env node
// Codex and the browser use the same API, so there's only one disk writer.
import { inbox, matches, person } from '../src/model.js';
import { readFile } from 'node:fs/promises';

const HELP = `Cerebro alpha — local collaboration

Start the server first: ./alpha/start.command
From alpha: node bin/cerebro.js COMMAND [options] (or ./node bin/cerebro.js)

status                         Workspace summary
inbox PERSON                   Unread messages + unfinished assigned tasks
list [--kind task|message|decision] [--status STATUS] [--json]
show ID [--json]                Read one record
history [--id ID]               JSON change history
search WORDS                   Search records and Markdown notes
notes [--folder PATH] [--tag TAG] [--json]  Browse shared knowledge
task|message|decision --actor PERSON --title TEXT [--to PERSON]
                     [--body TEXT | --body-file FILE]
note --actor PERSON --title TEXT --body TEXT [--folder PATH] [--tags emails,dms]
update ID --actor PERSON --expect REVISION --status STATUS --reason TEXT

--url http://127.0.0.1:4310      Override server URL (or CEREBRO_URL)
--help                         Show this help
Tasks/messages require --to. Decisions represent actual human decisions.
No direct disk writes: all mutations pass through the server.`;

function parse(argv) {
  const options = {}, positionals = [];
  const valued = ['url', 'kind', 'status', 'actor', 'title', 'to', 'body', 'body-file', 'expect', 'reason', 'id', 'folder', 'tags', 'tag'];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (!arg.startsWith('--')) { positionals.push(arg); continue; }
    const key = arg.slice(2);
    if (['json', 'help'].includes(key)) { options[key] = true; continue; }
    if (!valued.includes(key)) throw new Error(`Unknown option: ${arg}`);
    if (argv[index + 1] === undefined || argv[index + 1].startsWith('--')) throw new Error(`Missing value for ${arg}`);
    options[key] = argv[++index];
  }
  return { options, command: positionals[0], argument: positionals.slice(1).join(' ') };
}

function output(records, json) {
  if (json) return console.log(JSON.stringify(records, null, 2));
  if (!records.length) console.log('Nothing here yet.');
  for (const record of records) {
    console.log(`${record.id}  [${record.kind}/${record.status}] r${record.revision}  ${record.title}\nBy: ${record.author} | For: ${record.to || 'shared'}\n${record.body}\n${record.last_reason ? 'Last update: ' + record.last_reason + '\n' : ''}`);
  }
}

try {
  const { options: o, command, argument } = parse(process.argv.slice(2));
  if (o.help || !command) console.log(HELP);
  else {
    const base = new URL(o.url || process.env.CEREBRO_URL || 'http://127.0.0.1:4310');
    if (base.protocol !== 'http:' || base.hostname !== '127.0.0.1') throw new Error('Use a local http://127.0.0.1 server URL.');
    async function api(endpoint, method = 'GET', data) {
      let response;
      try {
        response = await fetch(new URL(endpoint, base), { method, signal: AbortSignal.timeout(10000),
          ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}) });
      } catch (error) { throw new Error(`Cannot reach Cerebro at ${base.origin}. Start the server with ./start.command in alpha. (${error.message})`); }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    }
    if (['task', 'message', 'decision', 'note'].includes(command)) {
      if (o.body !== undefined && o['body-file']) throw new Error('Choose --body or --body-file.');
      const input = { kind: command, actor: o.actor, title: o.title, to: o.to,
        folder: o.folder, tags: o.tags, body: o['body-file'] ? await readFile(o['body-file'], 'utf8') : o.body || '' };
      const record = await api(command === 'note' ? '/api/notes' : '/api/records', 'POST', input);
      if (command === 'note') console.log(record.id); else output([record], o.json);
    } else if (command === 'update') {
      if (!argument || !Number.isInteger(Number(o.expect)) || Number(o.expect) < 1) throw new Error('Specify a record ID and a positive --expect revision.');
      output([await api(`/api/records/${encodeURIComponent(argument)}`, 'PATCH', {
        actor: o.actor, expect: Number(o.expect), status: o.status, reason: o.reason,
      })], o.json);
    } else {
      if (!['status', 'inbox', 'list', 'show', 'history', 'search', 'notes'].includes(command)) throw new Error(`Unknown command: ${command}`);
      const state = await api('/api/state');
      if (command === 'status') {
        for (const { id: who } of state.people) {
          const items = inbox(state.records, who);
          console.log(`${who}: ${items.filter(r => r.kind === 'message').length} unread messages, ${items.filter(r => r.kind === 'task').length} unfinished tasks`);
        }
        console.log(`${state.notes.length} knowledge notes; ${state.records.filter(r => r.kind === 'decision' && r.status === 'active').length} active decisions`);
      } else if (command === 'inbox') output(inbox(state.records, person(argument, state.people.map(p => p.id))), o.json);
      else if (command === 'list') output(state.records.filter(r => (!o.kind || r.kind === o.kind) && (!o.status || r.status === o.status)), o.json);
      else if (command === 'show') {
        const found = state.records.find(r => r.id === argument);
        if (!found) throw new Error('Record not found.');
        output([found], o.json);
      } else if (command === 'history') console.log(JSON.stringify(state.events.filter(e => !o.id || e.record.id === o.id), null, 2));
      else if (command === 'notes') {
        const notes = state.notes.filter(n => (!o.folder || n.folder === o.folder || n.folder?.startsWith(o.folder + '/')) && (!o.tag || n.tags?.includes(o.tag)));
        console.log(o.json ? JSON.stringify(notes, null, 2) : notes.map(n => `${n.id}\n  ${n.title}${n.tags?.length ? ' · #' + n.tags.join(' #') : ''}`).join('\n'));
      }
      else {
        if (!argument) throw new Error('Enter a search term.');
        output(state.records.filter(r => matches(r, argument)), o.json);
        for (const note of state.notes.filter(n => matches(n, argument))) console.log(`Knowledge: ${note.id}\n${note.body}\n`);
      }
    }
  }
} catch (error) { console.error('Error: ' + error.message); process.exitCode = 1; }
