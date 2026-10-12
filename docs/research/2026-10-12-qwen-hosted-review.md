# Hosted Qwen architecture and trust review — 2026-10-12

Reviewer owns this document only. Application implementation and deployment belong to the lead and assigned frontend/backend agents.

## Scope

The owner explicitly requests Qwen Max on the existing Vercel deployment and selects OpenRouter. The intended hosted path is a same-origin server endpoint using the fixed `qwen/qwen3.8-max-0902` model and an `OPENROUTER_API_KEY` server environment secret. This request authorizes a bounded application backend for this feature; the earlier static-only limitation does not prohibit the requested implementation.

The endpoint must construct its own graph tools and model messages. It must not become a generic model proxy. Existing deterministic retrieval remains the map authority. The hosted agent may select approved evidence IDs retrieved through four local graph tools; application code renders exact claims, statuses, sources, scope and limitations. Browser publication checking is a separate read-only flow; the hosted agent must not imply it executed that check.

## Acceptance checks before publication

- GET availability reports whether the server is configured and names the fixed model. It does not imply a provider call succeeded.
- POST accepts only a bounded question, rejects client model/messages/tools/endpoint overrides, and constructs authoritative data and tools from checked-in modules.
- The owner secret is absent from browser assets, API responses, diagnostic logs and public Git files. Provider error bodies never reach the user.
- Request body, question, total request duration, completion tokens, completion rounds and per-round tool fanout have explicit limits. An abort cancels provider fetches. A rate/concurrency gate bounds shared-key use; in-memory gates are explicitly instance-local rather than presented as a global quota.
- Browser-origin requests are constrained to the served origin; there is no permissive CORS policy. Origin checks are not described as authentication and do not stop an arbitrary HTTP client from imitating the public origin.
- Unsupported or insufficient-evidence questions retain deterministic results without fabricated AI success. Provider errors and timeouts retain local navigation and show a truthful fallback.
- Hosted output accepts only retrieved eligible evidence IDs or previously computed coverage. Model prose cannot substitute for source claims. Unsupported IDs, unknown selections, incomplete provider output and excessive tool calls are rejected.
- UI identifies Qwen use only when the hosted/provider agent is available and reports actual completed tool work; source review approval, publication inclusion and model selection remain distinct.
- Tests simulate provider calls without real keys or network. Production validation must separately exercise a real provider request after the owner secret is configured.

## Initial assessment

The existing `runNavigatorAgent` already constrains the final response to one of evidence selection, computed coverage, or insufficient evidence, and prevents a claim unsupported by retrieved eligible records. Its original six-round / 700-token bounds do not by themselves bound tool-call fanout within a round. The new shared-secret server path needs an explicit fanout cap and total abort timer.

OpenRouter model availability and compatibility do not establish acceptance by the hackathon organizer. The saved sponsor requirements are historical observations from October 8; the private current track page has not been independently reverified by this reviewer.

## Implementation review

Read-only review covered `api/navigator.js`, `src/ai.js`, `src/main.js`, `src/projects.js`, the local server bridge and `vercel.json`.

- The endpoint imports the shared 176-project graph, approved v9 records and relationships. The extracted project block was compared against Git HEAD and is byte-identical apart from its exported declaration; profile evidence initialization and validation are preserved.
- GET exposes only a configured boolean and the fixed model, with `Cache-Control: no-store`. POST accepts exactly `{question}`, 1–500 trimmed characters, valid UTF-8 JSON and at most 4096 bytes. Model/messages/tools overrides fail before provider work.
- Server calls OpenRouter with its environment key, fixed model, four local graph tools, six completion rounds and 700 output tokens per round. Shared agent code rejects more than eight tool calls in a round before execution. Responses discard upstream model names and provider error details.
- Origin allowlist permits the public canonical origin and current Vercel deployment URL; loopback development is unavailable under Vercel. There is no permissive CORS response. The endpoint has two concurrent requests and eight requests per IP per minute per running instance; these are process-local bounds, not global authentication or billing controls.
- The agent deadline is 80 seconds after body parsing; it aborts provider fetches. Vercel configuration allows 90 seconds and cancellation. The local server bridges request abortion and unfinished response closure without treating a normally completed request body as a disconnect.
- Browser evidence results rehydrate IDs from the approved local snapshot and ignore server-supplied claim/prose fields. Exact source claims, statuses and limitations remain application-rendered. Coverage text comes from the server's fixed local-tool count template. Hosted traces are escaped, and the corrected client trace cap accommodates 48 tool calls rather than confusing six completion rounds with six calls.
- Hosted Qwen is preferred; unavailable configuration preserves local retrieval and optional custom settings. Server failure does not erase deterministic navigation. No server publication-check tool is registered.

Independent simulated checks passed: **26/26 AI tests and 9/9 server endpoint tests**, without real keys or provider network requests.

The cancellation race found during review was repaired by the backend owner. Already-aborted signals return 408 before provider invocation, with a second guard after listener registration; the regression proves no paid work starts. The deadline additionally races agent completion, so an abort-ignoring simulated runner cannot leave the handler awaiting forever.

No unresolved blocker was found in this bounded code review. Actual production inference and organizer acceptance are outside these simulated results.
