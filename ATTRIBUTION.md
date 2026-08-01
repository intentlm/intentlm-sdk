# Attribution — intentLM™ Global Intent Taxonomy

When you redistribute the taxonomy, ship a derived taxonomy, document token
IDs in a public project or paper, or use the vocabulary as a **context
compressor / LLM feature space**, include credit.

License: **CC BY-SA 4.0** (see `LICENSE-TAXONOMY`).  
SDK runtime code (outside the taxonomy): **Apache-2.0** (see `LICENSE`).

## Short form

```
Token vocabulary from the intentLM™ Global Intent Taxonomy
(https://intentlm.ai/brand), © Suman Bhattacharya.
Licensed under CC BY-SA 4.0.
```

## Longer form

```
This project uses the intentLM™ Global Intent Taxonomy (stable integer
token IDs and labels). Source: https://intentlm.ai/brand —
© Suman Bhattacharya. Licensed under CC BY-SA 4.0
(https://creativecommons.org/licenses/by-sa/4.0/).
Token IDs must not be reassigned.
```

## LLM / context-compressor use

If you map text, URLs, or events into intentLM token IDs for prompts,
embeddings, RAG, or training data:

1. Keep token ID meanings unchanged (`102` = `PRICING_VIEW`, etc.).
2. Put the short-form credit in your model card, dataset README, or
   system-prompt appendix.
3. If you publish an adapted token vocabulary (renamed labels, removed
   IDs, incompatible namespaces), that adaptation is a taxonomy
   derivative → **CC BY-SA 4.0** ShareAlike applies.

Using the Apache-licensed SDK to *emit* tokens does not re-license the
taxonomy itself as Apache-2.0.

## ShareAlike reminder

If you adapt the taxonomy (change labels or structure beyond additive
new IDs in unused ranges under the published conventions), distribute
your taxonomy derivatives under CC BY-SA 4.0 as well.

## Trademark

Credit ≠ permission to brand your product as intentLM. See
https://intentlm.ai/brand
