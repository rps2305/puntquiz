<template>
  <main class="print-page">
    <!-- Screen-only controls -->
    <section class="no-print wrap stack">
      <div class="row">
        <h1 class="grow" style="margin: 0">Antwoordformulieren printen</h1>
        <NuxtLink :to="`/host/${id}`" class="btn ghost">Terug naar dashboard</NuxtLink>
        <button class="ghost" :disabled="!quiz" title="Alle rondes, formulieren, sleutel en scoreformulier in één keer" @click="printEverything">Alles vooraf printen</button>
        <button :disabled="!quiz || !sheetsTotal" @click="printNow">Printen / opslaan als PDF</button>
      </div>
      <p v-if="err" class="err" role="alert">{{ err }}</p>
      <p class="muted">
        Noodplan als de app uitvalt (en handig voor een quiz zonder telefoons): één formulier per team of speler, een antwoordsleutel en een scoreformulier voor de presentator.
        De formulieren bevatten geen antwoorden; de sleutel print je apart voor jezelf.
      </p>

      <div v-if="quiz" class="card stack">
        <div class="row" style="align-items: flex-start">
          <div class="grow">
            <h3>Rondes</h3>
            <label v-for="r in quiz.rounds" :key="r.id" style="margin: 0; display: flex; gap: 8px; align-items: center; font-weight: 600">
              <input v-model="selected" type="checkbox" :value="r.number" style="width: 22px; min-height: 22px" />
              Ronde {{ r.number }}: {{ r.title }} <span class="muted">({{ r.questions.length }} vragen)</span>
            </label>
          </div>
          <div class="grow">
            <h3>Formulieren</h3>
            <p v-if="teamNames.length" class="muted" style="margin: 0">Teams uit de lobby: {{ teamNames.join(', ') }}</p>
            <label v-if="teamNames.length" style="margin: 8px 0 0; display: flex; gap: 8px; align-items: center; font-weight: 600">
              <input v-model="withTeams" type="checkbox" style="width: 22px; min-height: 22px" /> Eén formulier per team (met teamnaam)
            </label>
            <label style="margin-top: 8px">Teamnamen of spelersnamen vooraf (één per regel, optioneel)
              <textarea v-model="typedNames" rows="4" placeholder="De Slimmerds&#10;Quizzy Rascals" />
            </label>
            <label style="margin-top: 8px">Extra formulieren
              <input v-model.number="blanks" type="number" min="0" max="80" style="width: 100px" />
            </label>
            <label style="margin: 8px 0 0; display: flex; gap: 8px; align-items: center; font-weight: 600">
              <input v-model="numbered" type="checkbox" style="width: 22px; min-height: 22px" /> Extra formulieren nummeren ({{ quiz?.mode === 'TEAM' ? 'Team' : 'Speler' }} 1, 2, 3…)
            </label>
            <label style="margin-top: 8px">Volgorde
              <select v-model="order">
                <option value="team">Per {{ quiz?.mode === 'TEAM' ? 'team' : 'formulier' }}: alle rondes bij elkaar</option>
                <option value="round">Per ronde: alle formulieren van ronde 1, dan ronde 2…</option>
              </select>
            </label>
            <label style="margin: 8px 0 0; display: flex; gap: 8px; align-items: center; font-weight: 600">
              <input v-model="showImages" type="checkbox" style="width: 22px; min-height: 22px" /> Afbeeldingen meeprinten (beeldrondes)
            </label>
          </div>
          <div class="grow">
            <h3>Extra pagina's</h3>
            <label style="margin: 0; display: flex; gap: 8px; align-items: center; font-weight: 600">
              <input v-model="withKey" type="checkbox" style="width: 22px; min-height: 22px" /> Antwoordsleutel (alleen voor jou)
            </label>
            <label style="margin: 8px 0 0; display: flex; gap: 8px; align-items: center; font-weight: 600">
              <input v-model="withScore" type="checkbox" style="width: 22px; min-height: 22px" /> Scoreformulier (teams × rondes)
            </label>
          </div>
        </div>
        <p class="muted" style="margin: 0"><strong>{{ sheetsTotal }}</strong> pagina's. Tip: kies in het printvenster "Staand", A4, en zet kop- en voetteksten van de browser uit.</p>
      </div>
    </section>

    <!-- Everything below is what gets printed -->
    <div v-if="quiz" class="sheets">
      <template v-for="(p, pi) in pairs" :key="`p${pi}`">
        <article class="sheet">
          <header class="sheet-head">
            <div class="brand"><img src="/icons/icon-192.png" alt="" class="logo" />PuntQuiz</div>
            <div class="titles"><strong>{{ quiz.title }}</strong><span>Ronde {{ p.r.number }}: {{ p.r.title }}<template v-if="p.r.category"> · {{ p.r.category }}</template></span></div>
            <div class="code">Code {{ quiz.joinCode }}</div>
          </header>
          <div class="who">
            <span>{{ quiz.mode === 'TEAM' ? 'Team' : 'Naam' }}:</span>
            <span class="fill">{{ p.f.name }}</span>
            <span class="who-r">Score ronde: <span class="box-score" /></span>
          </div>

          <ol class="qs">
            <li v-for="q in p.r.questions" :key="q.id" class="q">
              <div class="qtext"><strong>{{ q.number }}.</strong> {{ q.text }} <span class="pts">({{ pt(q) }} pt)</span></div>
              <template v-if="showImages">
                <img v-for="(m, i) in q.media?.filter((x) => x.kind === 'image')" :key="i" :src="m.src" alt="" class="qimg" />
              </template>
              <div v-if="q.media?.some((m) => m.kind !== 'image')" class="note">
                {{ q.media.some((m) => m.kind === 'audio') ? '🔊 Luister naar het fragment van de presentator.' : '' }}
                {{ q.media.some((m) => m.kind === 'youtube') ? '▶ Kijk naar het videofragment.' : '' }}
              </div>

              <div v-if="q.type === 'MC' || q.type === 'MULTI'" class="opts">
                <div v-for="(o, i) in q.options" :key="o.id" class="opt"><span class="box" :class="{ sq: q.type === 'MULTI' }" /> <strong>{{ 'ABCDEFGH'[i] }}</strong> {{ o.text }}</div>
                <div v-if="q.type === 'MULTI'" class="note">Meerdere antwoorden mogelijk.</div>
              </div>
              <div v-else-if="q.type === 'MUSIC'" class="music">
                <div class="mline"><span>Artiest</span><span class="line" /></div>
                <div class="mline"><span>Titel</span><span class="line" /></div>
                <div v-if="q.music?.year" class="mline short"><span>Jaar</span><span class="line" /></div>
              </div>
              <div v-else class="mline"><span>Antwoord</span><span class="line" /></div>
            </li>
          </ol>
          <footer class="sheet-foot">PuntQuiz · {{ quiz.title }} · Ronde {{ p.r.number }}/{{ quiz.rounds.length }} · puntquiz.puntuale.nl</footer>
        </article>
      </template>

      <!-- Answer key: presenter only -->
      <article v-if="withKey" class="sheet key">
        <header class="sheet-head"><div class="brand"><img src="/icons/icon-192.png" alt="" class="logo" />PuntQuiz</div><div class="titles"><strong>Antwoordsleutel — alleen voor de presentator</strong><span>{{ quiz.title }}</span></div></header>
        <section v-for="r in rounds" :key="`k${r.number}`" class="key-round">
          <h3>Ronde {{ r.number }}: {{ r.title }}</h3>
          <ol class="key-list">
            <li v-for="q in r.questions" :key="q.id">
              <strong>{{ q.number }}.</strong> {{ q.text }}
              <span class="ans">→ {{ keyAnswer(q) }}</span>
              <span class="pts"> ({{ pt(q) }} pt<template v-if="q.type === 'OPEN'">, open vraag: laat beoordelen</template>)</span>
              <div v-if="q.explanation" class="note">{{ q.explanation }}</div>
            </li>
          </ol>
        </section>
      </article>

      <!-- Score sheet -->
      <article v-if="withScore" class="sheet">
        <header class="sheet-head"><div class="brand"><img src="/icons/icon-192.png" alt="" class="logo" />PuntQuiz</div><div class="titles"><strong>Scoreformulier</strong><span>{{ quiz.title }}</span></div></header>
        <table class="score">
          <thead><tr><th class="name">{{ quiz.mode === 'TEAM' ? 'Team' : 'Naam' }}</th><th v-for="r in rounds" :key="r.number">R{{ r.number }}</th><th>Totaal</th><th>Plek</th></tr></thead>
          <tbody>
            <tr v-for="n in scoreRows" :key="n"><td class="name">{{ scoreNames[n - 1] ?? '' }}</td><td v-for="r in rounds" :key="r.number" /><td /><td /></tr>
          </tbody>
        </table>
        <p class="note">Een gedeelde eerste plek blijft gedeeld: trek gelijke standen niet kunstmatig uit elkaar.</p>
      </article>
    </div>
  </main>
