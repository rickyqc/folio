# Folio — Product Vision

Oct 27, 2026 · @Ricky

## Vision

**Your links. Your page. Your domain. Free forever.**

Folio is an open-source link-in-bio page you own outright. You edit one config file, push to GitHub, and get a fast, beautiful page on your own domain in under five minutes. No account, no database, no monthly fee, no tracking unless you turn it on.

The page itself should feel like a product launch page: generous whitespace, confident type, one clear action per row, and nothing that doesn't earn its place.

_"Folio" is a working name. Check npm and GitHub for conflicts before you commit to it._

## Problem and audience

Hosted link-in-bio tools lock the best features (custom domains, themes, analytics, removing their logo) behind a subscription, and your page lives on their URL. If they change pricing or shut down, your link breaks everywhere you posted it.

Folio is for:

- **Creators and freelancers** who want a polished page on their own domain without paying monthly.
- **Developers** who want a personal hub they can version, fork and customize.
- **Small businesses and events** that need one shareable link for menus, tickets, socials and contact info.

The bar: someone who has never used GitHub can follow the README and have a live page in 5 minutes.

## Product principles

Every decision gets checked against these five. When two conflict, the earlier one wins.

1. **Owned, not rented.** Static files on your host and your domain. No Folio server, ever.
2. **One file to rule it.** All content lives in a single `folio.config.yaml`. If it isn't in the config, it isn't on the page.
3. **Fewer, better.** Ship a handful of polished themes and blocks, not dozens of half-finished ones. Every option must justify itself.
4. **Fast by default.** Zero JavaScript on the published page unless a feature truly needs it. Loads instantly on a phone on bad signal.
5. **Private by default.** No cookies, no third-party trackers. Analytics are opt-in and privacy-friendly.

## v1 scope

v1 ships a complete, beautiful page from a config file, with one-click deploy. Everything below is in.

**Page content**

- Profile: avatar, name, one-line bio, optional location and verified-style badge (cosmetic only).
- Links: title, URL, optional subtitle, optional icon, optional "featured" style for the one link that matters most.
- Social row: icons for common platforms (Instagram, X, TikTok, YouTube, GitHub, LinkedIn, email, and more), drawn from the CC0 Simple Icons set.
- Section headers to group links ("Listen", "Shop", "Work with me").
- Embeds, limited to three: YouTube video, Spotify track or playlist, and an image card.

**Look and feel**

- 4 themes at launch: Light, Dark, Auto (follows the device), and one accent theme.
- Accent color and button shape (rounded or pill) set in config.
- Subtle, purposeful motion: soft fade-in on load, gentle press state. Respects reduced-motion settings.

**Sharing and reach**

- Auto-generated social preview image (the card shown when the link is shared on iMessage, X, Slack).
- QR code for the page, downloadable as SVG and PNG.
- "Save contact" button that downloads a vCard.
- SEO basics: title, description, canonical URL, sitemap.

**Setup**

- GitHub template repo ("Use this template").
- Deploy buttons for Vercel and Netlify, plus a GitHub Pages workflow.
- Custom domain instructions for each host.
- Config validation with friendly error messages ("Link #3 is missing a url").
- Optional, opt-in analytics via Plausible or Umami.

## Non-goals for v1

- No hosted service, accounts or sign-up.
- No database or backend.
- No drag-and-drop visual editor (planned for v2, see Roadmap).
- No payments, tipping or e-commerce.
- No custom CSS escape hatch in config. Themes stay coherent; developers can fork.

## User experience

**Setup flow (target: under 5 minutes)**

1. Click "Use this template" on GitHub.
2. Click "Deploy to Vercel" (or Netlify) and connect the new repo.
3. Open `folio.config.yaml` in GitHub's web editor and replace the sample name, bio, avatar and links.
4. Commit. The host rebuilds and the page is live in about a minute.
5. Optional: add a custom domain in the host's dashboard.

Developers can instead clone, run `npm install` and `npm run dev`, and see changes live.

**Page anatomy (top to bottom, single centered column, max 480 px wide)**

1. Avatar (96 px, circular).
2. Name, then bio in a quieter weight.
3. Social icon row.
4. Featured link, if set, visually emphasized.
5. Link buttons and section headers, in config order.
6. Embeds, inline where they appear in config.
7. Footer: "Save contact" and "Share" (native share sheet on mobile, copy link on desktop), plus a small optional "Made with Folio" credit the owner can turn off.

## Design language

The goal is Apple-level restraint, not an Apple imitation: no Apple logos, product imagery or copied layouts. The page should feel calm, precise and expensive.

| Element    | Rule                                                                                                                                                                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typography | System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`), so it renders as SF Pro on Apple devices without shipping font files. Name 28 px semibold, bio 17 px regular, buttons 17 px medium. Tight letter-spacing on headings (about -0.02em). |
| Color      | Near-black text on off-white (#1d1d1f on #fbfbfd), soft greys for secondary text, one accent color used sparingly. Dark mode mirrors it. All text meets WCAG AA contrast.                                                                                                     |
| Spacing    | 8 px grid. Generous vertical rhythm: 12 px between buttons, 32 px between sections.                                                                                                                                                                                           |
| Buttons    | Full-width within the column, 56 px tall, 14 px radius (or full pill), hairline border or subtle fill. No drop shadows or gradients.                                                                                                                                          |
| Motion     | 200–300 ms ease-out. Fade and rise slightly on load; scale to 0.98 on press. Nothing loops or bounces.                                                                                                                                                                        |
| Imagery    | Avatar and embeds only. No background photos or patterns in v1 themes.                                                                                                                                                                                                        |
| Icons      | Simple Icons (CC0) for social platforms, Lucide for UI icons, all at one consistent stroke weight.                                                                                                                                                                            |

The repo's own README and demo page follow the same language: one hero screenshot, a single-sentence pitch, and short sections.

## Config schema

One YAML file is the whole product surface. It is validated at build time with Zod, and a JSON Schema is generated from it so VS Code autocompletes and flags mistakes as you type.

```yaml
# folio.config.yaml
site:
  url: https://jane.dev
  title: Jane Park
  description: Designer and writer in Oakland.

