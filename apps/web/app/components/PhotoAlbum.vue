<script setup lang="ts">
interface Shot { file: string; title: string; text: string }
const props = defineProps<{ shots: Shot[] }>()

const open = ref<number | null>(null)
const dlg = ref<HTMLDialogElement | null>(null)
const current = computed(() => (open.value === null ? null : props.shots[open.value]))

function show(i: number) {
  open.value = i
  nextTick(() => { if (!dlg.value?.open) dlg.value?.showModal() })
}
function close() { dlg.value?.close(); open.value = null }
function step(d: number) { if (open.value !== null) open.value = (open.value + d + props.shots.length) % props.shots.length }
// Swipe left/right in the enlarged view (vertical movement still scrolls tall screenshots).
let sx = 0, sy = 0
function touchStart(e: TouchEvent) { sx = e.changedTouches[0]!.clientX; sy = e.changedTouches[0]!.clientY }
function touchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0]!.clientX - sx
  const dy = e.changedTouches[0]!.clientY - sy
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1)
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') step(1)
  else if (e.key === 'ArrowLeft') step(-1)
}
</script>

<template>
  <section class="album" aria-labelledby="album-h">
    <h2 id="album-h">Zo ziet het eruit</h2>
    <p class="muted">Schermen van een testquiz, zoals een speler ze op de telefoon ziet. Tik op een foto om hem groter te bekijken.</p>
    <ul class="grid">
      <li v-for="(s, i) in shots" :key="s.file">
        <button type="button" class="thumb" :aria-label="`${s.title}: vergroten`" @click="show(i)">
          <img :src="`/spelregels/${s.file}.jpg`" :alt="s.title" loading="lazy" width="390" height="520" />
          <span class="cap"><strong>{{ s.title }}</strong><span>{{ s.text }}</span></span>
        </button>
      </li>
    </ul>

    <dialog ref="dlg" class="lightbox" aria-label="Schermafbeelding" @close="open = null" @keydown="onKey" @click.self="close">
      <div v-if="current" class="lb-body">
        <div class="lb-bar">
          <strong>{{ current.title }}</strong>
          <button type="button" class="ghost small" @click="close">Sluiten</button>
        </div>
        <div class="lb-scroll" @touchstart.passive="touchStart" @touchend.passive="touchEnd"><img :src="`/spelregels/${current.file}.jpg`" :alt="current.title" /></div>
        <p class="muted lb-text">{{ current.text }}</p>
        <div class="lb-nav">
          <button type="button" class="ghost small" @click="step(-1)">← Vorige</button>
          <span class="muted">{{ (open ?? 0) + 1 }} / {{ shots.length }}<span class="hint"> · veeg om te bladeren</span></span>
          <button type="button" class="ghost small" @click="step(1)">Volgende →</button>
        </div>
      </div>
    </dialog>
  </section>
</template>

<style scoped>
.grid { list-style: none; margin: 16px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(125px, 1fr)); gap: 12px; }
@media (min-width: 640px) { .grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); } }
.thumb { all: unset; box-sizing: border-box; display: flex; flex-direction: column; width: 100%; height: 100%; cursor: pointer; border: 1px solid var(--border); border-radius: var(--r-md); background: var(--surface); overflow: hidden; }
.thumb:focus-visible { outline: 3px solid var(--accent-2); outline-offset: 2px; }
.thumb img { display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: cover; object-position: top; background: var(--surface-2); border-bottom: 1px solid var(--border); }
.cap { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px 10px; font-size: .85rem; line-height: 1.3; color: var(--ink-muted); }
.cap strong { color: var(--ink); font-size: .95rem; }
@media (hover: hover) { .thumb:hover { border-color: var(--accent); } }
.lightbox { border: 0; padding: 0; background: transparent; max-width: 100vw; max-height: 100dvh; width: min(560px, 100vw); margin: auto; }
.lightbox::backdrop { background: rgba(20, 12, 9, .75); }
.lb-body { background: var(--surface); color: var(--ink); border-radius: var(--r-lg); display: flex; flex-direction: column; max-height: 96dvh; margin: 2dvh 0; overflow: hidden; }
.lb-bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--border); }
.lb-scroll { touch-action: pan-y; overflow: auto; background: var(--bg); flex: 1 1 auto; min-height: 0; }
.lb-scroll img { display: block; width: 100%; height: auto; }
.lb-text { margin: 0; padding: 10px 14px 0; font-size: .92rem; }
.hint { display: none; }
@media (pointer: coarse) { .hint { display: inline; } }
.lb-nav { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px 12px; }
</style>
