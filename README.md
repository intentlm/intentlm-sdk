# intentlm-sdk

Open-source browser SDK and **Global Intent Taxonomy** for [intentLM™](https://intentlm.ai).

Turn in-app navigation into a privacy-safe token stream, then get a **live intent label** your agents, webhooks, and product can act on — before the user asks for help.

**npm:** [`intentlm-sdk`](https://www.npmjs.com/package/intentlm-sdk)

---

## Why use this

| Without intentLM | With intentLM |
|------------------|---------------|
| Agents and CS tools see pages or chat text after the fact | Intent is classified **while the user browses** |
| Every app invents its own event names | Shared vocabulary: token `102` always means `PRICING_VIEW` |
| Raw URLs / DOM leave the browser | Only integer token IDs are sent for classification |

**Open SDK** = capture + taxonomy in your app.  
**Managed service** = real-time classification, dashboard, webhooks, and agent context — [intentlm.ai](https://intentlm.ai).

### Free managed tier

Create an account at [intentlm.ai](https://intentlm.ai/signup) and get:

- **10,000 Monthly Active Sessions (MAS) free** every month  
- Web app instrumentation, dashboard Insights, and webhooks  
- No credit card required to start  

[Try the sandbox](https://intentlm.ai/sandbox/b2b) · [Sign up free](https://intentlm.ai/signup) · [Pricing](https://intentlm.ai/#pricing)

---

## What you get (example output)

After the user hits pricing (and enough of a sequence exists), the managed API returns a classification like:

```json
{
  "intent": "UPGRADE_SEEKING",
  "confidence": 0.87,
  "trigger_nudge": true,
  "session_id": "sess_abc123",
  "model_tier": "markov"
}
```

Your app can:

- Push that object into an **AI agent** system prompt  
- Fire a **webhook** to Slack / CRM / lifecycle tools  
- Show an in-product nudge via `intentlm-sdk/actions`  

Raw page HTML and URLs stay in the browser; the API sees token IDs such as `[101, 102, 203, …]`.

---

## Make it work — step by step

### 1. Create a free intentLM account

1. Go to [intentlm.ai/signup](https://intentlm.ai/signup)  
2. Open **Dashboard → Setup** and copy your API key (`ilm_live_…`)  
3. (Optional) Complete the install wizard or run the CLI below  

### 2. Install the SDK

```bash
npm install intentlm-sdk
```

### 3. Initialize in your web app

```typescript
import { intentLM } from 'intentlm-sdk'

intentLM.init({
  apiKey: 'ilm_live_...',           // from intentlm.ai dashboard
  useRemoteConfig: true,
  configBaseUrl: '/api/intentlm',   // proxy to Config API in production
  consentCheck: () => true,         // replace with your CMP before production
  patterns: {
    '/': 101,           // HOME
    '/pricing*': 102,   // PRICING_VIEW
    '/checkout/**': 203,
  },
})
```

**Faster path:** from your app repo:

```bash
npx -y @intentlm/cli login
npx -y @intentlm/cli init --push
```

That scans routes, suggests token mappings, and can push patterns to your account.

### 4. Proxy config in production

Browser calls should not hit the Config API with CORS-only hacks. Proxy `/api/intentlm` to the intentLM Config API (dashboard **Setup** shows the exact pattern for Next.js / Vite / etc.).

### 5. Confirm it works

1. Browse your app: home → pricing → a plan page  
2. Open [intentlm.ai](https://intentlm.ai) → **Insights** — sessions and intents should appear  
3. Or listen in the page:

```typescript
intentLM.init({
  apiKey: 'ilm_live_...',
  patterns: { '/pricing*': 102 },
  onAnalyze: (result) => {
    console.log(result.intent, result.confidence, result.trigger_nudge)
  },
})
```

### 6. Act on intent (optional)

- **Agents / MCP:** wire classifications into your agent — see [docs on intentlm.ai](https://intentlm.ai/docs)  
- **Webhooks:** Dashboard → Webhooks → your HTTPS endpoint  
- **In-product UI:** `import { initIntentLMActions } from 'intentlm-sdk/actions'`  

---

## Taxonomy only (no hosted API)

You can use the shared vocabulary without classification:

```typescript
import { INTENT_TAXONOMY, TOKEN_BY_LABEL } from 'intentlm-sdk/taxonomy'

console.log(TOKEN_BY_LABEL.PRICING_VIEW) // 102
```

To get **intent labels + confidence in real time**, use the managed inference API with an API key from [intentlm.ai](https://intentlm.ai/signup) (includes **10K free sessions / month**).

---

## Privacy and network behavior

| What you do | What leaves the browser |
|-------------|-------------------------|
| Map patterns → tokens only | Nothing remote until you call a hosted API |
| `init` with an intentLM `apiKey` | Token sequences + timing metadata to `/v1/analyze` and `/v1/ingest` |
| Import `intentlm-sdk/taxonomy` only | No network |

Hosted classification is opt-in via API key — not “fully offline” while analyze/ingest are enabled.

[Privacy Policy](https://intentlm.ai/privacy) · [Brand & credit](https://intentlm.ai/brand)

---

## Package exports

| Import | Purpose |
|--------|---------|
| `intentlm-sdk` | Core SDK (capture + analyze/ingest) |
| `intentlm-sdk/taxonomy` | Token ID ↔ label maps |
| `intentlm-sdk/react` | React view helpers |
| `intentlm-sdk/actions` | Intent-driven UI actions |

---

## Licenses

| Part | License |
|------|---------|
| SDK code | [Apache License 2.0](./LICENSE) |
| Global Intent Taxonomy (`src/taxonomy.ts`) | [CC BY-SA 4.0](./LICENSE-TAXONOMY) |

Credit guide: [`ATTRIBUTION.md`](./ATTRIBUTION.md)

---

## Links

| | |
|--|--|
| Product & signup | [intentlm.ai](https://intentlm.ai) |
| Free account (10K MAS/mo) | [intentlm.ai/signup](https://intentlm.ai/signup) |
| Live sandbox | [intentlm.ai/sandbox/b2b](https://intentlm.ai/sandbox/b2b) |
| Docs | [intentlm.ai/docs](https://intentlm.ai/docs) |
| Brand / taxonomy credit | [intentlm.ai/brand](https://intentlm.ai/brand) |

Issues in **this** repo: SDK bugs, docs, and taxonomy questions. Hosted product / billing / inference quality → [intentlm.ai](https://intentlm.ai) support.

---

## Trademark

intentLM™ is a trademark of Suman Bhattacharya.  
Apache-2.0 / CC BY-SA 4.0 do **not** grant rights to use the intentLM name in your product title or branding.  
Nominative use (e.g. “compatible with the intentLM taxonomy”) with attribution is fine — [intentlm.ai/brand](https://intentlm.ai/brand).
