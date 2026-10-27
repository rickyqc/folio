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

## Layout

- `src/config/`: Zod schema, YAML loader, friendly error formatting. Every error names the line, the block and the fix.
- `src/lib/`: pure helpers (socials, embeds, color, vcard), unit tested in `tests/lib.test.ts`.
- `src/components/`, `src/pages/`: the published page, plus `contact.vcf`, `sitemap.xml`, `robots.txt` routes.
- `website/`: Folio's homepage. Template copies may delete it, so CI and `npm run ci` skip it when absent.
- `docs/AI_PROMPT.md` is the single source of the AI prompt; the website reads it at build time.

## Spec decisions made (2026-10-27)

- Themes are light / dark / auto plus an accent color; no separate "accent theme".
- At most one featured link (validated).
- No verified badge (cut under "Fewer, better").
- Embeds load on tap via a srcdoc placeholder: no third-party requests or JS until the visitor opts in.
- Images resolve from `public/`; existence is checked case-sensitively at build time.
- Share button, share image (Satori) and QR code are not built yet.

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
