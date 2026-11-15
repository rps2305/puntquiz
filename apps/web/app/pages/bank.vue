<template>
  <main class="wrap stack">
    <div class="row">
      <h1 class="grow" style="margin: 0">Vragenbank</h1>
      <button class="ghost" @click="startNew">Nieuwe vraag</button>
      <button class="ghost" @click="showImport = !showImport">Importeren</button>
      <a class="btn ghost" href="/api/bank/export?format=xlsx" download>Excel</a>
      <a class="btn ghost" href="/api/bank/export?format=csv" download>CSV</a>
      <a class="btn ghost" href="/api/bank/export?format=json" download>JSON</a>
    </div>
    <p v-if="err" class="err" role="alert">{{ err }}</p>
    <p v-if="msg" class="ok">{{ msg }}</p>

    <!-- Import -->
    <div v-if="showImport" class="card stack">
      <h3>Vragen importeren</h3>
      <p class="muted">
        CSV (komma of puntkomma), Excel (.xlsx) of JSON. Kolommen: <span class="mono">vraag, optie1…optie8, juist, categorie, moeilijkheid, tags, punten, seconden, toelichting, bron</span>.
        <span class="mono">juist</span> = optienummer(s) zoals <span class="mono">2</span> of <span class="mono">1|3</span>, of de optietekst. Bestaande vragen (zelfde tekst) worden overgeslagen.
      </p>
      <input type="file" accept=".csv,.json,.xlsx,text/csv,application/json" aria-label="Importbestand" @change="pickFile" />
      <template v-if="preview">
        <p :class="preview.errors.length ? 'info' : 'ok'">{{ preview.valid }} geldige vraag/vragen<span v-if="preview.errors.length">, {{ preview.errors.length }} met fouten (die worden overgeslagen)</span>.</p>
        <ul v-if="preview.errors.length" class="muted"><li v-for="e in preview.errors.slice(0, 10)" :key="e.row">Rij {{ e.row }}: {{ e.message }}</li></ul>
        <ul v-if="preview.preview.length" class="muted"><li v-for="t in preview.preview" :key="t">{{ t }}</li></ul>
        <button :disabled="!preview.valid || busy" @click="doImport">{{ preview.valid }} vragen importeren</button>
      </template>
    </div>

    <!-- Edit / create -->
    <div v-if="form" class="card stack">
      <h3>{{ form.id ? 'Vraag bewerken' : 'Nieuwe vraag' }}</h3>
      <input v-model="form.text" placeholder="Vraagtekst" aria-label="Vraagtekst" />
      <div class="row">
        <select v-model="form.type" style="width: auto" aria-label="Type" @change="fixType">
          <option value="MC">Meerkeuze (1 juist)</option><option value="MULTI">Meerdere juist</option><option value="OPEN">Open vraag (peer-review)</option><option value="MUSIC">Muziekvraag (artiest/titel/jaar)</option>
        </select>
        <label v-if="form.type !== 'MUSIC'" style="margin: 0">Punten <input v-model.number="form.points" type="number" min="0" step="0.5" style="width: 90px" /></label>
        <label style="margin: 0">Seconden <input v-model.number="form.seconds" type="number" min="5" max="600" style="width: 90px" /></label>
      </div>
      <MusicFields v-if="form.type === 'MUSIC'" :cfg="form.cfg" />
      <div v-if="form.type === 'OPEN'" class="stack">
        <label for="acc" style="margin: 0">Geaccepteerde antwoorden (één per regel)</label>
        <textarea id="acc" v-model="form.accepted" rows="3" placeholder="Parijs&#10;Paris" />
      </div>
      <div v-for="(o, oi) in (form.type === 'OPEN' || form.type === 'MUSIC' ? [] : form.options)" :key="o.id" class="row">
        <input v-if="form.type === 'MC'" type="radio" name="bc" :checked="form.correct.includes(o.id)" style="width: 28px; min-height: 28px" :aria-label="`Juist: optie ${oi + 1}`" @change="form.correct = [o.id]" />
        <input v-else type="checkbox" :checked="form.correct.includes(o.id)" style="width: 28px; min-height: 28px" :aria-label="`Juist: optie ${oi + 1}`" @change="toggle(o.id)" />
        <input v-model="o.text" class="grow" :placeholder="`Optie ${oi + 1}`" :aria-label="`Optie ${oi + 1}`" />
        <button class="ghost small" :disabled="form.options.length <= 2" @click="removeOpt(oi)">✕</button>
      </div>
      <button v-if="form.type !== 'OPEN' && form.type !== 'MUSIC'" class="ghost small" style="align-self: flex-start" :disabled="form.options.length >= 8" @click="addOpt">+ Optie</button>
      <div class="row">
        <CategorySelect v-model="form.category" class="grow" :extra="meta.categories" />
        <select v-model="form.difficulty" style="width: auto" aria-label="Moeilijkheid"><option :value="null">Moeilijkheid</option><option :value="1">Makkelijk</option><option :value="2">Gemiddeld</option><option :value="3">Moeilijk</option></select>
      </div>
      <input v-model="tagsText" placeholder="Tags, komma-gescheiden" aria-label="Tags" />
      <input v-model="form.explanation" placeholder="Toelichting bij onthulling (optioneel)" aria-label="Toelichting" />
      <input v-model="form.hint" maxlength="300" placeholder="Hint voor de Hint-power-up (optioneel)" aria-label="Hint" />
      <input v-model="form.source" placeholder="Bron (optioneel)" aria-label="Bron" />
      <details :open="(form.media?.length ?? 0) > 0 || form.type === 'MUSIC'">
        <summary>Beeld &amp; geluid ({{ form.media?.length ?? 0 }})</summary>
        <MediaEditor v-model="form.media" style="margin-top: 8px" />
      </details>
      <div class="row"><button :disabled="busy" @click="save">Opslaan</button><button class="ghost" @click="form = null">Annuleren</button></div>
    </div>

    <!-- Filters -->
    <div class="card row">
      <input v-model="f.q" class="grow" placeholder="Zoeken in vragen en tags…" aria-label="Zoeken" @input="debounced" />
      <select v-model="f.category" style="width: auto" aria-label="Categorie filter" @change="load"><option value="">Alle categorieën</option><option v-for="c in meta.categories" :key="c" :value="c">{{ c }}</option></select>
      <select v-model="f.tag" style="width: auto" aria-label="Tag filter" @change="load"><option value="">Alle tags</option><option v-for="t in meta.tags" :key="t" :value="t">{{ t }}</option></select>
      <label style="margin: 0; display: flex; gap: 6px; align-items: center"><input v-model="f.unused" type="checkbox" style="width: 20px; min-height: 20px" @change="load" />Alleen ongebruikt</label>
    </div>

    <p class="muted" role="status">{{ total }} vraag/vragen</p>
    <div v-for="q in items" :key="q.id" class="card stack">
      <div class="row">
        <strong class="grow">{{ q.text }}</strong>
        <button class="ghost small" @click="edit(q)">Bewerk</button>
        <button class="danger small" @click="remove(q)">Verwijder</button>
      </div>
      <div v-if="q.type === 'MUSIC'" class="muted"><span class="pill">muziekvraag</span> {{ q.config?.artist.join(' / ') }} — {{ q.config?.title.join(' / ') }}<span v-if="q.config?.year"> ({{ q.config.year }})</span></div>
      <div v-else-if="q.type === 'OPEN'" class="muted"><span class="pill">open vraag</span> Geaccepteerd: <span style="color: var(--success); font-weight: 800">{{ q.correct.join(' / ') }}</span></div>
      <div v-else class="muted">
        <span v-for="o in q.options" :key="o.id" :style="q.correct.includes(o.id) ? 'color: var(--success); font-weight: 800' : ''" style="margin-right: 12px">{{ q.correct.includes(o.id) ? '✓ ' : '' }}{{ o.text }}</span>
      </div>
      <div class="row">
        <span v-if="q.category" class="pill">{{ q.category }}</span>
        <span v-if="q.difficulty" class="pill">{{ ['', 'makkelijk', 'gemiddeld', 'moeilijk'][q.difficulty] }}</span>
        <span v-for="t in q.tags" :key="t" class="pill">#{{ t }}</span>
        <span class="pill mono">{{ q.points }} pt · {{ q.seconds }}s</span>
        <span v-if="q.media?.length" class="pill">{{ q.media.map((m) => ({ image: '🖼', audio: '🎵', youtube: '▶' })[m.kind]).join(' ') }}</span>
      </div>
      <UsageBadge :usage="q.usage" />
    </div>
  </main>
