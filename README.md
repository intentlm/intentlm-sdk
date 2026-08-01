# intentlm-sdk

Browser SDK and **Global Intent Taxonomy** for [intentLM™](https://intentlm.ai) — real-time behavioral intent classification.

- **Tokenization is local.** URL/DOM patterns map to stable integer token IDs in the browser. Raw URLs and PII are not sent as part of the token stream.
- **Taxonomy is shared.** Token `102` always means `PRICING_VIEW` across installations — that shared vocabulary is the open standard.
- **Hosted classification is optional.** Live intent labels come from the intentLM inference API when you configure an API key and endpoint.

npm: [`intentlm-sdk`](https://www.npmjs.com/package/intentlm-sdk)

> **This repository is the open SDK + taxonomy only.** Product issues for the hosted platform (dashboard, billing, inference quality, webhooks) belong on [intentlm.ai](https://intentlm.ai) / support — not in this repo’s issue tracker unless they are clearly SDK bugs.

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
  consentCheck: () => true, // wire your CMP before production
  patterns: {
    '/': 101,
    '/pricing*': 102,
    '/checkout/**': 203,
  },
})
```

Production apps should proxy `/api/intentlm` to the intentLM Config API (see [intentlm.ai](https://intentlm.ai) dashboard Setup).

## Privacy & network behavior

| Mode | What leaves the browser |
|------|-------------------------|
| **Token mapping** | Nothing by itself — patterns → integer IDs run locally |
| **With `apiKey` (current default product path)** | Integer token sequences (+ timing metadata, opaque ids you set) to intentLM `/v1/analyze` and `/v1/ingest`. Optional remote config / discovery calls when enabled |
| **Without configuring a hosted endpoint** | Intended future: local-only compressor / taxonomy use with **no** phone-home. Today `apiKey` is still required by `init()` for the hosted product path |

**Be explicit with users:** if you call `intentLM.init({ apiKey, … })` against intentLM (or a self-hosted compatible API), the SDK will send token sequences to that endpoint. Do not describe the package as “fully offline” while using hosted analyze/ingest.

Hosted product + privacy policy: [intentlm.ai](https://intentlm.ai) · [Privacy](https://intentlm.ai/privacy) · [Brand](https://intentlm.ai/brand)

## Licenses (dual)

| Material | License |
|----------|---------|
| SDK code (`src/intentlm.ts`, actions, react helpers, build, tests, …) | **Apache-2.0** — see [`LICENSE`](./LICENSE) |
| Global Intent Taxonomy (`src/taxonomy.ts`, token IDs & labels) | **CC BY-SA 4.0** — see [`LICENSE-TAXONOMY`](./LICENSE-TAXONOMY) |

Credit examples: [`ATTRIBUTION.md`](./ATTRIBUTION.md). Trademark rules: [intentlm.ai/brand](https://intentlm.ai/brand).

`package.json` uses `"license": "SEE LICENSE IN LICENSE"` because this package is dual-licensed.

## Subpath exports

| Import | Use |
|--------|-----|
| `intentlm-sdk` | Core SDK |
| `intentlm-sdk/taxonomy` | Taxonomy constants / maps |
| `intentlm-sdk/react` | React view helpers |
| `intentlm-sdk/actions` | Intent-driven UI actions |

## Docs & product

- [intentlm.ai](https://intentlm.ai) — hosted intent, dashboard, pricing
- [Brand & taxonomy credit](https://intentlm.ai/brand)
- Dashboard → Setup → Install / URL patterns

## Trademark

intentLM™ is a trademark of Suman Bhattacharya. The open-source SDK and taxonomy are licensed separately (see above). Use of the intentLM name in a product title or confusing branding requires permission. Nominative use (e.g. “compatible with the intentLM taxonomy”) with attribution is OK.

## Maintainers

Private monorepo remains canonical for day-to-day SDK work. This tree is produced by `scripts/sync-sdk-public.sh` — see [`SYNC.md`](./SYNC.md).
