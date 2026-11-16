import { createApp, ref, computed, watch, onMounted, onUnmounted, nextTick, h } from 'https://esm.sh/vue@3.5.45';
import { render } from '/generated/App.js';
import { render as cardRender } from '/generated/RecordCard.js';
import { render as emptyRender } from '/generated/EmptyState.js';
import { inbox, STATUSES } from '/src/model.js';
import { visibleItems, TITLES, capitalize, humanStatus } from '/src/presentation.js';
import { renderMarkdown, markdownText } from '/markdown.js';
import { identityStorage, canonicalPerson, applyPersonTheme, workspace, personName } from '/identity.js';
import { folderRows } from '/src/knowledge.js';
import { bufferedDrafts } from '/drafts.js';

// The only HTML sink: renderMarkdown always parses and sanitizes first.
const MarkdownContent = { props: ['source'], setup(props) {
  return () => h('div', { class: 'markdown-content', innerHTML: renderMarkdown(props.source || '') });
} };

const icons = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  inbox: 'M4 4h16l2 11v5H2v-5L4 4Z M2 15h6l2 3h4l2-3h6',
  check: 'M9 11l3 3L22 4 M20 12v8H4V4h10',
  book: 'M4 3h14a2 2 0 0 1 2 2v16H6a3 3 0 0 1-3-3V5a2 2 0 0 1 1-2Z M6 17h14 M7 7h8 M7 11h6',
  folder: 'M3 7V4h6l3 3h9v13H3V7Z',
  diamond: 'm12 2 10 10-10 10L2 12 12 2Z M8 12l3 3 5-6',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  plus: 'M12 5v14 M5 12h14',
  search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  'arrow-right': 'M4 12h16 M14 6l6 6-6 6',
  'arrow-up-right': 'M6 18 18 6 M6 6h12v12',
  close: 'm6 6 12 12 M6 18 18 6',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  chevron: 'm9 5 7 7-7 7',
  spark: 'm12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z',
  circle: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z M8 12l3 3 5-6',
  refresh: 'M20 7a9 9 0 1 0 1 9 M20 2v6h-6',
  alert: 'm12 3 10 18H2L12 3Z M12 9v4 M12 17h.01',
  code: 'm8 5-7 7 7 7 M16 5l7 7-7 7 M14 3l-4 18',
  copy: 'M8 8h13v13H8z M16 8V3H3v13h5',
  users: 'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3 M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M18 3a4 4 0 0 1 0 8 M22 21v-3a4 4 0 0 0-3-4',
};
const AppIcon = { props: ['name'], setup(props, { attrs }) { return () => h('svg', {
  ...attrs, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6,
  'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
}, [h('path', { d: icons[props.name] || icons.spark })]); } };

const statusColors = {
  blocked: 'bg-amber-50 text-amber-800 ring-amber-200', doing: 'bg-sky-50 text-sky-800 ring-sky-200',
  done: 'bg-forest-50 text-forest-700 ring-forest-200', acknowledged: 'bg-forest-50 text-forest-700 ring-forest-200',
  superseded: 'bg-stone-100 text-stone-600 ring-stone-200',
};
const RecordCard = { render: cardRender, props: ['item', 'note', 'actor'], emits: ['read', 'change-status'], setup(props) {
  return { capitalize: personName, humanStatus,
    kindColor: computed(() => props.note ? 'text-forest-600' : props.item.kind === 'decision' ? 'text-violet-700' : props.item.kind === 'message' ? 'text-clay' : 'text-forest-700'),
    statusColor: computed(() => statusColors[props.item.status] || 'bg-stone-50 text-stone-600 ring-stone-200'),
    excerpt: computed(() => {
      const body = props.note ? props.item.body.replace(/^# .+\n/, '').replace(/^(Author|Status|Tags):.*\n/gm, '') : props.item.body;
      const text = markdownText(body);
      return text.length > 220 ? text.slice(0, 220).trimEnd() + '…' : text;
    }),
    canUpdate: computed(() => props.actor && !props.note && (props.item.kind === 'task' ||
      (props.item.kind === 'message' && props.item.to === props.actor && props.item.status === 'open') ||
      (props.item.kind === 'decision' && props.item.status === 'active'))),
  };
} };
const EmptyState = { render: emptyRender, props: ['title', 'text', 'action', 'icon'], emits: ['action'] };

async function api(endpoint, method = 'GET', data) {
  let response;
  try { response = await fetch(endpoint, { method, signal: AbortSignal.timeout(10000),
    ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}) }); }
  catch { throw new Error('The local server is unavailable. Start Cerebro and try again.'); }
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || 'Could not save that change.'), { status: response.status });
  return result;
}
function getSession(key, fallback) {
  try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function setSession(key, value) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* storage may be disabled */ } }