</template>
<script setup lang="ts">
import type { BankQuestionDto } from '@puntquiz/contracts'
const { user, loaded } = useAuth()
const items = ref<BankQuestionDto[]>([])
const total = ref(0)
const meta = ref<{ categories: string[]; tags: string[] }>({ categories: [], tags: [] })
const f = reactive({ q: '', category: '', tag: '', unused: false })
const err = ref('')
const msg = ref('')
const busy = ref(false)
const form = ref<any>(null)
const tagsText = ref('')
const showImport = ref(false)
const preview = ref<any>(null)
let fileState: { format: string; content: string } | null = null
let timer: ReturnType<typeof setTimeout> | null = null
const LETTERS = 'abcdefgh'

const debounced = () => { if (timer) clearTimeout(timer); timer = setTimeout(load, 250) }
async function load() {
  try {
    const p = new URLSearchParams({ ...(f.q && { q: f.q }), ...(f.category && { category: f.category }), ...(f.tag && { tag: f.tag }), ...(f.unused && { unused: '1' }) })
    const r = await api(`/bank?${p}`)
    items.value = r.items; total.value = r.total
    meta.value = await api('/bank/meta')
  } catch (e: any) { err.value = e.message }
}
const blank = () => ({ text: '', type: 'MC', options: [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }], correct: ['a'], points: 10, seconds: 30, explanation: '', hint: '', category: '', difficulty: null, tags: [], source: '', media: [] as any[], cfg: emptyCfg() })
function startNew() { form.value = blank(); tagsText.value = '' }
function edit(q: BankQuestionDto) { form.value = JSON.parse(JSON.stringify(q)); form.value.accepted = q.type === 'OPEN' ? q.correct.join('\n') : ''; form.value.media = mediaFromDto((q.media ?? []) as any[]); form.value.cfg = cfgFromDto(q.config); tagsText.value = q.tags.join(', ') }
function fixType() {
  const f = form.value
  if (f.type !== 'OPEN' && !f.options?.length) { f.options = ['a', 'b', 'c', 'd'].map((id) => ({ id, text: '' })); f.correct = ['a'] }
  if (f.type === 'MUSIC') { f.cfg ??= emptyCfg(); return }
  if (f.type === 'OPEN') { f.accepted ??= ''; return }
  const valid = f.correct.filter((c: string) => f.options.some((o: any) => o.id === c))
  f.correct = f.type === 'MC' ? (valid.slice(0, 1).length ? valid.slice(0, 1) : [f.options[0].id]) : valid.length ? valid : [f.options[0].id]
}
const addOpt = () => form.value.options.push({ id: LETTERS.split('').find((l) => !form.value.options.some((o: any) => o.id === l))!, text: '' })
function removeOpt(i: number) { const [o] = form.value.options.splice(i, 1); form.value.correct = form.value.correct.filter((c: string) => c !== o.id); if (!form.value.correct.length) form.value.correct = [form.value.options[0].id] }
const toggle = (id: string) => { form.value.correct = form.value.correct.includes(id) ? form.value.correct.filter((c: string) => c !== id) : [...form.value.correct, id] }
async function save() {
  err.value = ''; msg.value = ''; busy.value = true
  try {
    const body = { ...form.value, tags: tagsText.value.split(',').map((t) => t.trim()).filter(Boolean), category: form.value.category || null, explanation: form.value.explanation || null, source: form.value.source || null }
    body.hint = form.value.hint || null
    body.media = mediaToPayload(form.value.media)
    if (body.type === 'MUSIC') { body.options = []; body.correct = []; body.config = cfgToPayload(form.value.cfg) }
    delete body.cfg
    if (body.type === 'OPEN') { body.options = []; body.correct = String(body.accepted ?? '').split('\n').map((x: string) => x.trim()).filter(Boolean) }
    delete body.usage; delete body.id; delete body.accepted
    if (form.value.id) await api(`/bank/${form.value.id}`, { method: 'PUT', body }); else await api('/bank', { method: 'POST', body })
    form.value = null; msg.value = 'Opgeslagen.'; await load()
  } catch (e: any) { err.value = e.message } finally { busy.value = false }
}
async function remove(q: BankQuestionDto) {
  const used = q.usage.count ? ` Hij is gebruikt in ${q.usage.count} quiz(zen); die kopieën blijven bestaan.` : ''
  if (!confirm(`Vraag verwijderen uit de bank?${used}`)) return
  try { await api(`/bank/${q.id}`, { method: 'DELETE' }); await load() } catch (e: any) { err.value = e.message }
}

