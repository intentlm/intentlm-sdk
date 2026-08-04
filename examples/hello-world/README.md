# Hello world — intentLM SDK (`localOnly`)

See a **`visitor_id`**, **`sess_…` session**, and **integer token stream** in under a minute. No API key. No calls to intentLM servers.

## Quick start

```bash
# from this folder (examples/hello-world)
npm install
npm start
```

Open the URL printed by the server (default **http://localhost:3456**).

1. Click **Pricing** then **Checkout**
2. Confirm the JSON panel shows tokens like `[910, 101, 102, …]`
3. Checklist items turn green; DevTools → Network has **no** `/v1/analyze` or `/v1/ingest`

## Success criteria

| Check | Expect |
|-------|--------|
| Visitor | UUID in the panel; cookie `_ilm_vid` |
| Session | `sessionId` starts with `sess_` |
| Tokens | Includes `910` (`SESSION_STARTED`) plus route tokens (`102` / `PRICING_VIEW`, `203` / `CHECKOUT_STARTED`) |
| Scroll (optional) | `911` `SCROLL_DEPTH_50`, `906` `SCROLL_DEPTH_75`, `912` `SCROLL_DEPTH_100` when you scroll the page |
| Network | No intentLM API traffic |
| Intent | Stays `null` — hosted labels need an API key ([path B](../../README.md#b-managed-classification--use-intentlmai)) |

## Why a `<script src>` instead of `import 'intentlm-sdk'`?

Browsers cannot resolve bare package names without a bundler (Vite, Next, etc.). This example loads the published **IIFE** build from `node_modules` so `npx serve` works.

In a real app with a bundler:

```ts
import { intentLM } from 'intentlm-sdk'

intentLM.init({ localOnly: true, patterns: { '/': 101, '/pricing*': 102 } })
```

## From a fresh clone of the public repo

```bash
git clone https://github.com/intentlm/intentlm-sdk.git
cd intentlm-sdk/examples/hello-world
npm install && npm start
```
