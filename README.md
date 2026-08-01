# intentlm-sdk

Open-source browser SDK and **Global Intent Taxonomy** for [intentLM™](https://intentlm.ai).

Use it to turn in-app navigation and UI events into stable integer token IDs, then optionally send those tokens to the intentLM API for real-time intent classification.

## What this package does

- Maps URLs and in-app views to a shared token vocabulary (for example, token `102` always means `PRICING_VIEW`)
- Keeps raw URLs and page text in the browser — only token IDs (and related non-PII metadata you configure) are eligible to leave the client
- Works with the hosted intentLM product when you supply an API key, or as a taxonomy / tokenization library in your own stack

**npm:** [`intentlm-sdk`](https://www.npmjs.com/package/intentlm-sdk)

This repository covers the **SDK and taxonomy**. For the hosted dashboard, billing, or inference support, use [intentlm.ai](https://intentlm.ai). Open issues here for SDK bugs, docs, and taxonomy questions.

## Install

```bash
npm install intentlm-sdk
```

## Quick start

```typescript
import { intentLM } from 'intentlm-sdk'

intentLM.init({
  apiKey: 'ilm_live_...',
  useRemoteConfig: true,
  configBaseUrl: '/api/intentlm',
  // Wire your consent / CMP check before production
  consentCheck: () => true,
  patterns: {
    '/': 101,
    '/pricing*': 102,
    '/checkout/**': 203,
  },
})
```

In production, proxy `/api/intentlm` to the intentLM Config API (dashboard → Setup).  
Onboarding help: `npx -y @intentlm/cli init --push`

## Privacy and network behavior

| What you do | What leaves the browser |
|-------------|-------------------------|
| Map patterns to tokens only | Token IDs are computed locally; nothing is sent until you call into a remote API |
| Call `init` with an intentLM `apiKey` (typical hosted setup) | Token sequences and timing metadata go to intentLM (`/v1/analyze`, `/v1/ingest`). Remote config may also be fetched when enabled |
| Use the taxonomy maps without the hosted API | Import `intentlm-sdk/taxonomy` for local vocabulary use — no network by itself |

If you initialize against intentLM (or any compatible remote endpoint), the SDK will send token sequences there. That is expected for hosted classification — it is not an offline-only mode.

More detail: [Privacy Policy](https://intentlm.ai/privacy) · [Brand & credit](https://intentlm.ai/brand)

## Licenses

This package is **dual-licensed**:

| Part | License |
|------|---------|
| SDK code (runtime, actions, React helpers, tests, build) | [Apache License 2.0](./LICENSE) |
| Global Intent Taxonomy (`src/taxonomy.ts` — token IDs and labels) | [CC BY-SA 4.0](./LICENSE-TAXONOMY) |

How to credit the taxonomy: [`ATTRIBUTION.md`](./ATTRIBUTION.md)

## Package exports

| Import | Purpose |
|--------|---------|
| `intentlm-sdk` | Core SDK |
| `intentlm-sdk/taxonomy` | Taxonomy constants and maps |
| `intentlm-sdk/react` | React view helpers |
| `intentlm-sdk/actions` | Intent-driven UI actions |

## Learn more

- [intentlm.ai](https://intentlm.ai) — product, dashboard, pricing
- [Brand & taxonomy credit](https://intentlm.ai/brand)
- Dashboard → Setup → Install / URL patterns

## Trademark

intentLM™ is a trademark of Suman Bhattacharya.  
Using this software under Apache-2.0 / CC BY-SA 4.0 does **not** grant rights to use the intentLM name in your product title or branding.  
Nominative references (for example, “compatible with the intentLM taxonomy”) with attribution are fine. Details: [intentlm.ai/brand](https://intentlm.ai/brand).
