<template>
  <div class="theme-toggle" role="group" aria-label="Thema">
    <button
      v-for="o in options" :key="o.value" type="button" class="ghost small"
      :class="{ active: choice === o.value }" :aria-pressed="choice === o.value" :aria-label="o.label" :title="o.label"
      @click="set(o.value)"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="o.icon" />
    </button>
  </div>
</template>
<script setup lang="ts">
import type { ThemeChoice } from '~/composables/useTheme'
const options: { value: ThemeChoice; label: string; icon: string }[] = [
  { value: 'system', label: 'Systeemthema', icon: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>' },
  { value: 'light', label: 'Licht thema', icon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' },
  { value: 'dark', label: 'Donker thema', icon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>' },
]
const choice = ref<ThemeChoice>('system')
function set(v: ThemeChoice) {
  choice.value = v
  try { localStorage.setItem('pq:theme', v) } catch {}
  applyTheme(v)
}
onMounted(() => {
  try { choice.value = (localStorage.getItem('pq:theme') as ThemeChoice) || 'system' } catch {}
  applyTheme(choice.value)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(choice.value))
})
</script>
<style scoped>
.theme-toggle { display: inline-flex; gap: 2px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-md); padding: 2px; }
.theme-toggle button { min-height: 32px; width: 36px; padding: 0; background: transparent; border: 0; color: var(--ink-muted); }
.theme-toggle button.active { background: var(--accent); color: var(--accent-ink); }
</style>
