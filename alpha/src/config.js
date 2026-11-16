import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_WORKSPACE, validateWorkspace } from './workspace.js';
export async function loadWorkspace(root) {
  try { return validateWorkspace(JSON.parse(await fs.readFile(path.join(root, 'workspace.local.json'), 'utf8'))); }
  catch (error) { if (error.code === 'ENOENT') return validateWorkspace(DEFAULT_WORKSPACE); throw error; }
}
