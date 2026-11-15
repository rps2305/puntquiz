// Pure e-mail templates (Dutch). All dynamic text is HTML-escaped: player names and question text are user input.

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export interface Mail { subject: string; html: string; text: string }

const OPT_IN_FOOTER = 'Je ontvangt deze mail omdat je dat zelf hebt aangezet. Pas je voorkeur aan in de lobby van een quiz.'
const ACCOUNT_FOOTER = 'Je ontvangt deze mail omdat je een PuntQuiz-account hebt aangemaakt.'

/** House style (Appendix B): cream page, white card, coral accent, dark ink; web fonts are not reliable in mail, so Arial stands in for Fredoka/Manrope. */
const wrap = (title: string, bodyHtml: string, footerUrl: string, opts: { preheader?: string; footer?: string } = {}) => `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>${esc(title)}</title>
<style>
@media (prefers-color-scheme: dark) {
  .pq-page { background: #1B120E !important; }
  .pq-card { background: #241813 !important; border-color: #41291E !important; }
  .pq-ink { color: #FAF3EA !important; }
  .pq-muted { color: #C9B6A9 !important; }
  .pq-foot { background: #2E1F18 !important; color: #C9B6A9 !important; }
}
@media (max-width: 600px) { .pq-pad { padding: 18px !important; } }
</style></head>
<body class="pq-page" style="margin:0;background:#FBF6EF;font-family:Arial,Helvetica,sans-serif;color:#241512;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(opts.preheader ?? title)}</div>
<table class="pq-page" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#FBF6EF"><tr><td align="center" style="padding:24px 12px">
<table class="pq-card" width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #E6D9C7;border-radius:16px">
<tr><td class="pq-pad" style="padding:20px 24px;border-bottom:4px solid #FF5A38;border-radius:16px 16px 0 0">
<table cellpadding="0" cellspacing="0" role="presentation"><tr>
<td style="padding-right:12px"><img src="${esc(footerUrl)}/icons/icon-192.png" width="44" height="44" alt="PuntQuiz" style="display:block;border:0;border-radius:10px"></td>
<td><div class="pq-ink" style="font-size:22px;font-weight:bold;color:#241512;line-height:1.1">PuntQuiz</div>
<div class="pq-muted" style="font-size:13px;color:#7A695F;margin-top:2px">Elke speler telt, ook in een team</div></td></tr></table></td></tr>
<tr><td class="pq-pad" style="padding:24px"><h1 class="pq-ink" style="font-size:21px;line-height:1.25;margin:0 0 14px;color:#241512">${esc(title)}</h1><div class="pq-ink" style="font-size:16px;line-height:1.5;color:#241512">${bodyHtml}</div></td></tr>
<tr><td class="pq-pad pq-foot" style="padding:16px 24px;background:#F4ECE0;font-size:12px;line-height:1.5;color:#7A695F;border-radius:0 0 16px 16px">
${esc(opts.footer ?? OPT_IN_FOOTER)} Lees ons <a href="${esc(footerUrl)}/info/privacy" style="color:#E8471F">privacybeleid</a>. PuntQuiz is een hobbyproject.</td></tr>
</table></td></tr></table></body></html>`

const btn = (url: string, label: string) =>
  `<p style="margin:18px 0"><a href="${esc(url)}" style="display:inline-block;background:#FF5A38;color:#241512;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:12px;font-size:16px">${esc(label)}</a></p>`

export function welcomeMail(name: string, siteUrl: string): Mail {
  const subject = 'Welkom bij PuntQuiz'
  const html = wrap(
    `Welkom, ${name}!`,
    `<p>Je account is aangemaakt. Bij PuntQuiz doet iedereen mee op de eigen telefoon, ook binnen een team.</p>
     <p><strong>Meedoen:</strong> vul de quizcode in op de site (of scan de QR-code van de presentator) en kies je team.</p>${btn(siteUrl, 'Naar PuntQuiz')}`,
    siteUrl,
    { preheader: 'Je account is aangemaakt. Zo doe je mee.', footer: ACCOUNT_FOOTER },
  )
  return { subject, html, text: `Welkom, ${name}!\n\nJe account is aangemaakt. Meedoen: vul de quizcode in op ${siteUrl}.\n` }
}

