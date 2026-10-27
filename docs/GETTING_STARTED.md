# Get your Folio page live

This takes about five minutes, and you don't need to install anything or use a terminal. Everything happens in your browser.

**You'll need:**

- A free [GitHub](https://github.com/signup) account. This is where your page's files live.
- A free [Vercel](https://vercel.com/signup) account. This is what puts your page on the internet. Choose "Continue with GitHub" when you sign up; it saves a step.

Prefer Netlify? It works the same way. Use the Netlify button in the [README](../README.md) instead, and follow the same steps.

---

## 1. Make your copy

1. Click this button: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frickyqc%2Ffolio&project-name=my-folio&repository-name=my-folio)
2. Sign in to Vercel with GitHub if it asks. If GitHub asks whether to let Vercel access your account, click **Install** or **Authorize**: that's how Vercel saves your copy and rebuilds your page when you edit it.
3. Under **Create Git Repository**, keep the name `my-folio` or type your own. Choose **Private** if you don't want others to see your files. Your page is public either way.
4. Click **Create**.

Vercel copies Folio into your GitHub account and builds your page. After about a minute you'll see a **Congratulations** screen. Click the preview to open your page. It shows the sample person, Jane Park, for now.

**Write down your page's address.** It looks like `my-folio-abc123.vercel.app`. You'll find it again any time on your project's page in the [Vercel dashboard](https://vercel.com/dashboard).

## 2. Put in your details

Everything on your page comes from one file called `folio.config.yaml`.

1. Go to [github.com](https://github.com) and open your new `my-folio` repository.
2. Click **folio.config.yaml** in the file list.
3. Click the **pencil icon** (Edit this file) at the top right of the file.
4. Change the sample details to yours: name, bio, links and social accounts. The sample social links just point to each site's home page; replace them with your usernames, e.g. `instagram: your-username`. The notes after `#` explain each option.
5. Click **Commit changes…**, then **Commit changes** again in the box that appears.

Vercel notices the change and rebuilds your page. Refresh it after about a minute.

> **Tip:** Rather not edit by hand? Copy the [AI prompt](AI_PROMPT.md) into Claude or ChatGPT with your details, and paste what it writes over the whole file.

### A few rules that keep the file happy

- **Indentation matters.** Use spaces, not tabs, and keep lines lined up with the ones around them, the way the sample does.
- **Links start with `https://`.** Write `https://jane.dev`, not `jane.dev`.
- **Colors go in quotes:** `accent: "#ff375f"`.
- **Quote text that contains `: ` or ` #`:** `bio: "Designer: product & brand"`.
- **Each block starts with `- type:`.** Copy an existing block and change it rather than typing one from scratch.

Every option is listed in the [config reference](CONFIG.md).

## 3. Add your photo

1. In your repository on GitHub, click the **public** folder.
2. Click **Add file → Upload files** and drag in your photo (JPG or PNG). Any size works: Folio crops it to a circle and shrinks it for you. iPhone photos in HEIC format need converting to JPG first; the build tells you how if you forget.
3. Click **Commit changes**.
4. Open `folio.config.yaml` again and set `avatar:` to your photo's exact file name, for example `avatar: me.jpg`. Capital letters must match: `Me.JPG` and `me.jpg` are different files.
5. Commit.

## 4. Share it

Your page comes with a few extras, made automatically:

- **A preview card.** Paste your link into Messages, Slack or X and it shows your photo, name and bio.
- **A QR code.** Open `your-page-address/qr.png` (e.g. `my-folio-abc123.vercel.app/qr.png`) and save it for business cards or posters.
- **A Share button**, if you want one: set `share: true` under `footer:`.

## 5. Optional: use your own domain

See [Use your own domain](CUSTOM_DOMAIN.md).

---

## Something went wrong?

### My page didn't change after I committed

Folio refuses to publish a page with mistakes in it, so your last working page stays up. To see what's wrong:

1. Open your project in the [Vercel dashboard](https://vercel.com/dashboard) and click **Deployments**.
2. Click the newest one marked **Error**.
3. Open the **Building** log and scroll to the red **✗**. It says exactly what to fix, for example:

```
✗ folio.config.yaml has 1 problem, so your page wasn't updated.

  1. Line 42: Block 3 (link “Portfolio”) is missing "url".
     Fix: Add a line like   url: https://example.com
```

GitHub shows the same message: a red **✗** appears next to your commit. Click it, then **Details**.

Fix the line in `folio.config.yaml`, commit again, and your page updates.

### My photo or image doesn't show

The build checks this for you and names the file it couldn't find. Usually the file isn't in the `public` folder, or the capital letters in the name don't match.

### The YouTube or Spotify box is gray with a play button

Your config has `loadOnTap: true` under `embeds:`, which loads players only when a visitor taps them, for privacy. Remove those lines to load players straight away.

### Still stuck?

[Ask for setup help](https://github.com/rickyqc/folio/issues/new?template=setup-help.yml). Paste the error message if there is one, and we'll help.