const nav = [ ['overview', 'Overview', 'grid'], ['inbox', 'My inbox', 'inbox'], ['tasks', 'Tasks', 'check'],
  ['knowledge', 'Knowledge', 'book'], ['tools', 'Tools', 'code'], ['decisions', 'Decisions', 'diamond'], ['activity', 'Activity', 'activity'] ]
  .map(([id, title, icon]) => ({ id, title, icon }));

const personStorage = identityStorage();
let rememberedPerson = canonicalPerson(getSession('cerebro-actor', ''));
try { rememberedPerson = await personStorage.load(rememberedPerson); } catch { /* Tab preference still works when browser storage is unavailable. */ }

createApp({ render, setup() {
  const state = ref({ records: [], notes: [], folders: [], events: [], projects: [] });
  const actor = ref(rememberedPerson);
  const people = workspace.people;
  applyPersonTheme(rememberedPerson);
  const initialView = location.hash.slice(1) === 'projects' ? 'tools' : location.hash.slice(1);
  const view = ref(Object.hasOwn(TITLES, initialView) ? initialView : 'overview');
  const folder = ref(''), tag = ref(''), collapsedFolders = ref([]);
  const knowledgeFolders = computed(() => state.value.folders || []);
  const treeRows = computed(() => folderRows(knowledgeFolders.value, collapsedFolders.value));
  const tags = computed(() => [...new Set(state.value.notes.flatMap(n => n.tags || []))].sort());
  const breadcrumbs = computed(() => folder.value.split('/').filter(Boolean).map((title, i, parts) => ({ title, path: parts.slice(0,i+1).join('/') })));
  const folderIndent = depth => ['ml-0','ml-4','ml-8','ml-12','ml-16','ml-20'][Math.min(depth,5)];
  const folderCount = path => state.value.notes.filter(n => n.folder === path || n.folder?.startsWith(path + '/')).length;
  function toggleFolder(path) { collapsedFolders.value = collapsedFolders.value.includes(path) ? collapsedFolders.value.filter(p => p !== path) : [...collapsedFolders.value, path]; }
  function chooseFolder(path) { folder.value = path; query.value = ''; }
  const query = ref(''), status = ref('active'), owner = ref('');
  const loading = ref(true), refreshing = ref(false), connected = ref(false), error = ref('');
  const saving = ref(false), formError = ref(''), conflict = ref(false), notice = ref('');
  const composeDialog = ref(), updateDialog = ref(), detailDialog = ref(), identityDialog = ref(), navigationDialog = ref(), searchInput = ref();
  const form = ref({ kind: 'task', title: '', body: '', to: people[1].id });
  const update = ref({ status: 'open', reason: '' });
  const selected = ref(null), detailRecord = ref(null), detailIsNote = ref(false);
  const readMode = ref('rendered'), formPreview = ref(false);
  const detailBody = computed(() => {
    const body = detailRecord.value?.body || 'No additional details.';
    const lines = body.split('\n');
    return detailIsNote.value && lines[0] === '# ' + detailRecord.value.title
      ? lines.slice(1).join('\n').trimStart() : body;
  });
  const draftWriter = bufferedDrafts(setSession);
  const flushDrafts = () => draftWriter.flush();
  let continuation = null, draftReady = false, poll, noticeTimer;

  const heading = computed(() => TITLES[view.value]);
  const inboxCount = computed(() => actor.value ? inbox(state.value.records, actor.value).length : 0);
  const hasWork = computed(() => state.value.records.length > 0);
  const items = computed(() => visibleItems(state.value, { view: view.value, actor: actor.value, query: query.value, status: status.value, owner: owner.value, folder: folder.value, tag: tag.value }));
  const recentNotes = computed(() => state.value.notes.slice(-2));
  const metrics = computed(() => [
    { title: 'Open tasks', value: state.value.records.filter(r => r.kind === 'task' && r.status !== 'done').length, icon: 'check', target: 'tasks', hint: 'A next step, with an owner' },
    { title: 'Shared notes', value: state.value.notes.length, icon: 'book', target: 'knowledge', hint: 'A little collective memory' },
    { title: 'Active decisions', value: state.value.records.filter(r => r.kind === 'decision' && r.status === 'active').length, icon: 'diamond', target: 'decisions', hint: 'The choices you have made' },
    { title: 'Your inbox', value: actor.value ? inboxCount.value : '—', icon: 'inbox', target: 'inbox', hint: actor.value ? `Waiting for ${personName(actor.value)}` : 'Choose your name to check in' },
  ]);
  const createKind = computed(() => ({ inbox: 'message', knowledge: 'note', decisions: 'decision' })[view.value] || 'task');
  const createLabel = computed(() => ({ overview: 'Add something', inbox: 'Send a handoff', tasks: 'New task', knowledge: 'New note', decisions: 'Record a decision', activity: 'Add something' })[view.value] || 'Add something');
  const kindLabel = computed(() => ({ task: 'task', message: 'handoff', note: 'note', decision: 'decision' })[form.value.kind]);
  const kindHint = computed(() => ({ task: 'Include the desired outcome, context, and what done looks like.', message: 'Include the context, useful files, and one clear next action.', note: 'Capture sources, findings, assumptions, and open questions. Markdown is welcome.', decision: 'Record a decision a human has actually made. Name who decided, why, and the sources.' })[form.value.kind]);
  const empty = computed(() => {
    if (query.value || owner.value || tag.value || status.value !== 'active') return { title: 'Nothing matches just yet.', text: 'Try a different word or clear the filters to see more.', action: 'Clear filters', icon: 'search', type: 'clear' };
    if (view.value === 'inbox') return actor.value ? { title: 'All caught up.', text: 'New handoffs and unfinished tasks assigned to you will appear here.', icon: 'circle' } : { title: 'Whose inbox is this?', text: 'Choose your name to see what is waiting for you.', action: 'Choose your name', icon: 'users', type: 'identity' };
    if (view.value === 'activity') return { title: 'Your story starts here.', text: 'Tasks, handoffs, and decisions leave a trail here as you work together.', icon: 'activity' };
    if (view.value === 'tools') return { title: 'Make room for an experiment.', text: 'Your chat can help you create a new browser tool from the starter.', action: 'How to add a tool', icon: 'folder', type: 'project' };
    return { title: ({ tasks: 'A clear next step goes a long way.', knowledge: 'Keep your first useful thought.', decisions: 'Keep the why, as well as the what.' })[view.value] || 'Your next good idea belongs here.', text: 'Add a little context now so the next conversation can start further ahead.', action: ({ tasks: 'Create a task', knowledge: 'Capture a note', decisions: 'Record a decision' })[view.value] || 'Capture a note', icon: ({ tasks: 'check', knowledge: 'book', decisions: 'diamond' })[view.value] || 'spark', type: 'create' };
  });
  const latestSelected = computed(() => selected.value && state.value.records.find(r => r.id === selected.value.id));

  const resetFilters = () => { query.value = ''; status.value = 'active'; owner.value = ''; tag.value = ''; };
  function navigate(next) {
    view.value = next; resetFilters(); location.hash = next;
    navigationDialog.value?.close();
    nextTick(() => document.getElementById('page-title')?.focus({ preventScroll: true }));
  }
  function notify(text) { notice.value = text; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => notice.value = '', 7000); }
  async function refresh() {
    if (refreshing.value) return;
    refreshing.value = true;
    try { state.value = await api('/api/state'); connected.value = true; error.value = ''; }
    catch (e) { connected.value = false; error.value = e.message; }
    finally { loading.value = false; refreshing.value = false; }
  }
  function openIdentity(kind) { continuation = kind || null; identityDialog.value.showModal(); }
  function chooseIdentity(name) {
    actor.value = name; identityDialog.value.close();
    if (continuation) { const kind = continuation; continuation = null; openCompose(kind); }
  }
  async function openCompose(kind = createKind.value) {
    if (!actor.value) return openIdentity(kind);
    flushDrafts(); draftReady = false; formPreview.value = false;
    const draft = getSession(`cerebro-draft-${actor.value}-${kind}`, null);
    form.value = draft || { kind, title: '', body: '', folder: folder.value, tags: tag.value, to: people.find(p => p.id !== actor.value).id };
    formError.value = ''; conflict.value = false;
    await nextTick();
    draftReady = true; composeDialog.value.showModal();
    document.getElementById('compose-title')?.focus({ preventScroll: true });
  }
  function changeKind() {
    const kind = form.value.kind;
    const draft = getSession(`cerebro-draft-${actor.value}-${kind}`, null);
    if (draft && !form.value.title && !form.value.body) form.value = draft;
  }
  async function saveCompose() {
    if (saving.value) return;
    saving.value = true; formError.value = '';
    try {
      await api(form.value.kind === 'note' ? '/api/notes' : '/api/records', 'POST', { ...form.value, actor: actor.value });
      draftReady = false; draftWriter.clear(`cerebro-draft-${actor.value}-${form.value.kind}`);
      composeDialog.value.close();
      const target = { task: 'tasks', message: 'inbox', note: 'knowledge', decision: 'decisions' }[form.value.kind];
      notify(form.value.kind === 'message' ? `Handoff saved for ${personName(form.value.to)}.` : `${capitalize(kindLabel.value)} saved to Cerebro.`);
      // Sent messages belong to the recipient's inbox; keep the sender in overview.
      if (form.value.kind !== 'message' && view.value !== 'overview') navigate(target);
      await refresh();
    } catch (e) { formError.value = e.message; }
    finally { saving.value = false; }
  }
  async function openDetail(item, note = view.value === 'knowledge') {
    detailRecord.value = item; detailIsNote.value = note; readMode.value = 'rendered';
    await nextTick(); detailDialog.value.showModal();
    document.getElementById('detail-close')?.focus({ preventScroll: true });
  }
  async function openUpdate(item) {
    selected.value = { ...item }; update.value = { status: item.kind === 'task' ? item.status : STATUSES[item.kind][0], reason: '' };
    formError.value = ''; conflict.value = false;
    detailDialog.value?.close(); await nextTick(); updateDialog.value.showModal();
    document.getElementById('update-status')?.focus({ preventScroll: true });
  }
  async function saveUpdate() {
    if (saving.value) return;
    saving.value = true; formError.value = ''; conflict.value = false;
    try {
      await api(`/api/records/${encodeURIComponent(selected.value.id)}`, 'PATCH', {
        ...update.value, actor: actor.value, expect: selected.value.revision,
      });
      updateDialog.value.close(); notify('Update saved. The shared history is up to date.'); await refresh();
    } catch (e) { formError.value = e.message; conflict.value = e.status === 409; if (conflict.value) await refresh(); }
    finally { saving.value = false; }
  }
  function reviewLatest() {
    if (!latestSelected.value) return;
    selected.value = { ...latestSelected.value }; update.value.status = selected.value.status;
    conflict.value = false; formError.value = ''; notify('Latest version loaded. Review the status and reason before saving.');
  }
  function projectHelp() { openDetail({ title: 'Start a new browser tool', id: 'projects/', body: 'Ask your Codex chat to copy projects/starter into a new tool folder and describe what you want to build.\n\nFor example: “Make a shared idea board in projects/idea-board using Vue 3 and Tailwind CSS 4.”\n\nOnce the folder has an index.html, it will appear here. Open the tool, edit it with your chat, and refresh to see changes.' }, true); }
  function emptyAction() {
    if (empty.value.type === 'clear') resetFilters();
    else if (empty.value.type === 'identity') openIdentity();
    else if (empty.value.type === 'project') projectHelp();
    else openCompose(view.value === 'overview' ? 'note' : createKind.value);
  }
  function followKnowledgeLink(event) {
    if (!detailIsNote.value || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a');
    if (!link) return;
    const url = new URL(link.getAttribute('href'), new URL('/' + detailRecord.value.id, location.origin));
    if (url.origin !== location.origin || !url.pathname.startsWith('/knowledge/')) return;
    const note = state.value.notes.find(n => n.id === decodeURIComponent(url.pathname.slice(1)));
    if (note) { event.preventDefault(); openDetail(note, true); }
  }
  async function copyId() {
    try { await navigator.clipboard.writeText(detailRecord.value.id); notify('Reference copied.'); }
    catch { notify('Copy unavailable. Select the reference text to copy it.'); }
  }
  function shortcuts(e) {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) && !document.querySelector('dialog[open]')) {
      e.preventDefault(); searchInput.value?.focus();
    }
  }
  function hashChanged() { const hash = location.hash.slice(1) === 'projects' ? 'tools' : location.hash.slice(1); if (Object.hasOwn(TITLES, hash) && hash !== view.value) { view.value = hash; resetFilters(); } }
  function onVisible() {
    if (document.hidden) flushDrafts();
    else if (!document.querySelector('dialog[open]')) refresh();
  }
  watch(actor, value => {
    applyPersonTheme(value);
    setSession('cerebro-actor', value);
    personStorage.save(value).catch(() => notify('Your name is kept for this tab. Browser storage is unavailable, so it may not be remembered next time.'));
  }, { flush: 'sync' });
  watch(form, value => { if (draftReady && actor.value) draftWriter.put(`cerebro-draft-${actor.value}-${value.kind}`, value); }, { deep: true });
  onMounted(() => { refresh(); poll = setInterval(onVisible, 4000); document.addEventListener('visibilitychange', onVisible); document.addEventListener('keydown', shortcuts); window.addEventListener('hashchange', hashChanged); window.addEventListener('pagehide', flushDrafts); });
  onUnmounted(() => { flushDrafts(); clearInterval(poll); clearTimeout(noticeTimer); document.removeEventListener('visibilitychange', onVisible); document.removeEventListener('keydown', shortcuts); window.removeEventListener('hashchange', hashChanged); window.removeEventListener('pagehide', flushDrafts); });

  return { previewMode: new URLSearchParams(location.search).has('preview'), nav, state, actor, people, view, folder, tag, knowledgeFolders, treeRows, tags, breadcrumbs, folderIndent, folderCount, toggleFolder, chooseFolder, followKnowledgeLink, query, status, owner, heading, inboxCount, hasWork, items, recentNotes, metrics, createKind, createLabel,
    kindLabel, kindHint, empty, latestSelected, loading, refreshing, connected, error, saving, formError, conflict, notice,
    composeDialog, updateDialog, detailDialog, identityDialog, navigationDialog, searchInput, form, update, selected, detailRecord, detailIsNote, detailBody, readMode, formPreview, flushDrafts,
    capitalize, personName, humanStatus, STATUSES, navigate, resetFilters, refresh, openIdentity, chooseIdentity, openCompose, changeKind, saveCompose,
    openDetail, openUpdate, saveUpdate, reviewLatest, projectHelp, emptyAction, copyId,
    date: value => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
  };
} }).component('AppIcon', AppIcon).component('RecordCard', RecordCard).component('EmptyState', EmptyState).component('MarkdownContent', MarkdownContent).mount('#app');
