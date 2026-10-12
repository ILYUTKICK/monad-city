# Monad City knowledge flow review — 2026-10-13

## Short answer

Monad City currently has a reviewed local knowledge snapshot and a constrained graph agent. It
does **not** have document RAG: there is no document chunk store, embedding model, vector database,
runtime crawler, internet-search tool, or persistent chat memory.

The city remains useful without a model. A deterministic retriever searches the checked-in project
profiles, typed relationships, and exact approved evidence records, then controls selection and map
focus. Hosted Qwen is a second, optional relevance-selection layer. It can call four read-only graph
tools and may return only approved evidence IDs or bounded dataset coverage; the UI does not render
arbitrary factual prose from the model.

## Source-to-screen path

1. Human-reviewed evidence is promoted into
   `data/evidence-snapshots/phase-3.5-v9.json`. This approved JSON snapshot is the evidentiary
   authority for the current runtime: 217 records and 194 sourced relationships. Approval means
   only that the exact bounded record may be displayed with its scope and limitations. It does not
   make a project globally verified, current, safe, legitimate, endorsed, or active.
2. Promotion generates the matching immutable runtime module
   `src/evidence-snapshots/phase-3.5-v9.generated.js`. `src/evidence.js` explicitly imports that
   version, exports `evidenceSnapshot`, `evidenceRecords`, and `relationshipProposals`, and validates
   the envelope, fields, approved-only projection, review metadata, counts, and evidence links.
   `npm run build` first runs `evidence:verify-promotion`, which requires the JSON and generated
   module to match the pinned canonical SHA-256
   `8147e7dedb389f2d8da5af63747aed71114692a1c2052fde0f14cd9b8133f088`.
3. `src/projects.js` supplies 176 shared city profiles. Their descriptions, tags, placements, and
   heights retain illustrative/profile semantics unless an exact evidence record supports a
   separately rendered claim. `src/data.js` adapts the approved relationship projection and joins
   it with the explicitly labelled illustrative fallback graph. The resulting hybrid graph has 205
   edges.
4. For every question, `src/main.js` first calls `retrieveNavigator()` from `src/retrieval.js` with
   the local projects, hybrid relationships, and approved evidence records. That pure deterministic
   result renders immediately and is authoritative for map highlights, view changes, selection,
   Passport opening, unsupported requests, and evidence-gap behavior.
5. If hosted AI is available and the deterministic outcome permits it, the browser sends only
   `{ question }` to `api/navigator.js`. The server fixes the model to
   `qwen/qwen3.8-max-0902`, keeps the OpenRouter key server-side, and supplies the same checked-in
   projects, graph, and evidence snapshot to `runNavigatorAgent()` in `src/ai.js`.
6. Qwen can call only `search_projects`, `get_project_evidence`,
   `get_project_relationships`, and `get_district_coverage`. These tools read in-memory local data;
   they do not browse sources, fetch current metrics, query a vector index, or mutate state. The
   hosted route does not expose the optional browser-side onchain publication check.
7. For a factual result, Qwen returns a JSON selection of one to three evidence IDs that it fetched
   during that tool conversation. Server validation rejects unknown, unapproved, unavailable, or
   otherwise ineligible selections. `runHostedNavigator()` then rehydrates the IDs again against
   the browser's own approved records and renders their exact claims, statuses, sources, scopes,
   warnings, and limitations. AI chooses relevance; it does not author the displayed facts. The
   earlier deterministic result still controls the map.

Each request starts a new bounded message/tool conversation. The application stores optional custom
provider settings in browser local storage, but it does not persist conversation history or build a
user-memory knowledge base.

## Why the TVL question failed

`data/research/defillama-monad-2026-09-27.json` contains numeric `tvl` values and a capture time, but
it is explicitly a research seed without review status and is not a runtime evidence authority.
Those numbers are overall protocol fields from that capture; the artifact does not provide an
approved, like-for-like Monad TVL series suitable for a current ranking.

The active v9 evidence records have no numeric `tvl` field and no approved comparison measure or
common observation timestamp for a TVL ranking. For example, Aave's active record
`E-AAVE-V3-MEM-001` supports only its dated Monad App Portal listing, categories, and tagline.
`src/projects.js` does contain illustrative/searchable profile sentences saying that DefiLlama
tracks TVL on Monad. In the reported query, the literal word “Monad” resolved to the project named
Monad, so the old retriever returned an unrelated project result with uncertainty `LOW` even though
it had no TVL value. A separate unanchored regression query such as “Who has the most TVL?” exposed the
second failure mode: it matched 111 profile descriptions and returned the first ten alphabetically.
Neither result was a metric comparison.

The truthful answer with the current runtime is therefore: the graph has evidence that certain
projects were listed in named sources, but it does not contain an approved, comparable TVL value set
that can establish which project has the highest TVL. Numeric TVL should enter product answers only
through a new reviewed, versioned evidence contract that defines chain scope, currency/unit,
observation time, source, comparison population, and staleness behavior.

## Acceptance criteria for the TVL intent fix

- Neutral metric comparisons such as “highest TVL”, “most TVL”, “largest TVL”, or “top by TVL”
  return `insufficient-evidence` while the active snapshot lacks comparable numeric TVL records.
  They must preserve the view and must not select alphabetic/profile-search matches.
- A named lookup such as “What is Aave TVL?” also must not invent or reuse the raw research value;
  it should expose the evidence gap for the named subject.
- Explicit advice or judgment such as “best investment”, “what should I buy”, or “recommend a DeFi
  project” remains `unsupported-request` under the existing safety/investment contract.
- Metric words must not broadly weaken the investment guardrail. “Best investment by TVL” is still
  advice and must remain unsupported; a neutral “largest TVL” question is a factual request with
  insufficient data, not investment advice.
- The hosted/custom model path must not run past the deterministic guard for this missing metric.
  This prevents Qwen from treating profile copy or its own knowledge as a numeric answer.
- Regression checks should cover both neutral metric comparisons and explicit investment language,
  plus a normal capability query, so the new intent rule does not turn ordinary discovery into an
  evidence-gap response.

## Known architectural limits

- Evidence is a checked-in, manually reviewed snapshot. There is no automatic freshness or live
  synchronization.
- Source-backed means the exact cited scope is inspectable; it is not a project-level verification.
- The deterministic matcher remains lexical and conservative. It does not perform semantic search,
  typo recovery, document retrieval, or multi-hop reasoning.
- Hosted rate/concurrency controls are process-local. Qwen availability means configuration is
  present, not that a given request succeeded.
- Raw files under `data/research/` may guide future reviewed ingestion, but they must never be read
  as runtime authority merely because they contain richer fields.
