<script setup lang="ts">
import type { MediaDto } from '@puntquiz/contracts'

defineProps<{ items: MediaDto[] }>()
const open = ref<number | null>(null)
const toggle = (i: number) => { open.value = open.value === i ? null : i }
</script>

<template>
  <div v-if="items.length" class="peek">
    <div class="peek-row">
      <template v-for="(m, i) in items" :key="i">
        <button v-if="m.kind === 'image'" type="button" class="peek-thumb" :class="{ on: open === i }" :aria-expanded="open === i" aria-label="Afbeelding bekijken" @click="toggle(i)">
          <img :src="m.src" alt="" loading="lazy" />
        </button>
        <button v-else type="button" class="ghost small" :aria-expanded="open === i" @click="toggle(i)">
          {{ m.kind === 'audio' ? '🎵 Beluister' : '▶ Bekijk video' }}
        </button>
      </template>
    </div>
    <template v-for="(m, i) in items" :key="'o' + i">
      <div v-if="open === i" class="peek-open">
        <img v-if="m.kind === 'image'" :src="m.src" alt="Afbeelding bij de vraag" class="peek-img" />
        <audio v-else-if="m.kind === 'audio'" :src="m.src" controls autoplay style="width: 100%" />
        <iframe
          v-else :src="m.src" title="Video bij de vraag" allowfullscreen
          sandbox="allow-scripts allow-same-origin allow-presentation" allow="encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"
          class="peek-video"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.peek { margin-top: 8px; }
.peek-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.peek-thumb { all: unset; box-sizing: border-box; cursor: pointer; width: 72px; height: 54px; border-radius: var(--r-sm); border: 2px solid var(--border); overflow: hidden; background: var(--surface-2); }
.peek-thumb:focus-visible { outline: 3px solid var(--accent-2); outline-offset: 2px; }
.peek-thumb.on { border-color: var(--accent); }
.peek-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
.peek-open { margin-top: 10px; }
.peek-img { display: block; max-width: 100%; max-height: 60vh; border-radius: var(--r-md); margin: 0 auto; }
.peek-video { width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: var(--r-md); }
</style>
