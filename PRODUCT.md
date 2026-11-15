# PuntQuiz — product context (for Impeccable)

> Derived from `PuntQuiz - Consolidated Product Reference.md` (§1–§3, §10, §16, §26). The Reference is the only spec; edit it, not this file.

**What it is:** a live, mobile-first pub-quiz platform where *every player answers individually on their own phone, even inside a team* ("Elke speler telt, ook in een team"). A presenter runs the quiz from a laptop/projector.

**Users:** players in a café/pub (often one hand, dim light, noisy, weak wifi, mixed digital skill), quizmasters building quizzes at a desk, presenters working live under time pressure.

**Tone:** warm, playful, Dutch, informal ("je"), never corporate. Fun but never confusing: a missed question (dead battery) is normal, not an error.

**Principles that shape the UI:** fast join (<15 s), one-thumb operation, large tap targets, minimal typing, readable on a projector and in bright/dim rooms, server-authoritative (the UI never decides score or time), graceful offline.

**Constraints:** WCAG 2.1 AA, light + dark + system theme everywhere, works on weak networks, no required QR/camera, brand and design tokens are fixed (see DESIGN.md), Dutch UI.

**Anti-goals:** generic SaaS look, tiny text, colour-only feedback, anything that blocks a presenter mid-quiz.
