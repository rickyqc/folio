# Contributing to Folio

Thanks for helping. Folio is small on purpose, so the best contributions make it simpler, faster or easier to set up, not bigger.

## Before you start

- **Read the [product spec](docs/VISION.md).** Every change is checked against its five principles, in order: owned not rented, one config file, fewer but better, fast by default, private by default.
- **Open an issue first** for anything bigger than a bug fix or a docs tweak, so we can agree it fits before you spend time on it.
- **Looking for a place to start?** Try an issue labeled [good first issue](https://github.com/rickyqc/folio/labels/good%20first%20issue).

## Set up

You need Node 22.23 or newer (`.nvmrc` pins 24).

```sh
git clone https://github.com/rickyqc/folio.git
cd folio
npm install
npm run dev          # your page at localhost:4321, reloads when folio.config.yaml changes
npm run site:dev     # Folio's own website (website/)
```

## Where things live

| Path                            | What it is                                                                 |
| ------------------------------- | -------------------------------------------------------------------------- |
| `folio.config.yaml`             | The sample page. It's also what every new user starts from.                |
| `src/config/`                   | Zod schema, YAML loader, and the friendly error messages                   |
| `src/lib/`                      | Small helpers: social links, embeds, colors, images, vCard, share card, QR |
| `src/components/`, `src/pages/` | The published page and its generated files                                 |
| `website/`                      | Folio's homepage (not shipped to users' pages)                             |
| `docs/`                         | User guides. `docs/AI_PROMPT.md` also feeds the website.                   |
| `tests/`                        | Unit tests (`*.test.ts`) and browser tests (`e2e/`)                        |

## Checks

Run these before opening a pull request:

```sh
npm run ci           # lint, format, typecheck, unit tests, build, size budget
npm run test:e2e     # browser tests and screenshots (run `npx playwright install chromium` once)
```

CI also runs Lighthouse and requires 100 in every category (see `lighthouserc.json`).

## House rules

- **Zero JavaScript on the published page** unless a feature can't work without it, and then only when the owner turns that feature on (like `footer.share`).
- **Every config mistake gets a friendly error** that names the line and the fix. If you add an option, add a test in `tests/config.test.ts` for what happens when someone gets it wrong.
- **Changed the schema?** Run `npm run schema` to update `folio.schema.json`, and document the option in `docs/CONFIG.md`. If it's something people would ask an AI for, update `docs/AI_PROMPT.md` too.
- **New dependencies need a reason** in the pull request. Prefer build-time-only packages; nothing new may run in visitors' browsers.
- **Design follows the table in the spec:** system fonts, 8 px grid, no shadows or gradients on the page, motion that respects reduced-motion settings.
- **Small commits with clear messages.** Add a line to `CHANGELOG.md` under "Unreleased" for anything users would notice.

## Releasing (maintainers)

1. Move the "Unreleased" notes in `CHANGELOG.md` under a new version heading. Folio uses [semantic versioning](https://semver.org): breaking config changes bump the major version.
2. Update `version` in `package.json`.
3. Commit, tag (`git tag v1.2.0`), push with tags, and publish a GitHub release with the changelog notes. Copies of Folio use the release to offer the update.
