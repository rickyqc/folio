# Use your own domain

Your page works at its free `vercel.app` or `netlify.app` address straight away. To use a domain you own, like `jane.dev`:

1. **Buy a domain** if you don't have one, from any registrar (Cloudflare, Namecheap, Porkbun, Squarespace Domains and so on), or buy it directly through Vercel or Netlify, which skips step 3.
2. **Add it to your project** (see your host below).
3. **Add the DNS records your host shows you** at your registrar. Copy them exactly. Changes usually work within minutes but can take up to a day.
4. **Set `site.url`** in `folio.config.yaml` to your new domain and commit, so link previews and your QR code use it.

HTTPS (the padlock) is set up for you automatically on both hosts.

## Vercel

1. Open your project in the [Vercel dashboard](https://vercel.com/dashboard).
2. Go to **Settings → Domains** and click **Add Domain**.
3. Type your domain (e.g. `jane.dev`) and click **Add**. Vercel suggests also adding `www.jane.dev` and redirecting it; accept that.
4. Vercel shows the DNS records to add at your registrar. When they're in place, the domain turns green.

Vercel's own guide: [Adding a custom domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

## Netlify

1. Open your site in the [Netlify dashboard](https://app.netlify.com).
2. Go to **Domain management** and click **Add a domain**.
3. Type your domain and follow the steps. Netlify shows the DNS records to add, or offers to manage DNS for you.

Netlify's own guide: [Custom domains](https://docs.netlify.com/domains-https/custom-domains/).

## Then

```yaml
site:
  url: https://jane.dev
```

Commit, and search engines and link previews will use your domain.
