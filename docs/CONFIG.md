# Config reference

Everything on your page comes from `folio.config.yaml`. Only `profile.name` is required; everything else is optional and has a sensible default.

In VS Code with the [YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml), every option below autocompletes and mistakes are underlined as you type.

- [site](#site)
- [profile](#profile)
- [theme](#theme)
- [socials](#socials)
- [blocks](#blocks): [link](#link) · [header](#header) · [youtube](#youtube) · [spotify](#spotify) · [image](#image)
- [embeds](#embeds)
- [contact](#contact)
- [analytics](#analytics)
- [footer](#footer)

---

## site

How your page appears in search results, browser tabs and link previews.

| Option        | Default             | What it does                                                                                                                                  |
| ------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`         | your host's address | Your page's address, e.g. `https://jane.dev`. Vercel, Netlify and GitHub Pages fill it in automatically; set it when you use your own domain. |
| `title`       | your name           | Browser tab and search result title.                                                                                                          |
| `description` | your bio            | Search result and link preview text.                                                                                                          |
| `lang`        | `en`                | The page's language code, e.g. `fr` or `pt-BR`.                                                                                               |

```yaml
site:
  url: https://jane.dev
  title: Jane Park · Designer
  description: Product designer in Oakland. Writing about craft and tools.
```

## profile

The top of your page.

| Option     | Default      | What it does                                                                                                                                      |
| ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`     | **required** | Your name.                                                                                                                                        |
| `bio`      | none         | One line about you.                                                                                                                               |
| `avatar`   | none         | Your photo: a file in the `public` folder (e.g. `me.jpg`), a full image link, or a single emoji in quotes (e.g. `"👩‍🎨"`). Shown as a 96 px circle. |
| `location` | none         | Shown under your bio with a pin icon.                                                                                                             |

```yaml
profile:
  name: Jane Park
  bio: Product designer. Writing about craft and tools.
  avatar: me.jpg
  location: Oakland, CA
```

## theme

| Option    | Default     | Choices                                                                                                                            |
| --------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `mode`    | `auto`      | `auto` follows each visitor's light/dark setting. `light` or `dark` forces one.                                                    |
| `accent`  | `"#0071e3"` | Any hex color, in quotes. Used for your featured link. Folio picks white or black text automatically, whichever is easier to read. |
| `buttons` | `rounded`   | `rounded` or `pill`.                                                                                                               |

```yaml
theme:
  mode: auto
  accent: '#ff375f'
  buttons: pill
```

## socials

A row of icons under your bio, in the order you list them. For each platform, write your username (with or without `@`) or a full link.

```yaml
socials:
  instagram: janepark
  tiktok: '@janepark'
  linkedin: janepark
  mastodon: https://mastodon.social/@janepark
  email: hi@jane.dev
```

| Name                                                                                                                                                                                                | Write                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `instagram`, `x`, `tiktok`, `youtube`, `github`, `linkedin`, `threads`, `facebook`, `twitch`, `soundcloud`, `medium`, `pinterest`, `dribbble`, `behance`, `snapchat`, `patreon`, `kofi`, `telegram` | your username                                                   |
| `substack`                                                                                                                                                                                          | your Substack name (the part before `.substack.com`)            |
| `bluesky`                                                                                                                                                                                           | your full handle, e.g. `janepark.bsky.social`                   |
| `whatsapp`                                                                                                                                                                                          | your phone number with country code, in quotes: `"+1 555 0100"` |
| `email`                                                                                                                                                                                             | your email address                                              |
| `mastodon`, `spotify`, `applemusic`, `discord`, `website`                                                                                                                                           | a full link starting with `https://`                            |

Need a platform that isn't listed? Add it as a [link](#link) instead.

## blocks

Your page, top to bottom. Each block starts with `- type:` followed by the type.

### link

A full-width button.

| Option     | Default      | What it does                                                                                                       |
| ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `title`    | **required** | The button text. Keep it short.                                                                                    |
| `url`      | **required** | Where it goes: a web address (`https://`), email link (`mailto:`), or phone link (`tel:`).                         |
| `subtitle` | none         | A smaller second line.                                                                                             |
| `icon`     | none         | An icon on the left: any name from [socials](#socials) (e.g. `youtube`) or a single emoji in quotes (e.g. `"🎨"`). |
| `featured` | `false`      | Fills the button with your accent color. Only one link can be featured.                                            |

```yaml
blocks:
  - type: link
    title: Shop my prints
    subtitle: New spring collection
    url: https://shop.jane.dev
    icon: '🛍️'
    featured: true
```

Email and phone links open in the visitor’s mail or phone app, rather than a new tab:

```yaml
- type: link
  title: Email me
  url: mailto:hello@example.com
- type: link
  title: Call the studio
  url: tel:+15550100
```

### header

A small heading to group the blocks below it.

```yaml
- type: header
  title: Listen
```

### youtube

A YouTube video player, ready to play when the page opens.

| Option  | Default      | What it does                                                             |
| ------- | ------------ | ------------------------------------------------------------------------ |
| `url`   | **required** | Any YouTube video link: `youtube.com/watch?v=…`, `youtu.be/…` or Shorts. |
| `title` | "Play video" | Shown on the player before it loads.                                     |

```yaml
- type: youtube
  url: https://youtu.be/aqz-KE-bpKQ
  title: My latest video
```

### spotify

A Spotify player for a track, album, playlist, podcast episode, show or artist. In the Spotify app, use **Share → Copy link**.

```yaml
- type: spotify
  url: https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC
```

### image

An image card, optionally linked.

| Option    | Default      | What it does                                                                           |
| --------- | ------------ | -------------------------------------------------------------------------------------- |
| `src`     | **required** | A file in the `public` folder (e.g. `poster.jpg`) or a full image link.                |
| `alt`     | **required** | A short description for people using screen readers, e.g. "Poster for my spring show". |
| `url`     | none         | Makes the image a link.                                                                |
| `caption` | none         | Small text under the image.                                                            |

```yaml
- type: image
  src: poster.jpg
  alt: Poster for my spring show at Gallery 9
  url: https://tickets.example.com
  caption: April 12, Oakland
```

## embeds

YouTube and Spotify players load with your page, so visitors see the real video and music straight away. That also means YouTube and Spotify can see that someone opened your page (YouTube uses its privacy-enhanced mode, which doesn't set cookies until someone plays the video).

For maximum privacy, show a placeholder instead and load each player only when a visitor taps it:

```yaml
embeds:
  loadOnTap: true
```

## contact

| Option         | Default              | What it does                                                                       |
| -------------- | -------------------- | ---------------------------------------------------------------------------------- |
| `vcard`        | `false`              | Shows a **Save contact** button that adds you to the visitor's contacts.           |
| `email`        | your `socials.email` | Email in the contact card.                                                         |
| `phone`        | none                 | Phone in the contact card. **It will be public**, so only add it if you want that. |
| `organization` | none                 | Company in the contact card.                                                       |

```yaml
contact:
  vcard: true
  organization: Park Studio
```

## analytics

Off by default. Folio never adds cookies or trackers on its own. If you want visitor numbers, use one of these privacy-friendly services:

```yaml
analytics:
  provider: plausible
  domain: jane.dev # the site you added in Plausible
```

```yaml
analytics:
  provider: umami
  websiteId: 4f1c… # from your Umami dashboard
```

Self-hosting either one? Add `src:` with your script's URL.

## footer

| Option   | Default | What it does                                                                                                                                         |
| -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `share`  | `false` | Shows a **Share** button: the share sheet on phones, "copy link" on computers. This is the only option that adds a script to your page (under 1 KB). |
| `credit` | `true`  | The small "Made with Folio" link.                                                                                                                    |

```yaml
footer:
  share: true
  credit: false
```

## Sharing extras

These are made for you on every build, no setup needed:

| File                        | What it's for                                                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `og.png`                    | The preview card shown when your link is shared in Messages, Slack, X and so on: your photo, name, bio and address.                    |
| `qr.png`, `qr.svg`          | A QR code for your page, for business cards, posters and menus. Open `your-page-address/qr.png` to download it; use the SVG for print. |
| `contact.vcf`               | The contact card behind "Save contact" (only when `contact.vcard` is on).                                                              |
| `sitemap.xml`, `robots.txt` | Help search engines find your page.                                                                                                    |

The preview card and QR code need your page's address, which your host provides automatically. If you build somewhere else, set `site.url`.
