// Public defaults contain fictional example participants. Personal settings stay local.
export const DEFAULT_WORKSPACE = { people: [
  { id: 'alex', name: 'Alex', theme: 'forest', aliases: [] },
  { id: 'sam', name: 'Sam', theme: 'magenta', aliases: [] },
] };
export function validateWorkspace(value = DEFAULT_WORKSPACE) {
  if (!Array.isArray(value.people) || value.people.length < 2 || value.people.length > 20) throw new Error('Configure between 2 and 20 people.');
  const ids = new Set();
  const people = value.people.map(p => {
    if (!p || !/^[a-z][a-z0-9-]{0,39}$/.test(p.id) || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 80 || !['forest','magenta'].includes(p.theme)) throw new Error('Each person needs a unique lowercase ID, name, and forest or magenta theme.');
    ids.add(p.id);
    if (p.aliases !== undefined && (!Array.isArray(p.aliases) || p.aliases.some(a => typeof a !== 'string' || !/^[a-z][a-z0-9-]{0,39}$/.test(a)))) throw new Error('Person aliases must be lowercase IDs.');
    return { id: p.id, name: p.name.trim(), theme: p.theme, aliases: p.aliases || [] };
  });
  return { people };
}
export function normalizePerson(value, people = DEFAULT_WORKSPACE.people) {
  return people.find(p => p.id === value || p.aliases?.includes(value))?.id || '';
}
