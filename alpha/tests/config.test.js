import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server.js';
import { normalizePerson, validateWorkspace } from '../src/workspace.js';

test('local participant configuration preserves custom IDs and journal attribution after restart', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'cerebro-config-'));
  let app;
  try {
    const people = [{id:'person-one',name:'First participant',theme:'forest',aliases:['first']},{id:'person-two',name:'Second participant',theme:'magenta'}];
    await fs.writeFile(path.join(root,'workspace.local.json'),JSON.stringify({people}));
    app = await startServer({root,port:0});
    const config = await (await fetch(app.url+'/api/config')).json();
    assert.equal(config.people[0].id,'person-one');
    assert.equal(normalizePerson('first',config.people),'person-one');
    await assert.rejects(app.store.mutate({kind:'task',actor:'alex',to:'person-two',title:'Wrong person'}),/configured workspace person/);
    const record = await app.store.mutate({kind:'task',actor:'person-one',to:'person-two',title:'A real local task'});
    await app.close(); app = await startServer({root,port:0});
    assert.equal((await app.store.snapshot()).records.find(r=>r.id===record.id).author,'person-one');
    assert.equal((await fetch(app.url+'/workspace.local.json')).status,404);
    assert.throws(()=>validateWorkspace({people:[people[0],people[0]]}),/unique/);
  } finally { if(app) await app.close(); await fs.rm(root,{recursive:true,force:true}); }
});
