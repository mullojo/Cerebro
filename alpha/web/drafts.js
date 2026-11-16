// Coalesce typing bursts without losing drafts on close, navigation, or save.
export function bufferedDrafts(write, { delay = 250, schedule = setTimeout, cancel = clearTimeout } = {}) {
  const pending = new Map();
  let timer;
  function flush() {
    cancel(timer); timer = undefined;
    for (const [key, value] of pending) write(key, value);
    pending.clear();
  }
  return {
    put(key, value) {
      pending.set(key, { ...value });
      cancel(timer); timer = schedule(flush, delay);
    },
    clear(key) { pending.delete(key); write(key, null); },
    flush,
  };
}