profile:
  name: Jane Park
  bio: Product designer. Writing about craft and tools.
  avatar: ./avatar.jpg
  location: Oakland, CA

theme:
  mode: auto # light | dark | auto
  accent: '#0071e3'
  buttons: rounded # rounded | pill

socials:
  instagram: janepark
  github: janepark
  email: hi@jane.dev

blocks:
  - type: link
    title: Read my newsletter
    url: https://jane.substack.com
    featured: true
  - type: header
    title: Work
  - type: link
    title: Portfolio
    subtitle: Selected projects 2022–2026
    url: https://jane.dev/work
  - type: youtube
    url: https://youtube.com/watch?v=xxxx

contact:
  vcard: true
  phone: '+1 555 0100'

analytics:
  provider: none # none | plausible | umami

footer:
  credit: true
```

Supported `blocks` types in v1: `link`, `header`, `youtube`, `spotify`, `image`.

## Technical architecture

Folio is a static site generator: config in, plain HTML and CSS out, deployable anywhere that serves files.

1. Read `folio.config.yaml`.
2. Validate it with Zod; fail the build with a clear message if anything is wrong.
3. Render the page with Astro components and the selected theme.
4. Generate the social preview image, QR code, vCard and sitemap.
5. Output a static `dist/` folder that any host serves.

| Layer         | Choice                                                   | Why                                                               |
| ------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| Framework     | Astro + TypeScript                                       | Ships zero JS by default; static output; easy components.         |
| Styling       | Plain CSS with custom properties (design tokens)         | Themes are just token sets; no build-time CSS framework to learn. |
| Validation    | Zod, plus generated JSON Schema                          | Friendly errors and editor autocomplete.                          |
| Preview image | Satori + resvg                                           | Renders the share card at build time.                             |
| QR code       | `qrcode` npm package                                     | Build-time SVG and PNG.                                           |
| Tests         | Vitest (unit), Playwright (page renders and screenshots) | Covers config parsing and visual regressions.                     |
| CI            | GitHub Actions                                           | Lint, typecheck, test, Lighthouse on every PR.                    |

**Repo structure**

```
folio/
├── folio.config.yaml        # the only file most users edit
├── public/                  # avatar and images
├── src/
│   ├── config/              # Zod schema, loader, error formatting
│   ├── components/          # Profile, LinkButton, SocialRow, Header, embeds
│   ├── themes/              # light, dark, accent token sets
│   ├── lib/                 # og-image, qr, vcard, icons
│   └── pages/index.astro
├── tests/
├── docs/                    # deploy guides, custom domains, FAQ
├── .github/workflows/       # ci.yml, pages.yml
├── CONTRIBUTING.md
├── LICENSE                  # MIT
└── README.md
```

## Quality bar

Nothing merges unless it meets these, and CI enforces the measurable ones.

- **Performance:** Lighthouse 100 on performance, accessibility, best practices and SEO. Published page under 50 KB before images, 0 KB JavaScript unless an enabled feature needs it.
- **Accessibility:** WCAG 2.2 AA. Full keyboard navigation, visible focus rings, alt text required for every image in config, reduced-motion respected.
- **Reliability:** Invalid config fails the build with a message that names the field and the fix. It never ships a broken page.
- **Tests:** Unit tests for the schema and every generator; Playwright screenshots of each theme in light and dark at phone and desktop widths.
- **Docs:** README gets a stranger live in 5 minutes. Every config option documented with an example.
- **Repo hygiene:** MIT license, CONTRIBUTING guide, issue and PR templates, semantic versioning, a CHANGELOG, and "good first issue" labels.

## Roadmap and success metrics

> TODO: the roadmap (3 phases) was an embedded block in the source doc and did not export. Paste it here.

Each phase ships only when its gate is met. The v2 editor stays true to the principles: it runs in the browser and saves by committing to your repo, so there is still no Folio server.

**Success metrics (first 3 months after launch)**

- Setup: three people who have never seen the repo go live in under 5 minutes each.
- Adoption: 100 GitHub stars and 25 real pages in a "Made with Folio" showcase discussion.
- Community: 5 merged pull requests from outside contributors.
- Quality: Lighthouse 100 holds on every release.

## Build order

1. **Scaffold:** Astro + TypeScript project, lint, format, Vitest, CI workflow, MIT license.
2. **Config:** Zod schema, YAML loader, friendly error formatting, generated JSON Schema, sample config. Tests first.
3. **Page:** Profile, social row, link buttons, headers, featured link. Light theme only.
4. **Design pass:** design tokens, dark and auto themes, accent and button shape, motion, reduced motion. Compare against the Design language table.
5. **Embeds:** YouTube, Spotify, image card.
6. **Sharing:** social preview image, QR code, vCard, share button, SEO and sitemap.
7. **Deploy:** Vercel and Netlify buttons, GitHub Pages workflow, custom domain docs.
8. **Polish:** Lighthouse and accessibility audit in CI, Playwright screenshots, README with hero image and demo link, CONTRIBUTING, templates.
