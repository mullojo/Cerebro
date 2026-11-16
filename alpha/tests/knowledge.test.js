import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTags, noteTags, folderRows, folderPath } from '../src/knowledge.js';
import { visibleItems } from '../src/presentation.js';
test('tags normalize and read metadata without mistaking later content for metadata', () => {
  assert.deepEqual(normalizeTags(' Emails, #DMs, emails, follow up '), ['emails','dms','follow-up']);
  assert.deepEqual(noteTags('# Context\n\nTags: emails, dms\n\n## Notes\nTags: other'), ['emails','dms']);
  assert.deepEqual(noteTags('---\ntags: ["emails", \'dms\']\n---\n# A note'), ['emails','dms']);
  assert.deepEqual(noteTags('# Context\n\n## Example\nTags: emails'), []);
  assert.throws(() => normalizeTags(['bad\ntag']));
  assert.throws(() => folderPath('Example/../../escape'));
});
test('tree collapse hides descendants and folder/tag filters intersect without matching sibling prefixes', () => {
  const folders = ['Example Project','Example Project/Outreach','Example Project/Outreach/DMs','Example Projecthere'];
  assert.deepEqual(folderRows(folders, ['Example Project']).map(n=>n.path), ['Example Project','Example Projecthere']);
  const state = { notes: [
    {id:'a',title:'Email',body:'',folder:'Example Project/Outreach',tags:['emails']},
    {id:'b',title:'DM',body:'',folder:'Example Project/Outreach/DMs',tags:['dms']},
    {id:'c',title:'Other',body:'',folder:'Example Projecthere',tags:['emails']}
  ] };
  assert.deepEqual(visibleItems(state,{view:'knowledge',folder:'Example Project',tag:'emails'}).map(n=>n.id), ['a']);
  assert.deepEqual(visibleItems(state,{view:'knowledge',tag:'emails'}).map(n=>n.id), ['a','c']);
});
