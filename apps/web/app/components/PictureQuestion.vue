<template>
  <div class="card stack" style="background: var(--surface-2); margin: 0">
    <div class="row"><strong class="grow">{{ question.number }}. {{ question.text }}</strong><span class="pill mono">{{ question.points }} pt</span></div>
    <QuestionMedia :items="question.media ?? []" />

    <div v-if="question.type === 'MUSIC'" class="stack">
      <input v-model="m.artist" maxlength="100" placeholder="Artiest" :disabled="disabled" :aria-label="`Artiest, vraag ${question.number}`" @input="saveMusic" />
      <input v-model="m.title" maxlength="100" placeholder="Titel" :disabled="disabled" :aria-label="`Titel, vraag ${question.number}`" @input="saveMusic" />
      <input v-model="m.year" inputmode="numeric" maxlength="4" placeholder="Jaar (optioneel)" :disabled="disabled" :aria-label="`Jaar, vraag ${question.number}`" @input="saveMusic" />
    </div>
    <input v-else-if="question.type === 'OPEN'" v-model="text" maxlength="200" placeholder="Typ je antwoord…" :disabled="disabled" :aria-label="`Antwoord vraag ${question.number}`" @input="saveText" />
    <div v-else>
      <button
        v-for="o in question.options" :key="o.id" type="button" class="option" :class="{ selected: picked.includes(o.id), multi: question.type === 'MULTI' }"
        :disabled="disabled" :aria-pressed="picked.includes(o.id)" @click="pick(o.id)"
      ><span class="mark">{{ picked.includes(o.id) ? '✓' : '' }}</span>{{ o.text }}</button>
    </div>
    <p v-if="saved" class="muted" style="margin: 0; font-size: .85rem">✓ opgeslagen</p>
  </div>
</template>
<script setup lang="ts">
import type { QuestionDto } from '@puntquiz/contracts'
const props = defineProps<{ question: QuestionDto; answer: string[] | undefined; disabled: boolean }>()
const emit = defineEmits<{ answer: [questionId: string, selected: string[]] }>()
const picked = computed(() => props.answer ?? [])
const saved = computed(() => !!props.answer?.some(Boolean))
const text = ref(props.answer?.[0] ?? '')
const m = reactive({ artist: props.answer?.[0] ?? '', title: props.answer?.[1] ?? '', year: props.answer?.[2] ?? '' })
let timer: ReturnType<typeof setTimeout> | null = null
const later = (fn: () => void) => { if (timer) clearTimeout(timer); timer = setTimeout(fn, 500) }
function saveText() { later(() => { const t = text.value.trim(); if (t) emit('answer', props.question.id, [t]) }) }
function saveMusic() { later(() => { if (m.artist.trim() || m.title.trim() || m.year.trim()) emit('answer', props.question.id, [m.artist, m.title, m.year]) }) }
function pick(id: string) {
  const cur = picked.value
  emit('answer', props.question.id, props.question.type === 'MC' ? [id] : cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
}
</script>
