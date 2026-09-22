# Bountystash Console (`bountystash-console`)

> Modern Brutalist, 3D Spatial Systems Console & Interactive Workstation for **Matt Ji** (`shaoyanji`). Built from scratch with zero framework dependencies, adhering strictly to the **14KB Initial TCP Window Rule** (< 14KB gzipped).

![Status](https://img.shields.io/badge/status-active-00ff66?style=flat-square)
![TCP Budget](https://img.shields.io/badge/14KB%20TCP%20Window-PASS%20(13.54KB)-1f69ff?style=flat-square)
![Dependencies](https://img.shields.io/badge/dependencies-0-00ff66?style=flat-square)
![WebGL Bloat](https://img.shields.io/badge/WebGL-0KB-blueviolet?style=flat-square)

---

## ⚡ Architectural Highlights

- **3D Spatial Depth Camera**: Navigates along the Z-axis through 5 discrete depth planes (`00 CONSOLE` → `01 SYSTEMS` → `02 ALGORITHMS` → `03 CAPITAL $100M+` → `04 FOUNDATION`) using hardware-accelerated CSS `transform-style: preserve-3d` with subtle cursor holographic parallax.
- **Cyber Visual Telemetry Inspector (Right Pane)**: A persistent diagnostic sidebar featuring reactive inline SVG telemetry diagrams that dynamically adapt to the sector in view:
  - **Sector 00 (Console)**: Animated radar grid & Gutach (DE) geolocation beacon
  - **Sector 01 (Systems)**: Deterministic Go ledger intake & multi-host NixOS mesh
  - **Sector 02 (Algorithms)**: FSVM Fibonacci oscilloscope waveform & adjacency width matrix
  - **Sector 03 (Scale)**: Diurnal solar yield curve & bank-audited $100M+ valuation envelope
  - **Sector 04 (Foundation)**: Golden ratio spiral ($\phi = 1.61803$) & Mines / Freiburg credentials
- **Dual-Mode Engine (3D HUD ↔ Flat Doc)**:
  - **3D HUD Mode**: Interactive spatial zoom engine with cursor parallax and depth-stacked plane management.
  - **Flat Doc Mode**: Keeps the right Inspector pane completely fixed while enabling smooth, independent vertical scrolling on the left document pane with a custom brutalist scrollbar. The left pane's scroll position dynamically drives the right pane's telemetry in real time.
- **Strict 14KB First-Packet TCP Rule**: Critical HTML + minified CSS inlines into a self-contained, zero-roundtrip delivery packet of **~13.54 KB gzipped** (well under the 14,336-byte limit).
- **Modern Brutalist Aesthetics**: Laser cobalt accents (`#1F69FF` / `#4F8EFF`), high-contrast typography, persistent telemetry HUD headers/footers, and instantaneous Dark/Light theme switching with anti-FOUT local state persistence.

---

## 🛠 Project Structure

```
.
├── data/
│   └── portfolio.json       # Canonical structured profile data
├── dist/
│   ├── index.html           # Inlined, production-ready artifact (< 14KB gzipped)
│   └── style.css            # Standalone stylesheet
├── scripts/
│   └── build.js             # Zero-dependency compiler & gzip budget validator
├── src/
│   ├── style.css            # Modern brutalist CSS (< 6KB minified)
│   └── template.html        # Semantic HTML5 shell with inline SVG diagrams & 3D engine
└── package.json
```

---

## 🚀 Development & Build

```bash
# Compile and validate 14KB TCP budget
node scripts/build.js

# Launch local preview server (http://localhost:3000)
npm run preview
```

---

## 👤 Author

**Matt Ji** (`shaoyanji`)  
Founder, [Bountystash](https://bountystash.com) · Senior Systems & Infrastructure Engineer  
- GitHub: [@shaoyanji](https://github.com/shaoyanji)  
- Email: [matt@bountystash.com](mailto:matt@bountystash.com)
