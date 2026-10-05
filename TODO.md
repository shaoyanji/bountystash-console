# Bountystash Console — Development & Polish TODO

## 1. Multi-Language Support (Localization)
- [ ] **German (Deutsch) Localization**:
  - [ ] Add `data/portfolio.de.json` with German translations:
    - Profile title: *Leitender System- und Infrastrukturingenieur*
    - Subtitle: *Go • NixOS • Verteilte Systeme • Energie- und Quantitative Infrastruktur*
    - Sector titles:
      - `00 KONSOLE` (Console)
      - `01 SYSTEME` (Systems)
      - `02 ALGORITHMEN` (Algorithms)
      - `03 KAPITAL $100M+` (Capital)
      - `04 FUNDAMENT` (Foundation)
    - Experience, telemetry labels, and bio descriptions in native/fluent C1 German.
- [ ] **Language Switcher UI**:
  - [ ] Add minimal HUD language toggle (`[EN | DE]`) in persistent top telemetry bar.
  - [ ] Store language preference in `localStorage` (`bountystash_lang: "en" | "de"`).
  - [ ] Ensure instantaneous switching without page reload or FOUT.
- [ ] **14KB TCP Budget Maintenance**:
  - [ ] Benchmark impact of bilingual strings on the 14KB TCP Envelope (< 14,336 bytes gzipped).
  - [ ] If combined `index.html` exceeds 14KB, implement dual-artifact compilation:
    - `/` (English, default, 13.5KB)
    - `/de/` (German, 13.5KB)
    - Or separate lightweight dynamic JSON payload fetch.

---

## 2. Final Touch-Ups & Visual Polish
- [ ] **3D Spatial Depth Engine**:
  - [ ] Tune cursor holographic parallax damping on desktop for ultra-smooth responsiveness.
  - [ ] Add subtle touch gesture mapping (swipe-to-depth / pinch-zoom) for mobile devices.
- [ ] **Telemetry Visualizations (Right Pane)**:
  - [ ] Fine-tune SVG telemetry rendering on retina/high-DPI displays.
  - [ ] Verify Gutach / Freiburg coordinates radar animation and solar yield curve fidelity.
  - [ ] Test Flat Doc scroll synchronization on Firefox, WebKit, and Chromium.
- [ ] **Accessibility & Fallbacks**:
  - [ ] Verify screen-reader accessibility for semantic HTML sections.
  - [ ] Validate no-JS graceful degradation to pure static document.

---

## 3. Deployment & CI/CD Pipeline
- [ ] **Git Pre-Push Cloudflare Nudge Hook**:
  - [ ] Install interactive `pre-push` hook in `.git/hooks/pre-push`.
  - [ ] Prompt operator via `gum confirm` to optionally deploy updated build to Cloudflare Pages preview.
  - [ ] Ensure non-blocking timeout fallback (auto-skips if unattended).
- [ ] **Production Promotion Protocol**:
  - [ ] Keep preview isolated at `https://preview.cv-resume-40q.pages.dev`.
  - [ ] Do **NOT** promote to `bountystash.com` until multi-language and final touch-ups are approved.
  - [ ] Final promotion command: `task bountystash:deploy:prod`.
