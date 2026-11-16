import * as fs from 'node:fs/promises';
import path from 'node:path';
import { initialState } from '../projects/outreach/model.js';
import { person, ValidationError } from './model.js';

export async function outreachState(store) {
  const directory = path.join(store.root, 'data/outreach');
  let names;
  try { names = (await fs.readdir(directory)).filter(n => /^\d{12}\.json$/.test(n)).sort(); }
  catch (error) { if (error.code === 'ENOENT') return initialState(); throw error; }
  return names.length ? JSON.parse(await fs.readFile(path.join(directory, names.at(-1)), 'utf8')) : initialState();
}
const limits = {
  contacts: { name: 240, email: 320, title: 240, organization: 240, website: 1000, instagram: 240, personalNote: 5000, notes: 10000, status: 40 },
  templates: { name: 240, subject: 500, body: 20000 },
  drafts: { name: 240, contactId: 100, templateId: 100, email: 320, subject: 500, body: 20000 },
};
export function saveOutreach(store, input) {
  return store.serialize(async () => {
    person(input.actor, store.people);
    const state = await outreachState(store);
    if (!Number.isInteger(input.expect) || input.expect !== state.revision) throw new ValidationError('Shared outreach changed. Download your unsaved work, then load the latest version before saving again.', 409);
    const fields = limits[input.collection];
    if (!fields || !input.item || typeof input.item !== 'object') throw new ValidationError('Choose a contact, template, or draft.');
    const item = {};
    for (const [key, max] of Object.entries(fields)) {
      const value = input.item[key] ?? '';
      if (typeof value !== 'string' || value.length > max) throw new ValidationError(`${key} must be text of at most ${max} characters.`);
      item[key] = value.trim();
    }
    if (!item.name) throw new ValidationError('A name is required.');
    if (input.collection !== 'contacts' && (!item.subject || !item.body)) throw new ValidationError('Subject and body are required.');
    if (input.collection === 'contacts') {
      if (item.email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(item.email)) throw new ValidationError('Enter a valid email address or leave it blank.');
      if (!['New', 'Contacted', 'Replied', 'Interested', 'Not a fit'].includes(item.status)) throw new ValidationError('Choose a contact status.');
    }
    if (item.email && /[\r\n]/.test(item.email) || item.subject && /[\r\n]/.test(item.subject)) throw new ValidationError('Email and subject must be one line.');
    const previous = input.item.id && state[input.collection].find(x => x.id === input.item.id);
    if (input.item.id && !previous) throw new ValidationError('Item no longer exists.', 404);
    item.id = previous?.id || crypto.randomUUID();
    item.updatedBy = input.actor;
    item.updatedAt = new Date().toISOString();
    if (previous) state[input.collection] = state[input.collection].map(x => x.id === item.id ? item : x);
    else state[input.collection].push(item);
    state.revision++;
    state.updatedBy = input.actor;
    state.updatedAt = item.updatedAt;
    await store.atomicWrite(path.join(store.root, 'data/outreach'), `${String(state.revision).padStart(12, '0')}.json`, JSON.stringify(state, null, 2) + '\n');
    return { state, item };
  });
}
