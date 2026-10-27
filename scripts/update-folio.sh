#!/usr/bin/env bash
# Brings a copy of Folio up to the latest release, keeping the owner's content.
# Run by .github/workflows/update.yml every week. Locally: DRY_RUN=1 bash scripts/update-folio.sh
#
# Copies made from the template share no git history with Folio, so this copies files from the
# release instead of merging. Never touched: folio.config.yaml, public/, and workflow files
# (GitHub doesn't let the built-in token change those; the pull request lists any that changed).
set -euo pipefail

UPSTREAM="${FOLIO_UPSTREAM:-rickyqc/folio}"
current="$(node -p "require('./package.json').version")"
latest="$(gh release view --repo "$UPSTREAM" --json tagName --jq .tagName)"
latest="${latest#v}"

newest="$(printf '%s\n%s\n' "$current" "$latest" | sort -V | tail -1)"
if [ "$newest" = "$current" ]; then
  echo "Folio is up to date (v$current)."
  exit 0
fi
echo "Folio v$latest is available (you have v$current)."

branch="folio-update-v$latest"
if [ -z "${DRY_RUN:-}" ] && git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
  echo "Branch $branch already exists; the update was already offered."
  exit 0
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
gh release download "v$latest" --repo "$UPSTREAM" --archive tar.gz --output "$work/folio.tar.gz"
mkdir "$work/folio"
tar -xzf "$work/folio.tar.gz" -C "$work/folio" --strip-components=1

excludes=(--exclude .git/ --exclude node_modules/ --exclude folio.config.yaml --exclude public/ --exclude .github/workflows/)
# Respect an owner who deleted Folio's own website.
[ -d website ] || excludes+=(--exclude website/)

rsync -a "${excludes[@]}" "$work/folio/" ./

changed_workflows="$(diff -rq "$work/folio/.github/workflows" .github/workflows 2>/dev/null | sed 's#^#- #' || true)"

if [ -n "${DRY_RUN:-}" ]; then
  echo "Dry run: files changed:"
  git status --short
  [ -n "$changed_workflows" ] && printf 'Workflow files that differ (not updated):\n%s\n' "$changed_workflows"
  exit 0
fi

if [ -z "$(git status --porcelain)" ]; then
  echo "Nothing to change."
  exit 0
fi

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git checkout -b "$branch"
git add -A
git commit -m "Update Folio to v$latest"
git push origin "$branch"

notes="$(gh release view "v$latest" --repo "$UPSTREAM" --json body --jq .body)"
body_file="$work/body.md"
{
  echo "Folio **v$latest** is out (you have v$current). This pull request updates Folio's code."
  echo
  echo "**Your content is untouched:** \`folio.config.yaml\` and everything in \`public/\` stay exactly as they are."
  echo
  echo "**To update:** check the preview your host builds for this pull request (Vercel and Netlify post a link below), then click **Merge pull request**. If you've changed Folio's code yourself, look over the file changes first."
  if [ -n "$changed_workflows" ]; then
    echo
    echo "**Workflow files changed upstream** and need copying by hand (GitHub doesn't let automation edit them):"
    echo "$changed_workflows"
  fi
  echo
  echo "## What's new"
  echo
  echo "$notes"
} >"$body_file"

if gh pr create --title "Update Folio to v$latest" --body-file "$body_file" --head "$branch"; then
  exit 0
fi

# Repos where Actions may not open pull requests (the default) get an issue with a one-click link.
compare="https://github.com/${GITHUB_REPOSITORY:-}/compare/$branch?expand=1"
{
  echo
  echo "---"
  echo "[**Open the update as a pull request**]($compare). To have this done for you next time: Settings → Actions → General → Workflow permissions → tick **Allow GitHub Actions to create and approve pull requests**."
} >>"$body_file"
gh issue create --title "Folio v$latest is available" --body-file "$body_file"
