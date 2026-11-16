// Pure view rules shared by Vue and Node tests.
import { inbox, matches } from './model.js';
export const TITLES = {
  overview: ['A little shared thinking.', 'Your conversations, connected.', 'A calm place for people and their assistants to turn thoughts into progress.'],
  inbox: ['Your inbox', 'A thought, passed to you.', 'Handoffs and assigned tasks, with the context you need to pick them up.'],
  tasks: ['Shared tasks', 'Small steps. Shared momentum.', 'A clear owner, a useful next step, and a shared sense of what done looks like.'],
  knowledge: ['Shared knowledge', 'Context, with a place.', 'Browse projects and their folders, or follow a tag across your shared knowledge.'],
  tools: ['Local tools', 'An idea you can use.', 'Small browser tools and experiments, made together.'],
  decisions: ['Human decisions', 'A little more clarity.', 'The choices you have made, and the thinking that brought you there.'],
  activity: ['Workspace activity', 'See the thinking unfold.', 'A shared trail of handoffs, tasks, and decisions as they change.'],
};
export const capitalize = value => value ? value[0].toUpperCase() + value.slice(1) : '';
export const humanStatus = status => ({ doing: 'In progress', open: 'Open', active: 'Active', blocked: 'Blocked', done: 'Done', acknowledged: 'Acknowledged', superseded: 'Superseded' })[status] || status;
export function visibleItems(state, { view, actor, query = '', status = 'active', owner = '', folder = '', tag = '' }) {
  let rows;
  if (view === 'knowledge') rows = state.notes;
  else if (view === 'tools') rows = state.projects || [];
  else if (view === 'inbox') rows = actor ? inbox(state.records, actor) : [];
  else if (view === 'activity') rows = [...state.events].reverse().map(event => ({ ...event.record, event }));
  else {
    rows = [...state.records].reverse();
    if (view === 'tasks') rows = rows.filter(r => r.kind === 'task');
    if (view === 'decisions') rows = rows.filter(r => r.kind === 'decision');
    if (status === 'active') rows = rows.filter(r => !['done', 'acknowledged', 'superseded'].includes(r.status));
    else if (status !== 'all') rows = rows.filter(r => r.status === status);
  }
  if (view === 'knowledge') {
    if (folder) rows = rows.filter(n => n.folder === folder || n.folder?.startsWith(folder + '/'));
    if (tag) rows = rows.filter(n => n.tags?.includes(tag));
  }
  if (owner) rows = rows.filter(r => (r.to || r.author) === owner);
  return rows.filter(r => matches(r, query));
}
