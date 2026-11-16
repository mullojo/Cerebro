// Pure browser-compatible logic. No Node APIs or storage assumptions here.
import { DEFAULT_WORKSPACE } from './workspace.js';
export const PEOPLE = DEFAULT_WORKSPACE.people.map(p => p.id);
export const STATUSES = {
  task: ['open', 'doing', 'blocked', 'done'],
  message: ['acknowledged'],
  decision: ['superseded'],
};

export class ValidationError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function requireText(value, name, max = 100000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new ValidationError(`${name} is required (maximum ${max} characters).`);
  }
  return value.trim();
}

export function person(value, people = PEOPLE) {
  if (!people.includes(value)) throw new ValidationError('Choose a configured workspace person.');
  return value;
}

export function createRecord(input, id, people = PEOPLE) {
  const { kind, actor, to } = input;
  if (!Object.hasOwn(STATUSES, kind)) throw new ValidationError('Unknown record kind.');
  person(actor, people);
  if (kind !== 'decision') person(to, people);
  if (input.body !== undefined && (typeof input.body !== 'string' || input.body.length > 100000)) {
    throw new ValidationError('Details must be text under 100,000 characters.');
  }
  return { id: `${kind}-${id}`, kind, title: requireText(input.title, 'Title', 240),
    body: input.body || '', author: actor, to: kind === 'decision' ? null : to,
    revision: 1, status: kind === 'decision' ? 'active' : 'open' };
}

export function updateRecord(record, input, people = PEOPLE) {
  person(input.actor, people);
  if (input.expect !== record.revision) {
    throw new ValidationError(`Revision conflict: current revision is ${record.revision}. Refresh and review before updating.`, 409);
  }
  if (!STATUSES[record.kind]?.includes(input.status)) throw new ValidationError('Invalid status for this record.');
  if (record.kind === 'message' && input.actor !== record.to) {
    throw new ValidationError('Only the recipient may acknowledge a message.', 403);
  }
  return { ...record, status: input.status, revision: record.revision + 1,
    last_reason: requireText(input.reason, 'Update reason') };
}

export function project(events) {
  const records = new Map();
  for (const event of events) records.set(event.record.id, event.record);
  return [...records.values()];
}

export function inbox(records, who) {
  return records.filter(r => r.to === who &&
    ((r.kind === 'message' && r.status === 'open') || (r.kind === 'task' && r.status !== 'done')));
}

export function matches(record, query) {
  return `${record.title || ''} ${record.body || ''} ${record.id || ''} ${record.author || ''} ${record.folder || ''} ${(record.tags || []).join(' ')}`
    .toLocaleLowerCase().includes(query.toLocaleLowerCase());
}
