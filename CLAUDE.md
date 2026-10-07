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

## Protected factual constraints (founder-approved 2026-10-07)

**Don't let the website outrun the product.** These apply to every public
surface: page copy, metadata and structured data, social cards, alt text,
and README text the site serves.

- **Never state or imply universal fingerprinting or guaranteed duplicate
  prevention.** That rules out "every file is fingerprinted", "SHA-256
  protects every upload", "duplicates can never slip through", or any
  equally strong rewording. A reworded claim is the same violation, so
  don't restore removed claims in new words.
  - **The facts** (verified against `MAIE_Framework_2.0` source,
    2026-10-07): a SHA-256 checksum is recorded only for **marketplace
    assets uploaded as files**. User-uploaded media gets no content hash.
    Duplicate detection is **heuristic**: client-side, images only,
    flagging *likely* duplicates.
  - **Evidence:**
    `MAIE_Framework_2.0/findings-and-fixes/MAIE_PRODUCT_CLAIMS_VS_IMPLEMENTATION_FINDINGS_10-07-2026.md`.
- **Product reality gate.** Write a capability in the present tense only
  if it can be demonstrated in the current product. If only part of it
  works, describe that part and qualify the rest. If none of it works,
  either omit it or label it clearly as direction or roadmap. Never bridge
  the gap silently.
- **Pricing** appears only if it matches a plan that is actually
  purchasable right now, verified against live billing. Roadmap or
  non-purchasable tiers are never shown as current.
- **No relationship claims** (partner, customer, endorsement, adoption)
  without verified evidence. Organizations mentioned in market research
  are research or outreach targets, not partners.
