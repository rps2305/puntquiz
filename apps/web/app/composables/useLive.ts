import { io, type Socket } from 'socket.io-client'
import type { HostLiveView, PlayerLiveView, StandingsDto } from '@puntquiz/contracts'

interface Pending {
  questionId: string
  selected: string[]
  answeredAt: number
}

/**
 * Live quiz state. The server is the only source of truth: sockets only say "refetch", the client
 * timer is display-only. Answers are buffered in localStorage while offline and re-sent on reconnect
 * (60s grace period enforced server-side, spec §10/§15).
 */
export function useLive(getId: () => string, host = false) {
  const view = ref<(PlayerLiveView & Partial<HostLiveView>) | null>(null)
  const standings = ref<StandingsDto | null>(null)
  const connected = ref(false)
  const error = ref('')
  const now = ref(Date.now())
  const offset = ref(0)
  const pendingNotice = ref(false)
  let socket: Socket | null = null
  let tick: ReturnType<typeof setInterval> | null = null
  let poll: ReturnType<typeof setInterval> | null = null
  let debounce: ReturnType<typeof setTimeout> | null = null
  const pKey = () => `pq:pending:${getId()}`

  const serverNow = computed(() => now.value + offset.value)
  const remainingMs = computed(() => {
    const l = view.value?.live
    if (!l) return 0
    if (l.phase === 'QUESTION_OPEN' && l.deadline) return Math.max(0, l.deadline - serverNow.value)
    if (l.phase === 'PAUSED') return l.remainingMs ?? 0
    return 0
  })

  // Several answers can be waiting at once (picture sheets have many questions): keep one per question.
  function readPending(): Pending[] {
    try {
      const v = JSON.parse(localStorage.getItem(pKey()) ?? 'null')
      return Array.isArray(v) ? v : v ? [v] : []
    } catch { return [] }
  }
  function writePending(list: Pending[]) {
    try { list.length ? localStorage.setItem(pKey(), JSON.stringify(list)) : localStorage.removeItem(pKey()) } catch {}
    pendingNotice.value = list.length > 0
  }
  const putPending = (p: Pending) => writePending([...readPending().filter((x) => x.questionId !== p.questionId), p])
  const dropPending = (qid: string) => writePending(readPending().filter((x) => x.questionId !== qid))

  async function flushPending() {
    for (const p of readPending()) {
      try {
        await api(`/live/${getId()}/answer`, { method: 'POST', body: p })
        dropPending(p.questionId)
      } catch (e: any) {
        if (e.status) dropPending(p.questionId) // server answered (e.g. too late): stop retrying
      }
    }
  }

  async function refresh() {
    try {
      const v = await api<PlayerLiveView & Partial<HostLiveView>>(`/live/${getId()}${host ? '?host=1' : ''}`)
      offset.value = v.serverNow - Date.now()
      view.value = v
      error.value = ''
      // Show buffered picks while we retry.
      for (const pending of readPending()) {
        if (pending.questionId === v.live.questionId && !v.myAnswer) v.myAnswer = pending.selected
        for (const pic of v.pictures ?? []) if (pic.questions.some((q) => q.id === pending.questionId) && !pic.answers[pending.questionId]) pic.answers[pending.questionId] = pending.selected
      }
      if (v.live.showStandings || v.live.phase === 'FINISHED' || host) {
        standings.value = await api(`/live/${getId()}/standings`)
      }
      if (!host) void flushPending()
    } catch (e: any) {
      error.value = e.message
    }
  }

  function scheduleRefresh() {
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(refresh, 150)
  }

  async function connect() {
    await refresh()
    socket = io({ path: '/socket.io', transports: ['websocket', 'polling'], withCredentials: true })
    socket.on('connect', () => {
      connected.value = true
      socket!.emit('quiz:join', { quizId: getId() }, () => refresh())
    })
    socket.on('disconnect', () => (connected.value = false))
    socket.on('quiz:changed', scheduleRefresh)
    socket.on('quiz:answered', (m: { answered?: number; presenceChanged?: boolean }) => {
      if (m.presenceChanged) return scheduleRefresh()
      if (view.value && typeof m.answered === 'number') view.value.answered = m.answered
    })
    window.addEventListener('online', refresh)
    tick = setInterval(() => (now.value = Date.now()), 250)
    poll = setInterval(refresh, 15000) // safety net only
  }

  function disconnect() {
    socket?.disconnect()
    if (tick) clearInterval(tick)
    if (poll) clearInterval(poll)
    window.removeEventListener('online', refresh)
  }

  /** Answer the current question, or (with `questionId`) a question on an open picture sheet. */
  async function answer(selected: string[], questionId?: string) {
    const v = view.value
    const qid = questionId ?? v?.question?.id
    if (!v || !qid) return
    const rec: Pending = { questionId: qid, selected, answeredAt: Date.now() + offset.value }
    if (questionId) { for (const pic of v.pictures ?? []) if (pic.questions.some((q) => q.id === qid)) pic.answers[qid] = selected }
    else v.myAnswer = selected // optimistic
    putPending(rec)
    try {
      await api(`/live/${getId()}/answer`, { method: 'POST', body: rec })
      dropPending(qid)
    } catch (e: any) {
      if (e.status) {
        dropPending(qid)
        error.value = e.message
        await refresh()
      } // no status = offline: keep buffered, flushed on reconnect
    }
  }

  async function action(a: string, force = false, round?: number) {
    return api(`/live/${getId()}/action`, { method: 'POST', body: { action: a, force, round } })
  }

  onBeforeUnmount(disconnect)
  return { view, standings, connected, error, remainingMs, serverNow, pendingNotice, connect, refresh, answer, action }
}

export function fmtTime(ms: number) {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
