---
tags:
  - quiz
  - pubquiz
  - puntquiz
  - product
status: pre-development
consolidated-from:
  - PuntQuiz.md
  - PuntQuiz ChatGPT.md
  - Hermes Input.md
  - 2020-03-26 Puntuale online Quiz.md
  - 2010-12-23 PUBQUIZ.md
  - 2018-11-08 PUBQUIZ.md
  - 2023-11-29 Oudejaarsquiz.md
Gemaakt: 2026-11-14T16:53:00
Description: PuntQuiz proposal for an online pubquiz framework
---

# PuntQuiz — Consolidated Product Reference

## 1. Mission & Positioning

**PuntQuiz maakt live quizzen socialer, eerlijker en interactiever doordat iedere deelnemer actief meespeelt, zelfs binnen een team.**

Traditional pub quiz software hands one phone to a whole team. PuntQuiz's bet is the opposite: **every player logs in individually, answers individually, and builds personal stats — even inside a team.** This is the single idea the rest of the product is built around.

**Slogan (primary):** *"PuntQuiz — Elke speler telt, ook in een team."* ("Every player counts, even in a team.")
Alternates considered: *"Denk hard, klik snel, win samen"*, *"Live quiz, geen gedoe"*, *"Jouw telefoon = jouw podium."*

**Target segments**

| Segment             | Use cases                                                               |
| ------------------- | ----------------------------------------------------------------------- |
| Horeca (pubs/cafés) | Weekly pub quiz nights, café competitions, music quizzes, themed nights |
| Companies           | Team building, knowledge sessions, onboarding, staff parties            |
| Associations        | Sports clubs, student/carnival associations, volunteer orgs             |
| Group of friends    |                                                                         |

## 2. Unique Selling Points

- **Every player plays** — no "one phone per team"; each member logs in, answers, and earns individual stats/achievements. 
- **Mobile-first, no install** — join via QR code, invite link, or room code straight in the browser (PWA) or just login and pick a quiz.
- **Real-time everything** — live scores, rankings, team results, presentation mode.
- **Team intelligence** — team answers resolved by Majority Vote (MVP), with Captain/Consensus/Expert modes planned later.

## 3. Product Principles

- **Simplicity first** — a quiz should be creatable in minutes: `Create quiz → choose type → add questions → publish → play.`
- **Mobile-first** — excellent on iPhone/Android/tablet/iPad; desktop is a supporting surface, primarily for presenters.
- **Real-time first** — WebSockets, Redis, event-driven architecture are core, not bolted on.
- **Server-authoritative** — the server is the only source of truth for score, time, ranking, and status. Never trust a client-side timer or client-computed score.
- **Fast join** — scan QR → enter name → join team → ready, in under 15 seconds. Passwordless/guest/magic-link login, QR pre-fills room code, optional team pre-selection.
- **Graceful about partial digital participation** — some players are digitally-handicapped, less comfortable with a phone-based flow, or simply have their battery die mid-quiz. That's expected, not an error state: nothing in the product should assume every player completes the digital flow every time. Concretely, this is why Majority Vote tallies whoever actually answered rather than requiring full team participation (§5), why a non-response isn't treated as suspicious by anti-cheat (§15), and why the printable paper answer-form fallback exists at all (§4).

## 4. Roles & Permissions

| Role | Can |
|---|---|
| **Player** | Join via QR/link/code; play individually or in a team; submit answers; use power-ups; view rankings, personal stats, and history |
| **Presenter / Host** | Start/pause/resume the live session; open/close rounds; push questions; control timers; reveal answers; show rankings/results; display sponsor slides; moderate shoutbox/system messages; override/correct answers; download printable answer forms for teams/players — a paper fallback if the live app becomes unavailable mid-session |
| **Quizmaster** | Create/edit quizzes; manage question banks and rounds; set categories/difficulty; configure scoring; approve player-submitted questions; manage media |
| **Administrator** | Manage users/permissions; global settings; themes/branding; sponsors; platform health monitoring; deployment/integrations |

## 5. Quiz Types & Team Mechanics

