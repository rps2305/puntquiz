# Contributing to PuntQuiz

Thanks for looking. PuntQuiz is a small hobby project run by one person, so please keep expectations modest: replies and merges may take a while, and some ideas will be politely declined to keep the project focused. Issues and pull requests are welcome, in English or Dutch.

## Before you start

- **Open an issue first** for anything bigger than a small fix, so we can agree on the approach before you spend time on it.
- Check the spec, `PuntQuiz - Consolidated Product Reference.md`, and its Appendix C (what is built, deviations, ideas not built). Many decisions are written down there, for example: team answers are a majority vote, scoring and timers are server-authoritative, and AI-generated content always needs human approval.
- The interface is Dutch. Keep user-facing texts Dutch, and code, comments and docs English.

## Set up

```bash
docker compose up -d --build     # http://localhost:8088
npm ci
```

See the README for the full list of commands.

## Before you open a pull request

Run all of these; CI runs them too.

```bash
npm run lint
npm run typecheck
npm test
node tests/e2e.mjs               # against your local stack only, never a real server
node tests/sw.test.mjs
npm run design                   # Impeccable design checks (web sources)
```

Also:

- **Rebuild and look at it.** `docker compose up -d --build` fails quietly on frontend build errors, so check the build output and use the UI. A running container does not mean the app works.
- **Add or update tests** for logic changes. Live-game rules (scoring, grading, state transitions) belong in the unit tests and in `tests/e2e.mjs`.
- **Keep the shared types in `packages/contracts` in sync** when an API response changes.
- **Database changes** need a Prisma migration. Migrations run automatically when the api container starts.

## Design

The design system is Impeccable (tokens in `apps/web/app/assets/css/main.css`, written down in Appendix B of the spec, `PRODUCT.md` and `DESIGN.md`). Use the existing tokens and components instead of ad hoc styling, keep text contrast at WCAG AA and touch targets comfortable on a phone, and check dark mode. If a design need is not covered, say so in the pull request instead of quietly diverging. The favicon and app icon set in `assets/favicon` is final: use it, do not generate new icons.

## Pull requests

- One focused change per pull request, with a short description of what and why.
- Small, readable commits with clear messages.
- Do not include secrets, personal data or server details. Real settings live in `.env` and `scripts/deploy.local.env`, which are ignored by git.
- By contributing you agree that your contribution is released under the [MIT license](LICENSE).

## Security

Please do not report security problems in a public issue. E-mail ronald.punt@mac.com instead, with enough detail to reproduce. This is a hobby project, so there is no bug bounty and no guaranteed response time, but reports are taken seriously.

## Conduct

Be kind and assume good faith. Harassment and personal attacks are not welcome and will be removed.
