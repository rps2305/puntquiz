# PuntQuiz

Real-time pub quiz platform: every player answers on their own phone, also in a team ("Elke speler telt, ook in een team"). A hobby project by Ronald Punt (Puntuale), live at https://puntquiz.puntuale.nl.

- **What and why:** `PuntQuiz - Consolidated Product Reference.md` is the one product/technical spec (roles, mechanics, scoring, architecture, implementation status in Appendix C).
- **Stack:** Nuxt 4 SPA (`apps/web`), NestJS 11 + Prisma + PostgreSQL + Redis + Socket.IO (`apps/api`), shared types (`packages/contracts`), Authentik for sign-in (`infra/authentik`), Traefik; everything runs as one Docker Compose stack.
- **Server-authoritative:** timers and scoring live on the server; sockets only say "refetch".

## Run it locally

```bash
docker compose up -d --build    # http://localhost:8088
npm test                        # unit tests
node tests/e2e.mjs              # API end-to-end test against the running stack
npm run lint && npm run typecheck
```

Local sign-in works with guest accounts and local password accounts; production uses Authentik (OIDC). Copy nothing secret into the repo: real settings live in `.env` (ignored), see `docker-compose.yml` for the variable names.

## Deploy

`scripts/deploy.sh` rsyncs the project to the server and runs `docker compose up`. It is specific to the author's server.

## Status

Working: quiz building and question bank, live play (individual and team), open answers with peer review, picture and music rounds, power-ups, printable answer forms, e-mail results, PWA. Not built yet: see Appendix C of the reference.

## License

[MIT](LICENSE) © 2026 Ronald Punt (Puntuale). The PuntQuiz name, logo and the avatar/landing artwork in `assets/` are part of the project but you are asked not to present them as your own service.
