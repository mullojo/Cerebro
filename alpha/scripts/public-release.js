// Publication is explicit: Git candidate files must exactly match the reviewed manifest.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const git = (args, options = {}) => execFileSync('git', args, { encoding: 'utf8', ...options });
export async function manifestFiles(root = ROOT) {
  const { files } = JSON.parse(await fs.readFile(path.join(root, 'public-files.json'), 'utf8'));
  if (!Array.isArray(files) || new Set(files).size !== files.length || files.some(f => typeof f !== 'string' || !/^[.a-zA-Z0-9_/-]+$/.test(f) || f.split('/').some(p => !p || p === '..'))) throw new Error('Invalid public file manifest.');
  return files;
}
export function ignoreRules(files) {
  const directories = new Set();
  for (const file of files) {
    const parts = file.split('/');
    for (let i = 1; i < parts.length; i++) directories.add(parts.slice(0,i).join('/'));
  }
  return '# Generated from public-files.json. Unlisted files are PRIVATE by default.\n# Do not force-add private files. See PUBLICATION.md.\n*\n' +
    [...directories].sort().map(d => '!/' + d + '/').join('\n') + '\n' + files.map(f => '!/' + f).join('\n') + '\n';
}
async function candidates(root) {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'cerebro-public-git-'));
  try {
    const gitDir = path.join(scratch, 'index.git');
    git(['init', '--bare', '--quiet', gitDir]);
    const untracked = git(['-c','core.excludesFile=/dev/null','--git-dir='+gitDir,'--work-tree='+root,'ls-files','--others','--exclude-standard','-z'], { cwd: root });
    let tracked = '';
    try { await fs.lstat(path.join(root, '.git')); tracked = git(['-C',root,'ls-files','--cached','-z']); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    return [...new Set((untracked + tracked).split('\0').filter(Boolean))].sort();
  } finally { await fs.rm(scratch, { recursive:true, force:true }); }
}
async function privateWords(root) {
  const words = new Set();
  try {
    const config = JSON.parse(await fs.readFile(path.join(root,'alpha/workspace.local.json'),'utf8'));
    for (const p of config.people || []) for (const text of [p.id,p.name,...p.aliases || []]) if (typeof text === 'string' && text.length >= 3) words.add(text);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  try { for (const entry of await fs.readdir(path.join(root,'alpha/knowledge'),{withFileTypes:true})) if (entry.isDirectory() && !entry.name.startsWith('.')) words.add(entry.name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return [...words];
}
export async function checkPublication(root = ROOT) {
  const files = await manifestFiles(root), issues = [];
  for (const [filename, expected] of [['.gitignore',ignoreRules(files)],['alpha/.gitignore',ignoreRules(files.filter(f=>f.startsWith('alpha/')).map(f=>f.slice(6)))]]) {
    if (await fs.readFile(path.join(root,filename),'utf8') !== expected) issues.push(filename+': ignore rules differ from the manifest; run sync first.');
  }
  const actual = await candidates(root);
  for (const file of actual) if (!files.includes(file)) issues.push(file+': Git would publish an unreviewed file.');
  for (const file of files) if (!actual.includes(file)) issues.push(file+': reviewed file is missing or ignored.');
  const patterns = [
    ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ['credential-like token', /(?:AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-(?:proj-)?[A-Za-z0-9_-]{24,})/],
    ['personal machine path', /\/(?:Users|home)\/[^\s/]+\/|\/private\/var\/folders\/|\/var\/folders\//],
    ['private conversation link', /chatgpt-conversation:\/\//],
    ['non-example email', /\b[A-Z0-9._%+-]+@(?!example\.(?:com|test|invalid)\b)[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
  ];
  const words = await privateWords(root);
  for (const file of files) {
    const full = path.join(root,file);
    const info = await fs.lstat(full);
    if (!info.isFile() || info.isSymbolicLink()) { issues.push(file+': public files must be regular files.'); continue; }
    // Refuse symlinked parent directories as well as symlinked files.
    for (let dir = path.dirname(full); dir !== root; dir = path.dirname(dir)) if ((await fs.lstat(dir)).isSymbolicLink()) issues.push(file+': symlinked parent directory.');
    const text = await fs.readFile(full,'utf8');
    if (text.includes('\0')) { issues.push(file+': binary files require a separate review; this manifest is text-only.'); continue; }
    for (const [label,pattern] of patterns) if (pattern.test(text)) issues.push(file+': '+label+'.');
    if (words.some(word => new RegExp('(?<![a-z0-9])'+word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![a-z0-9])','i').test(text))) issues.push(file+': private local identity or project name.');
  }
  if (issues.length) throw new Error('Publication audit failed:\n'+issues.map(i=>'  '+i).join('\n'));
  return files;
}
export async function exportPublic(destination, root = ROOT) {
  const files = await checkPublication(root);
  if (!destination) throw new Error('Specify an empty destination outside the working repository.');
  const target = path.resolve(destination);
  const parent = await fs.realpath(path.dirname(target));
  const resolved = path.join(parent,path.basename(target));
  if (resolved === root || resolved.startsWith(root+path.sep)) throw new Error('Export outside the working repository.');
  try {
    const info = await fs.lstat(target);
    if (info.isSymbolicLink() || !info.isDirectory() || (await fs.readdir(target)).length) throw new Error('Destination must be empty and must not be a symlink.');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.mkdir(target,{recursive:true});
  for (const file of files) {
    await fs.mkdir(path.dirname(path.join(target,file)),{recursive:true});
    await fs.copyFile(path.join(root,file),path.join(target,file));
    await fs.chmod(path.join(target,file),(await fs.stat(path.join(root,file))).mode & 0o777);
  }
  return target;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command = 'check', destination] = process.argv.slice(2);
    if (command === 'sync') {
      const files = await manifestFiles();
      await fs.writeFile(path.join(ROOT,'.gitignore'),ignoreRules(files));
      await fs.writeFile(path.join(ROOT,'alpha/.gitignore'),ignoreRules(files.filter(f=>f.startsWith('alpha/')).map(f=>f.slice(6))));
      console.log('Updated both ignore files from the public manifest.');
    } else if (command === 'check') console.log(`Publication audit passed: ${(await checkPublication()).length} reviewed public files. No repository was initialized.`);
    else if (command === 'export') console.log('Exported reviewed files to '+await exportPublic(destination));
    else throw new Error('Use check, sync, or export DESTINATION.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
