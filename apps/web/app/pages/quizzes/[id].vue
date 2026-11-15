<template>
  <main class="wrap stack">
    <div class="row">
      <h1 class="grow">{{ isNew ? 'Nieuwe quiz' : 'Quiz bewerken' }}</h1>
      <NuxtLink to="/quizzes" class="btn ghost">Terug</NuxtLink>
    </div>
    <p v-if="err" class="err" role="alert">{{ err }}</p>
    <p v-if="msg" class="ok">{{ msg }}</p>

    <div v-if="form" class="stack">
      <div class="card stack">
        <div><label for="t">Titel</label><input id="t" v-model="form.title" /></div>
        <div><label for="d">Omschrijving</label><input id="d" v-model="form.description" /></div>
        <details class="card" style="margin: 0" :open="(form.powerUps?.types?.length ?? 0) > 0">
          <summary><strong>Power-ups</strong> <span class="muted">({{ form.powerUps?.types?.length ?? 0 }} aan)</span></summary>
          <div class="stack" style="margin-top: 8px">
            <p class="muted" style="margin: 0">Spelers (bij een teamquiz: het team samen) krijgen van elk type een aantal keer te gebruiken tijdens de hele quiz.</p>
            <label v-for="t in POWER_UP_ORDER" :key="t" style="margin: 0; display: flex; gap: 10px; align-items: flex-start; font-weight: 600">
              <input type="checkbox" :checked="form.powerUps?.types?.includes(t)" style="width: 22px; min-height: 22px; flex: none" @change="togglePower(t)" />
              <span>{{ POWER_LABEL[t].icon }} {{ POWER_LABEL[t].name }}<br /><span class="muted" style="font-weight: 400">{{ POWER_LABEL[t].help }}</span></span>
            </label>
            <label style="margin: 0">Keer per type <input v-model.number="form.powerUps.uses" type="number" min="1" max="3" style="width: 80px" :disabled="!form.powerUps?.types?.length" /></label>
          </div>
        </details>
        <div class="row">
          <div class="grow"><label for="m">Type</label>
            <select id="m" v-model="form.mode"><option value="INDIVIDUAL">Individuele quiz</option><option value="TEAM">Teamquiz (meerderheidsstemming)</option></select></div>
          <div class="grow"><label for="r">Onthullen</label>
            <select id="r" v-model="form.revealMode"><option value="ROUND">Per ronde (standaard)</option><option value="QUESTION">Per vraag</option></select></div>
          <div v-if="form.mode === 'TEAM'"><label for="mx">Max. teamgrootte (min. 3)</label><input id="mx" v-model.number="form.maxTeamSize" type="number" min="3" max="12" /></div>
        </div>
      </div>

      <div v-for="(r, ri) in form.rounds" :key="ri" class="card stack">
        <div class="row">
          <h2 class="grow" style="margin: 0">Ronde {{ ri + 1 }}</h2>
          <button class="ghost small" :disabled="ri === 0" @click="move(ri, -1)">↑</button>
          <button class="ghost small" :disabled="ri === form.rounds.length - 1" @click="move(ri, 1)">↓</button>
          <button class="danger small" @click="form.rounds.splice(ri, 1)">Verwijder ronde</button>
        </div>
        <div class="row">
          <div class="grow"><label :for="`rt${ri}`">Titel</label><input :id="`rt${ri}`" v-model="r.title" /></div>
          <div class="grow"><label :for="`rc${ri}`">Categorie</label><CategorySelect :id="`rc${ri}`" v-model="r.category" /></div>
        </div>
        <div class="row">
          <label style="margin: 0">Soort ronde
            <select v-model="r.kind" style="width: auto" @change="onKind(r)">
              <option value="STANDARD">Standaard (vraag voor vraag)</option><option value="PICTURE">Beeldronde (blijft open tijdens volgende rondes)</option>
            </select>
          </label>
          <label v-if="r.kind === 'PICTURE'" style="margin: 0">Blijft open tijdens
            <select v-model.number="r.openRounds" style="width: auto"><option :value="1">1</option><option :value="2">2</option><option :value="3">3</option></select> volgende ronde(s)
          </label>
        </div>
        <p v-if="r.kind === 'PICTURE'" class="muted" style="margin: 0">
          Alle vragen van deze ronde staan tegelijk op de telefoons (zonder timer) terwijl de volgende ronde(s) gewoon doorgaan; daarna sluit de beeldronde en onthul je hem. Zet foto's als bijlage bij de vragen. Een beeldronde kan niet de laatste ronde zijn.
        </p>

        <div v-for="(q, qi) in r.questions" :key="qi" class="card stack" style="background: var(--surface-2)">
          <div class="row">
            <strong class="grow">Vraag {{ qi + 1 }}</strong>
            <button class="danger small" @click="r.questions.splice(qi, 1)">Verwijder</button>
          </div>
          <input v-model="q.text" placeholder="Vraagtekst" :aria-label="`Vraag ${qi + 1}`" />
          <div class="row">
            <select v-model="q.type" style="width: auto" aria-label="Type" @change="fixType(q)">
              <option value="MC">Meerkeuze (1 juist)</option><option value="MULTI">Meerdere juist</option><option value="OPEN">Open vraag (peer-review)</option><option value="MUSIC">Muziekvraag (artiest/titel/jaar)</option>
            </select>
            <label v-if="q.type !== 'MUSIC'" style="margin: 0">Punten <input v-model.number="q.points" type="number" min="0" step="0.5" style="width: 90px" /></label>
            <label style="margin: 0">Seconden <input v-model.number="q.seconds" type="number" min="5" max="600" style="width: 90px" /></label>
          </div>
          <MusicFields v-if="q.type === 'MUSIC'" :cfg="q.cfg" />
          <div v-if="q.type === 'OPEN'" class="stack">
            <label :for="`acc${ri}-${qi}`" style="margin: 0">Geaccepteerde antwoorden (één per regel)</label>
            <textarea :id="`acc${ri}-${qi}`" v-model="q.accepted" rows="3" placeholder="Parijs&#10;Paris" />
            <p class="muted" style="margin: 0">Een exact gelijk antwoord (hoofdletters, accenten en leestekens tellen niet) is automatisch goed. Andere antwoorden worden door een ander team of speler beoordeeld (goed/fout).</p>
          </div>
          <div v-for="(o, oi) in (q.type === 'OPEN' || q.type === 'MUSIC' ? [] : q.options)" :key="o.id" class="row">
            <input v-if="q.type === 'MC'" type="radio" :name="`c${ri}-${qi}`" :checked="q.correct.includes(o.id)" style="width: 28px; min-height: 28px" :aria-label="`Juist: optie ${oi + 1}`" @change="q.correct = [o.id]" />
            <input v-else type="checkbox" :checked="q.correct.includes(o.id)" style="width: 28px; min-height: 28px" :aria-label="`Juist: optie ${oi + 1}`" @change="toggle(q, o.id)" />
            <input v-model="o.text" class="grow" :placeholder="`Optie ${oi + 1}`" :aria-label="`Optie ${oi + 1}`" />
            <button class="ghost small" :disabled="q.options.length <= 2" @click="removeOpt(q, oi)">✕</button>
          </div>
          <div class="row">
            <button v-if="q.type !== 'OPEN' && q.type !== 'MUSIC'" class="ghost small" :disabled="q.options.length >= 8" @click="addOpt(q)">+ Optie</button>
            <input v-model="q.explanation" class="grow" placeholder="Toelichting bij onthulling (optioneel)" />
          </div>
          <input v-model="q.hint" maxlength="300" placeholder="Hint voor de Hint-power-up (optioneel)" :aria-label="`Hint vraag ${qi + 1}`" />
          <details :open="(q.media?.length ?? 0) > 0 || q.type === 'MUSIC'">
            <summary>Beeld &amp; geluid ({{ q.media?.length ?? 0 }})</summary>
            <MediaEditor v-model="q.media" style="margin-top: 8px" />
          </details>
        </div>
        <div class="row">
          <button class="ghost" @click="r.questions.push(blankQ())">+ Vraag</button>
          <button class="ghost" @click="openPicker(ri)">+ Uit vragenbank</button>
        </div>
        <!-- Bank picker: usage badges help avoid repeating questions on a recurring crowd (spec §18) -->
        <div v-if="pickerRound === ri" class="card stack" style="background: var(--surface-2)">
          <div class="row">
            <input v-model="pickQ" class="grow" placeholder="Zoeken in de vragenbank…" aria-label="Zoeken in vragenbank" @input="searchBank" />
            <label style="margin: 0; display: flex; gap: 6px; align-items: center"><input v-model="pickUnused" type="checkbox" style="width: 20px; min-height: 20px" @change="searchBank" />Alleen ongebruikt</label>
          </div>
          <p v-if="!bankItems.length" class="muted">Geen vragen gevonden. <NuxtLink to="/bank">Naar de vragenbank</NuxtLink></p>
          <label v-for="b in bankItems" :key="b.id" class="row" style="margin: 0; align-items: flex-start">
            <input v-model="picked" type="checkbox" :value="b.id" style="width: 22px; min-height: 22px" />
            <span class="grow"><strong>{{ b.text }}</strong><span class="muted"> — {{ b.category || 'geen categorie' }}</span><UsageBadge :usage="b.usage" /><MediaPeek :items="b.media ?? []" /></span>
          </label>
          <div class="row"><button :disabled="!picked.length" @click="addPicked(ri)">{{ picked.length }} toevoegen</button><button class="ghost" @click="pickerRound = null">Sluiten</button></div>
        </div>
      </div>

      <div class="row">
        <button class="ghost" @click="form.rounds.push({ title: `Ronde ${form.rounds.length + 1}`, category: '', kind: 'STANDARD', openRounds: 1, questions: [blankQ()] })">+ Ronde</button>
        <span class="grow" />
        <template v-if="!isNew">
          <NuxtLink class="btn ghost" :to="`/print/${id}`" title="Antwoordformulieren vooraf printen (sla eerst op)">Formulieren printen</NuxtLink>
          <a class="btn ghost" :href="`/api/quizzes/${id}/export`" download>Exporteer JSON</a>
          <button class="ghost" :disabled="busy" title="Bewaart alle vragen van deze quiz in je vragenbank en volgt hergebruik" @click="toBank">Bewaar in vragenbank</button>
        </template>
        <button :disabled="busy" @click="save(false)">Opslaan</button>
        <button v-if="!isNew" class="gold" :disabled="busy" @click="save(true)">Opslaan &amp; publiceren</button>
      </div>
    </div>
  </main>
