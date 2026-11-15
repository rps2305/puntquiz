<template>
  <main class="wrap stack">
    <!-- Not signed in: fast join (guest or login) -->
    <div v-if="loaded && !user" class="card stack">
      <h1>Doe mee met de quiz</h1>
      <p class="muted">Quizcode <span class="mono">{{ code }}</span></p>
      <form class="stack" @submit.prevent="guest">
        <div><label for="gn">Jouw naam</label><input id="gn" v-model="guestName" minlength="2" maxlength="40" required autocomplete="nickname" /></div>
        <p v-if="err" class="err">{{ err }}</p>
        <button>Meedoen als gast</button>
      </form>
      <NuxtLink :to="`/login?next=/play/${code}`">Ik heb een account</NuxtLink>
    </div>

    <p v-else-if="err && !view" class="err">{{ err }}</p>

    <template v-if="view">
      <div class="row">
        <h2 class="grow" style="margin: 0">{{ view.quiz.title }}</h2>
        <NuxtLink to="/info/spelregels" target="_blank" class="conn">Hoe werkt dit?</NuxtLink>
        <span class="conn" :class="{ off: !connected }" role="status">{{ connected ? '● live' : '● verbinding weg…' }}</span>
      </div>
      <p v-if="pendingNotice" class="info">Je antwoord is bewaard en wordt verstuurd zodra je weer verbinding hebt.</p>
      <p v-if="error" class="err" role="alert">{{ error }}</p>

      <!-- LOBBY -->
      <template v-if="live.phase === 'LOBBY'">
        <div class="card stack">
          <h3>Lobby</h3>
          <p>{{ view.participants }} speler(s) aanwezig<span v-if="view.quiz.mode === 'TEAM'"> · {{ view.teams.length }} team(s)</span>. Wachten op de presentator…</p>
        </div>
        <div v-if="view.quiz.mode === 'TEAM'" class="card stack">
          <h3>Jouw team</h3>
          <p v-if="!view.me?.teamId" class="muted">Kies een team of maak er een. Na de start staan de teams vast.</p>
          <div v-for="t in view.teams" :key="t.id" class="card" :style="t.id === view.me?.teamId ? 'border-color: var(--accent)' : ''">
            <div class="row">
              <strong class="grow">{{ t.name }}</strong>
              <span class="pill" :class="{ gold: t.members.length >= view.quiz.minTeamSize }">{{ t.members.length }} / {{ view.quiz.maxTeamSize }}</span>
              <button v-if="t.id !== view.me?.teamId" class="small" :disabled="t.members.length >= view.quiz.maxTeamSize" @click="teamOp(`/teams/${t.id}/join`)">Join</button>
              <button v-else class="ghost small" @click="teamOp('/teams/leave')">Verlaat</button>
            </div>
            <div class="muted">{{ t.members.map((m) => m.name).join(', ') }}</div>
          </div>
          <form v-if="!view.me?.teamId" class="row" @submit.prevent="newTeam">
            <input v-model="teamName" class="grow" placeholder="Nieuwe teamnaam" maxlength="30" aria-label="Nieuwe teamnaam" />
            <button :disabled="teamName.trim().length < 2">Team maken</button>
          </form>
          <p v-else-if="myTeamSize < view.quiz.minTeamSize" class="info">Je team heeft minimaal {{ view.quiz.minTeamSize }} spelers nodig.</p>
        </div>
        <div v-if="cfg.mail" class="card stack">
          <label v-if="user && !user.isGuest && user.email" style="display: flex; gap: 10px; align-items: flex-start; margin: 0; font-weight: 600">
            <input type="checkbox" :checked="view.me?.emailResults" style="width: 24px; min-height: 24px; flex: none" @change="setMail(($event.target as HTMLInputElement).checked)" />
            <span>Mail mij de uitslag per ronde en de eindstand<br /><span class="muted" style="font-weight: 400">naar {{ user.email }} — je kunt dit altijd weer uitzetten</span></span>
          </label>
          <p v-else class="muted" style="margin: 0">Wil je de uitslagen per e-mail ontvangen? <NuxtLink :to="`/login?next=/play/${code}`">Log in met een account</NuxtLink> (als gast heb je geen e-mailadres).</p>
        </div>
        <Rules :quiz="view.quiz" :has-open="view.quiz.hasOpenQuestions" :has-picture="view.quiz.rounds.some((r) => r.kind === 'PICTURE')" />
      </template>

      <!-- BREAK / PAUSED -->
      <div v-if="live.phase === 'BREAK'" class="banner">Pauze — straks gaan we verder 🍺</div>
      <div v-if="live.phase === 'PAUSED'" class="banner">De quiz is even gepauzeerd</div>

      <!-- GRADING: peer review of another team's / player's open answer -->
      <div v-if="live.phase === 'GRADING'" class="card stack">
        <h2>Beoordelen</h2>
        <p class="muted">Beoordeel hieronder het antwoord van een ander. Alleen goed of fout. Je weet niet van wie het is.</p>
        <p v-if="!view.grading?.length" class="info">Jij hoeft niets te beoordelen. De presentator wacht op de anderen…</p>
        <div v-for="g in view.grading" :key="g.id" class="card stack" style="background: var(--surface-2)">
          <strong>{{ g.question }}</strong>
          <p style="margin: 0" class="muted">Juist is: <strong>{{ g.reference.join(' / ') }}</strong></p>
          <p class="big-q" style="margin: 0">“{{ g.answer }}”</p>
          <div class="row">
            <button :class="g.verdict === true ? 'gold' : 'ghost'" :aria-pressed="g.verdict === true" @click="grade(g.id, true)">✓ Goed</button>
            <button :class="g.verdict === false ? 'danger' : 'ghost'" :aria-pressed="g.verdict === false" @click="grade(g.id, false)">✗ Fout</button>
          </div>
        </div>
        <p v-if="view.grading?.length && view.grading.every((g) => g.verdict !== null)" class="ok">Bedankt! Je beoordelingen zijn doorgegeven.</p>
      </div>

      <!-- QUESTION -->
      <div v-if="view.question && ['QUESTION_OPEN', 'QUESTION_CLOSED', 'PAUSED'].includes(live.phase) || (live.phase === 'BREAK' && !view.revealed.length && live.pausedFrom === 'QUESTION_CLOSED')" class="card stack">
        <div class="row">
          <span class="pill">Ronde {{ live.roundIndex + 1 }} · vraag {{ view.question!.number }}</span>
          <span class="grow" />
          <span v-if="live.phase !== 'QUESTION_CLOSED' || extraActive" class="timer" :class="{ low: timerMs < 6000 }" role="timer">{{ fmtTime(timerMs) }}</span>
          <span v-else class="pill">Gesloten</span>
        </div>
        <h2 class="big-q">{{ view.question!.text }}</h2>
        <!-- Power-ups: pooled per team in team quizzes -->
        <div v-if="view.powerUps && view.question && ['QUESTION_OPEN', 'QUESTION_CLOSED'].includes(live.phase)" class="stack">
          <div class="row" role="group" aria-label="Power-ups">
            <button
              v-for="t in view.powerUps.types" :key="t" type="button" class="ghost small"
              :disabled="!view.powerUps.canUse[t]" :title="POWER_LABEL[t].help"
              :aria-pressed="view.powerUps.usedOnQuestion.includes(t)"
              :style="view.powerUps.usedOnQuestion.includes(t) ? 'border-color: var(--accent); background: var(--accent-2); color: var(--accent-2-ink)' : ''"
              @click="usePower(t)"
            >{{ POWER_LABEL[t].icon }} {{ POWER_LABEL[t].name }} <span class="mono">×{{ view.powerUps.remaining[t] }}</span></button>
          </div>
          <p v-if="view.powerUps.owner === 'TEAM'" class="muted" style="margin: 0; font-size: .85rem">Power-ups zijn van het hele team; iedereen in je team ziet ze.</p>
          <p v-if="view.powerUps.hint" class="info" style="margin: 0">💡 {{ view.powerUps.hint }}</p>
        </div>
        <QuestionMedia :items="view.question!.media ?? []" />
        <p v-if="view.question!.type === 'MULTI'" class="muted">Meerdere antwoorden mogelijk — kies alles wat juist is.</p>
        <div v-if="view.question!.type === 'MUSIC'" class="stack">
          <label for="m-artist" class="sr-only">Artiest</label>
          <input id="m-artist" v-model="music.artist" maxlength="100" placeholder="Artiest" autocomplete="off" :disabled="!canAnswer" @input="saveMusic" />
          <label for="m-title" class="sr-only">Titel</label>
          <input id="m-title" v-model="music.title" maxlength="100" placeholder="Titel" autocomplete="off" :disabled="!canAnswer" @input="saveMusic" />
          <label for="m-year" class="sr-only">Jaar</label>
          <input id="m-year" v-model="music.year" inputmode="numeric" maxlength="4" placeholder="Jaar (bonus, optioneel)" autocomplete="off" :disabled="!canAnswer" @input="saveMusic" />
          <p class="muted" style="margin: 0">Artiest en titel scoren los van elkaar; je mag er ook maar één invullen.</p>
        </div>
        <div v-else-if="view.question!.type === 'OPEN'" class="stack">
          <label for="open-answer" class="sr-only">Jouw antwoord</label>
          <input id="open-answer" v-model="openText" maxlength="200" placeholder="Typ je antwoord…" autocomplete="off" :disabled="!canAnswer" @input="saveOpen" />
          <p class="muted" style="margin: 0">Een ander team of een andere speler beoordeelt straks of je antwoord goed is.</p>
        </div>
        <div v-else>
          <button
            v-for="o in view.question!.options.filter((x) => !view!.powerUps?.hidden.includes(x.id))" :key="o.id" class="option"
            :class="{ selected: picked.includes(o.id), multi: view.question!.type === 'MULTI' }"
            :disabled="!canAnswer" :aria-pressed="picked.includes(o.id)" @click="pick(o.id)"
          ><span class="mark">{{ picked.includes(o.id) ? '✓' : '' }}</span>{{ o.text }}</button>
        </div>
        <p v-if="live.skipped?.includes(view.question!.id)" class="info">Deze vraag is overgeslagen en telt niet mee.</p>
        <p v-if="picked.length && live.phase === 'QUESTION_OPEN' && view.question!.type === 'OPEN'" class="ok">Antwoord opgeslagen — je kunt het nog wijzigen tot de vraag sluit.</p>
        <p v-else-if="picked.length && live.phase === 'QUESTION_OPEN'" class="ok">Antwoord opgeslagen — je kunt het nog wijzigen tot de vraag sluit.</p>
        <p v-else-if="!picked.length && live.phase === 'QUESTION_CLOSED'" class="muted">Je hebt niet geantwoord. Geen zorgen, dat kan gebeuren.</p>
        <p v-else-if="live.phase === 'QUESTION_CLOSED'" class="muted">Je antwoord is vergrendeld. De uitslag volgt bij het onthullen.</p>
      </div>

      <!-- Picture round: all questions at once, answerable while later rounds run (spec §6) -->
      <template v-if="live.phase !== 'LOBBY' && live.phase !== 'FINISHED' && view.pictures?.length">
        <details v-for="pic in view.pictures" :key="pic.roundIndex" class="card" open>
          <summary style="cursor: pointer"><strong>📷 {{ pic.title }}</strong> <span class="pill" :class="{ gold: !pic.closed }">{{ pic.closed ? 'gesloten' : `open t/m ronde ${pic.closesAfterRound}` }}</span></summary>
          <div class="stack" style="margin-top: 10px">
            <p class="muted" style="margin: 0">{{ pic.closed ? 'Deze beeldronde is gesloten. De onthulling volgt.' : 'Je kunt hier tussen de andere vragen door antwoorden invullen en wijzigen.' }}</p>
            <PictureQuestion v-for="q in pic.questions" :key="q.id" :question="q" :answer="pic.answers[q.id]" :disabled="pic.closed || live.phase === 'PAUSED'" @answer="(qid, sel) => L.answer(sel, qid)" />
          </div>
        </details>
      </template>

      <!-- REVEAL -->
      <template v-if="view.revealed.length">
        <div v-for="r in view.revealed" :key="r.question.id" class="card stack">
          <h3>{{ r.question.text }}</h3>
          <QuestionMedia :items="r.question.media ?? []" />
          <div v-if="r.question.type === 'MUSIC'" class="stack">
            <p style="margin: 0">Goed: <strong style="color: var(--success)">{{ r.question.music?.artist[0] }} – {{ r.question.music?.title[0] }}<span v-if="r.question.music?.year"> ({{ r.question.music.year }})</span></strong></p>
            <p v-if="r.musicResult?.mine" style="margin: 0">
              Jij: {{ r.myAnswer?.[0] || '—' }} {{ r.musicResult.mine.artist ? '✓' : '✗' }} · {{ r.myAnswer?.[1] || '—' }} {{ r.musicResult.mine.title ? '✓' : '✗' }}<template v-if="r.question.music?.year"> · {{ r.myAnswer?.[2] || '—' }} {{ r.musicResult.mine.year ? '✓' : '✗' }}</template>
              — <strong>{{ r.musicResult.mine.points }} / {{ r.musicResult.max }} punten</strong>
            </p>
            <p v-if="view.quiz.mode === 'TEAM' && r.musicResult?.team" style="margin: 0">Team: {{ r.teamAnswer?.[0] || '—' }} {{ r.musicResult.team.artist ? '✓' : '✗' }} · {{ r.teamAnswer?.[1] || '—' }} {{ r.musicResult.team.title ? '✓' : '✗' }} — <strong>{{ r.musicResult.team.points }} punten</strong></p>
          </div>
          <div v-else-if="r.question.type === 'OPEN'" class="stack">
            <p style="margin: 0">Goed: <strong style="color: var(--success)">{{ r.question.correct?.join(' / ') }}</strong></p>
            <p style="margin: 0">Jouw antwoord: <strong>{{ r.myAnswer?.[0] ?? '—' }}</strong></p>
            <p v-if="view.quiz.mode === 'TEAM' && view.me?.teamId" style="margin: 0">Teamantwoord: <strong>{{ r.teamAnswer?.[0] ?? '—' }}</strong></p>
          </div>
          <div v-else>
            <div v-for="o in r.question.options" :key="o.id" class="option" :class="{ correct: r.question.correct?.includes(o.id), wrong: !r.question.correct?.includes(o.id) && r.myAnswer?.includes(o.id) }" style="cursor: default">
              <span class="mark">{{ r.myAnswer?.includes(o.id) ? '●' : '' }}</span>
              <span class="grow">{{ o.text }}<span v-if="r.teamAnswer?.includes(o.id)" class="pill" style="margin-left: 8px">team</span></span>
              <span class="mono muted">{{ r.histogram[o.id] ?? 0 }}×</span>
            </div>
          </div>
          <p v-if="r.myAnswer === null" class="muted">Geen antwoord gegeven.</p>
          <p v-else :class="r.myCorrect ? 'ok' : 'err'">{{ r.myCorrect ? 'Jouw antwoord was goed!' : 'Jouw antwoord was niet juist.' }}</p>
          <p v-if="view.quiz.mode === 'TEAM' && view.me?.teamId">
            Teamantwoord: <strong>{{ r.teamAnswer ? (r.teamCorrect ? 'goed' : 'fout') : 'geen antwoord' }}</strong>
          </p>
          <p v-if="r.powerUp" class="info" style="margin: 0">{{ POWER_LABEL[r.powerUp.type].icon }} {{ POWER_LABEL[r.powerUp.type].name }}: {{ r.powerUp.earned > 0 ? '+' : '' }}{{ r.powerUp.earned }} punten</p>
          <p v-if="r.question.explanation" class="muted">{{ r.question.explanation }}</p>
        </div>
      </template>

      <div v-if="live.showStandings || live.phase === 'FINISHED'" class="card">
        <h2 v-if="live.phase === 'FINISHED'">Eindstand 🏆</h2>
        <h2 v-else>Tussenstand</h2>
        <Standings :data="standings" />
      </div>

      <details v-if="live.phase !== 'LOBBY'"><summary>Spelregels</summary><Rules :quiz="view.quiz" :has-open="view.quiz.hasOpenQuestions" :has-picture="view.quiz.rounds.some((r) => r.kind === 'PICTURE')" /></details>
    </template>
    <ChatPanel v-if="view && quizId" :quiz-id="quizId" :tick="chatTick" />
  </main>
