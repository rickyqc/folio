# Changelog

All notable changes to Folio. Folio uses [semantic versioning](https://semver.org): a new major version means you may need to change your `folio.config.yaml`.

## Unreleased

- Link buttons accept `mailto:` and `tel:` addresses and open them in the visitor’s mail or phone app.

- A new copy's page shows a "Your Folio is live!" note with a button straight to its `folio.config.yaml` on GitHub. It disappears once you change the sample name.
- The README, setup guide and sample config point to the config builder.

- Use an emoji as your picture: `avatar: "👩‍🎨"`. It shows in a circle tinted with your accent color, and in your share card.
- The config builder can load your current `folio.config.yaml`, so you can change an existing page there. Settings it has no fields for (images, analytics, site details) are kept as they were.
- The config builder adds YouTube videos and Spotify players.
- The landing page leads with the builder: build first, then deploy and paste. It now has a sitemap and robots.txt.

## 1.0.0 (2026-10-27)

The first release.

### Your page

- Profile with photo, name, bio and location
- Social icons for 27 platforms, from a username or a full link
- Link buttons with subtitles, platform or emoji icons, and one featured link
- Section headers
- YouTube, Spotify and image cards, with an optional tap-to-load mode for extra privacy
- Light, dark or automatic theme, your accent color (with readable text picked for you), rounded or pill buttons
- "Save contact" button, opt-in Share button, optional "Made with Folio" credit
- Zero JavaScript by default; about 15 KB before images

### Made for you at build time

- Share preview card for Messages, Slack and X
- QR code as PNG and SVG
- Photos resized and converted to WebP, so any upload stays fast
- Contact card, sitemap and robots.txt
- Your page's address is picked up from Vercel, Netlify or GitHub Pages automatically

### Setup

- One-click deploy to Vercel or Netlify, plus an opt-in GitHub Pages workflow
- Friendly errors that name the line and the fix, with "did you mean" suggestions
- Editor autocomplete for `folio.config.yaml` via JSON Schema
- Step-by-step guide, config reference, custom domain guide and an AI prompt that writes your config
- A weekly check that offers Folio updates as a pull request
