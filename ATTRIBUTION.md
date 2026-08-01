# Crediting the intentLM™ Global Intent Taxonomy

The token vocabulary in this package (integer IDs and labels in `src/taxonomy.ts`)
is licensed under **CC BY-SA 4.0**. See [`LICENSE-TAXONOMY`](./LICENSE-TAXONOMY).

Everything else in this repository (the browser SDK and helpers) is licensed under
**Apache License 2.0**. See [`LICENSE`](./LICENSE).

If you redistribute the taxonomy, publish a derived vocabulary, document the
token IDs in a project or paper, or use the IDs in prompts / training data,
please include attribution.

## Suggested credit (short)

```
Token vocabulary from the intentLM™ Global Intent Taxonomy
(https://intentlm.ai/brand), © Suman Bhattacharya.
Licensed under CC BY-SA 4.0.
```

## Suggested credit (full)

```
This project uses the intentLM™ Global Intent Taxonomy (stable integer
token IDs and labels). Source: https://intentlm.ai/brand —
© Suman Bhattacharya. Licensed under CC BY-SA 4.0
(https://creativecommons.org/licenses/by-sa/4.0/).
Token IDs must not be reassigned.
```

## Using tokens with LLMs or embeddings

When you map events or text into these token IDs for prompts, embeddings,
retrieval, or datasets:

1. Keep published meanings stable (for example, `102` remains `PRICING_VIEW`).
2. Include the short credit above in your README, model card, or dataset docs.
3. If you publish a modified vocabulary (renamed labels, removed IDs, or
   incompatible namespaces), that work is a taxonomy derivative and must also
   be shared under **CC BY-SA 4.0**.

Using the Apache-2.0 SDK to generate tokens does not change the taxonomy’s
CC BY-SA 4.0 license.

## Adding new tokens

New token IDs should be additive (new IDs in unused ranges). Do not reuse an
existing ID for a different meaning.

## Trademark

Attribution satisfies the taxonomy license; it does not grant permission to
brand your product as intentLM. See [intentlm.ai/brand](https://intentlm.ai/brand).
