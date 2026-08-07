# Hello world — intentLM SDK (`localOnly`)

Two pages in one demo (**http://localhost:3456**):

1. **Capture checklist** (`#capture`) — visitor id, session, tokens, scroll checks  
2. **Own the stream** (`#backend`) — `getSessionSnapshot()`, getters, **Send snap to my backend** (logs in this terminal)

No API key. Nothing is sent to intentLM.

## Quick start

```bash
# from the SDK repo root (needs dist/)
npm install && npm run build

cd examples/hello-world
npm install
npm start
```

Open **http://localhost:3456** (or **http://localhost:3456/#backend** for the pull/send page).

Leave the terminal open — **Send snap to my backend** prints `POST /ingest` there.

## Page 2 snippet

```js
const snap = intentLM.getSessionSnapshot()

await fetch('/ingest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(snap),
})
```

Or snake_case for your API:

```js
await fetch('https://your-api.example/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    visitor_id: snap.visitorId,
    session_id: snap.sessionId,
    tokens: snap.tokens,
    time_deltas_ms: snap.timeDeltasMs,
  }),
})
```

Demo server: [`server.mjs`](./server.mjs).

## Success criteria (page 1)

| Check | Expect |
|-------|--------|
| Visitor | UUID; cookie `_ilm_vid` |
| Session | `sessionId` starts with `sess_` |
| Tokens | `910` + route tokens (`102`, `203`) |
| Deltas | `timeDeltasMs.length === tokens.length` |
| Scroll | `911` / `906` / `912` when you scroll |
| Network | No intentLM `/v1/*` traffic |
| Intent | Stays `null` without an API key |

## From a fresh clone

```bash
git clone https://github.com/intentlm/intentlm-sdk.git
cd intentlm-sdk
npm install && npm run build
cd examples/hello-world
npm install && npm start
```