</template>
<script setup lang="ts">
const route = useRoute()
const { user, loaded } = useAuth()
const id = route.params.id as string
const isNew = id === 'new'
const err = ref('')
const msg = ref('')
const busy = ref(false)
const form = ref<any>(null)
const LETTERS = 'abcdefgh'
const blankQ = () => ({ text: '', type: 'MC', options: [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }], correct: ['a'], points: 10, seconds: 30, explanation: '', hint: '', media: [] as any[], cfg: emptyCfg() })
const addOpt = (q: any) => q.options.push({ id: LETTERS.split('').find((l) => !q.options.some((o: any) => o.id === l))!, text: '' })
function removeOpt(q: any, i: number) { const [o] = q.options.splice(i, 1); q.correct = q.correct.filter((c: string) => c !== o.id); if (!q.correct.length) q.correct = [q.options[0].id] }
function toggle(q: any, oid: string) { q.correct = q.correct.includes(oid) ? q.correct.filter((c: string) => c !== oid) : [...q.correct, oid] }
function fixType(q: any) {
  if (q.type === 'MUSIC') { q.cfg ??= emptyCfg(); return }
  if (q.type !== 'OPEN' && !q.options?.length) { q.options = ['a', 'b', 'c', 'd'].map((id) => ({ id, text: '' })); q.correct = ['a'] }
  if (q.type === 'OPEN') q.accepted ??= ''
  else if (q.type === 'MC') q.correct = (q.correct.filter((c: string) => q.options.some((o: any) => o.id === c))).slice(0, 1).length ? q.correct.filter((c: string) => q.options.some((o: any) => o.id === c)).slice(0, 1) : [q.options[0].id]
  else if (!q.correct.some((c: string) => q.options.some((o: any) => o.id === c))) q.correct = [q.options[0].id]
}
const lines = (t: string) => String(t ?? '').split('\n').map((x) => x.trim()).filter(Boolean)
function onKind(r: any) { if (r.kind === 'PICTURE' && !r.openRounds) r.openRounds = 1 }
function togglePower(t: string) {
  const p = (form.value.powerUps ??= { types: [], uses: 1 })
  p.types = p.types.includes(t) ? p.types.filter((x: string) => x !== t) : [...p.types, t]
}
const hydrate = (f: any) => {
  f.powerUps = f.powerUps ? { ...f.powerUps } : { types: [], uses: 1 }
  for (const r of f.rounds) for (const q of r.questions) { if (q.type === 'OPEN') q.accepted = q.correct.join('\n'); q.media = mediaFromDto(q.media); q.cfg = cfgFromDto(q.music) } return f }
