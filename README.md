# intentlm-sdk

Open-source browser SDK and **Global Intent Taxonomy** for [intentLM™](https://intentlm.ai).

Turn in-app navigation into a privacy-safe shared token vocabulary — then optionally plug into managed intent classification for agents, webhooks, and product nudges.

**npm:** [`intentlm-sdk`](https://www.npmjs.com/package/intentlm-sdk)

**Try it (no API key):** [examples/hello-world](./examples/hello-world) — `npm install && npm start` → http://localhost:3456 — see `visitor_id` + integer tokens in under a minute.

**Propose a taxonomy token (no Git required):** [GitHub issue form](https://github.com/intentlm/intentlm-sdk/issues/new?template=taxonomy_token.yml) · [intentlm.ai/contribute](https://intentlm.ai/contribute) · see [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## Why use this

| Without intentLM | With intentLM |
|------------------|---------------|
| Agents and CS tools see pages or chat text after the fact | Intent can be classified **while the user browses** |
| Every app invents its own event names | Shared vocabulary: token `102` always means `PRICING_VIEW` |
| Raw URLs / DOM leave the browser for “intent” features | Only integer token IDs need leave the client for classification |

**Open SDK** = taxonomy + capture building blocks (Apache-2.0 / CC BY-SA).  
**Managed service** = live inference, Insights, webhooks, agent context — [intentlm.ai](https://intentlm.ai).

### Cost vs rolling your own LLM intent pipeline

See modeled savings on the compare-cost page:

**[intentlm.ai/compare-cost](https://intentlm.ai/compare-cost)** — intentLM token classification vs in-house LLM / analytics approaches.

### Free managed tier

Want labels + confidence without running models yourself?

- **[Sign up free](https://intentlm.ai/signup)** — **10,000 Monthly Active Sessions (MAS) / month** at $0  
- Web app, dashboard Insights, webhooks — no credit card to start  
- [Live sandbox](https://intentlm.ai/sandbox/b2b)

---

## Two ways to use this package

| Path | API key? | What you get |
|------|----------|--------------|
| **A. Open source — local capture** | **No** | `visitor_id`, session id, integer token stream in the browser (`localOnly`) |
| **B. Managed classification** | **Yes** (`ilm_live_…`) | Same capture + live `intent` / `confidence` from intentLM inference |

Path **A** never calls the network. Path **B** needs a free key from [intentlm.ai/signup](https://intentlm.ai/signup).

---

## A. Open source — no API key

### Hello world (fastest)

```bash
git clone https://github.com/intentlm/intentlm-sdk.git
cd intentlm-sdk/examples/hello-world
npm install
npm start
```

Open **http://localhost:3456**, click **Pricing** / **Checkout**. You should see `visitorId`, `sess_…`, and tokens like `[910, 101, 102]` with **no** network calls to intentLM.

Full walkthrough: [`examples/hello-world/README.md`](./examples/hello-world/README.md).

---

Goal of path A: a stable **`visitor_id`**, a **`sess_…` session id**, and an **integer token sequence** as the user navigates — with **zero** requests to intentLM.

### 1. Install (in your own app)

```bash
npm install intentlm-sdk
```

### 2. Init in the browser (no `apiKey`)

Use **`localOnly: true`** (omit `apiKey`). Map your routes to **global** token IDs (do not invent new meanings for existing IDs).

**With a bundler** (Vite, Next, etc.):

```typescript
import { intentLM } from 'intentlm-sdk'

intentLM.init({
  localOnly: true, // required when you omit apiKey — no /v1/analyze or /v1/ingest
  patterns: {
    '/': 101, // HOMEPAGE_VIEW
    '/pricing*': 102, // PRICING_VIEW
    '/checkout*': 203,
  },
  onAnalyze: (update) => {
    // Fires after navigation / capture (debounced). intent stays null in localOnly.
    console.log('visitor_id', update.visitorId)
    console.log('session_id', update.sessionId)
    console.log('tokens', update.sessionTokens) // e.g. [910, 101, 102]
  },
})
```

**Plain HTML** (no bundler): load the IIFE — see [`examples/hello-world/index.html`](./examples/hello-world/index.html). Bare `import 'intentlm-sdk'` will fail in the browser without a bundler.

Optional: import taxonomy-only helpers without `init`:

```typescript
import { INTENT_TAXONOMY, TOKEN_BY_LABEL } from 'intentlm-sdk/taxonomy'
const pricingToken = TOKEN_BY_LABEL.PRICING_VIEW // 102
```

### 3. Navigate (or call `capture`)

In your app, go to a matched route (e.g. `/pricing`), or:

```typescript
intentLM.capture('PRICING_VIEW') // same as token 102
```

### 4. Confirm success

In DevTools console (same origin as the page):

```typescript
intentLM.getVisitorId() // UUID — also cookie `_ilm_vid`
intentLM.getSessionId() // starts with `sess_`
intentLM.getSessionTokens() // integers, e.g. [910, 101, 102]
```

| Check | Passes when |
|-------|-------------|
| Visitor | `getVisitorId()` returns a UUID **and** `document.cookie` contains `_ilm_vid=…` |
| Session | `getSessionId()` is non-null and starts with `sess_` |
| Tokens | `getSessionTokens()` includes `910` (`SESSION_STARTED`) plus route tokens you mapped (e.g. `102` after `/pricing`) |
| Network | DevTools → Network: **no** calls to intentLM `/v1/analyze` or `/v1/ingest` |
| Callback | `onAnalyze` receives `sessionTokens` + `visitorId`; `intent` is `null` |

That is a successful OSS install. You own the stream — send it to your own backend/model if you want.

**Not included without a key:** hosted intent labels (`UPGRADE_SEEKING`, etc.), Insights, webhooks. For those, continue with path B.

Credit the taxonomy when you redistribute it: [`ATTRIBUTION.md`](./ATTRIBUTION.md) · [intentlm.ai/brand](https://intentlm.ai/brand).

---

## B. Managed classification — use intentlm.ai

Full install, URL patterns, consent, and proxy steps live in the product (kept up to date with the dashboard):

1. **[Create a free account](https://intentlm.ai/signup)** (10K MAS/mo)  
2. Follow **Dashboard → Setup** on [intentlm.ai](https://intentlm.ai) — API key, patterns, proxy, consent  
3. Optional CLI (uses your key): `npx -y @intentlm/cli login` then `npx -y @intentlm/cli init --push`  

Minimal shape once you have a key from Setup:

```typescript
import { intentLM } from 'intentlm-sdk'

intentLM.init({
  apiKey: 'ilm_live_...', // from Dashboard → Setup
  useRemoteConfig: true,
  configBaseUrl: '/api/intentlm',
  consentCheck: () => true, // wire your CMP before production
  patterns: {
    '/': 101,
    '/pricing*': 102,
    '/checkout*': 203,
  },
  onAnalyze: (result) => {
    console.log(result.intent, result.confidence, result.trigger_nudge)
  },
})
```

### Example managed output

```json
{
  "intent": "UPGRADE_SEEKING",
  "confidence": 0.87,
  "trigger_nudge": true,
  "session_id": "sess_abc123",
  "model_tier": "markov"
}
```

Confirm in **Insights** on [intentlm.ai](https://intentlm.ai), or via webhooks / agent docs: [intentlm.ai/docs](https://intentlm.ai/docs).

**Cost angle:** [compare intentLM vs DIY LLM intent](https://intentlm.ai/compare-cost).

---

## Privacy and network behavior

| What you do | Network |
|-------------|---------|
| Import `intentlm-sdk/taxonomy` only | None |
| `intentLM.init({ localOnly: true, patterns })` | None — tokens stay in the browser |
| `intentLM.init({ apiKey })` against intentLM | Token sequences to `/v1/analyze` and `/v1/ingest` |

[Privacy Policy](https://intentlm.ai/privacy)

---

## Package exports

| Import | Purpose |
|--------|---------|
| `intentlm-sdk/taxonomy` | Token ID ↔ label maps (**no API key**) |
| `intentlm-sdk` | Capture; use `localOnly: true` offline, or `apiKey` for hosted analyze/ingest |
| `intentlm-sdk/react` | React view helpers |
| `intentlm-sdk/actions` | Intent-driven UI (typically with managed classifications) |

---

## Licenses

| Part | License |
|------|---------|
| SDK code | [Apache License 2.0](./LICENSE) |
| Global Intent Taxonomy (`src/taxonomy.ts`) | [CC BY-SA 4.0](./LICENSE-TAXONOMY) |

[`ATTRIBUTION.md`](./ATTRIBUTION.md)

---

## Links

| | |
|--|--|
| Product & signup (10K MAS free) | [intentlm.ai/signup](https://intentlm.ai/signup) |
| Setup (managed install steps) | [intentlm.ai](https://intentlm.ai) → Dashboard → Setup |
| Cost savings vs DIY | [intentlm.ai/compare-cost](https://intentlm.ai/compare-cost) |
| Sandbox | [intentlm.ai/sandbox/b2b](https://intentlm.ai/sandbox/b2b) |
| Docs | [intentlm.ai/docs](https://intentlm.ai/docs) |
| Brand / taxonomy credit | [intentlm.ai/brand](https://intentlm.ai/brand) |

SDK / taxonomy issues → this repo. Hosted product & billing → [intentlm.ai](https://intentlm.ai).

---

## Trademark

intentLM™ is a trademark of Suman Bhattacharya.  
Apache-2.0 / CC BY-SA 4.0 do **not** grant rights to use the intentLM name in your product title or branding.  
Nominative use with attribution is fine — [intentlm.ai/brand](https://intentlm.ai/brand).
