<template>
  <main class="wrap stack">
    <div class="row"><h1 class="grow">Mijn quizzen</h1><label class="btn ghost" style="cursor: pointer">Quiz importeren (JSON)<input type="file" accept=".json,application/json" class="sr-only" @change="importQuiz" /></label><NuxtLink class="btn" to="/quizzes/new">Nieuwe quiz</NuxtLink></div>
    <p v-if="err" class="err">{{ err }}</p>
    <p v-if="list && !list.length" class="muted">Nog geen quizzen. Maak je eerste quiz!</p>
    <div v-for="q in list" :key="q.id" class="card row">
      <div class="grow">
        <h3 style="margin: 0">{{ q.title }}</h3>
        <span class="pill">{{ statusLabel[q.status] ?? q.status }}</span>
        <span class="pill">{{ q.mode === 'TEAM' ? 'Teamquiz' : 'Individueel' }}</span>
        <span class="pill">{{ q.questionCount }} vragen</span>
        <span v-if="q.status !== 'DRAFT'" class="pill gold mono">{{ q.joinCode }}</span>
      </div>
      <NuxtLink v-if="q.questionCount" class="btn ghost" :to="`/print/${q.id}`" title="Antwoordformulieren vooraf printen">Printen</NuxtLink>
      <NuxtLink v-if="q.status === 'DRAFT' || q.status === 'SCHEDULED'" class="btn ghost" :to="`/quizzes/${q.id}`">Bewerken</NuxtLink>
      <NuxtLink v-if="q.status === 'SCHEDULED' || q.status === 'LIVE'" class="btn" :to="`/host/${q.id}`">Presenteren</NuxtLink>
      <NuxtLink v-if="q.status === 'FINISHED'" class="btn ghost" :to="`/host/${q.id}`">Uitslag</NuxtLink>
    </div>
  </main>
</template>
<script setup lang="ts">
import type { QuizSummaryDto } from '@puntquiz/contracts'
const { user, loaded } = useAuth()
const list = ref<QuizSummaryDto[] | null>(null)
const err = ref('')
const statusLabel: Record<string, string> = { DRAFT: 'Concept', SCHEDULED: 'Gepubliceerd', LIVE: 'Live', FINISHED: 'Afgelopen', ARCHIVED: 'Gearchiveerd' }
async function load() {
  if (!user.value || user.value.isGuest) return navigateTo('/login?next=/quizzes')
  try { list.value = await api('/quizzes') } catch (e: any) { err.value = e.message }
}
async function importQuiz(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const q = await api('/quizzes/import', { method: 'POST', body: JSON.parse(await file.text()) })
    await navigateTo(`/quizzes/${q.id}`)
  } catch (er: any) { err.value = er.message }
}
watch(loaded, (v) => v && load(), { immediate: true })
</script>
