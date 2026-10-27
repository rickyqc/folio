# Getting Folio updates

Your copy of Folio checks for new versions every Monday. When there is one, it opens a **pull request** in your repository called "Update Folio to v…". Your host builds a preview of it, so you can see your page with the update before anything changes.

**Your content is never touched.** `folio.config.yaml` and everything in `public/` stay exactly as you left them.

## To install an update

1. Open the pull request (you'll also get an email from GitHub).
2. Click the preview link your host posted (Vercel and Netlify add one automatically) and check your page looks right.
3. Click **Merge pull request**, then **Confirm merge**. Your page updates in about a minute.

Not ready? Leave it open, or close it. The next version will be offered when it comes out.

## If you get an issue instead of a pull request

GitHub doesn't let automation open pull requests in new repositories by default, so Folio opens an issue with a one-click link instead. Click **Open the update as a pull request** in the issue, then follow the steps above.

To get pull requests directly next time: **Settings → Actions → General → Workflow permissions**, tick **Allow GitHub Actions to create and approve pull requests**, and click **Save**.

## Check now

Go to the **Actions** tab, click **Folio updates**, then **Run workflow**.

## Turn it off

**Actions** tab → **Folio updates** → **⋯** → **Disable workflow**.

## Workflow files

GitHub doesn't let automation change files in `.github/workflows/`. If an update changes them, the pull request lists which ones, and you can copy them from the [Folio repository](https://github.com/rickyqc/folio/tree/main/.github/workflows) by hand.

## Changed Folio's code yourself?

The update replaces Folio's own files with the new version. Look over **Files changed** in the pull request before merging and re-apply anything you want to keep.
