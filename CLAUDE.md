# Folio

Open-source, static link-in-bio page generator. `folio.config.yaml` in, plain HTML + CSS out. The full spec is [docs/VISION.md](docs/VISION.md); read it before starting a milestone.

## Principles (earlier wins on conflict)

1. **Owned, not rented.** Static output only. No Folio server, ever.
2. **One file to rule it.** All content comes from `folio.config.yaml`. Nothing on the page that isn't in the config.
3. **Fewer, better.** Few polished options beat many half-finished ones. Every option must justify itself.
4. **Fast by default.** Zero JS on the published page unless an enabled feature truly needs it.
5. **Private by default.** No cookies, no third-party trackers. Analytics opt-in only.

## Stack

Astro + TypeScript (strictest), plain CSS with custom properties as design tokens, Zod for config validation (+ generated JSON Schema), Satori + resvg for the share image, `qrcode` for QR, Vitest for unit tests, Playwright for render/screenshot tests, GitHub Actions for CI.

## Commands

- `npm run dev`: the user's link page at localhost:4321, reloads when `folio.config.yaml` changes
- `npm run site:dev`: Folio's own marketing site in `website/` (a separate Astro root; not shipped to users' pages)
- `npm run ci`: everything CI runs. Run before calling work done.
- `npm run schema`: regenerate `folio.schema.json` after changing `src/config/schema.ts` (a test fails if it's stale)
- `npm run budget`: fails if `dist/` contains any JS or HTML + CSS + JS exceeds 50 KB
- `npm run test:e2e`: builds the sample and `tests/fixtures/full.config.yaml` (every option on), runs Playwright and saves screenshots to `test-results/screenshots/`
- Lighthouse runs in CI only (`lighthouserc.json`, treosh/lighthouse-ci-action), and only in this repo: copies of the template skip the `browser` job

## Layout

- `src/config/`: Zod schema, YAML loader, friendly error formatting. Every error names the line, the block and the fix.
- `src/lib/`: pure helpers (socials, embeds, color, vcard), unit tested in `tests/lib.test.ts`.
- `src/components/`, `src/pages/`: the published page, plus `contact.vcf`, `sitemap.xml`, `robots.txt` routes.
- `website/`: Folio's homepage. Template copies may delete it, so CI and `npm run ci` skip it when absent.
- `docs/AI_PROMPT.md` is the single source of the AI prompt; the website reads it at build time.

## Releases and updates

- Version lives in `package.json`; notes in `CHANGELOG.md` (add to "Unreleased" as you go). Release = tag `vX.Y.Z` + GitHub release; see CONTRIBUTING.md.
- Copies update via `.github/workflows/update.yml` → `scripts/update-folio.sh`, which copies files from the latest release, never `folio.config.yaml`, `public/` or `.github/workflows/`. Breaking config changes need a major version and migration notes.

## Spec decisions made (2026-10-27)

- Themes are light / dark / auto plus an accent color; no separate "accent theme".
- At most one featured link (validated).
- No verified badge (cut under "Fewer, better").
- Embeds load with the page by default (owner's call, 2026-10-27). `embeds.loadOnTap: true` swaps in a srcdoc placeholder so no third-party requests happen until the visitor taps.
- Images resolve from `public/`; existence is checked case-sensitively at build time.
- Share button is opt-in (`footer.share`), the only inline script Folio can add, so pages stay 0 KB JS by default.
- `og.png`, `qr.png`, `qr.svg` need a public URL: `site.url`, else `hostUrl()` reads FOLIO_SITE_URL / VERCEL_PROJECT_PRODUCTION_URL / Netlify's URL.
- The share card font is Inter from `@fontsource/inter` (build-time only, never shipped to the page).
- The setup banner (`src/lib/links.ts`) shows while `profile.name` is still the sample name, links to the repo's GitHub editor from host env vars, and is suppressed on rickyqc/folio and with FOLIO_SETUP_BANNER=0. Changing the sample name means updating `SAMPLE_NAME`.
- Sample avatar is Noto Emoji artwork (Apache 2.0) as paths, so it renders identically everywhere, including resvg on Linux.

## Design language (summary; full table in VISION.md)

- System font stack; name 28px semibold, bio 17px, buttons 17px medium; headings ~-0.02em tracking.
- `#1d1d1f` on `#fbfbfd`, one accent used sparingly, dark mode mirrors. WCAG AA contrast.
- 8px grid; 12px between buttons, 32px between sections; single column, max 480px.
- Buttons full-width, 56px tall, 14px radius or pill, hairline border or subtle fill. No shadows or gradients.
- Motion 200–300ms ease-out, fade/rise on load, 0.98 press scale, nothing loops. Respect `prefers-reduced-motion`.
- Restraint, not imitation: no Apple logos, imagery or copied layouts.

## Quality bar

- Lighthouse 100 across the board; < 50 KB before images; 0 KB JS by default.
- WCAG 2.2 AA: keyboard nav, visible focus, alt text required in config.
- Invalid config fails the build with a message naming the field and the fix. Never ship a broken page.
- Unit tests for the schema and every generator; Playwright screenshots per theme × light/dark × phone/desktop.

## Working rules

- Build one milestone at a time (see Build order in VISION.md). Stop and show the result before starting the next.
- Write tests alongside code; config work is tests-first.
- Small commits with clear messages.
- Ask before adding any dependency not named in the spec.
- Don't use `client:*` directives or `<script>` tags in Astro components without an explicit, spec-backed reason.