function move(i: number, d: number) { const a = form.value.rounds; [a[i], a[i + d]] = [a[i + d], a[i]] }

async function load() {
  if (!user.value || user.value.isGuest) return navigateTo(`/login?next=/quizzes/${id}`)
  if (isNew) {
    form.value = { title: '', description: '', mode: 'INDIVIDUAL', revealMode: 'ROUND', maxTeamSize: 5, powerUps: { types: [], uses: 1 }, rounds: [{ title: 'Ronde 1', category: '', kind: 'STANDARD', openRounds: 1, questions: [blankQ()] }] }
    return
  }
  try { form.value = hydrate(await api(`/quizzes/${id}`)) } catch (e: any) { err.value = e.message }
}
async function save(publish: boolean) {
  err.value = ''; msg.value = ''; busy.value = true
  try {
    const pu = form.value.powerUps?.types?.length ? { types: form.value.powerUps.types, uses: form.value.powerUps.uses || 1 } : null
    const body = { ...form.value, powerUps: pu, rounds: form.value.rounds.map((r: any) => ({ title: r.title, category: r.category || null, kind: r.kind || 'STANDARD', openRounds: r.kind === 'PICTURE' ? r.openRounds || 1 : undefined, questions: r.questions.map((q: any) => ({ text: q.text, type: q.type, options: q.type === 'OPEN' || q.type === 'MUSIC' ? [] : q.options, correct: q.type === 'OPEN' ? lines(q.accepted) : q.type === 'MUSIC' ? [] : q.correct, media: mediaToPayload(q.media), config: q.type === 'MUSIC' ? cfgToPayload(q.cfg) : undefined, points: q.points, seconds: q.seconds, explanation: q.explanation || null, hint: q.hint || null, bankQuestionId: q.bankQuestionId || null })) })) }
    const saved = isNew ? await api('/quizzes', { method: 'POST', body }) : await api(`/quizzes/${id}`, { method: 'PUT', body })
    if (publish) await api(`/quizzes/${saved.id}/publish`, { method: 'POST' })
    if (isNew) return navigateTo(`/quizzes/${saved.id}`)
    form.value = hydrate(await api(`/quizzes/${id}`))
    msg.value = publish ? `Gepubliceerd. Quizcode: ${saved.joinCode}` : 'Opgeslagen.'
    if (publish) return navigateTo(`/host/${saved.id}`)
  } catch (e: any) { err.value = e.message } finally { busy.value = false }
}
const pickerRound = ref<number | null>(null)
const pickQ = ref('')
const pickUnused = ref(false)
const bankItems = ref<any[]>([])
const picked = ref<string[]>([])
async function searchBank() {
  try {
    const p = new URLSearchParams({ ...(pickQ.value && { q: pickQ.value }), ...(pickUnused.value && { unused: '1' }), limit: '100' })
    bankItems.value = (await api(`/bank?${p}`)).items
  } catch (e: any) { err.value = e.message }
}
function openPicker(ri: number) { pickerRound.value = ri; picked.value = []; searchBank() }
function addPicked(ri: number) {
  for (const b of bankItems.value.filter((x) => picked.value.includes(x.id))) {
    form.value.rounds[ri].questions.push({ text: b.text, type: b.type, options: JSON.parse(JSON.stringify(b.options)), correct: [...b.correct], accepted: b.type === 'OPEN' ? b.correct.join('\n') : '', media: mediaFromDto((b.media ?? []).map((m: any) => ({ ...m }))), cfg: cfgFromDto(b.config), points: b.points, seconds: b.seconds, explanation: b.explanation || '', hint: b.hint || '', bankQuestionId: b.id })
  }
  pickerRound.value = null
  msg.value = 'Toegevoegd; vergeet niet op te slaan.'
}
async function toBank() {
  err.value = ''; msg.value = ''
  try { const r = await api(`/bank/from-quiz/${id}`, { method: 'POST' }); msg.value = `${r.added} nieuwe vragen in de bank, ${r.linked} gekoppeld. Sla de quiz op om koppelingen te behouden.`; form.value = hydrate(await api(`/quizzes/${id}`)) } catch (e: any) { err.value = e.message }
}
watch(loaded, (v) => v && load(), { immediate: true })
</script>
