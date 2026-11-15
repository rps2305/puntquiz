# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

This directory holds the planning material **and, since 2026-11-14, the first implementation** of **PuntQuiz** (monorepo: `apps/api` NestJS, `apps/web` Nuxt 4, `packages/contracts`, `docker-compose.yml`). There is still no git repository here. Status, deviations and what is not built yet: Reference **Appendix C**.

Commands: `docker compose up -d --build` (local stack → http://localhost:8088), `npm test` (unit), `node tests/e2e.mjs [baseUrl]` (API E2E; against production it leaves test data and makes the first account admin, so wipe it afterwards or use localhost), `scripts/deploy.sh` (production; needs `scripts/deploy.local.env`), `npm run lint`, `npm run design` (Impeccable detector; `PRODUCT.md`/`DESIGN.md` are thin Impeccable inputs derived from the Reference). **Production**: https://puntquiz.puntuale.nl on the Oracle server behind a reverse proxy with Let's Encrypt, secrets only in the server `.env`. Server address, SSH key and stack directory are deliberately NOT in this public repo: they live in the gitignored `scripts/deploy.local.env` and `CLAUDE.local.md`. Identity = Authentik (https://auth-puntquiz.puntuale.nl; local http://auth.localhost:8088), see Reference Appendix C. Always verify container state yourself (see below).

## Files in this directory

- **`PuntQuiz - Consolidated Product Reference.md`** — the **only** proposal/spec document, by the user's explicit choice (2026-11-14). Organized §1–§30 (mission, roles, quiz/team mechanics, gameplay, scoring, auth §16, architecture §17, data model, roadmap, open questions, NFRs, legal/help pages §29, brand/design §30). **Read and edit this for every product/technical decision; never fork new parallel drafts, notes files or previews** — fold new input straight into it.
- **`assets/`** — kept deliberately: `favicon/` (final, approved icon set from the adopted logo mark, §30 — don't regenerate or invent icons; wire in these files and the PWA 192/512 sizes), `avatars/` (the "Ugly Animals" avatar sources) and `landing/` (landing-page mockup source): `.dc.html` artboards + `canvas.json` for Claude Design's canvas editor.
- **Files restored/added to this folder by the user on 2026-11-14** (after an earlier clean-out; the Consolidated Reference remains the one spec — these are supporting material, not parallel specs):
  - **`PuntQuiz - Design System.html`** (~357 KB) — tokens now summarized in Reference Appendix B (canonical for values; this file stays the visual/component gallery). Self-contained design-system reference: brand/logo, color system, theme backgrounds, typography, spacing/radius, component gallery, "in context" view and a plainer backend/admin template. Component gallery/visual reference (§30); token values are in Reference Appendix B; what Impeccable should be configured against.
  - **`PuntQuiz - Landing Page Mockup.html`** (~22 KB) — static marketing landing mockup (hero "Elke speler telt," features, 4-step flow, "app per team" comparison, pricing tiers, CTA). Copy grounded in §1–§3/§21; no invented testimonials or prices.
  - **`PuntQuiz - Ugly Animals Avatars.html`** (~34 KB) — avatar preset pack: sloth, frog, skunk, chicken, naked mole-rat, warthog, opossum, pug (§12). First pass; avatar deliverable still open in §30.
  - The legal/help draft files were moved to the macOS Trash on 2026-11-14 after being consolidated into Reference Appendix A (canonical; `[PLACEHOLDER]`s stay unfilled until the user supplies real facts). The preview HTML is gone — regenerate from Appendix A if ever needed.
  - **`open source alternatives.md`** — research note on QuizDock/ClassQuiz/Fuiz/Claper (untested). Its useful ideas are already folded into §25 #8–9 and §27 of the Reference; treat the file as a source trail.
- All HTML files should declare `<meta charset="UTF-8">` or opening via `file://` mis-decodes Dutch accents/em dashes.

## Key product decisions to know when reasoning about this project

These recur across the Consolidated Reference and matter for consistency if asked to draft specs, code, or further planning:

- **Every player logs in individually, even in team mode** — the core differentiator vs. one-phone-per-team pub quiz apps ("Elke speler telt, ook in een team"). Team score is an aggregation over individual participations, not a separate model — see `Quiz → Participation → (User, Team nullable)`, §18.
- **Server-authoritative scoring and timers** — never trust client-side timers or client-submitted scores (§3, §15).
- **MVP team answer mode is Majority Vote only**; tie-break is "earliest submitted answer among tied options" (§5). Captain, Consensus, Expert, and Trust-Your-Expert modes are explicitly deferred to V3.
- **Open-answer grading is resolved (§7, adopted in §25 #1–2)**: objectively-checkable types (MC, Multi-Select, True/False, Numeric, Margin) are auto-scored server-side; peer-review grading (teams grade another team's open-text answer, right/wrong only) is reserved for genuinely open-text questions and ships in V1.5, not MVP.
- **MVP stack** (§17): Nuxt 4/Vue 3/TypeScript/PWA frontend (Pinia), NestJS backend (REST + Socket.IO WebSocket gateway with Redis adapter), PostgreSQL via Prisma, Redis for live state/pub-sub. A monorepo (Turborepo or Nx) with a shared `contracts` package enforces API-contract stability (§26) between frontend and backend.
- **Everything runs as one Docker Compose stack** (§17): Nuxt frontend, NestJS backend, PostgreSQL, Redis, and Traefik each as their own service/container, brought up together per environment (dev/staging/prod). This is the concrete mechanism behind the platform-agnosticism NFR (§26) — the containers, not the host, define the runtime. **Once any of this exists, always verify container state yourself** rather than assuming from docs or prior sessions — see "Verifying implementation state" below.
- **Drupal is ruled out entirely for the live engine** — never for live quiz state, WebSocket handling, timer logic, or scoring (§17). The marketing-site platform is still an open choice, but it's a separate surface from the Nuxt/NestJS live app regardless of which one is picked.
- **AI assists, never replaces human review** — AI-generated questions/hints/distractors always require quizmaster approval before going live (§14).
- **Design system is Impeccable** (§30, https://github.com/pbakaus/impeccable) — the agreed tool for enforcing the documented style guide (palette per theme, typography scale, shared component library) consistently across the Nuxt frontend *and* any backend-rendered surfaces (NestJS admin/quizmaster screens, presenter dashboard, transactional emails). Once frontend/backend code exists, new UI work should conform to this design system rather than improvising ad hoc styling — flag it rather than silently diverging if a design requirement isn't yet covered by the style guide.
- **Favicon/app-icon set is final and already produced** (§30) — see `assets/favicon/` above. Don't invent new icon assets; wire in the existing ones (and the PWA manifest sizes, 192/512) when frontend scaffolding happens.

## Verifying implementation state

Once this project moves from docs to code, this directory (or wherever the resulting monorepo lives) will contain a Docker Compose stack with frontend, backend, database, cache, and reverse-proxy containers (§17). At that point:

- **Never take a container's or a webapp's status on faith from docs, memory, or a prior session** — check it yourself with `docker ps` / `docker compose ps` (and the equivalent logs/health endpoints) before reporting something as running, broken, or fixed.
- **Check all entries**, not just the one you touched — a change to one service (e.g. the backend) can silently break another (e.g. the frontend's API calls, or Traefik's routing) in a multi-container stack.
- This is especially true for the webapps (Nuxt frontend, NestJS backend) since they're the services most likely to be mid-iteration and least likely to fail loudly at the container level (a container can show "Up" while the app inside it is erroring).
- As of 2026-11-14 the stack exists locally and on the Oracle server; re-check with `docker compose ps` rather than trusting this line.
