// Browser preferences are separate from the shared on-disk records.
import { DEFAULT_WORKSPACE, normalizePerson, validateWorkspace } from '/src/workspace.js';
export let workspace = DEFAULT_WORKSPACE;
try {
  const response = await fetch('/api/config');
  if (response.ok) workspace = validateWorkspace(await response.json());
} catch { /* Keep the UI usable so its connection error can explain recovery. */ }
export const canonicalPerson = value => normalizePerson(value, workspace.people);
export const personName = value => workspace.people.find(p => p.id === value)?.name || value || '';

export function identityStorage(factory = globalThis.indexedDB) {
  let writes = Promise.resolve();
  async function transaction(mode, action) {
    if (!factory) throw new Error('IndexedDB is unavailable.');
    const db = await new Promise((resolve, reject) => {
      const request = factory.open('cerebro-preferences', 1);
      let blocked = false;
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('preferences')) request.result.createObjectStore('preferences');
      };
      request.onsuccess = () => { if (blocked) request.result.close(); else resolve(request.result); };
      request.onerror = () => reject(request.error);
      request.onblocked = () => { blocked = true; reject(new Error('Browser preference storage is blocked.')); };
    });
    db.onversionchange = () => db.close();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('preferences', mode);
        const request = action(tx.objectStore('preferences'));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error || new Error('Could not save browser preference.'));
        tx.onabort = () => reject(tx.error || new Error('Browser preference write was interrupted.'));
      });
    } finally { db.close(); }
  }
  return {
    async load(fallback = '') {
      const value = await transaction('readonly', store => store.get('person'));
      if (value !== undefined) return canonicalPerson(value);
      const person = canonicalPerson(fallback);
      if (person) await transaction('readwrite', store => store.put(person, 'person'));
      return person;
    },
    save(value) {
      const person = canonicalPerson(value);
      const next = writes.then(() => transaction('readwrite', store => store.put(person, 'person')));
      writes = next.catch(() => {});
      return next;
    },
  };
}


export function applyPersonTheme(person) {
  const selected = canonicalPerson(person);
  const theme = workspace.people.find(p => p.id === selected)?.theme || 'forest';
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'magenta' ? '#4b1c41' : '#193e35');
}

export async function restorePersonTheme() {
  let person = '';
  try { person = canonicalPerson(JSON.parse(sessionStorage.getItem('cerebro-actor'))); } catch {}
  try { person = await identityStorage().load(person); } catch {}
  applyPersonTheme(person);
  return person;
}
