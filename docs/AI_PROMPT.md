# Let AI write your config

Don't want to edit YAML by hand? Copy the prompt below into Claude, ChatGPT or any AI chat, fill in the "About me" part at the bottom, and send it. It replies with a finished `folio.config.yaml`. Paste that over the whole file in your repo and commit.

If the AI gets something wrong, your page won't break: the build stops and tells you which line to fix.

```text
Write a folio.config.yaml file for my Folio link-in-bio page. If anything you need is missing from "About me", ask me first. Then reply with only the finished YAML in one code block.

Rules:
- Use only these top-level sections: site, profile, theme, socials, blocks, contact, analytics, footer.
- profile.name is required. profile.bio is one short line. profile.avatar is the file name of my photo in the public folder (for example avatar.jpg); leave it out if I don't give one. profile.location is optional.
- site.title defaults to my name and site.description to my bio, so leave them out unless I want something different.
- theme.mode is auto, light or dark (use auto unless I say otherwise). theme.accent is a hex color in double quotes, like "#0071e3". theme.buttons is rounded or pill.
- socials: one line per platform, with my username (no @) or a full https:// link. Supported names: instagram, x, tiktok, youtube, github, linkedin, threads, bluesky, mastodon (full link), facebook, twitch, spotify (full link), applemusic (full link), soundcloud, discord (full link), substack, medium, pinterest, dribbble, behance, snapchat, patreon, kofi, whatsapp (phone number with country code, in quotes), telegram, email, website (full link).
- blocks is my page from top to bottom. Each item starts with "- type:" and is one of:
  - link: title, url (must start with https://), optional subtitle, optional icon (a platform name from the socials list), optional featured: true. Feature at most one link, the most important one.
  - header: title. Use short headers like "Listen" or "Shop" to group related links.
  - youtube: url (a YouTube video link), optional title.
  - spotify: url (a Spotify track, album, playlist, episode, show or artist link), optional title.
  - image: src (a file name in the public folder, or a full https:// link), alt (a short description for screen readers; required), optional url and caption.
- contact.vcard: true adds a "Save contact" button. Only add contact.phone if I ask for it, because it will be public.
- analytics.provider is none unless I ask for Plausible or Umami.
- Keep link titles short (2 to 5 words). Never invent links, usernames or details I didn't give you.
- Use 2 spaces for indentation. Put any text that contains ": " or " #" in double quotes.

About me:
- Name:
- One-line bio:
- Location (optional):
- Photo file name (optional):
- Favorite color (optional):
- Light, dark or automatic (optional):
- My social accounts:
- Links I want on my page, most important first:
- Videos, music or images to show (optional):
```
