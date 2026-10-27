# Folio

**Your links. Your page. Your domain. Free forever.**

Folio is a link-in-bio page you own outright. Edit one file, and it's live on your own domain. No Folio account, no monthly fee, no tracking.

**[See a live example →](https://rickyqc.github.io/folio/)**

## Get your page in 5 minutes

You'll need free **GitHub** and **Vercel** (or Netlify) accounts. Nothing to install.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frickyqc%2Ffolio&project-name=my-folio&repository-name=my-folio)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/rickyqc/folio)

1. **Click a button above.** It copies Folio into your GitHub account and puts your page online.
2. **Open `folio.config.yaml`** in your new repository and click the pencil icon to edit it.
3. **Change the sample details to yours** and click **Commit changes**.
4. **Your page updates in about a minute.**

New to GitHub? The **[step-by-step guide](docs/GETTING_STARTED.md)** walks through every click.

## Editing your page

Everything on your page is in [`folio.config.yaml`](folio.config.yaml):

```yaml
profile:
  name: Jane Park
  bio: Product designer. Writing about craft and tools.
  avatar: me.jpg

socials:
  instagram: janepark
  email: hi@jane.dev

blocks:
  - type: link
    title: Read my newsletter
    url: https://jane.substack.com
    featured: true
```

- **[Config reference](docs/CONFIG.md):** every option, with examples.
- **[Let AI write it](docs/AI_PROMPT.md):** paste a prompt into Claude or ChatGPT with your details and get a finished config back.
- **[Use your own domain](docs/CUSTOM_DOMAIN.md):** step by step for Vercel and Netlify.
- **[Getting updates](docs/UPDATING.md):** new versions arrive as a pull request you can preview first.

**Made a mistake?** Your page won't break. Folio stops the update and tells you the line and the fix:

```
✗ folio.config.yaml has 1 problem, so your page wasn't updated.

  1. Line 42: Block 3 (link “Portfolio”) is missing "url".
     Fix: Add a line like   url: https://example.com
```

[Where to find that message →](docs/GETTING_STARTED.md#something-went-wrong)

## What you get

- Profile, social icons, link buttons, section headers and one featured link
- YouTube, Spotify and image embeds, with an optional tap-to-load mode for extra privacy
- Light, dark or automatic theme, your accent color, rounded or pill buttons
- A share preview card, a QR code for print, "Save contact" and an optional Share button
- Search-friendly tags and a sitemap
- 0 KB of JavaScript and about 15 KB in total, so it loads instantly even on a weak signal
- No cookies or trackers; optional Plausible or Umami analytics

## Which files matter?

| You edit                         | Leave alone (unless you're a developer)                       |
| -------------------------------- | ------------------------------------------------------------- |
| `folio.config.yaml`: your page   | `src/`: the code that builds your page                        |
| `public/`: your photo and images | `website/`: Folio's own homepage; safe to delete in your copy |
|                                  | `docs/`, `tests/`, `scripts/`: guides and checks              |

## For developers

```sh
git clone https://github.com/rickyqc/folio.git
cd folio && npm install
npm run dev        # your page at localhost:4321, reloads as you edit the config
npm run ci         # lint, format, typecheck, tests, build, size budget
npm run test:e2e   # browser tests and screenshots (run npx playwright install chromium once)
```

Folio is an [Astro](https://astro.build) static site. The config is validated with Zod ([`src/config/`](src/config/)); run `npm run schema` after changing the schema to update editor autocomplete. The product spec is in [docs/VISION.md](docs/VISION.md).

## Made something?

**[Show off your page](https://github.com/rickyqc/folio/discussions/categories/show-and-tell)** in Show and tell. We love seeing them.

Stuck? [Ask for setup help](https://github.com/rickyqc/folio/issues/new?template=setup-help.yml). Want to help build Folio? Start with [CONTRIBUTING.md](CONTRIBUTING.md) and the [good first issues](https://github.com/rickyqc/folio/labels/good%20first%20issue).

## License

[MIT](LICENSE)
