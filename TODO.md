# Bountystash Console — Development & Polish TODO

## 1. Multi-Language Support (Localization)
- [x] **German (Deutsch) Localization**:
  - [x] Add `data/portfolio.de.json` with German translations:
    - Profile title: *Leitender System- und Infrastrukturingenieur*
    - Subtitle: *Go • NixOS • Verteilte Systeme • Energie- und Quantitative Infrastruktur*
    - Sector titles: `00 KONSOLE`, `01 SYSTEME`, `02 ALGORITHMEN`, `03 KAPITAL 100M+$`, `04 FUNDAMENT`
    - Experience, telemetry labels, and bio descriptions in idiomatic German.
    - The stated level is B2, per the CV; do not upgrade it in copy.
- [x] **Language Switcher UI**:
  - [x] Add minimal HUD language toggle (`[EN | DE]`) in persistent top telemetry bar.
  - [x] Dual-artifact routing: `/` for English, `/de/` for German.
  - [x] Instantaneous static zero-FOUT rendering.
- [x] **14KB TCP Budget Maintenance**:
  - [x] Benchmark impact of bilingual strings on the 14KB TCP Envelope (< 14,336 bytes gzipped).
  - [x] Dual-artifact compilation implemented:
    - `/` (English: 13.37 KB gzipped — 650 bytes margin)
    - `/de/` (German: 13.21 KB gzipped — 813 bytes margin)

---

## 2. Final Touch-Ups & Visual Polish
- [x] **3D Spatial Depth Engine & Gestures**:
  - [x] Holographic parallax damping on desktop with hover-freeze protection for clicks.
  - [x] Touch gesture swipe mapping (swipe-to-depth up/down) for mobile devices.
  - [x] Retro CRT scanline filter toggle in HUD with persistent `localStorage`.
  - [x] Web Audio API procedural sound synthesizer (subtle sine clicks on navigation).
- [x] **Telemetry Visualizations (Right Pane)**:
  - [x] High-DPI inline SVG telemetry rendering across all 5 sectors.
  - [x] Gutach / Freiburg coordinates radar animation and solar diurnal yield curve.
  - [x] Dual-pane desktop and single-pane responsive mobile view.
- [x] **Accessibility & Fallbacks**:
  - [x] Semantic HTML sections, ARIA tags, and keyboard navigation (0-4, Arrows, PageUp/Down).
  - [x] Flat Document mode (`[ VIEW: FLAT DOC ]`) for natural linear reading and printing.

---

## 3. Deployment & CI/CD Pipeline
- [x] **Git Pre-Push Cloudflare Nudge Hook**:
  - [x] Interactive `pre-push` hook installed in `.git/hooks/pre-push`.
  - [x] Prompts operator via `gum confirm` to optionally deploy updated build to Cloudflare Pages preview.
  - [x] Non-blocking 15-second timeout fallback (auto-skips if unattended).
- [x] **Production Promotion Protocol**:
  - [x] Keep preview isolated at `https://preview.cv-resume-40q.pages.dev`.
  - [x] Production deployed 2026-11-12 (build `2d4d5b71`) — a Pages environment variable only reaches a new deployment, so setting `BOUNTYSTASH_API` required one.
  - [ ] Redeploy belongs to `task bountystash:deploy:prod`, not a hand-run wrangler command.


---

## 4. Backend

- [x] **Console backend (`cmd/console-api`)**:
  - [x] `POST /api/contact` stores the message before mailing it, so a Resend outage no longer loses the enquiry.
  - [x] `GET /api/status` and `GET /api/work` expose the engine's state and public work.
  - [x] Worker proxies to `BOUNTYSTASH_API` and falls back to the local Resend path.
  - [x] Point `BOUNTYSTASH_API` at a public origin — `https://api.bountystash.com`, a Cloudflare Tunnel from clanker — and prove it: the site's `/api/status` serves the backend's own JSON, and a posted enquiry landed a row in `console_messages`.
  - [x] Keep the fallback on purpose. clanker suspends when idle, so the tunnel drops; the form should still mail then instead of failing.
