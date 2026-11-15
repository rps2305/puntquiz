<template>
  <main class="wrap wide stack">
    <p v-if="err" class="err" role="alert">{{ err }}</p>
    <template v-if="view">
      <div class="row">
        <h1 class="grow" style="margin: 0">{{ view.quiz.title }}</h1>
        <NuxtLink to="/info/presentator" target="_blank" class="conn">Handleiding</NuxtLink>
        <NuxtLink :to="`/print/${id}`" target="_blank" class="conn" title="Papieren noodplan: antwoordformulieren, sleutel en scoreformulier">Formulieren printen</NuxtLink>
        <span class="pill gold">{{ phaseLabel[live.phase] }}</span>
        <span class="conn" :class="{ off: !connected }">{{ connected ? '● live' : '● verbinding weg…' }}</span>
      </div>
      <p v-if="error" class="err">{{ error }}</p>

      <!-- LOBBY -->
      <div v-if="live.phase === 'LOBBY'" class="row" style="align-items: flex-start">
        <div class="card stack grow" style="text-align: center">
          <p class="muted">Doe mee op <strong>{{ origin }}</strong> met code</p>
          <div class="code">{{ view.quiz.joinCode }}</div>
          <img v-if="qr" :src="qr" alt="QR-code om mee te doen" width="220" height="220" style="margin: 0 auto; border-radius: 12px" />
          <p class="muted">De QR is alleen een sneltoets: de code en deze link werken altijd.</p>
        </div>
        <div class="card stack grow">
          <h3>{{ view.participants }} speler(s) · {{ view.online ?? 0 }} online</h3>
          <template v-if="view.quiz.mode === 'TEAM'">
            <div v-for="t in view.teams" :key="t.id">
              <strong>{{ t.name }}</strong>
              <span class="pill" :class="{ gold: t.members.length >= view.quiz.minTeamSize }">{{ t.members.length }}</span>
              <div class="muted">{{ t.members.map((m) => m.name).join(', ') }}</div>
            </div>
            <p v-if="view.teamsTooSmall?.length" class="info">Let op, onder het minimum ({{ view.quiz.minTeamSize }}): {{ view.teamsTooSmall.join(', ') }}</p>
          </template>
          <button :disabled="busy || !view.participants" @click="start()">Quiz starten</button>
        </div>
      </div>

      <!-- RUNNING -->
      <div v-else-if="live.phase !== 'FINISHED'" class="row" style="align-items: flex-start">
        <div class="card stack grow" style="min-width: 300px; flex-basis: 60%">
          <div class="row">
            <span class="pill">Ronde {{ live.roundIndex + 1 }}: {{ view.quiz.rounds[live.roundIndex]?.title }} · vraag {{ view.question?.number }}</span>
            <span class="grow" />
            <span class="timer" :class="{ low: live.phase === 'QUESTION_OPEN' && remainingMs < 6000 }" role="timer">{{ live.phase === 'QUESTION_OPEN' || live.phase === 'PAUSED' ? fmtTime(remainingMs) : '—' }}</span>
          </div>
          <p v-if="view.question && live.skipped?.includes(view.question.id)" class="info">Deze vraag is overgeslagen en telt niet mee.</p>
          <h2 class="big-q">{{ view.question?.text }}</h2>
          <QuestionMedia :items="view.question?.media ?? []" host-hint />
          <p v-if="view.question?.type === 'MUSIC'" class="muted">Muziekvraag. Juist: <strong>{{ view.question.music?.artist[0] }} – {{ view.question.music?.title[0] }}<template v-if="view.question.music?.year"> ({{ view.question.music.year }})</template></strong> · artiest {{ view.question.music?.artistPoints }} + titel {{ view.question.music?.titlePoints }}<template v-if="view.question.music?.year"> + jaar {{ view.question.music.yearPoints }}</template> punten</p>
          <p v-else-if="view.question?.type === 'OPEN'" class="muted">Open vraag — peer-review. Geaccepteerd: <strong>{{ view.currentCorrect?.join(' / ') }}</strong></p>
          <div v-else>
            <div v-for="o in view.question?.options" :key="o.id" class="option" :class="{ correct: showCorrect && view.currentCorrect?.includes(o.id) }" style="cursor: default">
              <span class="mark" />{{ o.text }}
            </div>
          </div>
          <div class="muted">{{ view.answered }} / {{ view.participants }} geantwoord · {{ view.online }} online</div>
          <div class="bar"><i :style="{ width: pct + '%' }" /></div>
          <div v-if="view.powerUpsUsed" class="row"><span v-for="(n, t) in view.powerUpsUsed" :key="t" class="pill gold">{{ POWER_LABEL[t as keyof typeof POWER_LABEL]?.icon }} {{ POWER_LABEL[t as keyof typeof POWER_LABEL]?.name }} ×{{ n }}</span></div>
          <p class="muted" v-if="live.phase === 'QUESTION_OPEN'">Het correcte antwoord is alleen voor jou zichtbaar na sluiten.</p>
        
      <div v-if="view.gradingAdmin?.length" class="stack" style="border-top: 1px solid var(--border); padding-top: 12px">
        <h3>Beoordelingen (open vragen)</h3>
        <p v-if="live.phase === 'GRADING'" class="muted">Spelers beoordelen elkaars antwoorden. Jij kunt elke beoordeling corrigeren.</p>
        <p v-else class="muted">Je kunt de open antwoorden nu al nakijken met ✓ of ✗. Wat jij beoordeelt, blijft staan; de rest beoordelen de spelers aan het eind van de ronde.</p>
        <div v-for="g in view.gradingAdmin" :key="g.id" class="row" style="border-bottom: 1px solid var(--border); padding-bottom: 8px">
          <div class="grow">
            <strong>{{ g.answer }}</strong> <span class="muted">— {{ g.gradee }} · vraag: {{ g.question }}</span><br />
            <span class="muted">{{ g.source === 'AUTO' ? 'automatisch goed (exacte match)' : g.source === 'HOST' ? 'door jou beoordeeld' : g.source === 'DEFAULT' ? 'niet beoordeeld: telt als fout' : g.grader ? `beoordelaar: ${g.grader}` : 'geen beoordelaar beschikbaar: beoordeel zelf' }}</span>
          </div>
          <span class="pill" :class="{ gold: g.verdict === true }">{{ g.verdict === null ? 'open' : g.verdict ? 'goed' : 'fout' }}</span>
          <button class="ghost small" :disabled="busy" aria-label="Markeer goed" @click="hostGrade(g.id, true)">✓</button>
          <button class="ghost small" :disabled="busy" aria-label="Markeer fout" @click="hostGrade(g.id, false)">✗</button>
        </div>
      </div>
        </div>

        <div class="card stack grow" style="min-width: 240px">
          <h3>Bediening</h3>
          <div class="row controls">
            <button v-if="live.phase === 'QUESTION_OPEN'" :disabled="busy" title="Sluit de vraag nu; het antwoord van spelers wordt vergrendeld" @click="act('close')">Vraag sluiten</button>
            <button v-if="live.phase === 'QUESTION_CLOSED'" class="ghost" :disabled="busy" title="Zet de gesloten vraag weer open (kan tot je de uitslag onthult)" @click="act('reopen')">Vraag heropenen</button>
            <button v-if="live.phase === 'QUESTION_OPEN' || live.phase === 'QUESTION_CLOSED'" class="ghost" :disabled="busy" title="Telt niet mee voor de scores en verdwijnt uit de onthulling" @click="skip">Vraag overslaan</button>
            <button v-if="live.phase === 'QUESTION_OPEN'" class="ghost" :disabled="busy" title="Noodgreep: sluit de vraag en onthult direct" @click="act('force_reveal')">Forceer onthulling</button>
            <button v-if="live.phase === 'GRADING'" class="gold" :disabled="busy" :title="pendingGrades ? 'Er zijn nog open beoordelingen: die tellen dan als fout' : 'Alles is beoordeeld'" @click="finishGrading">
              {{ pendingGrades ? `Beoordeling afronden (${pendingGrades} open)` : 'Onthul na beoordeling' }}
            </button>
            <button v-if="canReveal" :disabled="busy" :title="`Onthul ${view.quiz.revealMode === 'ROUND' ? 'alle gesloten vragen van deze ronde' : 'deze vraag'} en tel de scores mee`" @click="act('reveal')">
              Onthul {{ view.quiz.revealMode === 'ROUND' ? 'ronde' : 'vraag' }}
            </button>
            <button v-if="canNext" class="gold" :disabled="busy" @click="act('next')">{{ isLast ? 'Quiz afronden' : 'Volgende vraag' }}</button>
            <button v-if="canNext" class="ghost" :disabled="busy" title="Lichter dan pauzeren: even drinken of naar het toilet" @click="act('break')">Onderbreking</button>
            <button v-if="live.phase === 'BREAK' || live.phase === 'PAUSED'" class="gold" :disabled="busy" @click="act('resume')">Hervatten</button>
            <button v-if="!['BREAK', 'PAUSED'].includes(live.phase)" class="ghost" :disabled="busy" title="Bevriest de hele quiz, ook de timer" @click="act('pause')">Quiz pauzeren</button>
            <button class="ghost" :disabled="busy" @click="act('standings')">{{ live.showStandings ? 'Verberg tussenstand' : 'Toon tussenstand' }}</button>
            <button class="danger" :disabled="busy" @click="end">Quiz beëindigen</button>
          </div>
          <details>
            <summary>Wat doet wat?</summary>
            <ul class="muted">
              <li><strong>Sluiten</strong>: vergrendelt de antwoorden (of de timer doet het).</li>
              <li><strong>Onthullen</strong>: toont juiste antwoorden en telt de scores mee.</li>
              <li><strong>Onderbreking</strong>: korte pauze tussen vragen. <strong>Pauzeren</strong>: bevriest alles.</li>
            </ul>
          </details>
        </div>
      </div>

      <div v-if="live.phase === 'FINISHED'" class="banner">De quiz is afgelopen 🏆</div>

      <div v-if="view.pictures?.length" class="card stack">
        <h3>📷 Beeldrondes</h3>
        <div v-for="pic in view.pictures" :key="pic.roundIndex" class="row" style="border-bottom: 1px solid var(--border); padding-bottom: 8px">
          <div class="grow">
            <strong>{{ pic.title }}</strong>
            <span class="pill" :class="{ gold: !pic.closed }" style="margin-left: 6px">{{ pic.closed ? 'gesloten' : `open t/m ronde ${pic.closesAfterRound}` }}</span>
            <div class="muted">Antwoorden per vraag: {{ pic.questions.map((q) => view?.pictureProgress?.[q.id] ?? 0).join(' · ') }} van {{ view.participants }} spelers</div>
          </div>
          <button v-if="!pic.closed" class="ghost small" :disabled="busy" title="Sluit de beeldronde nu al" @click="act('close_picture', false, pic.roundIndex)">Sluit nu</button>
          <button class="small" :disabled="busy || !canRevealPicture" title="Sluit (indien nodig), beoordeel open antwoorden en onthul" @click="act('reveal_picture', false, pic.roundIndex)">Onthul</button>
        </div>
        <p v-if="!canRevealPicture" class="muted" style="margin: 0">Onthullen kan zodra de huidige vraag gesloten is.</p>
        <p class="muted" style="margin: 0">De quiz kan pas eindigen als alle beeldrondes onthuld zijn.</p>
      </div>

      <div v-if="view.revealed.length" class="card stack">
        <h3>Onthuld</h3>
        <div v-for="r in view.revealed" :key="r.question.id">
          <strong>{{ r.question.text }}</strong>
          <div class="row">
            <span class="muted grow">Juist: <template v-if="r.question.type === 'MUSIC'">{{ r.question.music?.artist[0] }} – {{ r.question.music?.title[0] }}</template><template v-else>{{ r.question.options.filter((o) => r.question.correct?.includes(o.id)).map((o) => o.text).join(', ') || r.question.correct?.join(' / ') }}</template></span>
            <button v-if="r.question.type === 'MC' || r.question.type === 'MULTI'" class="ghost small" @click="startFix(r.question)">Antwoord corrigeren</button>
          </div>
          <div v-if="fix && fix.id === r.question.id" class="card stack" style="background: var(--surface-2)">
            <p class="muted" style="margin: 0">Kies het juiste antwoord. De scores worden opnieuw berekend en de wijziging wordt gelogd.</p>
            <label v-for="o in r.question.options" :key="o.id" class="row" style="margin: 0">
              <input v-if="r.question.type === 'MC'" type="radio" name="fix" :checked="fix.correct.includes(o.id)" style="width: 24px; min-height: 24px" @change="fix.correct = [o.id]" />
              <input v-else type="checkbox" :checked="fix.correct.includes(o.id)" style="width: 24px; min-height: 24px" @change="toggleFix(o.id)" />
              {{ o.text }}
            </label>
            <input v-model="fix.reason" placeholder="Reden (verplicht, wordt gelogd)" aria-label="Reden" />
            <div class="row"><button :disabled="busy || fix.reason.trim().length < 3 || !fix.correct.length" @click="saveFix">Opslaan</button><button class="ghost" @click="fix = null">Annuleren</button></div>
          </div>
          <div v-for="o in (r.question.type === 'OPEN' || r.question.type === 'MUSIC' ? [] : r.question.options)" :key="o.id" class="row" style="gap: 8px">
            <span style="width: 40%" :style="r.question.correct?.includes(o.id) ? 'font-weight: 800; color: var(--success)' : ''">{{ o.text }}</span>
            <div class="bar grow"><i :style="{ width: (100 * (r.histogram[o.id] ?? 0)) / Math.max(1, view.participants) + '%' }" /></div>
            <span class="mono">{{ r.histogram[o.id] ?? 0 }}</span>
          </div>
        </div>
      </div>

      <div v-if="live.showStandings || live.phase === 'FINISHED'" class="card"><h2>Stand</h2><Standings :data="standings" /></div>
      <details v-else-if="standings?.gradedQuestions"><summary>Stand (alleen voor jou)</summary><Standings :data="standings" /></details>

      <div v-if="warn" class="card stack">
        <p class="info">Deze teams zijn kleiner dan het minimum: {{ warn.join(', ') }}. Toch starten?</p>
        <div class="row"><button class="danger" @click="start(true)">Toch starten</button><button class="ghost" @click="warn = null">Annuleren</button></div>
      </div>
    </template>
  </main>
