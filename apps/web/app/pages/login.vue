<template>
  <main class="wrap stack" style="max-width: 460px">
    <div class="card stack">
      <h1>{{ mode === 'login' ? 'Welkom terug' : mode === 'register' ? 'Account maken' : 'Als gast meedoen' }}</h1>
      <p v-if="route.query.error" class="err" role="alert">{{ route.query.error }}</p>
      <a v-if="cfg.oidc" class="btn" :href="ssoHref">Inloggen met PuntQuiz-account</a>
      <p v-if="cfg.oidc" class="muted" style="margin: 0">Via Google, Microsoft, e-mail of je PuntQuiz-account. Staf gebruikt tweestapsverificatie.</p>
      <div class="row">
        <button v-if="cfg.localAuth" class="ghost small" :aria-pressed="mode === 'login'" @click="mode = 'login'">Inloggen</button>
        <button v-if="cfg.localAuth" class="ghost small" :aria-pressed="mode === 'register'" @click="mode = 'register'">Registreren</button>
        <button class="ghost small" :aria-pressed="mode === 'guest'" @click="mode = 'guest'">Gast</button>
      </div>
      <form class="stack" @submit.prevent="submit">
        <div v-if="mode !== 'login'">
          <label for="name">Naam</label>
          <input id="name" v-model="name" autocomplete="nickname" required minlength="2" maxlength="40" />
        </div>
        <template v-if="mode !== 'guest'">
          <div><label for="email">E-mail</label><input id="email" v-model="email" type="email" autocomplete="email" required /></div>
          <div>
            <label for="pw">Wachtwoord</label>
            <input id="pw" v-model="password" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" required minlength="8" />
          </div>
        </template>
        <p v-if="err" class="err" role="alert">{{ err }}</p>
        <button :disabled="busy">{{ mode === 'login' ? 'Inloggen' : mode === 'register' ? 'Account maken' : 'Doorgaan als gast' }}</button>
      </form>
      <p v-if="mode === 'guest'" class="muted">Gasten hoeven geen account; je kunt later upgraden zonder je deelname te verliezen.</p>
    </div>
  </main>
</template>
<script setup lang="ts">
const route = useRoute()
const { user } = useAuth()
const cfg = ref({ oidc: false, localAuth: true })
const mode = ref<'login' | 'register' | 'guest'>(route.query.guest ? 'guest' : 'login')
const nextPath = computed(() => (typeof route.query.next === 'string' && route.query.next.startsWith('/') ? route.query.next : '/'))
const ssoHref = computed(() => `/api/auth/oidc/login?next=${encodeURIComponent(nextPath.value)}`)
onMounted(async () => {
  try {
    cfg.value = await api('/auth/config')
    if (!cfg.value.localAuth) mode.value = 'guest'
  } catch {}
})
const name = ref('')
const email = ref('')
const password = ref('')
const err = ref('')
const busy = ref(false)
async function submit() {
  err.value = ''
  busy.value = true
  try {
    const path = mode.value === 'guest' ? '/auth/guest' : mode.value === 'register' ? '/auth/register' : '/auth/login'
    user.value = await api(path, { method: 'POST', body: { name: name.value, email: email.value, password: password.value } })
    const next = typeof route.query.next === 'string' && route.query.next.startsWith('/') ? route.query.next : '/'
    await navigateTo(next)
  } catch (e: any) {
    err.value = e.message
  } finally {
    busy.value = false
  }
}
</script>
