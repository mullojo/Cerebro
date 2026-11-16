import { createApp, ref, computed } from 'https://esm.sh/vue@3.5.45';
import { render } from './view.js';
import { restorePersonTheme } from '/identity.js';
await restorePersonTheme();

createApp({ render, setup() {
  const sparks = ref(0);
  const rotation = computed(() => ['rotate-0', 'rotate-45', 'rotate-90', 'rotate-135', 'rotate-180', 'rotate-225', 'rotate-270', 'rotate-315'][sparks.value % 8]);
  const color = computed(() => ['text-forest-500', 'text-clay', 'text-forest-700'][sparks.value % 3]);
  return { sparks, rotation, color };
} }).mount('#project-app');
