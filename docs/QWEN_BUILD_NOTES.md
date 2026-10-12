# How Monad City uses Qwen to select ecosystem evidence

Originally published implementation note, 2026-10-08. Updated for the verified hosted Qwen Max release.

Monad City starts with a problem in ecosystem discovery: finding a project is easier than
understanding which statements about it have a source. The interface presents Monad projects
as a city, backed by a structured graph of projects, relationships, and bounded evidence.

## The agent's job

The hosted Qwen Max agent selects relevant evidence. It can call four local graph tools:

- `search_projects`: find named projects or literal capabilities and categories;
- `get_project_evidence`: read approved evidence for an identified project;
- `get_project_relationships`: inspect its typed edges and provenance;
- `get_district_coverage`: read data-derived counts for a district or the full city.

The retained personal browser-provider mode has an optional fifth tool,
`check_registry_publication`, which accepts an evidence ID already retrieved by
the graph tools and performs a read-only check against the configured Monad Testnet registry. It
reports exact publication inclusion or revocation at the checked block. It cannot sign a wallet,
execute a transaction, or establish source truth, safety, endorsement, or freshness.

The hosted four-tool path inspects the checked-in graph in a Vercel Function; the personal
provider mode runs its tools in the browser. Neither path crawls websites,
change the snapshot, or execute transactions. The provider receives the question and tool
results through an OpenAI-compatible chat-completions API.

## What Qwen contributes

Qwen supplies the tool-calling model for the tested agent path. It can choose which graph
tools to call, use their returned evidence to make subsequent calls, and select the records
relevant to the user's question. For example, investigating a declared integration can require
reading a project's relationships and then inspecting the exact records behind that edge.

This gives the Navigator an additional way to inspect the structured graph without a separate
hard-coded answer for every question. The deterministic search still handles basic discovery
and map focus; Qwen's contribution is the bounded tool conversation and final evidence
selection. We have not measured a quality or latency improvement over other models.

## Why final output is a selection

The model returns constrained JSON selecting 1–3 evidence IDs, previously queried coverage, or
an evidence gap. Every selected ID must have been retrieved in that tool conversation and pass
the application's eligibility checks. Unknown IDs, unqueried global IDs, unsupported fields,
and incomplete responses are rejected.

The interface gets factual text from exact source records. It shows the claim, source, claim
status, scope and limitations. AI relevance is still an inference; record validation does not
make the source accurate or current. This design limits fabricated factual prose and citations
without claiming that the model or underlying data cannot be wrong.

## Deterministic map authority

Local structured retrieval determines map selection and relationships to highlight. It remains
available with no key or a failed provider. Unsupported safety conclusions and unmet activity
requirements are handled locally rather than inviting the model to supply a confident answer.
The completion loop is capped at six rounds and eight tool calls per round. Truncated
provider output is rejected.

## Actual Qwen path and verification

The provider run documented here was performed on 2026-10-08 with `qwen/qwen3.8-max-0902`
through OpenRouter, using the owner's browser configuration. Real queries included Kuru sources
and Magma–Switchboard declared integration sources. The latter selected the exact declaration and
a Switchboard capability record, with the one-sided claim scope preserved. The trace reports
actual local tool activity; it does not reveal or manufacture hidden model reasoning. This is
historical provider evidence, not a new v9 AI-provider verification.

The hosted production path is now verified with the same `qwen/qwen3.8-max-0902` model
through OpenRouter, using a server-only Vercel Production Secret. The public deployment
`dpl_HLnpHfB2AUCWE4BpePcXKF97qyqa` serves application commit
`2ca38a735c7a725f03183039ecd23eadbd75d6bd`. Two real checks passed:

- **Show Kuru sources:** Qwen called `search_projects` and `get_project_evidence`, retrieved
  five records, and selected `E-KURU-CAP-001` (Claimed) and `E-KURU-REGISTRY-001` (Observed).
  Conflict/incomplete warnings on the registry record remain visible.
- **Show me the DeFi landscape:** Qwen called `get_district_coverage` and selected coverage
  for DeFi. The controlled answer reports 140 profiles, 140 with approved evidence, and
  166 relationships touching that scope (163 sourced, 3 illustrative or declared).

Twenty-six AI/grounding checks and nine server-boundary checks pass without an external
model call. They cover forged/unretrieved IDs, arbitrary factual prose, unavailable records,
malformed output, provider errors, truncation, round/fanout bounds, overrides, cancellation,
body limits, origin restrictions and error redaction. Real production evidence is recorded
in `docs/research/2026-10-12-qwen-hosted-release.json` and its screenshot.

## Current boundaries

The City/Graph frontend uses a static v9 snapshot, with a small hosted Navigator endpoint. Its 217 approved evidence records cover 172 of 176
displayed projects, with 194 sourced relationships and 205 total graph edges, including 11
illustrative or AI-inferred edges. Sources commonly support listing or publisher declarations,
rather than current contract activity. The app does not implement document RAG, a live indexer,
wallet execution, model training or automatic evidence refresh.

Visitors can use the hosted Qwen Max without entering a key. The server accepts only a
question, builds its own conversation from the checked-in graph, and sends the question
and tool results to OpenRouter. `OPENROUTER_API_KEY` stays in the Vercel Function and is
never part of the public static build or API responses. `GET /api/navigator` reports only
configuration availability; `POST /api/navigator` runs the bounded agent. Exact displayed
evidence is rebuilt from approved local IDs in the browser.

The endpoint has an 80-second agent deadline after parsing, bounded question/body size,
process-local rate/concurrency guards and request cancellation. Those guards are not a
global spending quota or authentication. The optional personal-provider setting remains
available when hosted Qwen is unavailable; its key stays in that visitor's browser.

The next product step is reviewed relationship coverage and evidence refresh, followed by easier
access to the structured graph for other agents.

## Try it and inspect the code

- [Monad City](https://monad-city.vercel.app/)
- [Agent implementation](../src/ai.js)
- [Vercel endpoint](../api/navigator.js)
- [AI tests](../scripts/ai-checks.test.js)
- [Server boundary tests](../scripts/server-ai-checks.test.js)
- [Recorded QA results](QA_REPORT_2026-10-08.md)

The tested model is Qwen through OpenRouter, rather than a direct Qwen Cloud endpoint. This
article documents that implementation; it does not establish acceptance for a sponsor bounty or
any requirement for a product deployed on Monad. The hosted checks document real model/tool
use and a working Vercel deployment; sponsor eligibility remains an organizer decision.
