import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bufferedDrafts } from '../web/drafts.js';
function fixture() {
  const writes = [], jobs = new Map(); let id = 0;
  const drafts = bufferedDrafts((key, value) => writes.push([key, value]), {
    schedule(fn) { jobs.set(++id, fn); return id; }, cancel(id) { jobs.delete(id); }
  });
  return { drafts, writes, jobs };
}
test('draft writes coalesce edits and preserve separate drafts', () => {
  const { drafts, writes, jobs } = fixture();
  const first = { body: 'first' };
  drafts.put('note', first); first.body = 'mutated';
  drafts.put('task', { title: 'next' });
  drafts.put('note', { body: 'latest' });
  assert.equal(writes.length, 0); assert.equal(jobs.size, 1);
  [...jobs.values()][0]();
  assert.deepEqual(writes, [['note', { body: 'latest' }], ['task', { title: 'next' }]]);
});
test('flush preserves last edit and clear cannot resurrect a saved draft', () => {
  const { drafts, writes, jobs } = fixture();
  drafts.put('note', { body: 'unfinished' }); drafts.flush();
  assert.equal(jobs.size, 0);
  drafts.put('note', { body: 'saved' }); drafts.clear('note'); drafts.flush();
  assert.deepEqual(writes, [['note', { body: 'unfinished' }], ['note', null]]);
});
