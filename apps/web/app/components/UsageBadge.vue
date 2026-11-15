<template>
  <div class="row" role="note">
    <span v-if="!usage.count" class="pill">Nog niet gebruikt</span>
    <span v-else class="pill gold">Laatst gebruikt: {{ usage.lastUsed?.title }} ({{ date }}) · {{ usage.count }}× gebruikt</span>
    <span v-if="usage.inDraft" class="pill">in een concept-quiz</span>
  </div>
</template>
<script setup lang="ts">
import type { BankUsage } from '@puntquiz/contracts'
const props = defineProps<{ usage: BankUsage }>()
const date = computed(() => (props.usage.lastUsed ? new Date(props.usage.lastUsed.date).toLocaleDateString('nl-NL') : ''))
</script>
