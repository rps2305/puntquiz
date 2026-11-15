// End-to-end API test against a running stack: node tests/e2e.mjs [baseUrl]
import assert from 'node:assert/strict'
import { io } from 'socket.io-client'

const BASE = process.argv[2] ?? 'http://localhost:8088'

class Client {
  constructor(name) { this.name = name; this.cookie = '' }
  async req(method, path, body) {
    const r = await fetch(`${BASE}/api${path}`, {
      method, headers: { 'content-type': 'application/json', cookie: this.cookie }, body: body ? JSON.stringify(body) : undefined,
    })
    const sc = r.headers.getSetCookie?.() ?? []
    if (sc.length) this.cookie = sc.map((c) => c.split(';')[0]).join('; ')
    const text = await r.text()
    const data = text ? JSON.parse(text) : null
    if (!r.ok) { const e = new Error(`${method} ${path} -> ${r.status} ${text}`); e.status = r.status; e.data = data; throw e }
    return data
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const fail = async (p, status) => { try { await p; assert.fail('expected failure') } catch (e) { assert.equal(e.status, status, e.message) } }

// SSO wiring: config + authorize redirect with PKCE (full login needs a browser; see Appendix C)
const cfg = await new Client('cfg').req('GET', '/auth/config')
if (cfg.oidc) {
  const r = await fetch(`${BASE}/api/auth/oidc/login?next=/quizzes`, { redirect: 'manual' })
  assert.equal(r.status, 302)
  const loc = new URL(r.headers.get('location'))
  assert.equal(loc.pathname, '/application/o/authorize/')
  assert.equal(loc.searchParams.get('code_challenge_method'), 'S256')
  assert.ok(loc.searchParams.get('state') && loc.searchParams.get('code_challenge'))
  const bad = await fetch(`${BASE}/api/auth/oidc/callback?code=x&state=y`, { redirect: 'manual' })
  assert.equal(bad.status, 302); assert.match(bad.headers.get('location'), /^\/login\?error=/)
}
if (!cfg.localAuth) { console.log('SSO checks OK; local auth disabled, skipping game-loop test (needs password accounts)'); process.exit(0) }

const stamp = Date.now()
const host = new Client('host')
await host.req('POST', '/auth/register', { email: `host${stamp}@test.dev`, name: 'Quizmaster', password: 'supersecret1' })

// ---- Question bank: import (dry run + real), duplicates, usage tracking, export round trip ----
import { readFileSync } from 'node:fs'
{
  const csv = readFileSync(new URL('./fixtures/sample-bank.csv', import.meta.url), 'utf8')
  const dry = await host.req('POST', '/bank/import', { format: 'csv', content: csv, dryRun: true })
  assert.equal(dry.valid, 6); assert.equal(dry.errors.length, 0)
  let r = await host.req('POST', '/bank/import', { format: 'csv', content: csv })
  assert.equal(r.imported, 6)
  r = await host.req('POST', '/bank/import', { format: 'csv', content: csv })
  assert.equal(r.imported, 0); assert.equal(r.duplicates, 6)
  const bad = await host.req('POST', '/bank/import', { format: 'csv', content: 'vraag;optie1;optie2;juist\nX;a;b;9' })
  assert.equal(bad.imported, 0); assert.equal(bad.errors.length, 1)
  await fail(new Client('anon3').req('GET', '/bank'), 401)
  const guest = new Client('g'); await guest.req('POST', '/auth/guest', { name: 'Gast' }); await fail(guest.req('GET', '/bank'), 403)
  const listed = await host.req('GET', '/bank?q=canberra'); assert.equal(listed.total, 0) // text says "hoofdstad", tags/text search
  const found = await host.req('GET', '/bank?q=hoofdstad'); assert.equal(found.total, 1)
  const cat = await host.req('GET', '/bank?category=Wiskunde'); assert.equal(cat.items[0].type, 'MULTI')
  assert.equal(cat.items[0].usage.count, 0)
  // use two bank questions in a quiz -> usage tracked once published
  const bankQ = found.items[0]
  const uq = await host.req('POST', '/quizzes', { title: 'Bank-gebruik', rounds: [{ title: 'R', questions: [{ text: bankQ.text, options: bankQ.options, correct: bankQ.correct, bankQuestionId: bankQ.id }] }] })
  let u = (await host.req('GET', '/bank?q=hoofdstad')).items[0].usage
  assert.equal(u.count, 0); assert.equal(u.inDraft, true)
  await host.req('POST', `/quizzes/${uq.id}/publish`)
  u = (await host.req('GET', '/bank?q=hoofdstad')).items[0].usage
  assert.equal(u.count, 1); assert.equal(u.lastUsed.title, 'Bank-gebruik')
  assert.equal((await host.req('GET', '/bank?unused=1')).total, 5)
  // save a whole quiz to the bank (dedup by text, links copies)
  const fq = await host.req('POST', `/bank/from-quiz/${uq.id}`); assert.equal(fq.added, 0)
  // export round trip: csv -> wipe -> import gives the same 6 questions back
  const exp = await fetch(`${BASE}/api/bank/export?format=csv`, { headers: { cookie: host.cookie } })
  const csvOut = await exp.text(); assert.ok(csvOut.includes('Canberra'))
  const xl = await fetch(`${BASE}/api/bank/export?format=xlsx`, { headers: { cookie: host.cookie } })
  const xlBuf = Buffer.from(await xl.arrayBuffer()); assert.equal(xlBuf.subarray(0, 2).toString(), 'PK')
  const xr = await host.req('POST', '/bank/import', { format: 'xlsx', content: xlBuf.toString('base64'), dryRun: true })
  assert.equal(xr.valid, 6, 'xlsx export re-imports')
  const jx = await (await fetch(`${BASE}/api/bank/export?format=json`, { headers: { cookie: host.cookie } })).json()
  assert.equal(jx.questions.length, 6)
  // quiz export -> import
  const qx = await (await fetch(`${BASE}/api/quizzes/${uq.id}/export`, { headers: { cookie: host.cookie } })).json()
  const qi = await host.req('POST', '/quizzes/import', qx); assert.equal(qi.rounds[0].questions.length, 1)
  console.log('bank checks OK')
}

const opts = (...t) => t.map((text, i) => ({ id: 'abcd'[i], text }))
const quiz = await host.req('POST', '/quizzes', {
  title: 'E2E quiz', mode: 'TEAM', revealMode: 'ROUND', maxTeamSize: 5,
  rounds: [
    { title: 'Ronde 1', category: 'Test', questions: [
      { text: 'Hoofdstad van Australië?', options: opts('Sydney', 'Canberra', 'Perth'), correct: ['b'], points: 10, seconds: 60 },
      { text: 'Welke zijn priemgetallen?', type: 'MULTI', options: opts('2', '3', '4', '9'), correct: ['a', 'b'], points: 5, seconds: 60 },
    ] },
    { title: 'Ronde 2', questions: [{ text: 'Kleur van de lucht?', options: opts('Blauw', 'Groen'), correct: ['a'], points: 0.5, seconds: 5 }] },
  ],
})
await fail(host.req('PUT', `/quizzes/${quiz.id}`, { title: '' }), 400)
await fail(new Client('anon').req('GET', '/quizzes'), 401)
await fail(new Client('anon2').req('GET', `/play/${quiz.joinCode}`), 404) // draft not joinable
await host.req('POST', `/quizzes/${quiz.id}/publish`)

// 6 players: 2 teams of 3
const players = []
for (let i = 0; i < 6; i++) {
  const c = new Client(`p${i}`)
  await c.req('POST', '/auth/guest', { name: `Speler ${i}` })
  await c.req('POST', `/play/${quiz.joinCode}/join`)
  players.push(c)
}
// ---- Chat with the presenter ----
{
  const stranger = new Client('stranger'); await stranger.req('POST', '/auth/guest', { name: 'Buitenstaander' })
  await fail(stranger.req('POST', `/live/${quiz.id}/chat`, { text: 'hoi' }), 403)
  await fail(stranger.req('GET', `/live/${quiz.id}/chat`), 403)
  await players[0].req('POST', `/live/${quiz.id}/chat`, { text: '  Kan de vraag nog   een keer?  ' })
  await fail(players[0].req('POST', `/live/${quiz.id}/chat`, { text: '' }), 400)
  await fail(players[0].req('POST', `/live/${quiz.id}/chat`, { text: 'x'.repeat(301) }), 400)
  let hostChat = await host.req('GET', `/live/${quiz.id}/chat?host=1`)
  assert.equal(hostChat.messages.length, 1); assert.equal(hostChat.messages[0].text, 'Kan de vraag nog een keer?'); assert.equal(hostChat.messages[0].from, 'Speler 0')
  assert.equal((await players[1].req('GET', `/live/${quiz.id}/chat`)).messages.length, 0, 'other players never see it')
  assert.equal((await players[0].req('GET', `/live/${quiz.id}/chat`)).messages.length, 1)
  await fail(players[1].req('GET', `/live/${quiz.id}/chat?host=1`), 403)
  const p0 = hostChat.messages[0].fromId
  await host.req('POST', `/live/${quiz.id}/chat`, { text: 'Ja, zo meteen.', to: p0 })
  await host.req('POST', `/live/${quiz.id}/chat`, { text: 'Nog 5 minuten pauze!' })
  assert.equal((await players[0].req('GET', `/live/${quiz.id}/chat`)).messages.length, 3, 'author sees own + private reply + broadcast')
  assert.equal((await players[1].req('GET', `/live/${quiz.id}/chat`)).messages.length, 1, 'others only see the broadcast')
  await players[2].req('POST', `/live/${quiz.id}/chat`, { text: 'een' }); await players[2].req('POST', `/live/${quiz.id}/chat`, { text: 'twee' }); await players[2].req('POST', `/live/${quiz.id}/chat`, { text: 'drie' })
  await fail(players[2].req('POST', `/live/${quiz.id}/chat`, { text: 'vier' }), 400)
  hostChat = await host.req('GET', `/live/${quiz.id}/chat?host=1`)
  await host.req('DELETE', `/live/${quiz.id}/chat/${hostChat.messages[0].id}`)
  assert.equal((await players[0].req('GET', `/live/${quiz.id}/chat`)).messages.length, 2, 'deleted message is gone')
  console.log('chat checks OK')
}
await players[0].req('POST', `/live/${quiz.id}/teams`, { name: 'Alfa' })
await players[3].req('POST', `/live/${quiz.id}/teams`, { name: 'Beta' })
await fail(players[4].req('POST', `/live/${quiz.id}/teams`, { name: 'Alfa' }), 409)
let v = await players[0].req('GET', `/live/${quiz.id}`)
const [alfa, beta] = [v.teams.find((t) => t.name === 'Alfa'), v.teams.find((t) => t.name === 'Beta')]
for (const i of [1, 2]) await players[i].req('POST', `/live/${quiz.id}/teams/${alfa.id}/join`)
for (const i of [4]) await players[i].req('POST', `/live/${quiz.id}/teams/${beta.id}/join`)
// player 5 stays unteamed -> Beta has only 2 -> start must warn
await fail(players[0].req('POST', `/live/${quiz.id}/action`, { action: 'start' }), 403) // not host
try { await host.req('POST', `/live/${quiz.id}/action`, { action: 'start' }); assert.fail('should warn') } catch (e) { assert.equal(e.status, 409); assert.ok(e.data.warnings.length) }
await players[5].req('POST', `/live/${quiz.id}/teams/${beta.id}/join`)

// socket push check
const sock = io(BASE, { path: '/socket.io', extraHeaders: { cookie: players[0].cookie }, transports: ['websocket'] })
let pushed = 0
sock.on('quiz:changed', () => pushed++)
await new Promise((r) => sock.on('connect', r))
const ack = await sock.emitWithAck('quiz:join', { quizId: quiz.id })
assert.ok(ack.ok)

await host.req('POST', `/live/${quiz.id}/action`, { action: 'start' })
await fail(players[1].req('POST', `/play/${quiz.joinCode}/join`).then(() => new Client('late').req('POST', `/play/${quiz.joinCode}/join`)), 401)
v = await players[0].req('GET', `/live/${quiz.id}`)
assert.equal(v.live.phase, 'QUESTION_OPEN')
assert.equal(v.question.correct, undefined, 'correct answer must not leak to players')
const q1 = v.question.id
await fail(players[0].req('POST', `/live/${quiz.id}/teams/leave`), 400) // teams locked

// Q1: Alfa: Canberra x2, Sydney x1 -> Canberra. Beta: tie Sydney (p3) vs Canberra (p4) vs ... p3 first
const ans = (i, sel) => players[i].req('POST', `/live/${quiz.id}/answer`, { questionId: q1, selected: sel })
await ans(0, ['a']); await ans(0, ['b']) // change allowed
await ans(1, ['b']); await ans(2, ['a'])
await sleep(20); await ans(3, ['a']); await sleep(20); await ans(4, ['b'])
// p5 never answers (dead battery) — not an error
await fail(ans(0, ['zzz']), 400)
await fail(ans(0, ['a', 'b']), 400)
await host.req('POST', `/live/${quiz.id}/action`, { action: 'close' })
await fail(ans(5, ['a']), 400) // late, no grace claim
// grace period: answer given before close, delivered late
const hv = await host.req('GET', `/live/${quiz.id}?host=1`)
await players[5].req('POST', `/live/${quiz.id}/answer`, { questionId: q1, selected: ['b'], answeredAt: hv.live.closedAt - 100 })
await fail(players[5].req('POST', `/live/${quiz.id}/answer`, { questionId: q1, selected: ['b'], answeredAt: hv.live.closedAt + 5000 }), 400)

// Q2 multi
await host.req('POST', `/live/${quiz.id}/action`, { action: 'next' })
v = await players[0].req('GET', `/live/${quiz.id}`)
const q2 = v.question.id
const a2 = (i, sel) => players[i].req('POST', `/live/${quiz.id}/answer`, { questionId: q2, selected: sel })
await a2(0, ['a', 'b']); await a2(1, ['b', 'a']); await a2(2, ['a']) // alfa majority = {a,b} correct
await a2(3, ['a']); await a2(4, ['a']); await a2(5, ['c']) // beta majority {a} -> wrong (partial)
await host.req('POST', `/live/${quiz.id}/action`, { action: 'close' })
await fail(host.req('POST', `/live/${quiz.id}/action`, { action: 'close' }), 400)

// standings hidden before reveal
let st = await players[0].req('GET', `/live/${quiz.id}/standings`)
assert.equal(st.gradedQuestions, 0)
await host.req('POST', `/live/${quiz.id}/action`, { action: 'reveal' })
v = await players[0].req('GET', `/live/${quiz.id}`)
assert.equal(v.revealed.length, 2, 'round reveal shows whole round')
assert.equal(v.revealed[0].teamCorrect, true)
st = await players[0].req('GET', `/live/${quiz.id}/standings`)
const rows = Object.fromEntries(st.rows.map((r) => [r.name, r.score]))
// Alfa: q1 Canberra(2 of 3) correct 10 + q2 correct 5 = 15. Beta: q1 tie p3 Sydney(first) vs p4,p5 Canberra -> Canberra has 2 votes -> correct 10; q2 wrong -> 10
assert.equal(rows.Alfa, 15); assert.equal(rows.Beta, 10)
assert.equal(st.rows.find((r) => r.name === 'Alfa').isMine, true)

// break + pause + timer freeze
await host.req('POST', `/live/${quiz.id}/action`, { action: 'break' })
await host.req('POST', `/live/${quiz.id}/action`, { action: 'resume' })
await host.req('POST', `/live/${quiz.id}/action`, { action: 'next' }) // round 2, 5s question
await host.req('POST', `/live/${quiz.id}/action`, { action: 'pause' })
await sleep(6000)
let h = await host.req('GET', `/live/${quiz.id}?host=1`)
assert.equal(h.live.phase, 'PAUSED'); assert.ok(h.live.remainingMs > 3000, 'timer frozen while paused')
await host.req('POST', `/live/${quiz.id}/action`, { action: 'resume' })
await sleep(5600) // server auto-closes at deadline
h = await host.req('GET', `/live/${quiz.id}?host=1`)
assert.equal(h.live.phase, 'QUESTION_CLOSED', 'server-side timer closes the question')
await host.req('POST', `/live/${quiz.id}/action`, { action: 'reveal' })
await host.req('POST', `/live/${quiz.id}/action`, { action: 'next' }) // last -> finished
h = await host.req('GET', `/live/${quiz.id}?host=1`)
assert.equal(h.live.phase, 'FINISHED')
st = await players[2].req('GET', `/live/${quiz.id}/standings`)
assert.equal(st.mode, 'TEAM')
assert.ok(pushed >= 5, `socket pushes received (${pushed})`)
sock.disconnect()
// ---- Host actions: reopen, skip, force reveal, answer override (spec §15) ----
{
  const o = (...t) => t.map((text, i) => ({ id: 'abcd'[i], text }))
  const hq = await host.req('POST', '/quizzes', { title: 'Host-acties', mode: 'INDIVIDUAL', revealMode: 'QUESTION', rounds: [{ title: 'R', questions: [
    { text: 'Q1', options: o('x', 'y'), correct: ['a'], points: 10, seconds: 60 },
    { text: 'Q2', options: o('x', 'y'), correct: ['a'], points: 10, seconds: 60 },
    { text: 'Q3', options: o('x', 'y'), correct: ['b'], points: 10, seconds: 60 },
  ] }] })
  await host.req('POST', `/quizzes/${hq.id}/publish`)
  const A = new Client('A'), B = new Client('B')
  for (const [c, n] of [[A, 'Anna'], [B, 'Bram']]) { await c.req('POST', '/auth/guest', { name: n }); await c.req('POST', `/play/${hq.joinCode}/join`) }
  const act = (a) => host.req('POST', `/live/${hq.id}/action`, { action: a })
  const view = (c) => c.req('GET', `/live/${hq.id}`)
  const ans = async (c, sel) => c.req('POST', `/live/${hq.id}/answer`, { questionId: (await view(c)).question.id, selected: sel })
  await act('start')
  await ans(A, ['a']); await ans(B, ['b'])
  await fail(act('reopen'), 400) // still open
  await act('close')
  await fail(ans(B, ['a']), 400)
  await act('reopen') // closed -> open again with a fresh timer
  assert.equal((await view(A)).live.phase, 'QUESTION_OPEN')
  await ans(B, ['a'])
  await act('close'); await act('reveal')
  await fail(act('reopen'), 400) // already revealed
  await act('next')
  await ans(A, ['a'])
  await act('skip')
  let sv = await view(A)
  assert.equal(sv.live.phase, 'QUESTION_CLOSED'); assert.ok(sv.live.skipped.includes(sv.question.id))
  await act('reveal'); assert.equal((await view(A)).revealed.length, 0, 'skipped question is hidden from reveal')
  await act('next')
  await ans(A, ['a']); await ans(B, ['b'])
  await act('force_reveal')
  assert.equal((await view(A)).live.phase, 'REVEAL', 'force reveal closes + reveals an open question')
  let rows = Object.fromEntries((await A.req('GET', `/live/${hq.id}/standings`)).rows.map((r) => [r.name, r.score]))
  assert.deepEqual(rows, { Anna: 10, Bram: 20 }, 'skipped Q2 does not score')
  const q3 = (await view(A)).question.id
  await fail(host.req('POST', `/live/${hq.id}/override`, { questionId: q3, correct: ['a'], reason: '' }), 400) // reason required
  await fail(A.req('POST', `/live/${hq.id}/override`, { questionId: q3, correct: ['a'], reason: 'ik wil winnen' }), 403)
  await fail(host.req('POST', `/live/${hq.id}/override`, { questionId: q3, correct: ['zzz'], reason: 'fout in sleutel' }), 400)
  await host.req('POST', `/live/${hq.id}/override`, { questionId: q3, correct: ['a'], reason: 'sleutel was fout' })
  rows = Object.fromEntries((await A.req('GET', `/live/${hq.id}/standings`)).rows.map((r) => [r.name, r.score]))
  assert.deepEqual(rows, { Anna: 20, Bram: 10 }, 'override recomputes scores')
  await act('next')
  assert.equal((await view(A)).live.phase, 'FINISHED')
  console.log('host action checks OK')
}

// ---- Open questions + peer-review grading (spec §7) ----
{
  const oq = await host.req('POST', '/quizzes', { title: 'Open vragen', mode: 'INDIVIDUAL', revealMode: 'QUESTION', rounds: [{ title: 'R', questions: [
    { text: 'Hoofdstad van Frankrijk?', type: 'OPEN', options: [], correct: ['Parijs', 'Paris'], points: 10, seconds: 60 },
    { text: 'Hoofdstad van Duitsland?', type: 'OPEN', options: [], correct: ['Berlijn'], points: 10, seconds: 60 },
  ] }] })
  await fail(host.req('POST', '/quizzes', { title: 'x', rounds: [{ title: 'R', questions: [{ text: 'a', type: 'OPEN', options: [], correct: [] }] }] }), 400)
  await host.req('POST', `/quizzes/${oq.id}/publish`)
  const P = {}
  for (const n of ['Anna', 'Bram', 'Cor']) { P[n] = new Client(n); await P[n].req('POST', '/auth/guest', { name: n }); await P[n].req('POST', `/play/${oq.joinCode}/join`) }
  const act = (a, force = false) => host.req('POST', `/live/${oq.id}/action`, { action: a, force })
  const view = (c) => c.req('GET', `/live/${oq.id}`)
  const say = async (c, text) => c.req('POST', `/live/${oq.id}/answer`, { questionId: (await view(c)).question.id, selected: [text] })
  const stand = async () => Object.fromEntries((await P.Anna.req('GET', `/live/${oq.id}/standings`)).rows.map((r) => [r.name, r.score]))
  await act('start')
  const v0 = await view(P.Anna)
  assert.equal(v0.question.type, 'OPEN'); assert.equal(v0.question.correct, undefined, 'accepted answers must not leak')
  await fail(P.Anna.req('POST', `/live/${oq.id}/answer`, { questionId: v0.question.id, selected: ['   '] }), 400)
  await say(P.Anna, ' parijs. '); await say(P.Bram, 'Lyon'); await say(P.Cor, 'Parys'); await say(P.Cor, 'Parys!') // change allowed
  await act('close')
  await act('reveal') // -> GRADING (Anna is auto-accepted, Bram + Cor need a peer)
  assert.equal((await view(P.Anna)).live.phase, 'GRADING')
  const items = Object.fromEntries(await Promise.all(Object.entries(P).map(async ([n, c]) => [n, (await view(c)).grading])))
  const all = Object.entries(items).flatMap(([n, g]) => g.map((i) => ({ n, ...i })))
  assert.equal(all.length, 2, 'two answers need peer review (exact match is auto-graded)')
  for (const i of all) assert.notEqual(i.answer === 'Lyon' ? 'Bram' : 'Cor', i.n, 'nobody grades their own answer')
  assert.deepEqual(all[0].reference.sort(), ['Parijs', 'Paris'])
  const lyon = all.find((i) => i.answer === 'Lyon'), parys = all.find((i) => i.answer === 'Parys!')
  const other = Object.keys(P).find((n) => n !== lyon.n)
  await fail(P[other].req('POST', `/live/${oq.id}/grade`, { gradeId: lyon.id, verdict: true }), 403) // not assigned to you
  await fail(act('reveal'), 400) // still pending
  await fail(act('next'), 400)
  await P[lyon.n].req('POST', `/live/${oq.id}/grade`, { gradeId: lyon.id, verdict: false })
  assert.equal((await stand()).Anna, 0, 'standings wait for grading')
  const hv = await host.req('GET', `/live/${oq.id}?host=1`)
  assert.equal(hv.gradingAdmin.filter((g) => g.verdict === null).length, 1)
  await P[parys.n].req('POST', `/live/${oq.id}/grade`, { gradeId: parys.id, verdict: true })
  await act('reveal')
  assert.deepEqual(await stand(), { Anna: 10, Bram: 0, Cor: 10 })
  const rv = await view(P.Cor); assert.equal(rv.revealed[0].myCorrect, true)
  // host can always correct a grade (audit-logged)
  await host.req('POST', `/live/${oq.id}/grade-override`, { gradeId: parys.id, verdict: false, reason: 'typfout is fout' })
  assert.deepEqual(await stand(), { Anna: 10, Bram: 0, Cor: 0 })
  await host.req('POST', `/live/${oq.id}/grade-override`, { gradeId: parys.id, verdict: true, reason: 'toch goed' })
  await fail(A_guestGrade(), 403).catch(() => {}); function A_guestGrade() { return P.Anna.req('POST', `/live/${oq.id}/grade-override`, { gradeId: parys.id, verdict: true }) }
  // Q2: host closes grading with items pending -> they count as wrong (DEFAULT), logged
  await act('next')
  await say(P.Anna, 'Berlijn'); await say(P.Bram, 'Bonn') // Cor does not answer
  await act('close'); await act('reveal')
  assert.equal((await view(P.Bram)).live.phase, 'GRADING')
  await act('reveal', true)
  assert.equal((await view(P.Bram)).live.phase, 'REVEAL')
  assert.deepEqual(await stand(), { Anna: 20, Bram: 0, Cor: 10 })
  await act('next')
  assert.equal((await view(P.Anna)).live.phase, 'FINISHED')
  console.log('peer-review checks OK')
}

// ---- Media + music questions (spec §7) ----
{
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
  const mp3 = Buffer.concat([Buffer.from('ID3\u0003\u0000\u0000\u0000\u0000\u0000\u0000'), Buffer.alloc(64)])
  const up = (c, data, name) => c.req('POST', '/media', { name, data: data.toString('base64') })
  const img = await up(host, png, 'plaatje.png'), aud = await up(host, mp3, 'liedje.mp3')
  assert.equal(img.kind, 'image'); assert.equal(aud.kind, 'audio')
  await fail(up(host, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'x.png'), 400) // SVG/HTML refused whatever the name
  await fail(up(host, Buffer.from('<!doctype html><script>alert(1)</script>'), 'x.png'), 400)
  const gst = new Client('gm'); await gst.req('POST', '/auth/guest', { name: 'Gast' }); await fail(up(gst, png, 'a.png'), 403)
  const raw = await fetch(`${BASE}${img.url}`)
  assert.equal(raw.status, 200); assert.equal(raw.headers.get('content-type'), 'image/png'); assert.equal(raw.headers.get('x-content-type-options'), 'nosniff')
  assert.equal((await fetch(`${BASE}/api/media/00000000-0000-0000-0000-000000000000`)).status, 404)

  const music = { artist: ['The Beatles'], title: ['Yesterday'], year: 1965, artistPoints: 0.5, titlePoints: 0.5, yearPoints: 1 }
  const bad = (q) => fail(host.req('POST', '/quizzes', { title: 'x', rounds: [{ title: 'R', questions: [q] }] }), 400)
  const mc = { text: 'Welk land?', options: [{ id: 'a', text: 'NL' }, { id: 'b', text: 'BE' }], correct: ['a'], points: 10, seconds: 60 }
  await bad({ ...mc, media: [{ kind: 'image', url: 'http://insecure.example/a.png' }] })
  await bad({ ...mc, media: [{ kind: 'youtube', url: 'dQw4w9WgXcQ', start: 30, end: 20 }] })
  await bad({ ...mc, media: [{ kind: 'image', assetId: '00000000-0000-0000-0000-000000000000' }] })
  await bad({ text: 'Lied?', type: 'MUSIC', options: [], correct: [] }) // no music settings
  const mq = await host.req('POST', '/quizzes', { title: 'Muziek en beeld', mode: 'INDIVIDUAL', revealMode: 'QUESTION', rounds: [{ title: 'R', questions: [
    { ...mc, media: [{ kind: 'image', assetId: img.id }, { kind: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ', start: 10, end: 20 }] },
    { text: 'Welk nummer hoor je?', type: 'MUSIC', options: [], correct: [], seconds: 60, media: [{ kind: 'audio', assetId: aud.id }], config: music },
  ] }] })
  assert.equal(mq.rounds[0].questions[1].points, 2, 'music points = artist + title + year')
  await host.req('POST', `/quizzes/${mq.id}/publish`)
  const M = {}
  for (const n of ['Anna', 'Bram', 'Cor']) { M[n] = new Client(n); await M[n].req('POST', '/auth/guest', { name: n }); await M[n].req('POST', `/play/${mq.joinCode}/join`) }
  const act = (a) => host.req('POST', `/live/${mq.id}/action`, { action: a })
  const view = (c) => c.req('GET', `/live/${mq.id}`)
  await act('start')
  let v = await view(M.Anna)
  assert.deepEqual(v.question.media.map((m) => m.kind), ['image', 'youtube'])
  assert.ok(v.question.media[1].src.startsWith('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?') && v.question.media[1].src.includes('start=10') && v.question.media[1].src.includes('end=20'))
  const answerMc = (c, sel) => c.req('POST', `/live/${mq.id}/answer`, { questionId: v.question.id, selected: sel })
  await answerMc(M.Anna, ['a']); await answerMc(M.Bram, ['b'])
  await act('close'); await act('reveal'); await act('next')
  v = await view(M.Anna)
  assert.equal(v.question.type, 'MUSIC'); assert.deepEqual(v.question.media, [], 'audio stays off the phones')
  assert.equal(v.question.music, undefined, 'accepted answers must not leak')
  const hv = await host.req('GET', `/live/${mq.id}?host=1`)
  assert.equal(hv.question.media[0].kind, 'audio'); assert.equal(hv.question.music.year, 1965)
  const say = (c, sel) => c.req('POST', `/live/${mq.id}/answer`, { questionId: v.question.id, selected: sel })
  await fail(say(M.Cor, ['', '', '']), 400)
  await say(M.Anna, ['beatles', 'Yesterdey', '1965']) // article dropped + 1 typo
  await say(M.Bram, ['The Beatles', 'Tomorrow', '1970'])
  await act('close'); await act('reveal')
  const standings = Object.fromEntries((await M.Anna.req('GET', `/live/${mq.id}/standings`)).rows.map((r) => [r.name, r.score]))
  assert.deepEqual(standings, { Anna: 12, Bram: 0.5, Cor: 0 }, 'independent parts, fractional points')
  const rv = await view(M.Anna)
  assert.deepEqual(rv.revealed[0].musicResult.mine, { artist: true, title: true, year: true, points: 2 })
  assert.equal(rv.revealed[0].musicResult.max, 2)
  await fail(host.req('POST', `/live/${mq.id}/override`, { questionId: rv.question.id, correct: ['a'], reason: 'nope' }), 400)
  await act('next')
  // bank: MUSIC + media via CSV, and JSON round trip
  const csv = 'vraag;type;artiest;titel;jaar;artiestpunten;titelpunten;jaarpunten;media\nWelk nummer?;MUSIC;Queen;Bohemian Rhapsody;1975;0,5;0,5;1;https://youtu.be/dQw4w9WgXcQ'
  const di = await host.req('POST', '/bank/import', { format: 'csv', content: csv })
  assert.equal(di.imported, 1, JSON.stringify(di))
  const bj = await (await fetch(`${BASE}/api/bank/export?format=json`, { headers: { cookie: host.cookie } })).json()
  const bm = bj.questions.find((x) => x.type === 'MUSIC')
  assert.equal(bm.config.year, 1975); assert.equal(bm.media[0].videoId, 'dQw4w9WgXcQ')
  const qx = await (await fetch(`${BASE}/api/quizzes/${mq.id}/export`, { headers: { cookie: host.cookie } })).json()
  assert.equal(qx.rounds[0].questions[1].config.artist[0], 'The Beatles'); assert.ok(qx.rounds[0].questions[0].media.length === 2)
  console.log('media + music checks OK')
}

// ---- Power-ups (spec §8): 50/50, hint, double, double down, extra time; pooled per team ----
{
  const o4 = (...t) => t.map((text, i) => ({ id: 'abcd'[i], text }))
  const mcq = (text, extra = {}) => ({ text, options: o4('w1', 'juist', 'w2', 'w3'), correct: ['b'], points: 10, seconds: 60, ...extra })
  const pq = await host.req('POST', '/quizzes', { title: 'Power-ups', mode: 'INDIVIDUAL', revealMode: 'QUESTION', powerUps: { types: ['FIFTY', 'DOUBLE', 'DOUBLE_DOWN', 'EXTRA_TIME', 'HINT', 'NOPE'], uses: 1 },
    rounds: [{ title: 'R', questions: [mcq('Q1', { hint: 'Begint met een j' }), mcq('Q2'), mcq('Q3', { seconds: 5 })] }] })
  assert.deepEqual(pq.powerUps, { types: ['FIFTY', 'DOUBLE', 'DOUBLE_DOWN', 'EXTRA_TIME', 'HINT'], uses: 1 })
  await host.req('POST', `/quizzes/${pq.id}/publish`)
  const [A, Bm] = [players[0], players[1]] // 'Speler 0', 'Speler 1'
  for (const c of [A, Bm]) await c.req('POST', `/play/${pq.joinCode}/join`)
  const act = (a) => host.req('POST', `/live/${pq.id}/action`, { action: a })
  const view = (c) => c.req('GET', `/live/${pq.id}`)
  const pu = (c, type) => c.req('POST', `/live/${pq.id}/powerup`, { type })
  const ans = async (c, sel) => c.req('POST', `/live/${pq.id}/answer`, { questionId: (await view(c)).question.id, selected: [sel] })
  const stand = async () => Object.fromEntries((await A.req('GET', `/live/${pq.id}/standings`)).rows.map((r) => [r.name, r.score]))
  await fail(pu(A, 'DOUBLE'), 400) // lobby: no open question
  await act('start')
  // Q1: 50/50 + hint + double
  await pu(A, 'FIFTY'); await pu(A, 'HINT'); await pu(A, 'DOUBLE')
  const va = await view(A), vb = await view(Bm)
  assert.equal(va.powerUps.hidden.length, 2); assert.ok(!va.powerUps.hidden.includes('b'), 'never hides the correct option')
  assert.deepEqual(vb.powerUps.hidden, []); assert.equal(va.powerUps.hint, 'Begint met een j'); assert.equal(vb.powerUps.hint, null)
  assert.equal(va.question.hint, undefined, 'hint must not leak to players before unlocking')
  assert.equal(va.powerUps.remaining.FIFTY, 0); assert.equal(vb.powerUps.remaining.FIFTY, 1)
  await fail(ans(A, va.powerUps.hidden[0]), 400) // removed option cannot be chosen
  await fail(pu(A, 'FIFTY'), 400); await fail(pu(A, 'DOUBLE_DOWN'), 400) // used / one booster per question
  await ans(A, 'b'); await ans(Bm, 'a')
  await act('close'); await act('reveal')
  assert.deepEqual(await stand(), { 'Speler 0': 20, 'Speler 1': 0 })
  assert.deepEqual((await view(A)).revealed[0].powerUp, { type: 'DOUBLE', earned: 20 })
  await act('next')
  // Q2: double down — right = x2, wrong = minus half
  await fail(pu(A, 'DOUBLE'), 400) // no uses left
  await pu(Bm, 'DOUBLE_DOWN'); await ans(A, 'b'); await ans(Bm, 'a')
  await act('close'); await act('reveal')
  assert.deepEqual(await stand(), { 'Speler 0': 30, 'Speler 1': -5 })
  await act('next')
  // Q3: extra time (5s question): A has 15 more seconds after the timer, B does not
  await pu(A, 'EXTRA_TIME')
  await new Promise((r) => setTimeout(r, 6500))
  const late = await view(A); assert.equal(late.live.phase, 'QUESTION_CLOSED'); assert.ok(late.powerUps.extraUntil > Date.now() - 100)
  await ans(A, 'b') // accepted thanks to extra time
  await fail(ans(Bm, 'b'), 400) // everyone else is locked out
  await act('reveal')
  assert.deepEqual(await stand(), { 'Speler 0': 40, 'Speler 1': -5 })
  await act('next')

  // Team quiz: power-ups are pooled per team and change the team score only
  const tq = await host.req('POST', '/quizzes', { title: 'Team power-ups', mode: 'TEAM', revealMode: 'QUESTION', powerUps: { types: ['DOUBLE'], uses: 1 }, rounds: [{ title: 'R', questions: [mcq('T1')] }] })
  await host.req('POST', `/quizzes/${tq.id}/publish`)
  for (const i of [0, 1, 2]) await players[i].req('POST', `/play/${tq.joinCode}/join`)
  await players[0].req('POST', `/live/${tq.id}/teams`, { name: 'Pool' })
  const tv = await players[0].req('GET', `/live/${tq.id}`)
  for (const i of [1, 2]) await players[i].req('POST', `/live/${tq.id}/teams/${tv.teams[0].id}/join`)
  await host.req('POST', `/live/${tq.id}/action`, { action: 'start' })
  const tq1 = (await players[0].req('GET', `/live/${tq.id}`)).question.id
  const tp = (i, type) => players[i].req('POST', `/live/${tq.id}/powerup`, { type })
  await tp(0, 'DOUBLE')
  await fail(tp(1, 'DOUBLE'), 400) // pooled: the team already used its one DOUBLE
  assert.equal((await players[2].req('GET', `/live/${tq.id}`)).powerUps.owner, 'TEAM')
  assert.deepEqual((await players[1].req('GET', `/live/${tq.id}`)).powerUps.usedOnQuestion, ['DOUBLE'], 'teammates see the pooled activation')
  for (const i of [0, 1, 2]) await players[i].req('POST', `/live/${tq.id}/answer`, { questionId: tq1, selected: ['b'] })
  await host.req('POST', `/live/${tq.id}/action`, { action: 'close' }); await host.req('POST', `/live/${tq.id}/action`, { action: 'reveal' })
  const ts = await players[0].req('GET', `/live/${tq.id}/standings`)
  assert.equal(ts.rows[0].score, 20, 'team score doubled'); assert.ok(ts.personal.every((r) => r.score === 10), 'personal rows unaffected')
  // a quiz without power-ups rejects them
  const nq = await host.req('POST', '/quizzes', { title: 'Zonder power-ups', rounds: [{ title: 'R', questions: [mcq('N1')] }] })
  await host.req('POST', `/quizzes/${nq.id}/publish`); await players[0].req('POST', `/play/${nq.joinCode}/join`)
  await host.req('POST', `/live/${nq.id}/action`, { action: 'start' })
  assert.equal((await players[0].req('GET', `/live/${nq.id}`)).powerUps, null)
  await fail(players[0].req('POST', `/live/${nq.id}/powerup`, { type: 'DOUBLE' }), 400) // not enabled for this quiz
  console.log('power-up checks OK')
}

// ---- Picture rounds (spec §6): a sheet that stays answerable during the next round(s) ----
{
  const o4 = (...t) => t.map((text, i) => ({ id: 'abcd'[i], text }))
  const mc = (text, extra = {}) => ({ text, options: o4('w', 'juist', 'x', 'y'), correct: ['b'], points: 10, seconds: 60, ...extra })
  await fail(host.req('POST', '/quizzes', { title: 'x', rounds: [{ title: 'R1', questions: [mc('a')] }, { title: 'Beeld', kind: 'PICTURE', openRounds: 1, questions: [mc('b')] }] }), 400) // cannot be last
  await fail(host.req('POST', '/quizzes', { title: 'x', rounds: [{ title: 'Beeld', kind: 'PICTURE', openRounds: 5, questions: [mc('b')] }, { title: 'R2', questions: [mc('a')] }] }), 400)
  const pq = await host.req('POST', '/quizzes', { title: 'Beeldronde', mode: 'INDIVIDUAL', revealMode: 'ROUND', rounds: [
    { title: 'R1', questions: [mc('Q1')] },
    { title: 'Foto\'s', kind: 'PICTURE', openRounds: 1, questions: [mc('P1'), { text: 'Hoofdstad van Frankrijk?', type: 'OPEN', options: [], correct: ['Parijs'], points: 10, seconds: 60 }] },
    { title: 'R3', questions: [mc('Q3')] },
    { title: 'R4', questions: [mc('Q4')] },
  ] })
  assert.equal(pq.rounds[1].kind, 'PICTURE'); assert.equal(pq.rounds[1].openRounds, 1)
  await host.req('POST', `/quizzes/${pq.id}/publish`)
  const [A, Bm] = [players[0], players[1]]
  for (const c of [A, Bm]) await c.req('POST', `/play/${pq.joinCode}/join`)
  const act = (a, extra = {}) => host.req('POST', `/live/${pq.id}/action`, { action: a, ...extra })
  const view = (c) => c.req('GET', `/live/${pq.id}`)
  const ans = async (c, sel) => c.req('POST', `/live/${pq.id}/answer`, { questionId: (await view(c)).question.id, selected: [sel] })
  const stand = async () => Object.fromEntries((await A.req('GET', `/live/${pq.id}/standings`)).rows.map((r) => [r.name, r.score]))
  await act('start')
  let v = await view(A)
  assert.equal(v.question.text, 'Q1'); assert.equal(v.pictures.length, 0, 'sheet not open before play reaches it')
  const pictureQs = (await host.req('GET', `/quizzes/${pq.id}`)).rounds[1].questions
  const pans = (c, qid, sel) => c.req('POST', `/live/${pq.id}/answer`, { questionId: qid, selected: [sel] })
  await fail(pans(A, pictureQs[0].id, 'b'), 400) // not started yet
  await ans(A, 'b'); await ans(Bm, 'a'); await act('close'); await act('reveal'); await act('next')
  // R3 is running; the picture sheet is open next to it
  v = await view(A)
  assert.equal(v.question.text, 'Q3'); assert.equal(v.pictures.length, 1); assert.equal(v.pictures[0].closed, false)
  assert.equal(v.pictures[0].closesAfterRound, 3); assert.equal(v.pictures[0].questions.length, 2)
  assert.equal(v.pictures[0].questions[0].correct, undefined, 'answers must not leak from the sheet')
  await pans(A, pictureQs[0].id, 'b'); await pans(A, pictureQs[1].id, ' parijs '); await pans(Bm, pictureQs[0].id, 'a'); await pans(Bm, pictureQs[1].id, 'Lyon')
  await pans(A, pictureQs[0].id, 'c'); await pans(A, pictureQs[0].id, 'b') // changing is allowed while open
  assert.deepEqual((await view(A)).pictures[0].answers[pictureQs[0].id], ['b'])
  assert.equal((await host.req('GET', `/live/${pq.id}?host=1`)).pictureProgress[pictureQs[0].id], 2)
  await ans(A, 'b'); await ans(Bm, 'b'); await act('close')
  await pans(Bm, pictureQs[0].id, 'b') // still open during round 3 even though the question closed ... and Bram changes his mind
  await act('reveal'); await act('next')
  // moved past round 3: the sheet closes
  v = await view(A)
  assert.equal(v.question.text, 'Q4'); assert.equal(v.pictures[0].closed, true)
  await fail(pans(A, pictureQs[0].id, 'b'), 400)
  await ans(A, 'b'); await ans(Bm, 'b'); await act('close')
  await fail(act('next'), 400) // cannot finish with an unrevealed picture round
  await act('reveal_picture')
  assert.equal((await view(A)).live.phase, 'GRADING', 'open answers are peer reviewed first')
  const gi = (await view(A)).grading
  assert.equal(gi.length, 1); assert.equal(gi[0].answer, 'Lyon')
  assert.ok((await host.req('GET', `/live/${pq.id}?host=1`)).gradingAdmin.some((g) => g.answer === 'Lyon'))
  await fail(act('reveal'), 400) // still pending
  await A.req('POST', `/live/${pq.id}/grade`, { gradeId: gi[0].id, verdict: false })
  await act('reveal') // normal Reveal finishes the picture grading
  v = await view(A)
  assert.equal(v.live.phase, 'QUESTION_CLOSED', 'back to where the main flow was'); assert.equal(v.live.revealScope, 'picture')
  assert.equal(v.revealed.length, 2)
  // Anna: Q1 10 + Q3 10 + P1 10 + P2 (auto) 10; Bram: Q3 10 + P1 10 (changed to right)
  assert.deepEqual(await stand(), { 'Speler 0': 40, 'Speler 1': 20 })
  await act('reveal') // the interrupted Q4 can still be revealed
  assert.deepEqual(await stand(), { 'Speler 0': 50, 'Speler 1': 30 })
  await act('next')
  assert.equal((await view(A)).live.phase, 'FINISHED')
  console.log('picture round checks OK')
}

console.log('E2E OK — pushes:', pushed, 'standings:', JSON.stringify(st.rows.map((r) => [r.name, r.score, r.rank])))