export interface RoundItem {
  text: string
  correct: string[]
  mine: string[] | null
  myCorrect: boolean | null
  team: string[] | null
  teamCorrect: boolean | null
}
export interface BoardRow { rank: number; name: string; score: number; mine: boolean }

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

function board(rows: BoardRow[]) {
  const top = rows.slice(0, 10)
  const mine = rows.find((r) => r.mine)
  const shown = mine && !top.includes(mine) ? [...top, mine] : top
  const html = `<table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:15px">${shown
    .map(
      (r) =>
        `<tr style="${r.mine ? 'background:#FFC93C;font-weight:bold' : 'border-bottom:1px solid #E6D9C7'}"><td width="40">${r.rank}</td><td>${esc(r.name)}</td><td align="right">${fmt(r.score)}</td></tr>`,
    )
    .join('')}</table>`
  const text = shown.map((r) => `${r.rank}. ${r.name} — ${fmt(r.score)}${r.mine ? '  <= jij' : ''}`).join('\n')
  return { html, text }
}

export function roundMail(o: { quiz: string; round: string; teamMode: boolean; items: RoundItem[]; rows: BoardRow[]; siteUrl: string }): Mail {
  const mark = (ok: boolean | null) => (ok === null ? '–' : ok ? '✓' : '✗')
  const list = o.items
    .map((i) => {
      const mine = i.mine ? i.mine.join(', ') : 'geen antwoord'
      const team = o.teamMode ? ` · team: ${i.team ? i.team.join(', ') : 'geen antwoord'} ${mark(i.teamCorrect)}` : ''
      return `<li style="margin-bottom:10px"><strong>${esc(i.text)}</strong><br>Juist: ${esc(i.correct.join(', '))}<br>Jij: ${esc(mine)} ${mark(i.myCorrect)}${esc(team)}</li>`
    })
    .join('')
  const b = board(o.rows)
  const subject = `Uitslag ${o.round} — ${o.quiz}`
  const html = wrap(
    `${o.round}: jouw uitslag`,
    `<p style="color:#7A695F;margin-top:0">${esc(o.quiz)}</p><ol style="padding-left:20px">${list}</ol><h2 style="font-size:16px">Tussenstand</h2>${b.html}`,
    o.siteUrl,
  )
  const text =
    `${o.round} — ${o.quiz}\n\n` +
    o.items
      .map((i) => `${i.text}\n  Juist: ${i.correct.join(', ')}\n  Jij: ${i.mine ? i.mine.join(', ') : 'geen antwoord'} ${mark(i.myCorrect)}` + (o.teamMode ? ` | team: ${i.team ? i.team.join(', ') : 'geen antwoord'} ${mark(i.teamCorrect)}` : ''))
      .join('\n\n') +
    `\n\nTussenstand\n${b.text}\n`
  return { subject, html, text }
}

export function finalMail(o: { quiz: string; teamMode: boolean; rows: BoardRow[]; myScore: number | null; siteUrl: string }): Mail {
  const b = board(o.rows)
  const subject = `Eindstand — ${o.quiz}`
  const html = wrap(
    'De quiz is afgelopen',
    `<p style="color:#7A695F;margin-top:0">${esc(o.quiz)}</p>${o.myScore !== null ? `<p>Jouw persoonlijke score: <strong>${fmt(o.myScore)}</strong></p>` : ''}<h2 style="font-size:16px">${o.teamMode ? 'Teamranglijst' : 'Eindstand'}</h2>${b.html}`,
    o.siteUrl,
  )
  return { subject, html, text: `De quiz is afgelopen — ${o.quiz}\n${o.myScore !== null ? `Jouw score: ${fmt(o.myScore)}\n` : ''}\n${b.text}\n` }
}

/** Never send to reserved/test domains (e2e tests, fixtures) or malformed addresses. */
export function isDeliverable(email: string | null | undefined): email is string {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false
  const domain = email.split('@')[1].toLowerCase()
  return !/(^|\.)(test|local|localhost|invalid|example|example\.com|example\.org)$/.test(domain) && domain !== 'test.dev'
}
