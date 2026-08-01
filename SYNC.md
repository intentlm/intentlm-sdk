# Syncing this tree from the private monorepo

`sdk-public/` is the **publishable mirror** of the browser SDK for
https://github.com/intentlm/intentlm-sdk

## Canonical source

| Path | Role |
|------|------|
| Private monorepo `sdk/` | Day-to-day development (dashboard, tests, releases) |
| `sdk-public/` | Overlay + synced copy → push to public GitHub |

Do **not** edit synced source under `sdk-public/src` by hand — change
`sdk/` then re-run the sync script.

## Overlay files (owned here, not overwritten by sync)

- `README.md`
- `LICENSE` (Apache-2.0)
- `LICENSE-TAXONOMY` (CC BY-SA 4.0)
- `NOTICE`
- `ATTRIBUTION.md`
- `SYNC.md` (this file)
- `.gitignore`
- `.env.example` (sanitized)

## Sync

From the monorepo root:

```bash
./scripts/sync-sdk-public.sh
cd sdk-public && npm ci && npm test && npm run build
```

## First-time: create + push public repo

Requires [GitHub CLI](https://cli.github.com/) logged in as an **intentlm** org owner:

```bash
gh auth login
```

**Option A — create empty repo, then push a clean tree** (recommended; keeps monorepo git history private):

```bash
# IMPORTANT: run every command from the monorepo root
#   /Users/.../intentLM   (the private repo that contains sdk-public/)
# Not from inside a clone of intentlm-sdk.

cd /path/to/intentLM          # ← monorepo root
./scripts/sync-sdk-public.sh

gh repo create intentlm/intentlm-sdk --public \
  --description "Browser SDK + global intent taxonomy for intentLM"

# Use SSH (not HTTPS) — GitHub rejects password auth on HTTPS remotes.
TMP=$(mktemp -d)
git clone git@github.com:intentlm/intentlm-sdk.git "$TMP/intentlm-sdk"
rsync -a --delete \
  --exclude node_modules/ --exclude dist/ --exclude .git/ \
  "$PWD/sdk-public/" "$TMP/intentlm-sdk/"
cd "$TMP/intentlm-sdk"
git add -A
git commit -m "Initial public SDK + taxonomy release tree"
git push -u origin main
```

**Option B — if the empty repo already exists**, skip `gh repo create` and run the clone/rsync/push block above.

## Later releases

1. Develop and bump version in monorepo `sdk/package.json`
2. `./scripts/sync-sdk-public.sh`
3. rsync into a clone of `intentlm/intentlm-sdk` (or CI) → commit → tag → `npm publish`
