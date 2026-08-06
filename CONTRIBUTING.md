# Contributing to the Global Intent Taxonomy

**You do not need to use Git.**

## Propose a token (non-technical)

1. Open the guided form:  
   **[Propose a taxonomy token](https://github.com/intentlm/intentlm-sdk/issues/new?template=taxonomy_token.yml)**
2. Describe the behavior in everyday language.
3. Maintainers review, assign a stable ID if approved, and open the PR themselves.

Or use the same flow on the product site: **[intentlm.ai/contribute](https://intentlm.ai/contribute)**

## Before proposing

- Check whether an existing label in [`src/taxonomy.ts`](./src/taxonomy.ts) already fits — remapping your URL is usually better than a new ID.
- Company-specific events belong as **local tokens** (customer-scoped), not in this global registry.
- Security / auth events (IDs 1001–1499) must be emitted server-side, not from browser URL patterns.
- Token IDs are **immutable**. We only add; we never renumber.

## Technical contributors

If you prefer a PR: fork, add an entry only after discussion in an issue, mirror Python/docs if required by maintainers, never reuse IDs. Taxonomy is **CC BY-SA 4.0** — see `LICENSE-TAXONOMY` and `ATTRIBUTION.md`.
