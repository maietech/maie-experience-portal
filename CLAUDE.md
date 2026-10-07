# CLAUDE.md — maie-experience-portal

Repo-specific guidance. Ecosystem-wide rules (secrets, git authority,
production boundary) are in the sibling `MAIE_Framework_2.0/CLAUDE.md`
(§0, §7–§9).

## What this is

The **MAIE Product Experience Hub** at `portal.joinmaie.com`: static,
hand-written HTML/CSS/JS demo modules. They are presentational only. They
don't call the MAIE API; they link to `app.joinmaie.com/signup` and the
other `joinmaie.com` sites.

| Path | Module |
|---|---|
| `index.html` | Hub: navigation and links to each module |
| `pitch/` | Pitch deck experience |
| `dashboard/` | Dashboard cockpit demo |
| `experience-module/` | Chapter/scene product walkthrough |
| `pixie/`, `pixie-framework/` | Pixie companion demos |
| `assets/` | Shared engine: `maie-scene-engine.js`, `maie-chapters.js`, `maie-chapter-renderer.js`, `maie-pixie.js`, `pixie-companion.js`, design tokens in `maie-tokens.css` |

Pixie and scene code is shared in spirit with `joinmaie-landing`. When
you change shared behavior, check whether the landing site has the same
code, and whether its `CLAUDE.md` §8 (Pixie rules) applies.

## Run locally

No build step. `python3 -m http.server 8080` from the repo root →
`http://localhost:8080`. `package.json` only holds Playwright/axe dev
tools for ad hoc audits (`npm ci`, then `npx playwright install
chromium`). There is no test suite.

## Boundaries

- `portal.joinmaie.com` is served by the **Cloudflare Pages** project
  `maie-experience-portal`. It deploys automatically from `main`, and
  each PR gets a preview as a "Cloudflare Pages" check, so merging to
  `main` publishes. The legacy GitHub Pages copy at
  `maietech.github.io/maie-experience-portal/` was **disabled
  2026-10-07** (`.nojekyll` is a leftover from it). Canonical URLs
  must point at `portal.joinmaie.com`.
- Git: per-action authority (Framework §7). Recent practice is short
  feature branches merged by PR.
- Mobile layout has regressed before (header overflow, sticky companion).
  Check narrow viewports after any nav, header or companion change.