</template>
<script setup lang="ts">
import QRCode from 'qrcode'
const route = useRoute()
const { user, loaded } = useAuth()
const id = route.params.id as string
const L = useLive(() => id, true)
const { view, connected, error, remainingMs } = L
const err = ref('')
const busy = ref(false)
const warn = ref<string[] | null>(null)
const qr = ref('')
const origin = ref('')
const live = computed(() => view.value!.live)
const standings = computed(() => L.standings.value)
const phaseLabel: Record<string, string> = { LOBBY: 'Lobby', QUESTION_OPEN: 'Vraag open', QUESTION_CLOSED: 'Vraag gesloten', GRADING: 'Beoordelen', REVEAL: 'Onthulling', BREAK: 'Onderbreking', PAUSED: 'Gepauzeerd', FINISHED: 'Afgelopen' }
const showCorrect = computed(() => ['QUESTION_CLOSED', 'REVEAL'].includes(live.value.phase))
const pct = computed(() => Math.min(100, (100 * (view.value?.answered ?? 0)) / Math.max(1, view.value?.participants ?? 1)))
const canReveal = computed(() => ['QUESTION_CLOSED', 'REVEAL'].includes(live.value.phase))
const pendingGrades = computed(() => (view.value?.gradingAdmin ?? []).filter((g: any) => g.verdict === null).length)
async function finishGrading() {
  if (pendingGrades.value && !confirm(`${pendingGrades.value} antwoord(en) zijn nog niet beoordeeld. Die tellen dan als fout. Toch afronden?`)) return
  await act('reveal', pendingGrades.value > 0)
}
async function hostGrade(gradeId: string, verdict: boolean) {
  const reason = prompt('Reden voor deze correctie (wordt gelogd):', verdict ? 'toch goed' : 'toch fout')
  if (!reason) return
  busy.value = true; err.value = ''
  try { await api(`/live/${id}/grade-override`, { method: 'POST', body: { gradeId, verdict, reason } }); await L.refresh() } catch (e: any) { err.value = e.message } finally { busy.value = false }
}
const canNext = computed(() => ['QUESTION_CLOSED', 'REVEAL'].includes(live.value.phase))
const canRevealPicture = computed(() => ['QUESTION_CLOSED', 'REVEAL', 'GRADING'].includes(live.value.phase))
// Picture rounds are not stepped through, so they do not count towards "last question".
const totalQ = computed(() => (view.value?.quiz.rounds ?? []).filter((r) => r.kind !== 'PICTURE').reduce((n, r) => n + r.questionCount, 0))
const isLast = computed(() => {
  const v = view.value!
  let n = 0
  for (let r = 0; r < live.value.roundIndex; r++) if (v.quiz.rounds[r]?.kind !== 'PICTURE') n += v.quiz.rounds[r]?.questionCount ?? 0
  return n + live.value.questionIndex + 1 >= totalQ.value
})

