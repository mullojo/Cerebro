// Shared knowledge metadata and folder rules; no filesystem/browser dependencies.
export function normalizeTags(value = []) {
  const tags = typeof value === 'string' ? value.split(',') : value;
  if (!Array.isArray(tags) || tags.length > 32 || tags.some(t => typeof t !== 'string')) throw new Error('Use up to 32 comma-separated tags.');
  return [...new Set(tags.map(t => t.trim().toLowerCase().replace(/^#/, '').replace(/ +/g, '-')).filter(Boolean))].map(tag => {
    if (tag.length > 48 || !/^[\p{L}\p{N}_-]+$/u.test(tag)) throw new Error('Tags use letters, numbers, hyphens, or underscores (48 characters maximum).');
    return tag;
  });
}
export function noteTags(body) {
  const header = body.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  const line = (header || body.split(/\r?\n##\s/)[0]).match(/^tags:\s*([^\r\n]*)/im)?.[1];
  if (!line) return [];
  try { return normalizeTags(line.replace(/^\[|\]$/g, '').split(',').map(t => t.trim().replace(/^['"]|['"]$/g, ''))); }
  catch { return []; }
}
export function folderPath(value = '') {
  if (typeof value !== 'string' || value.length > 240) throw new Error('Use a relative knowledge folder path (240 characters maximum).');
  const folder = value.trim();
  if (folder && folder.split('/').some(part => !part.trim() || part.startsWith('.') || /[\\\x00-\x1f:]/.test(part))) throw new Error('Use folder names separated by /; hidden folders and traversal are not allowed.');
  return folder;
}
export function folderRows(folders, collapsed = []) {
  const hidden = new Set(collapsed);
  return [...folders].sort((a,b) => a.localeCompare(b)).filter(folder => {
    const parts = folder.split('/');
    return !parts.slice(0,-1).some((_,i) => hidden.has(parts.slice(0,i+1).join('/')));
  }).map(folder => ({ path: folder, title: folder.split('/').at(-1), depth: folder.split('/').length - 1,
    children: folders.some(other => other.startsWith(folder + '/')), expanded: !hidden.has(folder) }));
}
