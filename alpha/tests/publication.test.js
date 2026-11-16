import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { checkPublication, exportPublic } from '../scripts/public-release.js';
const source = path.resolve(fileURLToPath(new URL('../../',import.meta.url)));

test('public export excludes runtime data and audit detects forced private files and secrets', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(),'cerebro-public-test-'));
  const root = path.join(temporary,'checkout');
  try {
    await exportPublic(root,source);
    await assert.rejects(fs.stat(path.join(root,'alpha/workspace.local.json')), {code:'ENOENT'});
    await assert.rejects(fs.stat(path.join(root,'alpha/knowledge')), {code:'ENOENT'});
    assert.ok((await fs.stat(path.join(root,'alpha/start.command'))).mode & 0o111);
    const git = args => execFileSync('git',['-C',root,...args],{stdio:'pipe'});
    git(['init','--quiet']);
    for (const name of ['alpha/knowledge/private.md','alpha/data/events/private.json','alpha/projects/unreviewed/index.html','alpha/.env','alpha/preview.png']) {
      await fs.mkdir(path.dirname(path.join(root,name)),{recursive:true});
      await fs.writeFile(path.join(root,name),'Fixture content must stay private.');
    }
    await checkPublication(root);
    git(['add','--force','alpha/knowledge/private.md']);
    await assert.rejects(checkPublication(root), /unreviewed file/);
    git(['rm','--cached','--force','alpha/knowledge/private.md']);
    const readme = path.join(root,'README.md');
    const original = await fs.readFile(readme,'utf8');
    await fs.appendFile(readme,'\n'+'sk-'+'x'.repeat(40));
    await assert.rejects(checkPublication(root), /credential-like token/);
    await fs.writeFile(readme,original);
    const script = path.join(root,'alpha/web/app.js'), backup = path.join(temporary,'original-app.js');
    await fs.rename(script,backup); await fs.symlink(backup,script);
    await assert.rejects(checkPublication(root), /regular files/);
  } finally { await fs.rm(temporary,{recursive:true,force:true}); }
});
