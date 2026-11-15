# PuntQuiz — design system (for Impeccable)

> Canonical values: Reference **Appendix B** and `PuntQuiz - Design System.html`. Implemented in `apps/web/app/assets/css/main.css`. Change tokens there, not here.

**Brand constants:** coral `#FF5A38`, cream `#FBF6EF`, gold `#FFC93C` (cream is intentional, not a default palette).
**Themes:** light / dark / system via `data-theme` on `<html>`; every colour is a CSS variable (`--bg --surface --ink --accent …`).
**Type:** display **Fredoka**, body **Manrope**, mono **IBM Plex Mono** (timers, codes, scores). Body 17px; prose measure ≤ 60ch.
**Shape:** radius 8 / 14 / 20 / 28 px. Buttons ≥ 48px tall (36px for `.small`), options ≥ 60px.
**Accessibility rules:** text ≥ 4.5:1 (large ≥ 3:1) in both themes, visible focus ring (gold), feedback never by colour alone (✓/✗ + text), reduced motion respected, tap targets ≥ 44px.
**Known deviation:** in the light theme `--accent-ink` is dark ink (`#241512`) instead of white, because white on coral is 3.1:1 (fails AA). Dark theme already did this.
**Components:** buttons (primary coral / ghost / gold / danger), question card, answer option (radio/checkbox look), timer, ranking board (own row highlighted), pills, banners, print sheets (paper: black on white, Arial on purpose).
**Surfaces:** player (phone), presenter dashboard (laptop/projector), quizmaster editor + question bank, info/legal pages, print sheets.
