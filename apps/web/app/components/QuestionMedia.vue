<template>
  <div v-if="items.length" class="stack">
    <template v-for="(m, i) in items" :key="i">
      <img v-if="m.kind === 'image'" :src="m.src" alt="Afbeelding bij de vraag" loading="lazy" style="max-width: 100%; max-height: 60vh; border-radius: var(--r-md); display: block; margin: 0 auto" />
      <audio v-else-if="m.kind === 'audio'" :src="m.src" controls preload="none" style="width: 100%" />
      <!-- Third-party embed: privacy-enhanced domain, sandboxed, no referrer details beyond origin. -->
      <iframe
        v-else-if="m.kind === 'youtube'" :src="m.src" title="Video bij de vraag" loading="lazy" allowfullscreen
        sandbox="allow-scripts allow-same-origin allow-presentation" allow="encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"
        style="width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: var(--r-md)"
      />
      <p v-if="m.kind === 'audio' && hostHint && !m.players" class="muted" style="margin: 0; font-size: .85rem">🔊 Speel dit af via de speakers. Spelers zien/horen dit niet op hun telefoon.</p>
    </template>
  </div>
</template>
<script setup lang="ts">
import type { MediaDto } from '@puntquiz/contracts'
defineProps<{ items: MediaDto[]; hostHint?: boolean }>()
</script>