</template>
<script setup lang="ts">
const route = useRoute()
const code = String(route.params.code).toUpperCase()
const { user, loaded } = useAuth()
const guestName = ref('')
const teamName = ref('')
const err = ref('')
const quizId = ref('')
const cfg = ref({ mail: false })
onMounted(async () => { try { cfg.value = await api('/auth/config') } catch {} })
async function setMail(enabled: boolean) {
  try { await api(`/live/${quizId.value}/email-pref`, { method: 'POST', body: { enabled } }); await L.refresh() } catch (e: any) { err.value = e.message; await L.refresh() }
}
const L = useLive(() => quizId.value, false)
const { view, standings, connected, error, pendingNotice, remainingMs, serverNow, chatTick } = L
// Extra Time lets one owner keep answering after the shared timer ran out (the server enforces it).
const extraUntil = computed(() => view.value?.powerUps?.extraUntil ?? null)
const extraActive = computed(() => live.value.phase === 'QUESTION_CLOSED' && !!extraUntil.value && serverNow.value < extraUntil.value)
const canAnswer = computed(() => live.value.phase === 'QUESTION_OPEN' || extraActive.value)
const timerMs = computed(() => (extraUntil.value && canAnswer.value ? Math.max(0, extraUntil.value - serverNow.value) : remainingMs.value))
async function usePower(type: string) {
  if (type === 'DOUBLE_DOWN' && !confirm('Dubbel risico: goed = dubbele punten, fout = je verliest de helft van de vraagpunten. Doorgaan?')) return
  try { await api(`/live/${quizId.value}/powerup`, { method: 'POST', body: { type } }); await L.refresh() } catch (e: any) { err.value = e.message }
}
const live = computed(() => view.value!.live)
const picked = computed(() => view.value?.myAnswer ?? [])
const myTeamSize = computed(() => view.value?.teams.find((t) => t.id === view.value?.me?.teamId)?.members.length ?? 0)

