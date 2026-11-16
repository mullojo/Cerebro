import { createApp, ref, reactive, computed, watch } from 'https://esm.sh/vue@3.5.45';
import { render } from './view.js';
import { tokens, personalize, initialState } from './model.js';
import { restorePersonTheme, applyPersonTheme, identityStorage, workspace, personName } from '/identity.js';
const profilePerson = await restorePersonTheme();
const personPreference = identityStorage();

createApp({ render, setup() {
  const people = workspace.people;
  const state = ref(initialState()), loading = ref(true), busy = ref(false), error = ref(''), notice = ref(''), conflict = ref(false);
  const tab = ref('compose'), actor = ref(profilePerson), query = ref('');
  const contact = reactive({}), template = reactive({}), draft = reactive({});
  const contactId = ref(''), templateId = ref('starter-1'), senderName = ref(personName(profilePerson)), productUrl = ref('');
  const dirty = reactive({ contacts: false, templates: false, drafts: false });
  const reset = (target, value) => { Object.keys(target).forEach(k => delete target[k]); Object.assign(target, value); };
  const newContact = () => { reset(contact, { name:'', email:'', title:'', organization:'', website:'', instagram:'', personalNote:'', notes:'', status:'New' }); dirty.contacts = false; };
  const newTemplate = () => { reset(template, { name:'', subject:'', body:'' }); dirty.templates = false; };
  const newDraft = () => { reset(draft, { name:'', contactId:'', templateId:'', email:'', subject:'', body:'' }); dirty.drafts = false; };
  newContact(); newTemplate(); newDraft();
  const selectedContact = computed(() => state.value.contacts.find(c => c.id === contactId.value));
  const selectedTemplate = computed(() => state.value.templates.find(t => t.id === templateId.value));
  const contacts = computed(() => state.value.contacts.filter(c => [c.name,c.email,c.organization,c.title,c.status].join(' ').toLowerCase().includes(query.value.toLowerCase())));
  const missing = computed(() => [...new Set([...personalize(draft.subject || '', {}).missing, ...personalize(draft.body || '', {}).missing])]);
  const ready = computed(() => Boolean(draft.body?.trim() && draft.subject?.trim() && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(draft.email || '') && !/[\r\n]/.test(draft.email + draft.subject) && !missing.value.length));
  const hasDirty = () => Object.values(dirty).some(Boolean);
  function persistScratch() {
    try { sessionStorage.setItem('astro-outreach-scratch', JSON.stringify({contact,template,draft,dirty,actor:actor.value,senderName:senderName.value,productUrl:productUrl.value,contactId:contactId.value,templateId:templateId.value})); } catch {}
  }
  try {
    const scratch = JSON.parse(sessionStorage.getItem('astro-outreach-scratch') || 'null');
    if (scratch) { for (const [key,obj] of Object.entries({contact,template,draft,dirty})) Object.assign(obj,scratch[key]); actor.value=profilePerson || scratch.actor || ''; senderName.value=scratch.senderName || ''; productUrl.value=scratch.productUrl || ''; contactId.value=scratch.contactId || ''; templateId.value=scratch.templateId || 'starter-1'; }
  } catch {}
  applyPersonTheme(actor.value);
  watch(actor, value => { applyPersonTheme(value); personPreference.save(value).catch(() => { error.value = 'Your name is kept for this tab; browser preference storage is unavailable.'; }); });
  watch([contact,template,draft,dirty,actor,senderName,productUrl,contactId,templateId], persistScratch, {deep:true});
  window.addEventListener('beforeunload', event => { persistScratch(); if(hasDirty()) {event.preventDefault();event.returnValue='';} });
  async function load(manual=false) {
    if (manual && hasDirty() && !window.confirm('Load shared changes? Your unsaved forms stay in this tab. Download a backup first if needed.')) return;
    loading.value=true; error.value='';
    try { const r=await fetch('/api/outreach'); if(!r.ok) throw new Error('Cannot load outreach. Check that the updated Cerebro server is running.'); state.value=await r.json(); conflict.value=false; }
    catch(e) { error.value=e.message; } finally { loading.value=false; }
  }
  async function save(collection,item) {
    if(!actor.value) { error.value='Choose who is editing before saving.'; return; }
    busy.value=true; error.value=''; notice.value='';
    try {
      const r=await fetch('/api/outreach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({actor:actor.value,expect:state.value.revision,collection,item})});
      const result=await r.json(); if(!r.ok) {conflict.value=r.status===409; throw new Error(result.error);}
      state.value=result.state; reset(item,result.item); dirty[collection]=false; notice.value='Saved to the shared workspace.';
    } catch(e) { error.value=e.message; } finally {busy.value=false;}
  }
  function edit(collection,item) {
    if(dirty[collection] && !window.confirm('Replace the unsaved form? Download your work first to keep it.')) return;
    reset(collection==='contacts'?contact:collection==='templates'?template:draft, JSON.parse(JSON.stringify(item))); dirty[collection]=false;
  }
  function duplicateTemplate() {
    delete template.id; template.name = (template.name || 'New template') + ' / variant'; dirty.templates = true; notice.value = 'New variant ready to edit. Save to add it to the library.';
  }
  function fresh(collection) {
    if(dirty[collection] && !window.confirm('Start a new form and discard these unsaved changes?')) return;
    ({contacts:newContact,templates:newTemplate,drafts:newDraft})[collection]();
  }
  function generate() {
    if(!selectedContact.value || !selectedTemplate.value) {error.value='Choose a contact and a template.';return;}
    if(dirty.drafts && !window.confirm('Replace your unsaved email with a new personalized draft?')) return;
    const c=selectedContact.value, t=selectedTemplate.value;
    const values={...c,firstName:c.name.trim().split(/\s+/)[0],senderName:senderName.value,productUrl:productUrl.value};
    reset(draft,{name:`${c.name} · ${t.name}`,contactId:c.id,templateId:t.id,email:c.email,subject:personalize(t.subject,values).text,body:personalize(t.body,values).text});
    dirty.drafts=true; error.value=''; notice.value='Email prepared. Review and edit it below, then save or copy.';
  }
  async function copy(value,label) {
    try {await navigator.clipboard.writeText(value);notice.value=`${label} copied.`;error.value='';}
    catch {error.value='Clipboard is unavailable. Select and copy the text directly from the field.';}
  }
  function download(scratch=false) {
    const value=scratch?{state:state.value,unsaved:{contact,template,draft},dirty}:state.value;
    const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=`astro-outreach${scratch?'-unsaved':''}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  load();
  return {people,state,loading,busy,error,notice,conflict,tab,actor,query,contact,template,draft,dirty,contactId,templateId,senderName,productUrl,contacts,tokens,missing,ready,save,edit,fresh,duplicateTemplate,generate,copy,download,load};
} }).mount('#project-app');
