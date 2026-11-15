<template>
  <main class="wrap stack">
    <article class="card stack prose">
      <h1>Presentator worden</h1>
      <template v-if="!loaded" />
      <template v-else-if="!user || user.isGuest">
        <p>Alleen meespelen kan met een gast of een account. Om zelf quizzen te maken en te presenteren heb je een account nodig, en moet de beheerder je toestemming geven.</p>
        <p><NuxtLink class="btn" to="/login?next=/presentator">Inloggen of account maken</NuxtLink></p>
      </template>
      <template v-else-if="user.canHost">
        <p class="ok">Je mag quizzen maken en presenteren.</p>
        <p><NuxtLink class="btn" to="/quizzes">Naar mijn quizzen</NuxtLink></p>
      </template>
      <template v-else-if="user.hostRequested || sent">
        <p class="ok">Je aanvraag is verstuurd. De beheerder krijgt een mail en beslist. Zodra je bent goedgekeurd, krijg je ook een mail en verschijnen "Mijn quizzen" en "Vragenbank" bovenaan.</p>
      </template>
      <template v-else>
        <p>Meespelen mag iedereen. Quizzen maken en presenteren (vragen bewaren, een quiz starten, antwoorden nakijken) mag alleen met toestemming van de beheerder. Dat houdt het voor iedereen overzichtelijk.</p>
        <p>Vraag toestemming aan: de beheerder krijgt een mail met je naam en e-mailadres.</p>
        <p v-if="err" class="err" role="alert">{{ err }}</p>
        <p><button :disabled="busy" @click="ask">Toestemming vragen</button></p>
      </template>
    </article>
  </main>
</template>
<script setup lang="ts">
const { user, loaded, fetchMe } = useAuth()
const busy = ref(false)
const sent = ref(false)
const err = ref('')
useHead({ title: 'Presentator worden — PuntQuiz' })
onMounted(() => { if (!loaded.value) void fetchMe() })
async function ask() {
  busy.value = true; err.value = ''
  try { await api('/host/request', { method: 'POST' }); sent.value = true; await fetchMe() } catch (e: any) { err.value = e.message } finally { busy.value = false }
}
</script>