async function guest() {
  err.value = ''
  try { user.value = await api('/auth/guest', { method: 'POST', body: { name: guestName.value } }); await start() } catch (e: any) { err.value = e.message }
}
async function start() {
  try {
    const j = await api(`/play/${code}/join`, { method: 'POST' })
    quizId.value = j.quizId
    await L.connect()
  } catch (e: any) { err.value = e.message }
}
const music = reactive({ artist: '', title: '', year: '' })
let musicTimer: ReturnType<typeof setTimeout> | null = null
// Same buffered, grace-aware save path as every other answer; sent as positional [artist, title, year].
function saveMusic() {
  if (musicTimer) clearTimeout(musicTimer)
  musicTimer = setTimeout(() => { if (music.artist.trim() || music.title.trim() || music.year.trim()) L.answer([music.artist, music.title, music.year]) }, 500)
}
watch(() => view.value?.question?.id, () => { const a = view.value?.myAnswer; music.artist = a?.[0] ?? ''; music.title = a?.[1] ?? ''; music.year = a?.[2] ?? '' }, { immediate: true })
const openText = ref('')
let openTimer: ReturnType<typeof setTimeout> | null = null
// Typing: debounce, then save through the same buffered/grace-aware path as other answers.
function saveOpen() {
  if (openTimer) clearTimeout(openTimer)
  openTimer = setTimeout(() => { const t = openText.value.trim(); if (t) L.answer([t]) }, 500)
}
watch(() => view.value?.question?.id, () => { openText.value = view.value?.myAnswer?.[0] ?? '' }, { immediate: true })
watch(() => view.value?.myAnswer, (a) => { if (a && !openText.value) openText.value = a[0] ?? '' })
async function grade(gradeId: string, verdict: boolean) {
  try { await api(`/live/${quizId.value}/grade`, { method: 'POST', body: { gradeId, verdict } }); await L.refresh() } catch (e: any) { err.value = e.message }
}
function pick(id: string) {
  const q = view.value?.question
  if (!q) return
  const cur = picked.value
  L.answer(q.type === 'MC' ? [id] : cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
}
async function teamOp(path: string) {
  try { await api(`/live/${quizId.value}${path}`, { method: 'POST' }); await L.refresh() } catch (e: any) { err.value = e.message }
}
async function newTeam() {
  try { await api(`/live/${quizId.value}/teams`, { method: 'POST', body: { name: teamName.value } }); teamName.value = ''; await L.refresh() } catch (e: any) { err.value = e.message }
}
watch(loaded, (v) => { if (v && user.value) start() }, { immediate: true })
</script>