Both drafts converge on one modeling idea (see [[#18. Data Model]]): there is no separate "team quiz" system — everything is **participation-based**, and a participation optionally belongs to a team.

### Quiz-level settings (quizmaster-configurable)
*Restored here — this whole area ("Quiz Administration" in `PuntQuiz.md`) was dropped during consolidation, the same way the team-switching rule was. It matters directly for the per-quiz rules page in §6: that page is generated from exactly these settings.*

- **Basic settings:** quiz name, description, date/time, host/presenter, theme (§13), logo, sponsor settings (§13).
- **Status lifecycle:** `draft → scheduled → live → finished → archived`.
- **Participation mode:** Individual Quiz or Team Quiz (below) — chosen once per quiz.
- **Team settings** — only relevant/shown when Team Quiz is selected (see below).

### Individual Quiz
Independent scoring, ranking, personal stats/achievements/history.

### Team Quiz
Every player still logs in individually and joins a team. Team score is an aggregation over member participations; personal stats are still recorded underneath it (used later for team analytics and MVP awards).

**Rule: no team switching once the quiz has started.** A participation's team assignment is locked at quiz start — a player can join or change teams only in the lobby, never mid-quiz. (This rule was present in the original source notes but dropped during consolidation; restored here.) See also the one-active-participation-per-user rule in §15.

**Team settings (quizmaster-configurable):**
- **Minimum team size: 3.** Below 3, "majority" degenerates — a 2-person team ties on every disagreement, making the tie-break rule (not the majority rule) the real decision mechanism. 3 is the smallest size where a genuine majority is possible.
- Maximum team size: configurable per quiz, normally 5
- Joining method: open, captain-approval, or invite-only
- Team answer mode: Majority Vote / Captain submits / First answer counts / Consensus required
- **Recommended MVP: Majority Vote only** — simpler to build, still more engaging than one-device-per-team.

### Team answer resolution — Majority Vote (MVP)
All members answer individually; the system takes the most-chosen answer as the team's official answer. **Full team participation is not required** — the tally is over whoever actually submitted, so a member who can't or doesn't answer (dead battery, low digital comfort — §3) simply isn't counted for that question; the team still gets a valid answer from the rest.

> Example — "Capital of Australia?" Ronald→Canberra, John→Canberra, Lisa→Sydney, Peter→Canberra ⇒ **team answer: Canberra**

**Rule: players may change their answer freely until the question closes** — either the timer runs out or the presenter closes the question, whichever comes first (§6). Only the final answer at that moment counts.

Tie-break: **earliest submitted answer among tied options** (recommended for MVP) — where "submitted" means the timestamp of a member's **final** answer change, not their first pick, consistent with the answer-changing rule above. Other options considered: captain tiebreak, no answer awarded, or random with visual indication.

### Future team answer modes (post-MVP)
- **Captain Mode** — everyone answers, captain picks the team's final answer.
- **Consensus Mode** — bonus points scale with team agreement (100% = big bonus, 75% = small bonus, split = none).
- **Expert Mode** — players declare expertise areas (Tech, Sports, Music, History, Movies, Politics); matching questions highlight "team expert."
- **Trust Your Expert** — the team expert can flag "Trust Me" on an answer: correct → bonus, incorrect → penalty. Fun, deliberately excluded from MVP due to risk/complexity.

## 6. Gameplay Flow

1. **Lobby** — join via QR/room code/invite link; login, register, or guest; create/join team; ready status; live player/team counts; a **spelregels ("rules of this quiz") screen** (below); host waiting screen.
2. **Live gameplay** — presenter opens a round → question pushed to devices → timer auto-starts → players submit (and may **change their answer freely** as many times as they like) → presenter closes the question or the timer expires, whichever comes first → the player's final answer at that moment is locked → reveal. Live indicators: players/teams online, answers submitted, % answered, timer remaining, round status.
3. **Reveal** — correct answer + optional explanation shown, scores calculated, rankings updated, presenter advances. **Reveal cadence is presenter-configurable, defaulting to per-round rather than per-question**: in typical live use, all 10 questions of a round are answered first, then the presenter reveals and narrates every answer in that round in one pass — commonly with a microphone, elaborating on each answer rather than just displaying it.
4. **Results** — shown per-question/round/end-of-quiz: round standings, overall standings, final ranking, team + personal stats, shareable result cards. The logged-in player's row (or their team's row) is highlighted with a distinct background color in every ranking/results view so they can spot themselves at a glance. **Interim standings (*tussenstand*) default to showing at the halfway point** — e.g. after round 5 of a 10-round quiz — configurable by the presenter. **Leaderboard ties are a separate concept from the Majority Vote answer tie-break in §5**: when two or more teams/players share the top score, both keep rank #1 (never silently forced apart), and the UI should flag it to the presenter as a highlight moment — a shared #1 is normally called out live as a shout-out, not resolved away.
5. **Inter-round break** — between rounds, the presenter may either move straight to the next round or **insert a break** (drinks/bathroom, common in live pub-quiz events). Independent of the full quiz pause/resume host control in §22 — this is a lighter, more frequent action, not a "freeze everything" state. **A rule that applies whenever standings are shown between rounds: they are only displayed once every answer counted so far has actually been graded** — trivially instant while scoring is auto-scored-only (MVP), but load-bearing once peer-review grading ships in V1.5 (§7), since that grading is asynchronous and human-driven and can lag behind round close. Standings must wait for it, not show a partial/stale total.
6. **Replay & history** — quiz archive, past scores, team/personal history, achievements, category performance.

### Spelregels page — generated per quiz, not static

Players get a "rules of this quiz" page in the lobby (and reachable during play), but **it is not one fixed rules page for the whole platform** — it's generated from the specific settings of the quiz being played, pulled from the quiz-level and team settings in §5. What it shows depends on what's actually configured for that quiz, for example:

- Individual Quiz vs. Team Quiz, and if team: minimum team size (3), team-joining method, and the no-switching-after-start rule.
- The active team answer mode (Majority Vote for MVP) and its tie-break rule, stated in plain language, not jargon.
- Which scoring modes are live for this quiz's question types — including, for a quiz with a music round, the actual point split in use (1+1 vs. 0.5+0.5 per §7), since that varies quiz to quiz.
- The answer-changing rule (can change until the question closes) and the 60-second reconnect grace period (§15).
- Any power-ups enabled for this quiz (none in MVP, per §8) and, once V1.5/V2 ship, whether peer-review grading or specific power-ups are turned on.
- Interim-standings cadence and picture-round open-duration, if this quiz's presenter has changed them from the defaults in the reference format below.

Practically: this means quiz settings need to be structured data the rules page can render from directly (§18), not free text the quizmaster writes per quiz — otherwise the page can't stay accurate when a presenter flips a setting.

### Typical quiz format (reference template)

The format below reflects how these quizzes are actually run live and is a useful default, not a hard constraint — the engine should support other shapes, but this is what a quizmaster expects out of the box:

- **10 rounds of 10 questions each** is the standard quiz length.
- **Each round carries its own theme/category** (e.g. Sport, Algemene Kennis, Eten & Drinken, Muziek) — see §9. Theming applies at the round level, not only per-question.
- **One round is typically a music round** — see §7 for its artist/title/year scoring specifics.
- **Picture rounds stay open longer than a normal round** — commonly spanning up to 3 subsequent rounds before closing, since photo questions take longer to research or discuss as a team than a single timed question.
- Reveal and interim-standings cadence as described above (per-round reveal with presenter narration; interim standings at the halfway point).

## 7. Question Types & Scoring

### Types
- **Standard:** Multiple Choice, Multi-Select, True/False, Open Question
- **Advanced:** Estimation, Margin-based, Numeric, Ordering, Matching
- **Multimedia:** Picture round (see §6 for its extended open-duration rule), Music round, Audio fragment, Video (YouTube in/out timestamps, Spotify/audio preview, image upload, external media URL, optional local/CDN storage)
- **Competitive:** Bonus, Shootout, Tiebreaker, Fastest-correct

**Music round scoring:** each question awards points for **artist** and **title** as separate, independently-scored sub-answers. **The point value per sub-answer is configurable by the presenter/quizmaster, not fixed** — typically 1 + 1 (2 points total), but sometimes 0.5 + 0.5, chosen based on the audience's expected knowledge and age. An optional **year bonus** can be enabled per question or per round, awarding an extra point for correctly guessing the release year. This is a distinct scoring shape from the single-answer modes below and should be modeled as a question with multiple independently-weighted gradable fields, not a single correct-answer field — and since half-point values are a real, expected case, **the scoring engine and Scores entity (§18) must support fractional points, not integers only.**

**MVP question types: Multiple Choice, Multi-Select.** Open Text (and therefore any open-answer grading) is deferred to V1.5 alongside media rounds — see the decision below. True/False, Estimation, Margin, Numeric, Ordering, and Matching are not scheduled before V1.5/V2 either; they exist as supported types the engine should be built to accommodate, not MVP commitments.

### Scoring modes
- **Standard:** fixed points (e.g. correct = 10, incorrect = 0)
- **Estimation:** points scale with closeness to the true value
- **Margin:** full points if the answer lands inside a configured range (e.g. correct=100, margin 90–110)
- **Shootout:** sudden-death tiebreaker, last one standing wins
- **Team scoring:** aggregated per team, but individual answers are still stored (for personal stats, team analytics, MVP calculation, category strengths, future achievements)

### ⚠ Open decision — how open questions get graded
The two source drafts disagree and this should be resolved before building open-question support:

- **`PuntQuiz.md`** assumes a conventional model: an open answer is checked against a stored correct answer (implicitly system/quizmaster-graded).
- **`PuntQuiz ChatGPT.md`** proposes **peer-review scoring** as the actual MVP mechanism: after each question, teams are *randomly assigned another team's answer to grade* (e.g. Team A grades Team D, Team B grades Team F, Team C grades Team A). Grading is binary only — **Goed/Fout (right/wrong)**, explicitly no half or quarter points. The app auto-tallies points, processes scores in real time, and keeps an audit trail; the quizmaster can always correct a score, overrule an answer, or inspect the audit log.

**Decision (adopted, per [[#25. Recommendations|§25]] #1–2): hybrid, and out of MVP.** Everything objectively checkable (MC, Multi-Select, True/False, Numeric, Margin) is auto-scored server-side — no peer review involved. Peer-review grading is reserved for genuinely open-text questions only, and since Open Text itself is now deferred to V1.5 (see above), **peer-review scoring ships in V1.5, not MVP.** This keeps the server-authoritative principle (§3) intact for the entire MVP.

## 8. Power-Ups & Lifelines

Configurable per quiz or round.

| Power-up | Effect | Example |
|---|---|---|
| 50/50 | Removes two wrong options from an MC question | 4 options → 2 |
| Skip Question | Skip without losing points/streak | Skip a hard history question |
| Double Points Booster (NL: *verdubbelaar*) | Double points if correct, no penalty if wrong | 10 → 20 |
| Double Down | High-risk: double if correct, deduct if wrong | +20 / −10 |
| Extra Time | More time on one question | 30s → 45s |
| Hint Unlock | Reveals a quizmaster/AI clue | "This politician later became PM" |

Can be pooled per team or owned per player (team decides when to spend a member's power-up).

**Decision (adopted, per [[#25. Recommendations|§25]] #8): zero power-ups in MVP** *(since built anyway, see Appendix C)*, not even Hint Unlock. All power-ups, including Hint Unlock, move to V2 — keeps MVP engineering focused on the core differentiator (individual participation inside team play) rather than diluted across small features.

## 9. Categories

Default set: Sports, History, Geography/Topography, Politics, Technology, Science, Movies, Music, Food, Drinks, Nature, Current Events, General Knowledge, Biology.

Each question should carry: category, difficulty, tags, round assignment, media, explanation, source/reference notes.

**Categories also apply at the round level, not just per-question.** A whole round is commonly themed (e.g. a Sport round, a Food & Drinks round, the Music round) — see the reference format in §6. A round's theme is typically the shared category of its questions, but the data model should allow a round-level category field independent of its individual questions' tags, so a themed round can be labeled even if a couple of its questions don't strictly match.

## 10. Mobile-First Experience & Presentation Mode

**Design goals:** one-thumb operation, large tap targets, minimal typing, fast loading, high readability/contrast, smooth on weak mobile networks.

**Mobile features:** native-app feel, responsive layout, PWA, iPad optimization, push notifications, haptic + audio feedback, offline answer buffering, **60-second grace period** for weak/dropped connections (see §15).

**Presenter/host screen** (phone, tablet, or desktop; supports projector/TV/external screen): current question/round, timer, answers submitted + % answered, ranking, sponsor slides, reveal screen, final results screen. Optional Reveal.js integration for a slide-deck-style presentation.

## 11. Social Features

- **Shoutbox** — public room chat: player messages, team banter, quizmaster announcements, sponsor messages, automated system messages.
- **Team chat** — private, team-only, plus host announcements/system notifications.
- **Sharing** — result cards, social sharing, invite links, WhatsApp group QR, donation QR.

## 12. Profiles, Avatars, Achievements & Analytics

**Profile:** display name, photo, team badge, personal stats, quiz history, category strengths, achievements.
**Avatars:** preset collection (e.g. "Ugly Animals" 🦥🐸🦨🐔).

**Team achievements** (examples): Perfect Round, Unanimous Genius, Fastest Team, Comeback Kings, Music Masters, History Buffs, Technology Titans, Teamwork Champions.
**Individual achievements** (examples): Fastest Thinker, Team MVP, Music MVP, Sports MVP, Comeback Player, Most Consistent Player.

**Team analytics (post-quiz):**
- *Team view:* ranking, score, category breakdown, accuracy by round, avg. response time, power-up usage, historical performance.
- *Individual view:* per-player accuracy and avg. response time.
- *Team MVP:* auto-computed from correct answers, speed, category expertise, bonus points, and contribution to winning team answers.

## 13. Themes, Branding & Sponsorship

**Built-in themes** (each with light + dark mode): Neutral, Winter, Spring, Summer, Autumn. **Future:** Halloween, Christmas, Festival Mode, Retro Arcade.
**Branding:** custom logo, app name, fonts, colors, backgrounds; round number rendered with a subtle shadow for contrast.
**Sponsorship:** sponsor logos, slides, interstitials between rounds, banner positions, messages in the shoutbox, donation QR, WhatsApp group QR.

## 14. AI Features

AI assists the quizmaster — it never replaces human review, and **AI-generated questions always require quizmaster approval before going live.**

- **Content generation:** question generator, quiz generator, difficulty balancing, hint generation, distractor generation, explanation generation.
- **Media generation:** AI images, AI audio fragments, AI avatar generation.
- Longer-term: fuzzy-matching/AI-assisted grading of open questions (still human-approved), AI quizmaster voice.

## 15. Anti-Cheat, Fair Play & Real-Time Host Controls

**Anti-cheat** (strong but not intrusive): server-authoritative scoring, answer locking, timer validation, a **60-second grace period** for network delay (a dropped connection has 60 seconds to reconnect and have its last-submitted answer counted before the question is treated as unanswered for that player), duplicate-participation detection, optional device fingerprinting, host override controls, audit log for answer changes, one active participation per user per quiz — which combined with the no-team-switching rule (§5) means a participation's user, team, and quiz are all fixed for the duration of the quiz. **Core rule: never trust client-side timers or client-side scoring.** Equally important: **a non-response is a normal outcome, not a suspicious one.** A dead battery, a player who's less comfortable with the digital flow, or connectivity loss beyond the 60-second grace period should be treated as an ordinary unanswered question (§3, §5) — anti-cheat mechanisms target deliberate manipulation, not absence.

**Live/real-time state:** rankings, scores, timers, round status, answers submitted, % answered, player/team online status.

**Host controls:** start quiz, pause/resume timer, reopen question, skip question, close question, reveal answer, override answer, force reveal, end round, **start/end an inter-round break** (§6 — lighter and more frequent than the full quiz pause below, used for drinks/bathroom breaks between rounds), pause/resume the whole quiz (§22 — a harder freeze of the entire session, distinct from an inter-round break), end quiz.

## 16. Authentication, Privacy, Accessibility & GDPR

**Auth — decisions (interview 2026-11-14):**
- **Login methods for players:** GitHub, Facebook, Google, Apple, Microsoft, plus email + password / magic link.
- **Guests:** allowed — name only, no account; a guest can upgrade to an account later (supports the fast-join principle, §3).
- **Long sessions:** sliding ~30-day session, renewed on each visit, so players are never forced to re-login during or between quiz nights. Applies to the player-facing session; staff sessions may be shorter.
- **Staff (admin, quizmaster, presenter):** same identity system as players, with **mandatory MFA** (admins) enforced per role.
- **QR is never required:** QR code is only a shortcut that pre-fills the room code. Room code, invite link and normal login must always work on their own — no flow may depend on scanning a QR.
- **Branding:** the hosted login screens carry the PuntQuiz brand (§30 design system), not a generic provider look.

> **Decision (2026-11-14): Authentik is the identity provider; Keycloak is the fallback.** Authelia was dropped because it cannot do social login (it is an OIDC provider only; relying-party support is roadmap — [Authelia roadmap](https://www.authelia.com/roadmap/active/openid-connect-1.0-provider/), [discussion #7141](https://www.github.com/authelia/authelia/discussions/7141)). Authentik federates GitHub/Facebook/Google/Apple/Microsoft, supports email/magic-link and enforced MFA per group, and its login flows are brandable. Keycloak is the switch if Authentik fails the checks below (heavier JVM, more mature, themes via Keycloakify). The NestJS backend and Nuxt frontend authenticate via standard OIDC, so the provider stays swappable. **To verify before committing:** official image runs on both linux/amd64 and linux/arm64; Sign in with Apple works with the live domain; sliding 30-day session behaves as in §16.

**Security:** optional MFA for players, **mandatory MFA for administrators**, rate limiting, session management.

**Quiz privacy:** Open (anyone can join) vs. Private (password, invite link, or team invite).

**GDPR:** export personal data, delete account, manage consents/privacy settings; configurable data retention for quiz data, logs, and stats.

**Accessibility target: WCAG 2.1 AA** — high contrast, keyboard navigation, screen-reader support, color-independent feedback.

## 17. Technical Architecture

The two drafts propose slightly different backend framing — treat NestJS as the concrete choice, plain "Node.js API" as the earlier, less specific version of the same idea. Specifics below (transport, ORM, monorepo, containerization) are decisions made on top of that, not present in either original draft.

| Layer | Choice |
|---|---|
| Frontend | Nuxt (v4) + Vue 3 + TypeScript, PWA, Pinia for state; optional Ionic UI components |
| Backend | Node.js + **NestJS**, REST API (GraphQL possibly later), WebSocket Gateway over **Socket.IO** |
| Realtime transport | Socket.IO, with the **Redis adapter** for pub/sub across instances — its built-in reconnection/fallback logic is what actually implements the "grace period for weak connections" requirement (§10) rather than hand-rolled reconnect logic |
| ORM | **Prisma** over PostgreSQL — generated types are the enforcement mechanism for the API-contract-stability NFR (§26): a mutation's shape drifting from what the frontend expects breaks the build, not just at runtime |
| Database | PostgreSQL |
| Realtime/cache | Redis + Redis Pub/Sub |
| Infra | **Docker Compose**, Traefik, Proxmox (pve1), separate PRD environment |
| Identity | **Authentik** (Keycloak fallback) as its own container(s) in the Compose stack, OIDC to NestJS/Nuxt, themed with PuntQuiz branding — see §16 |
| Live domain | **puntquiz.puntuale.nl** |

**Repository structure:** a **monorepo** (Turborepo or Nx) with a shared `contracts` package holding request/response types, consumed by both the Nuxt frontend and the NestJS backend. This is what makes the API-contract-stability requirement (§26) enforceable rather than aspirational, and gives each MVP feature slice (§22) a single typed boundary to build against when run through Spec Kit's per-feature `/speckit.specify` cycle (§28).

**Everything runs as one Docker Compose stack** — Nuxt frontend, NestJS backend, PostgreSQL, Redis, and Traefik each as their own service/container, brought up together per environment (dev/staging/prod). This is also the concrete mechanism satisfying the platform-agnosticism NFR (§26): the containers, not the host, define the runtime environment, so the stack can move between Proxmox and any other Docker-capable host without code changes — provided no Proxmox-specific behavior leaks into the images themselves (see the tension note in §26).

**The live engine is Node.js + Redis + PostgreSQL only — never a CMS.** The original drafts suggested Drupal for the separate marketing site (static pages, blog/news, long-form editorial content), but **Drupal has since been ruled out entirely** — no CMS should ever host live quiz state, WebSocket handling, timer logic, or real-time scoring regardless of which one is eventually chosen for marketing content. The marketing-site tech choice itself is intentionally left open — not yet decided.

See [[#26. Non-Functional Requirements & Platform Constraints|§26]] for cross-cutting platform, security, and performance constraints that apply on top of this stack — including a note on reconciling them with the Proxmox-specific infra above.

## 18. Data Model

**Core concept — participation, not two parallel systems:**

```text
Quiz
 └── Participation
      ├── User
      └── Team (nullable)
```

- *Individual quiz:* `Participation { User: Ronald, Team: NULL }`
- *Team quiz:* `Participation { User: Ronald, Team: "BAM Brains" }`

Same answer/leaderboard engine either way — only the score-aggregation step differs.

**Recommended entities:** Users, Quizzes, Teams, Participations, Rounds, Questions, QuestionMedia, RoundQuestions, Answers, Scores, Invitations, Sponsors, Themes, Achievements, ShoutboxMessages, AuditLog.

**Question bank reuse tracking.** The quizmaster's question bank (§4, "manage question banks") is a persistent arsenal, not something consumed per quiz — the same Question can be attached to many Quizzes over time via RoundQuestions. The question-bank UI must surface, per question, which quizzes/rounds it has already been used in and when (e.g. "last used: Oudejaarsquiz, 2023-12-31 — used 3× total"), so a quizmaster can deliberately avoid repeating a question on a recurring crowd (§1 — the target segments are largely recurring pub nights) instead of finding out by accident mid-quiz. This is a query over existing RoundQuestions history, not a new entity, but it needs to be a first-class, visible affordance on the question-bank screen, not something buried in an audit log.

**Live state → Redis, not Postgres.** Only final answers/scores/audit events are persisted to PostgreSQL.
```text
room:{quiz_id}:current_round
room:{quiz_id}:current_question
room:{quiz_id}:timer_remaining
room:{quiz_id}:status
```

**Predecessor sketch (from `2020-03-26 Puntuale online Quiz.md`)** — an earlier, simpler pass at the same idea, kept for reference:
```text
Quiz: date-range, title, body, media, tax
Round: quiz, number, title, body, media, tax, workflow, fbevent, organizer
Question: quiz, round, title, body, workflow, tax, number
Answer: quiz, round, question, title, media, points, tax, number, link
Response: quiz, round, question, answer, title, user, points, workflow
User: username, image, email, team
Team: title, users, avatar
```
`tax` (taxonomy) values sketched there: video, audio, open vraag (open question), multi-per-choice, plaatjesronde (picture round), muziekronde (music round); category taxonomy: algemene kennis, voetbal, muziek, sport, films en series, eten & drinken, techniek. Environments were split across subdomains: `dev.`, `acc.`, `www.`, `prj.puntuale.nl` — a useful precedent for a dev/staging/production split, and the same `puntuale.nl` domain now hosts the confirmed live PuntQuiz URL (§17): **puntquiz.puntuale.nl**.

## 19. Public API

REST-first (GraphQL as a possible later addition), covering quizzes, questions, categories, teams, players, and results:

```http
GET  /api/quizzes
GET  /api/questions
GET  /api/categories

POST /api/questions
POST /api/quizzes
POST /api/teams
```

**Import/export:** CSV, Excel, and JSON, for bulk question import, quiz export, and backups.

**Scriptable access:** the API must be documented well enough to script content management headlessly — e.g. a documented Python client/examples for bulk-adding or editing quizzes, questions, and categories outside the admin UI. See [[#26. Non-Functional Requirements & Platform Constraints|§26]] for the contract-stability requirement this implies.

## 20. Operations

**Monitoring:** uptime, WebSocket connections, active quizzes, Redis status, PostgreSQL status. Suggested tools: Prometheus, Grafana, Loki.
**Backups:** daily PostgreSQL, media, and configuration backups; a documented restore procedure (not yet written).
**Scalability targets:** MVP ~100 concurrent players → V1 ~1,000 → V2 10,000+.

## 21. Business Model

> **Update 2026-11-14:** PuntQuiz is a **non-commercial hobby project** of Ronald Punt (Puntuale). The tiers below are an unused idea: nothing is sold, no pricing exists in the app, and the legal texts say so (no company, no KVK, "as is", own risk).

| Tier | Includes |
|---|---|
| **Free** | Up to 25 players, basic functionality |
| **Pro** | Unlimited players, multimedia rounds, branding, export |
| **Event** | One-off large events: festivals, corporate quizzes |

## 22. Roadmap

**MVP — Core Platform** *(scope below reflects the decisions adopted in [[#25. Recommendations|§25]], not just the original source drafts)*
Roles: Player, Host. Modes: Individual Quiz, Team Quiz (Majority Vote only, earliest-submitted tie-break). Question types: MC, Multi-Select — both auto-scored server-side. Features: registration, guest mode (auth: email+password, magic link, guest — see §16), team creation/joining, QR join, mobile gameplay, presenter dashboard, round management, timer, live scoreboard, final ranking, dark mode, basic personal stats, **offline answer buffering / reconnection**, **pause & resume the whole quiz** (not just per-round host controls).
*Explicitly excluded from MVP:* AI, multimedia rounds, Open Text questions and peer-review grading (→ V1.5; built early, see Appendix C), **all power-ups including Hint Unlock** (→ V2), Captain/Consensus/Expert/Trust-Your-Expert modes, tournament mode, league mode.

**V1.5 — Polish & Media:** Open Text questions **with peer-review grading** (teams randomly grade another team's answer, right/wrong only — §7), picture rounds (partly built, see Appendix C), YouTube video support, music/audio rounds, better themes, sponsor logos, basic stats dashboard, shareable result cards, improved iPad/projector mode.

**V2 — Social & Team Expansion:** shoutbox, team chat, team profiles, avatar presets, sponsor slides, WhatsApp/donation QR, power-ups (50/50, Hint Unlock, Double Points Booster), achievements, team MVP, category performance.

**V3 — AI & Advanced Gameplay:** AI question/quiz/hint/distractor generation, seasonal themes, Reveal.js integration, Captain/Consensus/Expert/Trust-Your-Expert modes, shootout mode, replay system, advanced analytics.

**Future ideas (unscheduled):** tournament mode, league system, fantasy quiz league, public quiz marketplace, AI quizmaster voice, Twitch/YouTube live integration, multi-language support, festival edition, smart TV app, public seasonal competitions.

## 23. Open Questions & Gaps

Carried over from `Hermes Input.md`, grouped by area — none of these are resolved in either product draft.

**Critical product**
- Monetization/pricing model detail (freemium, per-quiz, subscription, sponsor revenue share?)
- ~~Auth details~~ → **pulled into MVP scope** (§22): guest mode, email+password, magic link. Social login (GitHub/Facebook/Google/Apple/Microsoft), sliding 30-day sessions, guest-by-name and mandatory staff MFA are now decided in §16; identity provider is Authentik (Authelia dropped, can't do social login).
- Bulk import/export of questions (CSV/Excel/JSON, copy between quizzes)
- ~~Open-question evaluation mechanism~~ → **resolved** (§7): auto-score closed-form types in MVP; peer-review grading for Open Text moves to V1.5.
- Private quiz mechanics: password, invite-only, shared link with a participant limit
- ~~Reconnection~~ → **pulled into MVP scope** (§22): offline answer buffering while a player is disconnected.
- ~~Pause/resume the whole quiz~~ → **pulled into MVP scope** (§22), not just per-round host controls.

**Operations & hosting**
- Monitoring/alerting specifics (uptime, Redis/Postgres health, active user count)
- Backup & DR: Redis state loss on crash, restore procedure
- Certificate management (Let's Encrypt via Traefik, renewal)
- Logging/audit strategy: who changed what, retention period
- Deployment checklist: staging → production, migrations

**Business/organizer tools**
- Billing/usage reporting for organizers
- Sponsor slide mechanics: how/when are interstitials inserted between rounds?
- Organizer dashboard for participant management (CSV export)
- Support channels: report a bad question, help, status page

**User experience**
- Password reset / account management flow
- Profile editing (name, photo, switching teams)
- Notification preferences (quiz start, invite, results ready) — email vs. push
- Concrete haptic/audio feedback spec

**Compliance**
- GDPR: data deletion, export rights, consent management
- WCAG 2.1 AA conformance checks
- Rate limiting / DDoS protection for live quizzes

**Technical**
- Load testing at 100 / 1,000 / 10,000 concurrent connections
- ~~CI/CD and test strategy (unit, integration, E2E — Playwright/Puppeteer)~~ → **pulled into required quality gates** (§26, "Testing & Quality Gates")
- WebSocket failover if a Node process crashes mid-quiz
- Per-environment configuration (dev/staging/prod)
- Observability: answer-rate %, timer errors, active WS instance count

**Missing user flows**
- Players returning after the quiz to view results
- Presenter drops out mid-quiz — who takes over?
- Team captain leaves — what happens to their permissions?
- Quizmaster fixes a question mistake after going live — audit trail for it

**Small concrete unknowns**
- UUIDs vs. integer IDs for entities
- Media storage limits (space, format restrictions)
- Open-question grading: AI matching or fully manual?
- Realistic max players per quiz, technically
- Who can see whose statistics (privacy between teammates)?

**Suggested sequencing (from the same note):** for MVP, prioritize auth, open-question evaluation, import/export, and reconnection logic; for production-readiness, prioritize backup/monitoring, GDPR, failover, and load testing.

## 24. Legacy Content Archive

Three files are archived real pub-quiz question banks, useful as seed content once import/export exists, not product spec:

- `2010-12-23 PUBQUIZ.md` — 15 trivia items (e.g. Bitcoin/Satoshi Nakamoto, Rolls-Royce's Spirit of Ecstasy, Russian leaders since the revolution, most-used phone PINs).
- `2018-11-08 PUBQUIZ.md` — 8 items, geography/current-events flavored (Spanish-speaking countries, Cuba's president, Qatar leaving OPEC in 2019).
- `2023-11-29 Oudejaarsquiz.md` — a picture round ("Bekende personen" / "Steden") with a linked image (`2024-06-11 Drawing.png`), tagged `#quiz #pubquiz`.

These map cleanly onto the planned category taxonomy (§9) and the picture-round question type (§7) — they're a natural first CSV/JSON import test case.

## 25. Recommendations

Advisory notes on top of the consolidation above, not present in the source files. Items 1, 2, 4, and 8 have been **adopted** and are now reflected directly in §7, §8, §22, and §23 above; 3, 5, 6, and 7 are standing process/sequencing advice not yet actioned anywhere else in this document.

1. ✅ **Adopted — hybrid scoring, not either/or** (now §7). Auto-score everything objectively checkable (MC, Multi-Select, True/False, Numeric, Margin) server-side. Reserve peer-review grading *only* for genuinely open-text questions. Keeps the server-authoritative principle (§3) intact for most of the quiz while still getting the social, "everyone stays engaged" benefit peer-review is meant to deliver, without building two independent scoring pipelines.

2. ✅ **Adopted — Open Text (and peer-review) moved out of MVP, into V1.5** (now §7, §22). MVP ships with auto-scored MC/Multi-Select only. Peer-review adds randomized grading-assignment logic, a grading UI, a dispute window, and audit/override handling — real complexity better absorbed after the core loop (individual participation inside team play) is proven, since that differentiator doesn't depend on peer review at all.

3. **Pick one canonical spec and stop maintaining two.** `PuntQuiz.md` and `PuntQuiz ChatGPT.md` now disagree on scoring model and drift slightly on backend framing (plain Node.js vs. NestJS). This document merges them, but future edits should happen in *one* living spec (this file, or whichever you designate) rather than continuing to fork drafts — otherwise this exact reconciliation problem recurs every time either file is updated.

4. ✅ **Adopted — pulled auth details, reconnection/offline buffering, and whole-quiz pause/resume into MVP scope** (now §22, §23). Open-question evaluation was resolved via #1/#2 above rather than pulled in as-is. Import/export and monetization/pricing remain open and unscheduled — see §23.

5. **Decide entity ID strategy (UUID vs. integer) and environment layout early** — both are cheap to decide now and expensive to change after data exists. The predecessor project's subdomain split (`dev./acc./www./prj.puntuale.nl`, §18) is a reasonable starting template for PuntQuiz's own dev/staging/prod environments.

6. **Treat the archived question banks (§24) as your import/export feature's first test fixture.** Before building a general CSV/Excel/JSON importer, hand-convert one of the three archives into the target format — it will surface real schema gaps (e.g. picture-round questions need a media reference field; the 2018 file's answers are single strings, not structured options) faster than designing the importer abstractly.

7. **Write the failure-mode user flows (§23, "Missing user flows") as actual acceptance criteria before implementation**, not just as a bullet list. "Presenter drops out mid-quiz" and "captain leaves the team" are exactly the scenarios that are expensive to retrofit once the WebSocket/session model is built — they belong in the initial architecture discussion, not a post-launch patch.

8. ✅ **Adopted — MVP power-up scope narrowed to zero** (now §8, §22). Not even Hint Unlock ships in MVP; all power-ups move to V2. Keeps MVP engineering focused on the core differentiator rather than diluted across small features.

8. **Run a short build-vs-adopt pilot of QuizDock before committing to a full custom build** *(added 2026-11-14 from the open-source scan; none of these projects has been installed or tested — all claims are from their docs, "not confirmed" ≠ "impossible")*. QuizDock (MIT; React + NestJS + PostgreSQL + Redis + Socket.IO, Docker images, PIN/QR join without account, separate control and projector views, OIDC login mode) overlaps heavily with §17's stack, so it is either a head start to fork or a reference to learn from. Pilot: one quiz, two rounds, an image, one open question, loose phones, a separate presenter screen; then test reconnect, score correction, and presenting a quiz someone else authored. **Known gaps vs. PuntQuiz (would need custom work):** per-player answers inside a team with Majority Vote (§5), separate quizmaster/presenter rights (§4; QuizDock's Host both authors and presents), open-answer review before score publication (§7), score corrections with a logged reason and leaderboard recompute (§15), a quiz version pinned per session so edits never affect a running quiz (§18), and reconnect/identity/deadline recovery (§10). Fallback if the team-vote model is relaxed: *one phone per team* ships faster but loses individual stats and contradicts §3. Other candidates, lower priority: ClassQuiz (SvelteKit + FastAPI, MPL-2.0; different stack), Fuiz (Svelte + Rust, **AGPL-3.0**), Claper (presentation interaction, poor fit for a presenter-driven quiz night — not recommended).
9. **Licence check before borrowing any code:** QuizDock is MIT (safe to fork), ClassQuiz MPL-2.0 (file-level copyleft), Fuiz AGPL-3.0 (network copyleft — copying its code into PuntQuiz would force PuntQuiz open under AGPL). Borrow *ideas* freely; borrow *code* only after checking the licence against the business model (§21).

## 26. Non-Functional Requirements & Platform Constraints

*Added from a later round of notes — these are cross-cutting constraints on top of everything above, not a feature area.*

### Platform & architecture agnosticism
The system **must be platform-agnostic and architecture-independent**: it must behave consistently across operating systems, hardware architectures (x86_64, ARM), and deployment environments (cloud, on-premises, hybrid) **without platform-specific modifications** to the application layer.

> ⚠ **Tension to reconcile with §17:** the recommended infra (Docker Compose, Traefik, **Proxmox pve1**) names a specific on-prem hypervisor. That's not automatically a violation — a containerized app can target Proxmox today and a cloud host tomorrow without code changes — but it only holds if Proxmox-specific behavior (storage paths, networking assumptions, host-level scripts) never leaks into the application or its Dockerfiles. Treat Proxmox as *the current deployment target*, not an architectural dependency.

### Security
- **Multi-arch images:** every image in the Compose stack (including the identity service) must be published for linux/amd64 and linux/arm64 so it runs on x64 and on macOS Apple Silicon without emulation.
- Security is **designed in from inception**, not added later.
- Least-privilege access throughout (services, database roles, admin permissions).
- Secure coding standards enforced across the codebase.
- This extends, rather than replaces, the anti-cheat/server-authoritative principles already set out in §3 and §15.

### Performance
- Performance standards must be **defined for every critical component** (join flow, answer submission, WebSocket broadcast, scoring calculation, etc.) — not just as an aggregate concurrency target.
- This is currently unspecified at the per-component level; §20's concurrency targets (100 → 1,000 → 10,000 players) are the only performance numbers in this document so far. Defining per-component budgets (e.g. max answer-submission latency, max broadcast fan-out time) is listed as an open item in §23 ("Load testing / scalability").
- Components must run efficiently with **minimal resource overhead** — relevant directly to the Redis-for-live-state / Postgres-for-persistence split in §18, which already exists partly for this reason.

### API contract stability
- The system **must maintain strict contract adherence during all API mutations** — breaking changes to request/response shapes require versioning, not silent changes.
- This directly supports the scriptable Python access pattern in §19: a script built against the API today must keep working unless a version boundary is crossed.

### Testing & Quality Gates
No code reaches production without passing all of the following, enforced in CI/CD rather than left to reviewer discipline — this is what resolves the "CI/CD and test strategy" open item in §23:

- **Unit tests** — per-package logic (scoring engine, Majority Vote resolution, tie-break, aggregation), owned by whichever package (frontend/backend/contracts, §17) the logic lives in.
- **Integration tests** — cross-service behavior: NestJS ↔ PostgreSQL/Prisma, NestJS ↔ Redis pub/sub, WebSocket Gateway event flows (§17).
- **Linting** — static style/quality enforcement across the monorepo (§17), run as a merge gate, not just an editor hint.
- **Type checking** — TypeScript strict-mode checks across frontend, backend, and the shared `contracts` package (§17); this is the second half of the API-contract-stability enforcement mechanism described there, alongside Prisma's generated types.
- **Security scans** — dependency/SAST scanning as a merge gate, direct implementation of the "security designed in from inception" principle above, not a later bolt-on.
- **Playwright tests** — end-to-end browser tests covering the golden paths from §6 (lobby join → answer → reveal → results) and the failure-mode flows called out in §25 #7 (presenter drop-out, captain leaves).
- **API contract tests** — verify the REST API (§19) and WebSocket event payloads against the shared `contracts` package (§17) so a breaking change is caught in CI, not by a script author discovering it in production (§19, "Scriptable access").
- **CI/CD gates** — all of the above wired as required, blocking checks on every merge to the trunk/release branch; a merge cannot bypass them, matching the "no `--no-verify` shortcuts" discipline this NFR section exists to codify.
- **Second-model review** — an independent AI model reviews a change before merge, separate from whichever model/agent authored it (per the Spec Kit `implement` stage, §28) — a second, differently-biased pass catches the class of mistake a single model is prone to repeating on its own output.

### Documentation
- Documentation **must reflect these non-functional requirements** — i.e., a component's docs should state its platform assumptions (or lack thereof), its performance budget, and its security posture, not just its functional behavior.

## 27. Fun & Engagement Ideas (Future)

Speculative, not yet scoped into a version — playful features that fit the "every player counts" identity and the pub/festival crowd. Suggested landing spot noted per idea; revisit when scoping V2/V3 (§22).

- **Live answer histogram** — after a question closes but before reveal, show a bar chart of how the crowd split across options. Free suspense, built entirely on data already collected at answer-lock. *→ V1.5/V2, pairs naturally with the Reveal Phase (§6).*
- **Hot Hand streaks** — a visible multiplier/badge for consecutive correct answers within a quiz, decaying on a miss. Built on the same per-answer data as Fastest Thinker (§12), just surfaced mid-game instead of only post-quiz. *→ V2, alongside achievements.*
- **Underdog boost (final round only)** — a small, clearly-telegraphed point bonus for the bottom-ranked team/player in the last round. Keeps the room's energy up when one team runs away with it early. *→ V3, alongside Shootout mode (§7).*
- **Silly end-of-night superlatives** — auto-generated alongside the real achievements: "Most Confidently Wrong," "Slowest Correct Answer," "Comeback of the Night." Reuses the analytics pipeline in §12 with joke copy instead of serious stats. *→ V2, alongside Achievements.*
- **Drumroll reveal** — a short countdown/sound sting before the correct answer appears, layered onto the existing Reveal Phase (§6). *→ V1.5, cheap addition alongside audio feedback (§10).*
- **Spectator/watch-only join** — a QR that joins the live scoreboard view without creating a Participation (§18), for friends who just want to watch. A natural funnel: today's spectator is next week's player. *→ V2.*
- **Venue Hall of Fame** — since the target segments are recurring pub nights (§1), a per-venue leaderboard of historic champions, distinct from personal history (§12), gives hosts something to tease at the start of the next night. *→ V3, alongside advanced analytics.*
- **Auto-generated team names** — a "surprise me" button pulling from a silly Dutch name generator at team creation, in the spirit of the Ugly Animals avatar pack (§12). *→ V2, cheap addition to team creation flow (§5).*

- **Presenter remote control** *(ClassQuiz)* — the presenter runs the quiz from their phone while the main screen is on the beamer; the dashboard (§10, §15) should be fully usable at phone size and decoupled from the projection view. *→ V1.5; arguably MVP-adjacent since presenters move around the room.*
- **Quiz night = several quizzes in one lobby** *(QuizDock)* — chain multiple quizzes in the same room without players re-joining, with cumulative or per-quiz rankings. Fits "an evening" better than one-quiz-one-room. *→ V2; touches the Participation model (§18).*
- **Split-answers team mode ("Teamwork")** *(Fuiz)* — each team member sees only a subset of the answer options, so the team must talk to find the right one. A cheap, distinctive alternative to Majority Vote that rewards real cooperation. *→ V3, alongside the other team answer modes in §5.*
- **Manual vs. automatic progression per quiz** *(QuizDock)* — presenter-paced by default, with an auto-advance option for unattended/online quizzes. *→ V1.5.*
- **Live "crowd" polls between rounds** *(Claper-style, low priority)* — quick audience polls/word clouds during breaks (§6) for sponsor slots; not core. *→ V3 at most.*

## 28. Development Workflow — GitHub Spec Kit

PuntQuiz will be built using **GitHub Spec Kit** (`specify` CLI) for spec-driven implementation: a `constitution → specify → plan → tasks → implement` pipeline run through an AI coding agent, where each stage produces a markdown artifact the next stage consumes.

**How this document feeds that pipeline:**
- **Constitution:** seed from §3 (Product Principles) and §26 (NFRs & Platform Constraints) — server-authoritative scoring, mobile-first, real-time-first, platform/architecture agnosticism, security-by-design, and API contract stability are exactly the non-negotiable rules that stage is meant to lock in.
- **Specify (per feature):** draw from the MVP scope in §22, one slice at a time — e.g. QR join flow (§6, §10), Majority Vote team resolution (§5), auto-scored MC/Multi-Select (§7), reconnection/offline buffering (§10, §22). **Do not feed this entire document into a single `/speckit.specify` call** — Spec Kit expects one constitution, then a separate specify → plan → tasks → implement cycle per feature.
- **Before writing the constitution:** close out the still-open foundational decisions from §25 #5 — UUID vs. integer entity IDs, and dev/staging/prod environment layout (a candidate default already exists in §18: the `puntuale.nl` subdomain pattern, paralleling the live domain in §17). These are cheap to fix now and expensive to revisit mid-implementation.

## 29. Embedded Manuals & In-App Help

Extends the player-only *spelregels* page (§6) into role-specific help for all three roles — a gap surfaced when checking whether dark mode (§13, confirmed already present) had an equivalent for in-app guidance (it didn't).

- **Player:** the existing per-quiz *spelregels* page (§6) covers only that quiz's active settings. Add a separate, general "how to play" layer alongside it — join flow, answering mechanics, and (once V2 ships) power-ups — kept distinct from the settings-driven rules page so the two don't get conflated.
- **Presenter:** a host-controls reference explaining what each dashboard action does — open/close round, reveal, override answer, inter-round break vs. full quiz pause (§6, §15), force reveal. Presenters operate live under time pressure, so this should be **contextual help directly on the dashboard** (tooltips/inline help), not a separate manual they'd have to leave the live view to read.
- **Quizmaster:** a content-authoring guide covering round/question building, configuring scoring modes (including the music-round point-split choice in §7), and team settings (§5). Quiz-building happens outside live time pressure, so unlike the presenter's contextual help, this one benefits from being a proper standalone reference.

**About page:** a simple in-app screen (reachable from settings/profile or a footer link, for all roles) showing:
- The current **app version number**.
- **Release notes / changelog** — what changed per released version, written in plain player-facing language, not raw commit messages.
- Links out to the three role manuals above and to support channels (§23 — "report a bad question, help, status page" is still an open gap this page would need to resolve into).

App version numbering is distinct from the API contract versioning already required by §26, but should follow the same discipline — a version bump means something changed, not an arbitrary label. **Left open for now:** whether release notes live only in-app (authenticated) or also as a public "what's new" page on the marketing site (§17 — platform TBD, no longer Drupal).

### Required static/legal pages

Beyond the in-app About page above, five reachable-from-anywhere pages are required at launch:

- **About this website** — what PuntQuiz is, who built it, the mission from §1. Distinct from the in-app About page above (that one is version/changelog-focused; this one is identity/marketing-focused) — they can share a footer link but serve different purposes.
- **Privacy Policy** — implements the GDPR commitments in §16: what personal data is collected (name, email, quiz history, stats), why, retention periods, and how to exercise export/delete rights.
- **Disclaimer** — accuracy/liability disclaimer for question content, including AI-generated content (§14 — quizmaster-approved, but not warranted error-free) and third-party media used in questions (§7, media rounds).
- **Game Rules (general, platform-wide)** — the general "how to play" layer already scoped for the Player manual above (join flow, answering mechanics, and power-ups once V2 ships). Kept distinct from the per-quiz *spelregels* page in §6, which covers only that specific quiz's active settings.
- **AI Statement** — a plain-language disclosure of where and how AI is used (§14: content/media generation, and longer-term AI-assisted grading and quizmaster voice), reinforcing that AI output never goes live without quizmaster approval.

All five are static/mostly-static content and are natural candidates for whichever marketing-site platform is eventually chosen (§17), rather than the live Nuxt app — but the Privacy Policy and AI Statement should also be linked from in-app settings/footer regardless of where they end up hosted.

## 30. Brand & Design Deliverables

Concrete assets to produce alongside the themes/branding feature set in §13 — project deliverables, not user-configurable product features.

- **Logo:** a **square mark** (primary — app icon, avatar/favicon contexts, sponsor-grid tiles) plus an **optional landscape/horizontal lockup** (headers, presenter dashboard, projector/TV mode per §10, sponsor slides per §13). **Generation approach:** design the initial mark with an AI image-generation tool, then derive every other icon surface — favicon, PWA app icons, avatar/favicon fallback, sponsor-grid tile — from that same generated square mark rather than designing each one separately, so every icon context stays visually identical to the primary logo instead of drifting into near-matches over time.
  - **✅ Approved (2026-08-30):** [PuntQuiz Logo — Claude Design canvas](https://claude.ai/code/artifact/81765c82-0c71-479b-b21b-97b83706ee59). Concept: an exclamation mark built from a rounded bar and a dot, where the dot doubles as the "Punt" (Dutch for point/period) wordplay; coral mark with a gold dot, shown on light/dark backgrounds plus a horizontal lockup and a legibility check at favicon (16px), app-icon (48px), avatar-badge (40px), and sponsor-tile (28px) sizes. This is the adopted mark — the canvas also keeps the two alternate directions considered and set aside (a pulse/target ring, a speech bubble) for reference.
  - **Exported icon files (2026-08-30):** `assets/favicon/` in this repo — `favicon.ico` (16/32/48 combined), standalone `icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-180.png`/`apple-touch-icon.png`, `icon-192.png`, `icon-512.png` (the last two are the standard PWA manifest icon sizes referenced in §17). Rendered from a vector recreation of the approved square mark, so all sizes are pixel-crisp rather than scaled-down screenshots.
- **Design system:** a documented style guide — palette per built-in theme (§13, each with light/dark variants), typography scale, and a shared component library — so the Nuxt frontend (§17) has one visual source of truth across the five launch themes rather than each screen improvising its own.
- **Images:** supporting visual assets — the avatar preset pack (§12, "Ugly Animals"), theme backgrounds (§13), and marketing/landing imagery for the eventual marketing site (§17 — platform still TBD, no longer Drupal).
- **Design-consistency tooling:** install and use [Impeccable](https://github.com/pbakaus/impeccable) to enforce the design system above — palette, typography scale, and component library — consistently across both the Nuxt frontend and any backend-rendered surfaces (NestJS admin/quizmaster screens, presenter dashboard, transactional emails), rather than relying on manual review alone to catch drift from the style guide.

---

## Appendix A. Legal & Help Content — Dutch concept text (§29)

**Status: concept, not legally reviewed. Rendered in the app (with a concept banner, see Appendix C) since 2026-11-14 but not approved — remove the banner only after review.** Consolidated into this document on 2026-11-14 (previously a separate file). A quizmaster/owner — preferably a lawyer — must review it before publication, above all the Privacy Policy and Disclaimer. Every missing hard fact (legal entity, KVK number, address, contact/support email, retention periods, sub-processor list) is a bracketed `[PLACEHOLDER]` — **never invent these values**; only fill them from information the owner supplies. Texts mention the login methods of §16 only generically ("gast, e-mail en wachtwoord, magic link"); update A2/A4 when social login ships. Open-item list = every `[PLACEHOLDER]` below.

### Deel A — Wettelijke / statische pagina's

Vijf pagina's, overal-vanaf-bereikbaar, zoals gescoped in §29 "Required static/legal pages". Kandidaat-locatie: de nog te kiezen marketingsite (§17), met Privacybeleid en AI-verklaring ook gelinkt vanuit de in-app instellingen/footer.

#### A1. Over deze website

> **Titel:** Over PuntQuiz

PuntQuiz is een live pubquiz-platform met één simpel uitgangspunt: **elke speler telt, ook in een team.** Waar de meeste pubquiz-apps één telefoon per team gebruiken, logt bij PuntQuiz iedere deelnemer individueel in, beantwoordt individueel mee en bouwt een eigen score en statistieken op — ook als je onderdeel bent van een team.

PuntQuiz is gemaakt voor horeca (wekelijkse pubquiz-avonden, café-competities, muziekquizzen), festivals, bedrijven (teambuilding, kennissessies, personeelsfeesten) en verenigingen (sportclubs, studenten- en carnavalsverenigingen).

Belangrijkste uitgangspunten:
- **De server bepaalt altijd de score, de tijd en de ranglijst** — nooit de telefoon van een speler.
- **Een gemiste vraag door een lege batterij of wankele verbinding is normaal, geen fraude.** Spelers krijgen 60 seconden om opnieuw te verbinden voordat een vraag als onbeantwoord telt.
- **AI helpt de quizmaster, maar neemt nooit het laatste woord.** Door AI gegenereerde vragen, hints of media gaan pas live na goedkeuring door een quizmaster (zie de AI-verklaring).

Gemaakt door `[PLACEHOLDER — naam maker/organisatie]`. Vragen of feedback? `[PLACEHOLDER — contactadres]`.

*Bron: §1 (missie, doelgroepen), §3 (productprincipes), §14 (AI-beleid).*

---

#### A2. Privacybeleid

> **Titel:** Privacybeleid
> **Let op:** dit is een conceptstructuur op basis van wat elders in de spec al is vastgelegd (§16, §18). De juridische formulering en de exacte bewaartermijnen moeten nog worden vastgesteld — publiceer dit niet ongewijzigd.

**1. Wie is verantwoordelijk voor je gegevens**
`[PLACEHOLDER — juridische entiteit, KVK-nummer, vestigingsadres, contactgegevens verwerkingsverantwoordelijke]`

**2. Welke gegevens verzamelen we**
- **Accountgegevens:** je e-mailadres (bij registratie of magic link), wachtwoord (versleuteld) of gastnaam (bij gastmodus zonder account).
- **Profielgegevens:** weergavenaam, gekozen avatar, teamnaam/-badge (indien van toepassing).
- **Spelgegevens:** quizgeschiedenis, antwoorden per vraag, scores, ranglijstposities, prestaties per categorie, achievements.
- **Technische gegevens:** sessie-informatie nodig om je verbinding en antwoorden te kunnen toewijzen tijdens een live quiz, en — optioneel, als anti-cheat-maatregel — apparaatherkenning om dubbele deelname aan dezelfde quiz te detecteren.
- **Berichten:** wat je typt in de shoutbox of teamchat, als die functies actief zijn voor de quiz die je speelt.

We verzamelen bewust **geen** gegevens die niet nodig zijn om mee te spelen, te scoren of achteraf je eigen geschiedenis te kunnen laten zien.

**3. Waarom we deze gegevens gebruiken**
Om je te laten inloggen en deelnemen, om scores en ranglijsten eerlijk en server-side te kunnen bepalen, om je persoonlijke statistieken en geschiedenis te tonen, en om misbruik (dubbele deelname, gemanipuleerde antwoorden) te kunnen herkennen.

**4. Hoe lang we gegevens bewaren**
Bewaartermijnen voor quizdata, logs en statistieken zijn instelbaar door de beheerder van het platform. `[PLACEHOLDER — concrete standaardtermijnen per gegevenscategorie]`.

**5. Met wie we gegevens delen**
We delen geen gegevens met derden voor marketingdoeleinden. Gegevens kunnen wel verwerkt worden door partijen die de techniek achter PuntQuiz draaiend houden (hosting, e-mail voor magic links). `[PLACEHOLDER — lijst verwerkers/subverwerkers en waar de data staat]`.

**6. Jouw rechten**
Je kunt op elk moment:
- je eigen gegevens **inzien en exporteren**;
- je **account laten verwijderen**;
- je **consent- en privacyvoorkeuren** aanpassen in je accountinstellingen.

Vragen over je gegevens of een verzoek dat je niet zelf in je instellingen kunt regelen: `[PLACEHOLDER — privacycontact/e-mailadres]`.

**7. Wijzigingen in dit beleid**
We passen dit beleid aan wanneer het product verandert. Wijzigingen worden vermeld op de in-app Over-pagina (zie Deel C).

*Bron: §16 (auth/privacy/GDPR), §18 (datamodel — welke entiteiten persoonsgegevens bevatten), §12 (profielgegevens), §15 (apparaatherkenning als anti-cheat-maatregel).*

---

#### A3. Disclaimer

> **Titel:** Disclaimer

**Inhoud van vragen.** We doen ons best om vragen, antwoorden en toelichtingen correct te houden, maar kunnen niet garanderen dat elke vraag foutloos is — ook niet na goedkeuring door een quizmaster. Zie je een fout? Laat het ons weten via `[PLACEHOLDER — manier om een foute vraag te melden, zie ook §23 open gap "support channels"]`.

**Door AI gegenereerde content.** Sommige vragen, hints, afleiders of toelichtingen kunnen (deels) door AI zijn gegenereerd. Dit gebeurt nooit ongecontroleerd: een quizmaster keurt AI-gegenereerde content altijd goed voordat die live gaat. Ondanks die controle blijft de kans op een fout net als bij door mensen geschreven vragen aanwezig — zie ook onze AI-verklaring.

**Media van derden.** Vragen kunnen afbeeldingen, muziekfragmenten, video's of externe links bevatten die door de quizmaster zijn toegevoegd. De quizmaster is verantwoordelijk voor het rechtmatig gebruik van dat materiaal; PuntQuiz faciliteert het invoegen ervan maar controleert niet vooraf op auteursrecht.

**Beschikbaarheid.** PuntQuiz streeft naar een stabiele, realtime ervaring, maar kan — zoals elk live systeem — te maken krijgen met verbindingsproblemen of storingen. Presentatoren hebben de mogelijkheid om bij een storing terug te vallen op een uitprintbaar antwoordformulier (§4), maar we garanderen geen ononderbroken beschikbaarheid.

**Aansprakelijkheid.** Gebruik van PuntQuiz is voor eigen risico. `[PLACEHOLDER — formele aansprakelijkheidsbeperking, af te stemmen met jurist]`.

*Bron: §14 (AI-beleid, menselijke goedkeuring), §7 (media in vragen), §4 (papieren noodplan bij storing).*

---

#### A4. Algemene Spelregels ("Hoe werkt PuntQuiz")

> **Titel:** Spelregels
> Dit is de **platformbrede** versie: hoe PuntQuiz in het algemeen werkt. Dit is niet hetzelfde als de per-quiz spelregels-pagina die spelers in de lobby zien (§6) — die toont alleen de instellingen van de quiz die op dat moment gespeeld wordt (teammodus, teamgrootte, actieve scoringsregels, etc.). Deze pagina is de algemene laag eronder, en dubbelt tegelijk als de Speler-handleiding uit Deel B.

**Meedoen**
Je scant een QR-code, klikt op een uitnodigingslink of vult een roomcode in. Daarna log je in — als gast, met e-mail en wachtwoord, of via een magic link — en kies je (indien van toepassing) een team. Dat hele proces duurt normaal gesproken minder dan 15 seconden.

**Individueel of in een team**
Bij een individuele quiz speel je los; je score en ranglijstpositie zijn helemaal van jou. Bij een teamquiz log je nog steeds zelf in en beantwoord je zelf de vragen — je team-antwoord wordt bepaald door **meerderheid van stemmen** onder de teamleden die daadwerkelijk hebben geantwoord. Je hoeft dus niet te wachten tot iedereen in je team heeft geantwoord, en als een teamgenoot een keer niet antwoordt (lege batterij, geen zin, geen verbinding), telt de rest van het team gewoon door. Bij een gelijke stand binnen het team wint het antwoord dat het eerst is ingediend. Eenmaal gestart, kun je niet meer van team wisselen.

**Antwoorden**
Je mag je antwoord zo vaak veranderen als je wilt, zolang de vraag nog openstaat. Zodra de tijd om is of de presentator de vraag sluit, telt je laatste keuze. De klok en de score worden altijd door de server bepaald — nooit door je eigen telefoon.

**Verbinding kwijt?**
Geen paniek. Als je verbinding wegvalt, heb je 60 seconden om opnieuw te verbinden; je laatst ingediende antwoord blijft gewoon meetellen. Een gemiste vraag is een normale uitkomst, geen verdacht gedrag.

**Scores en ranglijst**
Na elke ronde (of, afhankelijk van de instelling van de quiz, na elke vraag) worden de antwoorden onthuld en de scores bijgewerkt. Sta je samen met iemand anders op de eerste plek? Dan blijven jullie allebei #1 — die wordt nooit kunstmatig uit elkaar getrokken.

**Power-ups**
Power-ups (zoals 50/50 of een dubbele-punten-boost) zitten nog niet in de huidige versie van PuntQuiz en worden in een latere update toegevoegd.

*Bron: §3 (fast join, server-authoritative), §5 (teammodus, meerderheid van stemmen, tie-break), §6 (gameplay-flow, antwoord-wijzigen), §8 (power-ups, nog niet in MVP), §15 (60-seconden-grace, gelijke standen).*

---

#### A5. AI-verklaring

> **Titel:** Hoe PuntQuiz AI gebruikt

We zijn open over waar en hoe we AI inzetten. Het uitgangspunt is simpel: **AI stelt voor, een mens beslist.** Niets dat door AI is gegenereerd gaat live zonder dat een quizmaster het heeft goedgekeurd.

**Waar we AI nu voor gebruiken (of gaan gebruiken):**
- Het genereren van vragen, hele quizzen, hints, afleiders (foute antwoordopties) en toelichtingen bij het juiste antwoord.
- Het balanceren van moeilijkheidsgraad binnen een ronde of quiz.
- Het genereren van afbeeldingen, audiofragmenten en avatar-varianten.

**Waar we AI mogelijk later voor gaan gebruiken:**
- Het (fuzzy-matchend) mee laten beoordelen van open antwoorden — ook dan blijft een menselijke goedkeuring vereist.
- Een AI-stem voor de quizmaster/presentator.

**Wat we niet doen:** AI-gegenereerde content automatisch en ongecontroleerd publiceren, of AI laten bepalen wie een quizvraag goed of fout heeft zonder dat een quizmaster dat proces heeft ingesteld en goedgekeurd.

Vragen over ons AI-gebruik? `[PLACEHOLDER — contactadres]`.

*Bron: §14 (AI-features, altijd menselijke goedkeuring).*

---

### Deel B — Rolhandleidingen

Drie rolgerichte handleidingen naast de per-quiz spelregels-pagina (§6), zoals gescoped in §29.

#### B1. Speler

De spelershandleiding **is** de Algemene Spelregels-pagina hierboven (A4) — §29 scoped deze expliciet als dezelfde inhoud, alleen bereikbaar vanuit twee plekken: als losse hulp-pagina in de app, en als platformbrede statische pagina. Geen aparte tekst nodig; wel twee ingangen (in-app "Hoe werkt dit?"-link, en de publieke Spelregels-pagina) die naar dezelfde content wijzen.

#### B2. Presentator — Host-controls referentie

> Dit is bewust **geen losse handleiding om te lezen**, maar korte, contextuele hulp die rechtstreeks op het presentator-dashboard verschijnt (tooltip/inline), omdat presentatoren live onder tijdsdruk werken. Onderstaande lijst is de brontekst voor die tooltips.

| Actie | Wat het doet | Wanneer gebruiken |
|---|---|---|
| **Quiz starten** | Zet de quiz van `scheduled` naar `live`, opent de lobby voor spelers. | Zodra genoeg spelers zijn ingelogd. |
| **Ronde openen** | Stuurt de eerste vraag van de ronde naar alle spelers; de timer start automatisch. | Bij het begin van elke ronde. |
| **Timer pauzeren/hervatten** | Bevriest of hervat de countdown voor de huidige vraag. | Bij een technisch probleem of een onderbreking die niets met de vraag te maken heeft. |
| **Vraag heropenen** | Zet een gesloten vraag weer open voor antwoorden. | Als een vraag per ongeluk te vroeg is gesloten. |
| **Vraag overslaan** | Slaat de huidige vraag over zonder scoring. | Bij een vraag die achteraf ongeschikt blijkt (fout, kapotte media). |
| **Vraag sluiten** | Sluit de vraag voor nieuwe antwoorden, ook al loopt de timer nog. | Als iedereen zichtbaar al heeft geantwoord. |
| **Antwoord onthullen** | Toont het juiste antwoord en berekent de scores. | Na het sluiten van een vraag of aan het eind van een ronde, afhankelijk van de reveal-instelling. |
| **Antwoord overschrijven** | Corrigeert handmatig een score of markeert een antwoord alsnog goed/fout. | Bij een dispuut of een fout in de vraagdata — wordt gelogd in het auditlog. |
| **Forceer onthulling** | Onthult het antwoord direct, ongeacht de timer. | Zelden nodig; noodgreep bij een vastgelopen sessie. |
| **Ronde beëindigen** | Sluit de huidige ronde af en toont de rondestand. | Na de laatste vraag van een ronde. |
| **Pauze tussen rondes starten/beëindigen** | Lichte, korte onderbreking (drankje/toiletpauze) tussen twee rondes. | Standaard tussen rondes in, niet bedoeld als noodstop. |
| **Hele quiz pauzeren/hervatten** | Volledige "bevries alles"-status van de sessie — zwaarder dan de rondepauze hierboven. | Bij een langere onderbreking of technisch incident dat de hele quiz raakt. |
| **Quiz beëindigen** | Sluit de quiz af, toont de eindstand. | Na de laatste ronde. |

*Bron: §6 (rondepauze vs. volledige pauze), §15 (volledige lijst host controls), §22 (pauze/hervatten hele quiz als MVP-scope).*

#### B3. Quizmaster — Handleiding contentopbouw

Quizzen bouwen gebeurt buiten live tijdsdruk, dus deze handleiding mag — anders dan de presentator-hulp — een volwaardig naslagwerk zijn.

**Een quiz opzetten**
Een standaardquiz bestaat uit 10 rondes van elk 10 vragen; dat is geen harde eis, maar wel wat spelers en presentatoren gewend zijn. Geef elke ronde een eigen thema (Sport, Algemene Kennis, Eten & Drinken, Muziek, …) — dat thema geldt voor de ronde als geheel, ook als een enkele vraag er net niet helemaal in past. Kies vooraf: individuele quiz of teamquiz; dat bepaalt welke teaminstellingen verderop zichtbaar zijn.

**Vraagtypen die nu beschikbaar zijn**
In de huidige versie kun je bouwen met **Meerkeuze** en **Multi-select**. Open Tekst en de overige types (Waar/Onwaar, Schatting, Marge, Numeriek, Volgorde, Koppelen) staan gepland voor een latere release en zijn nu nog niet bruikbaar in een live quiz.

**Muziekronde-scoring**
Een muziekvraag scoort artiest en titel **los van elkaar** — jij bepaalt de puntenverdeling per vraag of ronde (meestal 1+1, soms 0,5+0,5, afhankelijk van hoe muzikaal je publiek is). Je kunt daarnaast per vraag of ronde een jaartal-bonuspunt aanzetten. Punten mogen hierdoor decimalen bevatten — dat is bewust ondersteund, geen bug.

**Teaminstellingen (alleen bij een teamquiz)**
Een team moet minimaal 3 spelers hebben — kleiner dan dat werkt "meerderheid" niet meer als meerderheid. Je bepaalt zelf hoe spelers een team joinen (open, op uitnodiging, of na goedkeuring door een aanvoerder) en de teamantwoordmodus staat in deze versie vast op **meerderheid van stemmen**, met het eerst ingediende antwoord als tie-break bij een gelijke stand.

**Je vragenbank hergebruiken**
Elke vraag die je opslaat blijft in je vragenbank staan en kan in latere quizzen terugkomen. Bij elke vraag zie je hoe vaak en in welke quiz hij eerder is gebruikt (bijvoorbeeld "laatst gebruikt: Oudejaarsquiz, 31-12-2025 — 3× gebruikt totaal") — handig omdat je waarschijnlijk regelmatig voor hetzelfde vaste publiek staat.

**AI-hulp bij het maken van vragen**
Je kunt AI gebruiken om vragen, hints, afleiders of afbeeldingen te genereren. Niets daarvan gaat live totdat jij het hebt goedgekeurd — zie de AI-verklaring (A5) voor wat je aan spelers mag communiceren over AI-gebruik in jouw quiz.

*Bron: §5 (teaminstellingen), §6 (standaardformat, rondethema's), §7 (vraagtypen MVP, muziekscoring, fractionele punten), §14 (AI-hulp), §18 (vragenbank-hergebruik).*

---

### Deel C — In-app Over-pagina

> Bereikbaar vanuit instellingen/profiel of een footer-link, voor alle rollen.

**Inhoud:**
- **Versienummer** van de app (bijv. "PuntQuiz v0.4.0").
- **Changelog / release notes** in spelersvriendelijke taal, niet als ruwe commit-berichten. Voorbeeldformat:
  > **v0.4.0 — 3 september 2026**
  > - Nieuw: je kunt nu een avatar kiezen uit de "Lelijke Dieren"-set.
  > - Verbeterd: de ranglijst laat nu duidelijker zien waar jij staat.
  > - Opgelost: een vraag kon soms blijven hangen na een korte verbindingsstoring.
- **Links** naar de drie rolhandleidingen (Deel B) en naar de vijf wettelijke pagina's (Deel A).
- **Support/contact:** `[PLACEHOLDER — nog open, zie §23: "report a bad question, help, status page" is nog niet ingevuld]`.

**Nog open:** of releasenotes alleen in-app (achter login) staan, of ook als publieke "wat is er nieuw"-pagina op de marketingsite verschijnen — dat wacht op het platformbesluit uit §17.

*Bron: §29 (in-app About page).*

---

## Appendix B. Design-System Tokens Summary (§30)

*Condensed from the former `PuntQuiz - Design System.html`; colors were sampled from `assets/favicon/icon-512.png`, not re-guessed. The HTML remains the visual reference (component gallery, theme backgrounds, admin-shell template). Impeccable (§30) should be configured against these values.*

**Brand constants (identical in every theme and seasonal skin):** coral `#FF5A38`, cream `#FBF6EF`, gold `#FFC93C`.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FBF6EF` | `#1B120E` |
| `--surface` / `-2` / `-3` | `#FFFFFF` / `#F4ECE0` / `#EDE2D2` | `#241813` / `#2E1F18` / `#3A281F` |
| `--border` | `#E6D9C7` | `#41291E` |
| `--ink` / `--ink-muted` / `--ink-faint` | `#241512` / `#7A695F` / `#8C7A6E` | `#FAF3EA` / `#C9B6A9` / `#A6988D` |
| `--accent` / `--accent-strong` / `--accent-ink` | `#FF5A38` / `#E8471F` / `#FFFFFF` | `#FF6B4A` / `#FF8464` / `#241209` |
| `--accent-2` (gold) / ink | `#FFC93C` / `#241512` | same gold / `#241512` |
| success / bg | `#1C8F63` / `#E1F3EA` | `#3FC98C` / `#173328` |
| danger / bg | `#D93A5C` / `#FBE4E9` | `#FF7089` / `#3A1620` |
| info / bg | `#2E6BB8` / `#E4EDF9` | `#6FA4E8` / `#132538` |

**Typography:** display **Fredoka**, body **Manrope**, mono **IBM Plex Mono** (used for timers/numbers). **Radius:** sm 8px, md 14px, lg 20px, xl 28px. **Theme backgrounds:** the five §13 seasonal themes × light/dark, CSS-only gradients/patterns (no raster images), each verified with the "round number on a subtle shadow" contrast check. **Components in the gallery:** buttons, question card, timer, ranking board, avatar picker, plus a deliberately plainer admin shell (sidebar, stat cards, data table, form) for quizmaster/presenter/backend screens. Light/dark/system toggle is required everywhere (§26 accessibility, §16 WCAG 2.1 AA).

## Appendix C. Implementation Status (added 2026-11-14)

**Built (v0.1.0, MVP slice of §22), live at https://puntquiz.puntuale.nl** — monorepo `apps/api` (NestJS + Prisma + Socket.IO/Redis adapter), `apps/web` (Nuxt 4 SPA), `packages/contracts` (shared types), `docker-compose.yml` (Traefik, web, api, postgres, redis), `tests/e2e.mjs` (API E2E incl. majority vote, tie-break, grace period, pause, server timer, socket push), `scripts/deploy.sh`.

- **Working:** guest/e-mail+password auth (sliding 30-day cookie, guest→account upgrade), quiz editor (rounds, MC + Multi-Select, fractional points), publish + join code + QR, lobby with teams (min 3/max configurable, locked at start, host warning), live play with server-authoritative timer, answer changing, 60 s reconnect grace + client offline buffering, Majority Vote with earliest-final-answer tie-break, per-round (or per-question) reveal, standings counted only over revealed questions with shared ranks, halfway interim standings, inter-round break, whole-quiz pause/resume, per-quiz generated spelregels, light/dark/system theme from Appendix B tokens.
- **Question bank (added 2026-11-14, §18/§19):** `BankQuestion` per quizmaster (category, difficulty 1-3, tags, source, fractional points); quizzes use **snapshot copies** linked by `Question.bankQuestionId`, so editing the bank never changes a started quiz and reuse tracking is a query ("Laatst gebruikt: <quiz> (<date>) · n× gebruikt", drafts shown separately). Bank page with search/filter/"alleen ongebruikt", editor picker showing the same badges, "Bewaar in vragenbank". Import CSV (`,` or `;`, Dutch headers accepted), Excel and JSON with dry-run preview, row-level errors, duplicate skip (same normalised text); export CSV/Excel/JSON; quiz export/import JSON (`puntquiz.quiz.v1`). `correct` = 1-based option numbers (`2`, `1|3`) or option text. Fixture: `tests/fixtures/sample-bank.csv` (§25 #6; the archived question files themselves are no longer in the repo). Not yet: sharing banks between quizmasters, per-question stats, bulk edit, media.
- **Legal/help pages (added 2026-11-14, §29):** `/info/<slug>` (over-ons, privacy, disclaimer, spelregels, ai-verklaring, presentator, quizmaster) rendered from `apps/web/app/content/pages.ts`, linked from a site footer, `/about` (version, changelog, help, legal links), a "Hoe werkt dit?" link on the player screen and "Handleiding" on the host dashboard. **That TS file is now the working copy of Appendix A/B texts: keep the two in sync (or make the TS file canonical once the legal review is done).** Texts were adapted where the product differs from the concept (A2 now mentions SSO/social login and functional cookies only; B2/B3 list only host actions and features that exist, plus a "nog niet beschikbaar" list). Legal pages show a "Conceptversie — nog niet juridisch beoordeeld" banner and every `[PLACEHOLDER]` renders highlighted; **none are filled** (entity, KVK, address, contacts, retention periods, sub-processors, liability clause, support channel). Version bumped to 0.2.0.
- **E-mail (added 2026-11-14):** `MailService` (nodemailer over SMTP; configured only via `.env`: `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM`, `MAIL_DAILY_CAP` default 400; currently a Gmail account over SSL 465 — an app password, so rotate it there if it ever leaks). Mails: **welcome** (new account), **round results + current standings** (after the reveal of a round's last question; per-question correct answer, own answer ✓/✗, team answer in team quizzes) and **final standings + personal score** (when the quiz ends). Round/final mails are **opt-in per quiz** (lobby checkbox, off by default, accounts with an e-mail only; guests have none). Deduped via `MailLog` (re-reveals/overrides never re-send), sent sequentially, HTML-escaped, never to reserved test domains (`*.test`, `*.local`, `test.dev`, `example.*`) so `tests/e2e.mjs` sends nothing. Authentik uses the same SMTP for a new **password-recovery flow** (`puntquiz-recovery`, "wachtwoord vergeten" link; Authentik's own mail text is still the English default). Limits: consumer Gmail allows ~500 mails/day, so a busy night with many opted-in players would hit the cap — switch to a transactional provider (only the SMTP env changes) before large events; no unsubscribe link beyond the lobby checkbox yet.
- **Host actions (added 2026-11-14, §15):** reopen (closed, not yet revealed), skip (excluded from scoring/reveal), force reveal, and answer-key override with mandatory reason in the audit log (scores recompute). **CI (added):** `.github/workflows/ci.yml` — typecheck, unit tests, web build, `npm audit` (fails on critical; high advisories in Prisma CLI/Vite build tooling are reported only, and `npm audit fix` currently breaks the Nuxt toolchain), full-stack E2E; **never executed on GitHub yet** (no repo), no linter configured, Impeccable not configured.
- **Open questions + peer review (added 2026-11-14, §7, normally V1.5):** question type `OPEN` (accepted answers listed in `correct`; free-text input, autosaved, changeable until close). On reveal a **GRADING** phase runs first: exact normalised matches (case/accents/punctuation-insensitive) are auto-accepted; every other answer gets one random grader via a circular shuffle (so nobody grades their own answer) — a **team** in team quizzes (any member can submit, last verdict wins) or a **player** in individual quizzes; authors are anonymous; **Goed/Fout only**. In team quizzes the team answer is the majority over normalised text (earliest wording/tie-break as §5) and a member scores personally only if their own answer is the judged one. Reveal and standings wait until everything is graded (§6); the host sees all grades, can override any (reason logged, `host:grade`), and can close grading with items pending (they count as wrong, source `DEFAULT`, logged). With fewer than 2 candidates nobody can grade → host grades. Works in bank import/export (`type=OPEN`, `juist` = accepted answers separated by `|`), editor, e-mails. Tests: unit (assignment, normalisation, team text vote) + E2E scenario. Not yet: AI-assisted fuzzy matching, grader dispute/appeal window, per-grader workload balancing beyond the circular assignment, fractional partial credit.
- **Media + music questions (added 2026-11-14, §7, normally V1.5):** every question can carry up to 3 attachments: **image** or **audio** (upload to the `media` Docker volume via `POST /api/media`, or an https link) and **YouTube** (embedded via `youtube-nocookie.com`, sandboxed, with start/end seconds). Uploads are base64 JSON, type is **sniffed from the bytes** (PNG/JPEG/GIF/WebP, MP3/OGG/M4A/WAV; SVG/HTML refused), max 5 MB image / 10 MB audio, served with a fixed type, `nosniff` and a sandbox CSP; photos are downscaled to 1600 px in the browser. Each item has a "show/play on players' phones" flag: **audio defaults to presenter-only** (it plays on the venue speakers), images/video default to phones; audio becomes playable for everyone after the reveal. New question type **MUSIC**: accepted artists/titles (several allowed), optional year, **separate points per part (fractional, e.g. 0.5 + 0.5, +1 year bonus)**; matching ignores case/accents/punctuation/leading articles and tolerates 1 typo (6-10 chars) or 2 (11+); a team's answer is a per-part majority; players type artist/title/year (any subset), the reveal shows per-part ✓/✗ and points. Works in editor, bank (media + music settings; CSV columns `artiest/titel/jaar/…punten/media`, JSON round trip) and e-mails. Tests: unit (matching, scoring, YouTube parsing, URL/upload validation) + E2E (upload safety, visibility, scoring, bank). **Not built:** Spotify/audio-preview links, orphaned-upload cleanup, storage quotas, audio transcoding.
- **Power-ups (added 2026-11-14, §8, normally V2):** per quiz the quizmaster enables any of **50/50, Double Points (verdubbelaar), Double Down, Extra Time, Hint** and sets uses per type (1-3). **Ownership: individual quizzes = per player; team quizzes = pooled per team** (any member can activate, teammates see it, one shared stock). Rules (all server-side, `powerups.ts`): only while a question is open; one score booster per question; DOUBLE = x2 when right, nothing lost when wrong; DOUBLE_DOWN = x2 when right, a *submitted* wrong answer costs half the question's points (spec +20/-10), unanswered costs nothing; 50/50 only on MC with 3+ options, hides all but one wrong option (deterministic per owner+question, hidden options are rejected on submit); EXTRA_TIME = 15 s more for that owner only, valid when the timer (not the host) closed the question; HINT unlocks the question's hint text (hidden from players otherwise). Boosters change the **team score** in team quizzes (personal rows stay base points) and the personal score in individual quizzes; scores can go negative; the reveal shows the booster and the points it earned; host sees which power-ups were used on the current question; skipping a question refunds its power-ups. Works with MC/MULTI/OPEN/MUSIC scoring and is bank/export aware (hints). **Not built:** *Skip Question* (meaningless without answer streaks, which don't exist), per-round power-up configuration (quiz-level only), spending a member's *personal* stock inside a team, power-up usage in the post-quiz analytics (§12).
- **Printable answer forms (added 2026-11-14, §4/§15):** `/print/<quizId>` (host/admin only, linked from the host dashboard as "Formulieren printen"). Client-side, from the quiz + the lobby's team list: **one A4 sheet per team (or blank copy) per round** with prefilled team name, numbered questions (circles for MC, squares for multi-select, writing lines for open/music artist-title-year, points per question, images printed for picture rounds, a note where audio/video is on the screen), a score box, plus an optional **answer key** (presenter copy, includes explanations) and a **score sheet** (teams × rounds, shared first place note). Round selection, extra blank copies and image/key/score toggles; printing via the browser (`@page` A4, 12 mm margins, long rounds flow to a second page, app chrome hidden). The forms contain no answers. Paper has no majority vote: the manual tells the presenter to let a team fill in one answer. **Verified on screen only** (sheet layout, 12-page count, key and score pages); the browser's real print dialog / PDF output was not tested. **Advance printing (added):** reachable from the quiz list and the editor too (works for drafts, no lobby needed), typed team/player names, numbered extra copies, order per team (packet) or per round (hand out round by round), and an "Alles vooraf printen" shortcut (all rounds + key + score sheet). Not built: server-side PDF generation, QR codes on forms, entering paper results back into the app, per-player named forms in individual quizzes (blank name line instead).
- **Picture rounds (added 2026-11-14, §6/§7):** a round can be of kind `PICTURE` with `openRounds` 1-3. When play moves past it (i.e. when the next regular round starts) the **whole round appears at once as a sheet** under the live question (no per-question timer), every question answerable/changeable (MC, multi-select, open text, music) while the following `openRounds` rounds run; picture rounds are skipped by the question-by-question flow (`seq` = regular rounds only). It closes automatically when play moves beyond its last open round, or earlier via **Sluit nu**; the host reveals it with **Onthul** (`reveal_picture`) when the current question is closed: open answers go through the normal peer-review GRADING phase first (the usual Reveal button finishes it), then it is revealed, standings count it and the round mail goes out; the phase returns to where the main flow was so the interrupted question can still be revealed. **The quiz cannot finish while a picture round is unrevealed.** Rules: a picture round cannot be the last round, needs at least one question, `openRounds` 1-3; answers use the same endpoint (accepted while the sheet is open), the offline buffer keeps one pending answer per question; power-ups do not apply to picture questions; printable forms print them like any round. Tested in unit-free E2E (open timing, closing, blocking, grading, scoring, restore of flow) + browser. **Not built:** a per-picture countdown, per-question reveal inside a picture round, several picture rounds revealed in one go.
- **Lint + Impeccable (added 2026-11-14, §26/§30):** `npm run lint` (ESLint 9 flat config: typescript-eslint + eslint-plugin-vue; real-bug rules as errors, `any`/auto-import globals relaxed on purpose) is clean and a CI gate. **Impeccable** (`impeccable` 4.9.1 dev dependency; skills + agents installed project-scoped under `.claude/` **without the auto-running hook** and with telemetry off — run `npx impeccable install` again without `--no-hooks` if you want the hook; `npx impeccable detect apps/web/app` is a CI gate (exit 2 on findings), `npm run design` runs it locally; rendered-page scan `npx impeccable detect http://localhost:8088/<path>` is advisory in CI (never run on GitHub yet). `PRODUCT.md` + `DESIGN.md` are thin, derived inputs for Impeccable that point back to this Reference (do not edit them as a second spec); config in `.impeccable/config.json` (ignores: Arial on the print sheets, brand cream). First scan found and fixed: placeholder contrast (3.8:1), over-long line measure on text pages (`.prose` ≤ 60ch), a repeated "Inloggen" on the login card, straggler words (`text-wrap: pretty`), and **white-on-coral buttons at 3.1:1**. **Design deviation to review:** to meet WCAG AA the light theme now uses dark ink `#241512` on coral (5.6:1) instead of Appendix B's white `--accent-ink` (the dark theme already did); revert by setting `--accent-ink: #ffffff` in `main.css` if the brand must stay white (then buttons need ≥ 18.7px bold to pass as large text). Also added a real 404/error page. Not yet done (from `impeccable foundations`): a README that runs, a "no giant files" check (`live.service.ts` is large), social preview images, error tracking, current-dependency check, and only the public pages were scanned (logged-in surfaces need a session).
- **Legal placeholders filled (2026-11-14):** maker/controller = Ronald Punt, trading as Puntuale (www.ronaldpunt.nl), **no KVK number**; one contact address (ronald.punt@mac.com) for general, privacy, AI and wrong-question reports and for the support channel; processors named (Oracle Cloud server managed by Puntuale, Gmail/Google for e-mail, Authentik on the same server). **Still `[PLACEHOLDER]`:** postal address, default retention periods, the server's data-centre region, the liability limitation (lawyer). The "Conceptversie" banner stays until a legal review.
- **Data retention (added 2026-11-14, §16/§20):** `Quiz.finishedAt` is set when a quiz ends; `RetentionService` (first run 2 min after start, then daily; admin-only `POST /api/admin/retention/run` for a manual run; `RETENTION_DAYS`, default **90**) deletes, 90 days after the end: participations, answers, teams, grades, power-up uses and the audit log of that quiz, sets it to `ARCHIVED` and clears its Redis state; it also deletes audit/mail log rows older than 90 days and guest accounts with no remaining data. **Kept:** quiz content (rounds, questions, media), question banks, registered accounts (until deletion is requested). Verified locally with aged data (old quiz wiped and archived, recent quiz untouched, orphan guest and old log gone); the privacy text now states 90 days. **Gap:** the privacy text promises export/deletion of an account *on request by e-mail*; there are no self-service export/delete buttons, and deleting an account would also require removing the user in Authentik. Server region filled in: Oracle Cloud, Amsterdam. Placeholders still open: postal address, liability wording.
- **Hobby project (2026-11-14):** legal/help texts adapted: PuntQuiz is a non-commercial hobby project; the owner is a private person (no company, no KVK, no postal address published, contact by e-mail); the disclaimer is a plain "as is / own risk / no liability as far as the law allows" wording; marketing language about hospitality/companies removed from the About text; the banner now reads "Hobbyproject: in goed vertrouwen opgesteld en niet juridisch beoordeeld". **No `[PLACEHOLDER]` remains.** Still true: texts are not legally reviewed.
- **Home hero (added 2026-11-14, §30):** the start page now has a hero: headline, short promise, the join-code box and a flat SVG illustration of a friendly quizmaster **heron** (bow tie, "Wie weet het?" bubble, A/B/C answer chips) in the brand palette (`components/HeroArt.vue`, inline SVG so it works in light and dark and costs no request). Illustration-first stacking on phones. The heron is a first-pass drawing, not a final brand asset; no new icon assets were created (favicon set unchanged).
- **PWA / add to home screen (reworked 2026-11-14, §10/§17):** before this the PWA was manifest + icons only. Now: `public/sw.js` (registered in production by `plugins/pwa.client.ts`) makes the app installable and shows `public/offline.html` when a page load fails offline. **Safety rule: live data is never cached or intercepted** — `/api`, `/socket.io`, non-GET and cross-origin requests pass straight through (so no stale question, score or timer); pages are network-first; only content-hashed `/_nuxt/*` assets and the icons are cache-first; old caches are deleted on activate; `sw.js` is served `no-cache` so updates roll out. Manifest now has `id`, `scope`, `lang`, `categories` (icons 192/512, purpose `any`: no maskable variant, because new icon assets are not to be invented — Android will put the icon on a plate); iOS tags (`apple-mobile-web-app-capable/title/status-bar-style`) added; an install hint on the start page: real **install button** where the browser offers it (Chromium), a short **"Deel → Zet op beginscherm"** explanation on iOS Safari. Tested: worker rules in Node with mocked browser APIs (`tests/sw.test.mjs`, in CI). **Not built:** offline answering beyond the existing answer buffer (the app shell is not cached, so a cold offline start shows the offline page), push notifications, maskable icon.
- **Screenshot album on the rules page (2026-11-15):** `/info/spelregels` ends with a responsive photo album (`components/PhotoAlbum.vue`, captions in `pages/info/[slug].vue`) built from 13 phone screenshots in `public/spelregels/*.jpg` (question types, picture round, peer review, results, mid-way and final standings, presenter screen). They were generated from a local run of the test quiz with bots plus headless Chrome (not kept in the repo); regenerate when the player UI changes. Question and round categories are now a dropdown (`CategorySelect.vue`, presets + "Anders…"); printable forms carry the PuntQuiz logo.
- **Quizmaster checks open answers early (2026-11-15):** before, the review panel only appeared in the GRADING phase at the end of the round. Now grades are prepared as soon as an open question is closed (`gradingAdmin`, idempotent), so the presenter sees every open answer with ✓/✗ right under the question; a verdict by the quizmaster (`source HOST`) is never overwritten by peers and is not offered to peer graders; reopening a question deletes its grades so answers are judged afresh. Players still review the rest at round end.
- **Typecheck, Authentik texts, deploy fix (2026-11-15):** `apps/web/tsconfig.json` (project references to `.nuxt/*`) makes `npm run typecheck -w @puntquiz/web` work; three real type errors fixed; CI now runs it. Authentik: brand attribute `settings.locale: nl` (UI in Dutch; a few upstream strings such as the TOTP "Copy TOTP Config" button have no Dutch translation) and a Dutch recovery mail template `infra/authentik/templates/puntquiz_password_reset.html` (mounted at `/templates`). **Deploy bug fixed:** `scripts/deploy.sh` excluded every `*.html`, so `offline.html` never reached production (the SPA fallback answered instead, so the service worker cached the wrong page); the exclude is now root-only and the worker cache is `pq-v2`, so installed clients refetch.
- **E-mails in house style (2026-11-15):** all mails (welcome, round results, final standings in `apps/api/src/mail.templates.ts`; Authentik password recovery in `infra/authentik/templates/`) share one layout: logo + wordmark + tagline over a coral rule, cream page, white card, dark-ink button on coral (AA contrast), preheader text, mobile padding, `prefers-color-scheme: dark` styles, a footer that states why the mail was sent (welcome: account; others: opt-in) and a hobby-project note. Web fonts are not reliable in mail, so Arial stands in for Fredoka/Manrope. The logo is loaded from `<site>/icons/icon-192.png` (some clients block remote images until allowed; alt text is set). The one-off admin password mail was sent by a script and is not a template.
- **Language and roadmap (2026-11-15):** for now the whole project is Dutch (app, mails, README, CONTRIBUTING; code identifiers and comments stay English). On the roadmap, not built: multilingual UI/mails (language per player or per quiz) and custom styling/themes (colours and logo per quiz or organisation). The repo is public at github.com/rps2305/puntquiz under the MIT license; server address, SSH key and directory are kept out of it (`scripts/deploy.local.env`, `CLAUDE.local.md`, both gitignored).
- **UI:** theme switcher is an icon group (system / light / dark).
- **Identity (added 2026-11-14, §16):** Authentik 2025.12 (multi-arch, own Postgres, branded login via `infra/authentik/blueprints/puntquiz.yaml`) is the IdP. NestJS runs OIDC authorization-code + PKCE (`/api/auth/oidc/login|callback`, token exchange over the back channel), links users by `sub` then e-mail, upgrades a guest session in place, and maps Authentik group `puntquiz-admins` → admin. Staff (`puntquiz-staff` / `puntquiz-admins`) get **mandatory TOTP/WebAuthn enrolment**; players may enrol optionally; self-service sign-up flow included. Our own sliding 30-day cookie stays the app session. Production: `LOCAL_AUTH=false` (password endpoints disabled, guests still allowed), IdP at https://auth-puntquiz.puntuale.nl; bootstrap admin `akadmin`, password in the server `.env` (`AUTHENTIK_BOOTSTRAP_PASSWORD`). Locally: `auth.localhost:8088`, `akadmin` / `akadmin-dev`, local password auth still on.
- **Social login (wired 2026-11-14, awaiting credentials):** Google, Microsoft, GitHub and Facebook are defined as Authentik OAuth sources in the blueprint, bound to the login stage, and **disabled until their client id is present** in the server `.env`. Setup per provider: create an OAuth app there, set the redirect URI to `https://auth-puntquiz.puntuale.nl/source/oauth/callback/<slug>/` (`google`, `microsoft`, `github`, `facebook`), then add `PQ_<PROVIDER>_CLIENT_ID` and `PQ_<PROVIDER>_CLIENT_SECRET` to the server's `.env` and run `scripts/deploy.sh` (it force-applies the blueprint). Google: Cloud Console → Credentials → OAuth client (Web) + consent screen. Microsoft: Entra app registration, accounts "any organisation + personal", Web redirect, client secret. GitHub: Settings → Developer settings → OAuth Apps. Facebook: developers.facebook.com app with Facebook Login, app in Live mode. Account linking: Google/Microsoft (verified e-mail) link to an existing account with the same e-mail; GitHub/Facebook never auto-link (`email_deny`). Verified locally with dummy credentials only (button appears, redirects to the provider); no real provider login has been tested.
- **Still open for §16:** Sign in with Apple (not wired: needs an Apple Developer account, Services ID, key and a verified domain; Authentik's Apple source takes those instead of a plain secret), magic link and e-mail verification/password reset (need SMTP configured in Authentik), SSO logout (only our cookie is cleared; the Authentik session persists), ID-token signature validation (we trust the back-channel userinfo), Keycloak fallback untested.
- **Deviations / not yet built:** no Pinia (composables only); PWA is manifest + icons only (no service worker); Impeccable not configured; legal pages carry unfilled Appendix A placeholders. Presence/online count is per API instance.
- **Environments:** local = `docker compose up -d --build` → http://localhost:8088. Production = same compose file on the Oracle server (host, key and directory are kept out of the public repo, in the local `scripts/deploy.local.env`; Traefik bound to localhost only) behind a CloudPanel reverse-proxy site with Let's Encrypt; secrets only in the server-side `.env`.
