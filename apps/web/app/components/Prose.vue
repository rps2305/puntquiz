<template>
  <span>
    <template v-for="(s, i) in parts" :key="i">
      <strong v-if="s.type === 'b'">{{ s.t }}</strong>
      <mark v-else-if="s.type === 'ph'" class="placeholder" title="Nog in te vullen door de eigenaar">{{ s.t }}</mark>
      <template v-else>{{ s.t }}</template>
    </template>
  </span>
</template>
<script setup lang="ts">
const props = defineProps<{ text: string }>()
// No v-html: split into bold / placeholder / plain segments.
const parts = computed(() =>
  props.text.split(/(\*\*[^*]+\*\*|\[PLACEHOLDER[^\]]*\])/).filter(Boolean).map((t) =>
    t.startsWith('**') ? { type: 'b', t: t.slice(2, -2) } : t.startsWith('[PLACEHOLDER') ? { type: 'ph', t } : { type: 't', t },
  ),
)
</script>
<style scoped>
.placeholder { background: var(--accent-2); color: var(--accent-2-ink); border-radius: 6px; padding: 0 4px; }
</style>
