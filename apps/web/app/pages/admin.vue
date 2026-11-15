<template>
  <main class="wrap stack">
    <h1>Beheer</h1>
    <p v-if="err" class="err" role="alert">{{ err }}</p>
    <section class="card stack">
      <h2>Aanvragen om presentator te worden</h2>
      <p v-if="data && !data.requests.length" class="muted">Geen openstaande aanvragen.</p>
      <div v-for="r in data?.requests" :key="r.id" class="row" style="border-bottom: 1px solid var(--border); padding-bottom: 10px">
        <div class="grow">
          <strong>{{ r.name }}</strong> <span class="muted">{{ r.email ?? 'geen e-mailadres' }}</span><br />
          <span class="muted">aangevraagd op {{ new Date(r.requestedAt).toLocaleString('nl-NL') }}</span>
        </div>
        <button :disabled="busy" @click="act(r.id, 'approve')">Goedkeuren</button>
        <button class="ghost" :disabled="busy" @click="act(r.id, 'deny')">Afwijzen</button>
      </div>
    </section>
    <section class="card stack">
      <h2>Presentatoren</h2>
      <p class="muted">Beheerders worden beheerd in Authentik (groep puntquiz-admins) en staan hier niet bij.</p>
      <p v-if="data && !data.hosts.length" class="muted">Nog geen goedgekeurde presentatoren naast de beheerders.</p>
      <div v-for="h in data?.hosts" :key="h.id" class="row" style="border-bottom: 1px solid var(--border); padding-bottom: 10px">
        <div class="grow"><strong>{{ h.name }}</strong> <span class="muted">{{ h.email ?? '' }}</span></div>
        <button class="ghost" :disabled="busy" @click="revoke(h)">Toestemming intrekken</button>
      </div>
    </section>
  </main>
</template>
<script setup lang="ts">
import type { HostAdminDto } from '@puntquiz/contracts'
const { user, loaded, fetchMe } = useAuth()
const data = ref<HostAdminDto | null>(null)
const err = ref('')
const busy = ref(false)
useHead({ title: 'Beheer — PuntQuiz' })
async function load() {
  try { data.value = await api('/admin/hosts') } catch (e: any) { err.value = e.message }
}
async function act(id: string, what: 'approve' | 'deny' | 'revoke') {
  busy.value = true; err.value = ''
  try { await api(`/admin/hosts/${id}/${what}`, { method: 'POST' }); await load() } catch (e: any) { err.value = e.message } finally { busy.value = false }
}
function revoke(h: { id: string; name: string }) {
  if (confirm(`Toestemming van ${h.name} intrekken? Bestaande quizzen blijven staan, maar ${h.name} kan geen nieuwe maken of presenteren.`)) void act(h.id, 'revoke')
}
onMounted(async () => {
  if (!loaded.value) await fetchMe()
  if (!user.value?.isAdmin) return navigateTo('/')
  await load()
})
</script>
