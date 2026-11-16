import * as path from './src/paths.js';
import * as fs from 'node:fs/promises';
import http from 'node:http';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { Store } from './src/store.js';
import { outreachState, saveOutreach } from './src/outreach.js';

const CODE_ROOT = path.fromFileUrl(new URL('.', import.meta.url));
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
// The Tailwind browser CDN compiles into an injected stylesheet.
// Vue templates are precompiled, so scripts do not need unsafe-eval.
const POLICY = "default-src 'self'; script-src 'self' https://esm.sh https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; connect-src 'self' https://esm.sh; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

async function projects(root) {
  const directory = path.join(root, 'projects');
  let realDirectory;
  try { realDirectory = await fs.realpath(directory); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^[a-z0-9-]+$/.test(entry.name)) continue;
    try {
      const real = await fs.realpath(path.join(directory, entry.name, 'index.html'));
      if (!real.startsWith(realDirectory + '/')) continue;
      const html = await fs.readFile(real, 'utf8');
      result.push({ id: entry.name, title: html.match(/<title>([^<]+)<\/title>/i)?.[1] || entry.name,
        url: `/projects/${entry.name}/`, directory: `projects/${entry.name}/` });
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return result.sort((a, b) => a.id.localeCompare(b.id));
}

function failure(message, status) { return Object.assign(new Error(message), { status }); }

async function readBody(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw failure('Use application/json.', 415);
  const chunks = [];
  let size = 0;
  if (request.body) {
    for await (const chunk of request.body) {
      size += chunk.byteLength;
      if (size > 150000) throw failure('Request too large.', 413);
      chunks.push(chunk);
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch { throw failure('Expected a JSON object.', 400); }
}

export async function startServer({ root = process.env.CEREBRO_ROOT || CODE_ROOT, port = Number(process.env.PORT || 4310) } = {}) {
  const store = new Store(root);
  await store.open();
  let origin;
  const headers = { 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': POLICY };
  const json = (status, value) => Response.json(value, { status, headers: { ...headers, 'Cache-Control': 'no-store' } });
  const file = async filename => new Response(await fs.readFile(filename), { headers: {
    ...headers, 'Content-Type': `${TYPES[path.extension(filename)]}; charset=utf-8`, 'Cache-Control': 'no-cache',
  } });
  const handler = async request => {
    try {
      const url = new URL(request.url);
      if (url.origin !== origin || (request.headers.get('origin') && request.headers.get('origin') !== origin) ||
          request.headers.get('sec-fetch-site') === 'cross-site') return json(403, { error: 'Use the local Cerebro address.' });
      if (request.method === 'GET' && url.pathname === '/api/config') return json(200, store.workspace);
      if (request.method === 'GET' && url.pathname === '/api/outreach') return json(200, await outreachState(store));
      if (request.method === 'POST' && url.pathname === '/api/outreach') return json(200, await saveOutreach(store, await readBody(request)));
      if (request.method === 'GET' && url.pathname === '/api/state') return json(200, { ...await store.snapshot(), projects: await projects(store.root) });
      if (request.method === 'POST' && url.pathname === '/api/records') return json(201, await store.mutate(await readBody(request)));
      if (request.method === 'PATCH' && url.pathname.startsWith('/api/records/')) {
        return json(200, await store.mutate(await readBody(request), decodeURIComponent(url.pathname.slice('/api/records/'.length))));
      }
      if (request.method === 'POST' && url.pathname === '/api/notes') return json(201, await store.addNote(await readBody(request)));
      if (request.method !== 'GET') return json(405, { error: 'Method not allowed.' });
      if (url.pathname.startsWith('/projects/')) {
        const relative = decodeURIComponent(url.pathname.slice('/projects/'.length));
        if (relative.split('/').some(part => part.startsWith('.') || part.includes('\\'))) return json(404, { error: 'Not found.' });
        let base, filename;
        try {
          base = await fs.realpath(path.join(store.root, 'projects'));
          filename = await fs.realpath(path.join(base, relative + (relative.endsWith('/') ? 'index.html' : '')));
        } catch (error) { if (error.code === 'ENOENT') return json(404, { error: 'Not found.' }); throw error; }
        if (!filename.startsWith(base + '/') || !Object.hasOwn(TYPES, path.extension(filename))) return json(404, { error: 'Not found.' });
        return await file(filename);
      }
      const assets = { '/': 'web/index.html', '/app.js': 'web/app.js', '/markdown.js': 'web/markdown.js', '/drafts.js': 'web/drafts.js', '/identity.js': 'web/identity.js', '/src/model.js': 'src/model.js', '/src/workspace.js': 'src/workspace.js',
        '/src/presentation.js': 'src/presentation.js', '/src/knowledge.js': 'src/knowledge.js', '/generated/App.js': 'web/generated/App.js',
        '/generated/RecordCard.js': 'web/generated/RecordCard.js', '/generated/EmptyState.js': 'web/generated/EmptyState.js' };
      if (!Object.hasOwn(assets, url.pathname)) return json(404, { error: 'Not found.' });
      return await file(path.join(CODE_ROOT, assets[url.pathname]));
    } catch (error) {
      if (!error.status) console.error(error);
      return json(error.status || 500, { error: error.status ? error.message : 'Local storage failed. Check the server terminal.' });
    }
  };
  const server = http.createServer(async (incoming, outgoing) => {
    try {
      const request = new Request(new URL(incoming.url, `http://${incoming.headers.host}`), {
        method: incoming.method, headers: incoming.headers,
        ...(!['GET', 'HEAD'].includes(incoming.method) ? { body: Readable.toWeb(incoming), duplex: 'half' } : {}),
      });
      const response = await handler(request);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      console.error(error);
      if (!outgoing.headersSent) outgoing.writeHead(400, { 'Content-Type': 'application/json' });
      outgoing.end(JSON.stringify({ error: 'Invalid local request.' }));
    }
  });
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', resolve);
    });
  } catch (error) { await store.close(); throw error; }
  origin = `http://127.0.0.1:${server.address().port}`;
  let closing;
  return { server, store, url: origin, handler, close: () => {
    closing ||= (async () => {
      try { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
      finally { await store.close(); }
    })();
    return closing;
  } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const app = await startServer();
    console.log(`Cerebro alpha · ${app.url}\nRuntime: Node.js ${process.versions.node}\nShared files: ${app.store.root}\nPress Ctrl+C to stop.`);
    let stopping = false;
    const stop = async () => {
      if (stopping) return;
      stopping = true;
      try { await app.close(); }
      finally { for (const signal of ['SIGINT', 'SIGTERM']) process.removeListener(signal, stop); }
    };
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, stop);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
