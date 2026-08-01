# intentlm-sdk

Open-source browser SDK and **Global Intent Taxonomy** for [intentLM™](https://intentlm.ai).

Turn in-app navigation into a privacy-safe shared token vocabulary — then optionally plug into managed intent classification for agents, webhooks, and product nudges.

**npm:** [`intentlm-sdk`](https://www.npmjs.com/package/intentlm-sdk)

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
| **A. Open source — taxonomy** | **No** | Stable token IDs & labels for your own compressor, analytics, or models |
| **B. Managed classification** | **Yes** (`ilm_live_…`) | Real-time `intent` + `confidence` via intentLM inference |

Today, `intentLM.init({…})` is built for path **B** and **requires an API key**. Path **A** does not call `init` — import the taxonomy (and map events yourself).

---

## A. Open source — no API key

Install:

```bash
npm install intentlm-sdk
```

Use the Global Intent Taxonomy locally:

```typescript
import { INTENT_TAXONOMY, TOKEN_BY_LABEL } from 'intentlm-sdk/taxonomy'

// Shared meaning across products — do not reassign IDs
const pricingToken = TOKEN_BY_LABEL.PRICING_VIEW // 102

// Example: map your own routes → tokens (no network)
function pathToToken(pathname: string): number | undefined {
  if (pathname.startsWith('/pricing')) return 102
  if (pathname === '/') return 101
  return undefined
}
```

Credit the taxonomy when you redistribute it: [`ATTRIBUTION.md`](./ATTRIBUTION.md) · [intentlm.ai/brand](https://intentlm.ai/brand).

When you want **hosted intent labels** instead of building your own classifier, continue with path B.

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
    '/checkout/**': 203,
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
| Your own code mapping paths → token IDs | None (unless you send tokens somewhere) |
| `intentLM.init({ apiKey })` against intentLM | Token sequences to `/v1/analyze` and `/v1/ingest` |

[Privacy Policy](https://intentlm.ai/privacy)

---

## Package exports

| Import | Purpose |
|--------|---------|
| `intentlm-sdk/taxonomy` | Token ID ↔ label maps (**no API key**) |
| `intentlm-sdk` | Capture + hosted analyze/ingest (**API key required** for `init`) |
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