</template>

<script setup lang="ts">
import type { QuestionDto, QuizDetailDto } from '@puntquiz/contracts'

const route = useRoute()
const { user, loaded } = useAuth()
const id = route.params.id as string
const quiz = ref<QuizDetailDto | null>(null)
const teamNames = ref<string[]>([])
const err = ref('')
const selected = ref<number[]>([])
const withTeams = ref(true)
const blanks = ref(2)
const showImages = ref(true)
const withKey = ref(true)
const withScore = ref(true)
const typedNames = ref('')
const numbered = ref(true)
const order = ref<'team' | 'round'>('team')

const rounds = computed(() => (quiz.value?.rounds ?? []).filter((r) => selected.value.includes(r.number)))
const typed = computed(() => typedNames.value.split('\n').map((x) => x.trim()).filter(Boolean))
const allNames = computed(() => [...(withTeams.value ? teamNames.value : []), ...typed.value])
const forms = computed(() => {
  const list: { name: string }[] = allNames.value.map((name) => ({ name }))
  const word = quiz.value?.mode === 'TEAM' ? 'Team' : 'Speler'
  for (let i = 0; i < blanks.value; i++) list.push({ name: numbered.value ? `${word} ${i + 1}` : '' })
  return list
})
// Forms x rounds, stacked either per team (a packet per team) or per round (hand out round by round).
const pairs = computed(() => {
  const out: { f: { name: string }; r: QuizDetailDto['rounds'][number] }[] = []
  if (order.value === 'round') for (const r of rounds.value) for (const f of forms.value) out.push({ f, r })
  else for (const f of forms.value) for (const r of rounds.value) out.push({ f, r })
  return out
})
const scoreNames = computed(() => forms.value.map((f) => f.name))
const scoreRows = computed(() => Math.max(12, forms.value.length + 2))
const sheetsTotal = computed(() => pairs.value.length + (withKey.value ? 1 : 0) + (withScore.value ? 1 : 0))

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
const pt = (q: QuestionDto) => fmt(q.points)

