import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server.js';
import { personalize, initialState } from '../projects/outreach/model.js';

test('personalization preserves unknown tokens and treats contact text literally', () => {
  assert.deepEqual(personalize('Hi {{firstName}}, {{personalNote}} {{unknown}}', {firstName:'Ava',personalNote:'I like {{your}} work <script>'}), {text:'Hi Ava, I like {{your}} work <script> {{unknown}}',missing:['unknown']});
  const state=initialState();
  assert.equal(state.templates.length,6);
  for(const template of state.templates) {
    assert.deepEqual(personalize(template.body,{firstName:'Ava',personalNote:'I enjoyed your recent talk.',productUrl:'https://example.test',senderName:'Sam'}).missing,[]);
  }
});

test('outreach API persists shared records, rejects stale concurrent writes and survives restart', async () => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'outreach-test-'));
  let app;
  try {
    app=await startServer({root,port:0});
    const request=async(input,origin) => {
      const r=await fetch(app.url+'/api/outreach', input?{method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:JSON.stringify(input)}:{});
      return {status:r.status,body:await r.json()};
    };
    assert.equal((await request()).body.revision,0);
    assert.equal((await request()).body.contacts.length,0);
    const input={actor:'alex',expect:0,collection:'contacts',item:{name:'Test Astrologer',email:'test@example.test',status:'New',personalNote:'A thoughtful talk',notes:'Never put this in an email'}};
    assert.equal((await request(input,'https://foreign.test')).status,403);
    assert.equal((await request({...input,actor:'stranger'})).status,400);
    assert.equal((await request({...input,item:{...input.item,email:'bad-address'}})).status,400);
    const results=await Promise.all([request(input),request(input)]);
    assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
    let state=(await request()).body;
    assert.equal(state.contacts.length,1);
    const id=state.contacts[0].id;
    assert.equal((await request({...input,expect:1,item:{...state.contacts[0],status:'Replied'}})).status,200);
    const template=state.templates[0];
    assert.equal((await request({actor:'sam',expect:2,collection:'templates',item:{...template,subject:'A new subject'}})).status,200);
    const saved=await request({actor:'alex',expect:3,collection:'drafts',item:{name:'A personal draft',contactId:id,templateId:template.id,email:'test@example.test',subject:'Hello',body:'A saved email'}});
    assert.equal(saved.status,200);
    assert.equal(saved.body.state.drafts[0].updatedBy,'alex');
    assert.equal((await request({actor:'alex',expect:4,collection:'templates',item:{name:'Variant seven',subject:'Another approach',body:'Hello {{name}}'}})).status,200);
    assert.equal((await request()).body.templates.length,7);
    assert.equal((await request({actor:'alex',expect:5,collection:'drafts',item:{name:'bad',subject:'Hello\nInjected',body:'Body'}})).status,400);
    await app.close();
    app=await startServer({root,port:0});
    state=(await request()).body;
    assert.equal(state.revision,5);
    assert.equal(state.contacts[0].status,'Replied');
    assert.equal(state.templates[0].subject,'A new subject');
    assert.equal(state.drafts[0].body,'A saved email');
    assert.equal((await app.store.history()).length,0);
    assert.equal((await fs.readdir(path.join(root,'data/outreach'))).length,5);
  } finally { if(app) await app.close(); await fs.rm(root,{recursive:true,force:true}); }
});
