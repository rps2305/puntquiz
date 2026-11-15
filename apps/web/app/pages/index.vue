<template>
  <main class="wrap stack">
    <section class="hero">
      <div class="hero-text stack">
        <h1>Elke speler telt,<br />ook in een team.</h1>
        <p class="muted lead">Iedereen speelt mee op de eigen telefoon: jouw antwoord, jouw punten, jouw team.</p>
        <form class="row" @submit.prevent="go">
          <input v-model="code" class="mono join-code" placeholder="Quizcode" maxlength="8" aria-label="Quizcode" autocomplete="off" />
          <button :disabled="code.trim().length < 4">Meedoen</button>
        </form>
        <p v-if="err" class="err">{{ err }}</p>
        <p class="muted small-note">Geen app nodig. Scan de QR-code van de presentator of vul de code in.</p>
        <InstallHint />
      </div>
      <HeroArt class="hero-art-wrap" />
    </section>
    <section class="card">
      <h2>Quizmaster?</h2>
      <p>Maak een account, bouw je quiz en presenteer hem live.</p>
      <NuxtLink class="btn ghost" :to="user && !user.isGuest ? '/quizzes' : '/login?next=/quizzes'">{{ user && !user.isGuest ? 'Mijn quizzen' : 'Inloggen of registreren' }}</NuxtLink>
    </section>
  </main>
</template>
<script setup lang="ts">
const { user } = useAuth()
const code = ref('')
const err = ref('')
async function go() {
  err.value = ''
  const c = code.value.trim().toUpperCase()
  try {
    await api(`/play/${c}`)
    await navigateTo(`/play/${c}`)
  } catch (e: any) {
    err.value = e.status === 404 ? 'Deze quizcode bestaat niet (of is nog niet gepubliceerd).' : e.message
  }
}
</script>
<style scoped>
.hero { display: grid; grid-template-columns: 1.05fr 1fr; gap: 24px; align-items: center; padding: 12px 4px 8px; }
.lead { font-size: 1.15rem; margin: 0; }
.join-code { max-width: 200px; text-transform: uppercase; text-align: center; font-size: 1.2rem; }
.small-note { font-size: .9rem; margin: 0; }
.hero h1 { font-size: clamp(2rem, 5vw, 3.1rem); margin: 0; }
@media (max-width: 720px) {
  .hero { grid-template-columns: 1fr; }
  .hero-art-wrap { order: -1; max-width: 320px; margin: 0 auto; }
}
</style>