async function act(a: string, force = false, round?: number) {
  busy.value = true
  err.value = ''
  try { await L.action(a, force, round); await L.refresh() } catch (e: any) {
    if (e.status === 409 && e.data?.warnings) warn.value = e.data.warnings
    else err.value = e.message
  } finally { busy.value = false }
}
const start = (force = false) => act('start', force === true).then(() => (warn.value = null))
function skip() { if (confirm('Deze vraag overslaan? Hij telt niet mee voor de scores.')) act('skip') }
const fix = ref<{ id: string; type: string; correct: string[]; reason: string } | null>(null)
function startFix(q: any) { fix.value = { id: q.id, type: q.type, correct: [...(q.correct ?? [])], reason: '' } }
function toggleFix(id: string) { const f = fix.value!; f.correct = f.correct.includes(id) ? f.correct.filter((c) => c !== id) : [...f.correct, id] }
async function saveFix() {
  const f = fix.value!
  busy.value = true; err.value = ''
  try { await api(`/live/${id}/override`, { method: 'POST', body: { questionId: f.id, correct: f.correct, reason: f.reason } }); fix.value = null; await L.refresh() }
  catch (e: any) { err.value = e.message } finally { busy.value = false }
}
function end() { if (confirm('Quiz nu beëindigen? Dit kan niet ongedaan worden gemaakt.')) act('end') }

async function init() {
  if (!user.value || user.value.isGuest) return navigateTo(`/login?next=/host/${id}`)
  origin.value = location.origin
  try {
    await L.connect()
    const code = view.value?.quiz.joinCode
    if (code) qr.value = await QRCode.toDataURL(`${location.origin}/play/${code}`, { margin: 1, width: 440 })
  } catch (e: any) { err.value = e.message }
}
watch(loaded, (v) => v && init(), { immediate: true })
</script>