function keyAnswer(q: QuestionDto): string {
  if (q.type === 'MUSIC') {
    const m = q.music
    return `${m?.artist.join(' / ')} — ${m?.title.join(' / ')}${m?.year ? ` (${m.year})` : ''}`
  }
  if (q.type === 'OPEN') return (q.correct ?? []).join(' / ')
  return q.options.map((o, i) => ((q.correct ?? []).includes(o.id) ? `${'ABCDEFGH'[i]}. ${o.text}` : null)).filter(Boolean).join('  +  ')
}

function printNow() { window.print() }
/** One click for the advance print run: every round, key and score sheet, images included. */
function printEverything() {
  selected.value = (quiz.value?.rounds ?? []).map((r) => r.number)
  withKey.value = true; withScore.value = true; showImages.value = true
  if (!forms.value.length) { blanks.value = 10; numbered.value = true }
  nextTick(() => window.print())
}

async function init() {
  if (!user.value || user.value.isGuest) return navigateTo(`/login?next=/print/${id}`)
  try {
    quiz.value = await api(`/quizzes/${id}`)
    selected.value = quiz.value!.rounds.map((r) => r.number)
    try {
      const live = await api(`/live/${id}?host=1`)
      teamNames.value = (live.teams ?? []).map((t: any) => t.name)
    } catch { /* no teams yet: blanks only */ }
    withTeams.value = teamNames.value.length > 0
    blanks.value = teamNames.value.length ? 2 : 10 // no teams yet (advance printing): ten numbered copies as a start
  } catch (e: any) { err.value = e.message }
}
watch(loaded, (v) => v && init(), { immediate: true })
useHead({ title: 'Antwoordformulieren — PuntQuiz' })
</script>

