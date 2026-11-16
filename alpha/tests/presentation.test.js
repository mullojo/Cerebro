import { visibleItems } from '../src/presentation.js';
import { test } from 'node:test';

const state = {
  records: [
    { id: 'task-a', kind: 'task', title: 'Review café idea', body: 'Context', author: 'alex', to: 'sam', status: 'open' },
    { id: 'task-b', kind: 'task', title: 'Archived task', body: '', author: 'alex', to: 'alex', status: 'done' },
    { id: 'message-a', kind: 'message', title: 'Read this', body: '', author: 'alex', to: 'sam', status: 'open' },
    { id: 'decision-a', kind: 'decision', title: 'Old choice', body: '', author: 'alex', status: 'superseded' },
  ],
  notes: [{ id: 'note-a', title: 'Shared café context', body: 'Evidence' }],
  projects: [{ id: 'starter', title: 'A small beginning' }], events: [],
};
const ids = options => visibleItems(state, options).map(r => r.id).join(',');
function equal(actual, expected) { if (actual !== expected) throw new Error(`Expected ${expected}; got ${actual}`); }

test('task filters distinguish active, completed, all, and assigned owner', () => {
  equal(ids({ view: 'tasks' }), 'task-a');
  equal(ids({ view: 'tasks', status: 'done' }), 'task-b');
  equal(ids({ view: 'tasks', status: 'all', owner: 'alex' }), 'task-b');
  equal(ids({ view: 'tasks', query: 'CAFÉ' }), 'task-a');
});
test('inbox cannot show another person’s unassigned work', () => {
  equal(ids({ view: 'inbox', actor: '' }), '');
  equal(ids({ view: 'inbox', actor: 'alex' }), '');
  equal(ids({ view: 'inbox', actor: 'sam' }), 'task-a,message-a');
});
test('knowledge, project, and archived decision views remain searchable', () => {
  equal(ids({ view: 'knowledge', query: 'Evidence' }), 'note-a');
  equal(ids({ view: 'tools', query: 'small' }), 'starter');
  equal(ids({ view: 'decisions' }), '');
  equal(ids({ view: 'decisions', status: 'superseded' }), 'decision-a');
});