async function pickFile(e: Event) {
  err.value = ''; msg.value = ''; preview.value = null; fileState = null
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const ext = file.name.split('.').pop()?.toLowerCase()
  const format = ext === 'xlsx' ? 'xlsx' : ext === 'json' ? 'json' : 'csv'
  let content: string
  if (format === 'xlsx') {
    const bytes = new Uint8Array(await file.arrayBuffer())
    let bin = ''
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    content = btoa(bin)
  } else content = await file.text()
  fileState = { format, content }
  try { preview.value = await api('/bank/import', { method: 'POST', body: { ...fileState, dryRun: true } }) } catch (e: any) { err.value = e.message }
}
async function doImport() {
  if (!fileState) return
  busy.value = true
  try {
    const r = await api('/bank/import', { method: 'POST', body: fileState })
    msg.value = `${r.imported} vragen geïmporteerd, ${r.duplicates} dubbel overgeslagen${r.errors.length ? `, ${r.errors.length} met fouten` : ''}.`
    preview.value = null; showImport.value = false; await load()
  } catch (e: any) { err.value = e.message } finally { busy.value = false }
}
function init() {
  if (!user.value || user.value.isGuest) return navigateTo('/login?next=/bank')
  load()
}
watch(loaded, (v) => v && init(), { immediate: true })
</script>