<style>
/* Paper look on screen, real pages in print. Black on white; no colour needed. */
.print-page .sheets { display: grid; gap: 24px; justify-items: center; padding: 16px; }
.print-page .sheet {
  width: 210mm; max-width: 100%; min-height: 297mm; box-sizing: border-box; padding: 12mm 14mm;
  background: #fff; color: #000; border: 1px solid #ccc; box-shadow: 0 2px 12px rgba(0, 0, 0, .12);
  font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.3; display: flex; flex-direction: column;
}
.print-page .sheet-head { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #000; padding-bottom: 6px; }
.print-page .brand { display: flex; align-items: center; gap: 2.5mm; font-weight: 800; font-size: 16pt; letter-spacing: .5px; }
.print-page .brand .logo { width: 10mm; height: 10mm; border-radius: 2mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.print-page .titles { flex: 1; display: flex; flex-direction: column; font-size: 11pt; }
.print-page .code { font-family: ui-monospace, monospace; font-size: 10pt; }
.print-page .who { display: flex; gap: 8px; align-items: flex-end; margin: 10px 0 8px; font-size: 12pt; }
.print-page .who .fill { flex: 1; border-bottom: 1px solid #000; min-height: 7mm; font-weight: 700; padding: 0 4px; }
.print-page .who-r { display: flex; gap: 6px; align-items: center; margin-left: 12px; }
.print-page .box-score { display: inline-block; width: 18mm; height: 9mm; border: 1.5px solid #000; }
.print-page .qs { list-style: none; margin: 0; padding: 0; display: grid; gap: 4mm; flex: 1; align-content: start; }
.print-page .q { break-inside: avoid; page-break-inside: avoid; border-bottom: 1px dotted #888; padding-bottom: 3mm; }
.print-page .qtext { font-size: 11.5pt; margin-bottom: 2mm; }
.print-page .pts, .print-page .note { color: #444; font-size: 9pt; }
.print-page .qimg { display: block; max-height: 55mm; max-width: 100%; margin: 2mm 0; border: 1px solid #000; }
.print-page .opts { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5mm 8mm; }
.print-page .opt { display: flex; gap: 6px; align-items: center; }
.print-page .opts .note { grid-column: 1 / -1; }
.print-page .box { display: inline-block; flex: none; width: 4.5mm; height: 4.5mm; border: 1.5px solid #000; border-radius: 50%; }
.print-page .box.sq { border-radius: 1px; }
.print-page .mline { display: flex; gap: 8px; align-items: flex-end; margin-top: 2mm; }
.print-page .mline > span:first-child { width: 22mm; flex: none; font-size: 10pt; }
.print-page .mline.short { max-width: 70mm; }
.print-page .line { flex: 1; border-bottom: 1px solid #000; height: 7mm; }
.print-page .sheet-foot { margin-top: 6mm; padding-top: 2mm; border-top: 1px solid #000; font-size: 8pt; color: #444; text-align: center; }
.print-page .key h3 { margin: 6mm 0 2mm; font-size: 12pt; }
.print-page .key-list { padding-left: 0; list-style: none; display: grid; gap: 2mm; font-size: 10pt; }
.print-page .key .ans { font-weight: 800; }
.print-page table.score { width: 100%; border-collapse: collapse; margin-top: 8mm; }
.print-page table.score th, .print-page table.score td { border: 1.5px solid #000; height: 11mm; text-align: center; font-size: 10pt; }
.print-page table.score td.name, .print-page table.score th.name { text-align: left; padding-left: 6px; width: 48mm; font-weight: 700; }

@media print {
  /* The browser's page margin does the spacing, so a long round flows onto a 2nd page with proper margins. */
  @page { size: A4 portrait; margin: 12mm; }
  html, body { background: #fff !important; }
  .topbar, .site-footer, .no-print { display: none !important; }
  .print-page .sheets { display: block; padding: 0; }
  .print-page .sheet { border: 0; box-shadow: none; width: auto; min-height: 0; height: auto; padding: 0; overflow: visible; break-after: page; page-break-after: always; }
  .print-page .sheet:last-child { break-after: auto; page-break-after: auto; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
