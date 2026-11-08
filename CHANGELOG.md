# Changelog

All notable changes to Folio. Folio uses [semantic versioning](https://semver.org): a new major version means you may need to change your `folio.config.yaml`.

## Unreleased

- A new copy's page shows a "Your Folio is live!" note with a button straight to its `folio.config.yaml` on GitHub. It disappears once you change the sample name.
- The README, setup guide and sample config point to the config builder.

- Use an emoji as your picture: `avatar: "👩‍🎨"`. It shows in a circle tinted with your accent color, and in your share card.
- The config builder can load your current `folio.config.yaml`, so you can change an existing page there. Settings it has no fields for (images, analytics, site details) are kept as they were.
- The config builder adds YouTube videos and Spotify players.
- The landing page leads with the builder: build first, then deploy and paste. It now has a sitemap and robots.txt.
- Fixed: long names and bios ran off the edge of the share card. Long names now get smaller and wrap, and long bios end with “…” after three lines.
- A color written without quotes (`accent: #ff375f`) now gets a clear “needs quotes” message, instead of saying the accent is missing.
- Fixed: the browser tab icon used your original photo, so a large upload was downloaded in full by every visitor. It now uses the smallest resized copy.
- Your featured link stays visible with any accent color: when the accent is too close to the page background (a very light accent in light mode, a very dark one in dark mode), the button gets a thin outline.
- Pill buttons with a long, wrapping title keep pill-shaped ends instead of stretching into an oval.
- Link buttons can start an email, a call or a text: `url: mailto:hi@jane.dev`, `tel:+15550100` or `sms:+15550100`. Spaces and brackets in phone numbers are tidied for you. The config builder accepts them too.
- Links written without `https://` (`url: jane.dev/shop`) now work instead of failing the build, and a bare email address on a link button becomes an email link.
- Clearer errors for configs written for other tools: `links:` points you to `blocks:`, and an option outside its section (like `bio:` at the top) says which section it belongs in. Errors about a section now point at its own line.
- YAML mistakes are explained in plain words: tabs, misaligned lines, unclosed quotes, an option written twice, a username starting with @, and text containing `: ` (with the quoted line to paste).
- A YouTube channel link in a video block now says to add the channel under `socials` instead.
- With analytics on, you can see which links get tapped. Plausible now loads its outbound-links script (add the “Outbound Link: Click” goal once to see them), and Umami records a “Link click” event for each button, social icon and image link. No change for pages with analytics off.
- “Save contact” now includes your picture and your social profiles, so the saved contact shows your photo and links.
- Hovering a social icon on a computer shows the platform's name.
- If an edit breaks your config, the check next to your commit on GitHub turns red and shows the problem on the right line of `folio.config.yaml`. GitHub emails you too. (New copies only: workflow files aren't changed by updates. To add it to an existing copy, add the “Check folio.config.yaml” step from `.github/workflows/ci.yml`.)

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
