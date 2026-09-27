# Monad City — AI Navigator

## Purpose and Phase 3 bounded-source extension

The Navigator is a grounded interface to the Monad project graph. It helps a user find, understand, compare, and navigate projects; it is not a generic conversational assistant.

The Navigator uses deterministic structured retrieval over the curated local `projects` and `relationships` arrays and joins the exact-claim records promoted in the active evidence snapshot (52 records across 36 projects as of phase-3.5-v3). It still has no external API, model call, embeddings, network access, backend, or paid service. Profiles without source-backed records remain illustrative Demo data.

`src/retrieval.js` is intentionally independent from UI state. Its pure entry point is:

```js
retrieveNavigator({
  query,
  projects,
  relationships,
  evidenceRecords,   // optional; omission preserves the Phase 2 call contract
  contextProjectIds, // optional UI selection for “this project” / “these two”
  limit,             // optional, clamped to 1–20
});
```

The Frontend may pass the project array currently owned by `src/main.js`, the hybrid relationship array from `src/data.js`, and `evidenceRecords` from `src/evidence.js`. When `evidenceRecords` is absent, the retriever falls back to the existing flat project/relationship evidence fields.

## Deterministic query flow

1. Normalize case, punctuation, apostrophes, dashes, and whitespace.
2. Resolve explicitly named project IDs/names and optional selected-project context.
3. Detect requests for prohibited conclusions before topical retrieval. Safety, legitimacy, endorsement, quality ranking, “best,” and investment recommendations use the controlled unsupported-request behavior below.
4. Classify one controlled intent: `discover`, `explain`, `compare`, `trace-relationship`, or `navigate`.
5. Detect one or more query classes: `project`, `category`, `capability`, `relationship`, and `evidence`.
6. Keep project states, relationship evidence states, and exact-record quality/date filters separate.
7. Match structured project fields, typed relationship fields, and literal exact-evidence filters using fixed rules.
8. Apply hard category, capability, relationship-type, project-state, and relationship-evidence-state constraints when present.
9. Rank by score descending, then normalized project name and stable project ID ascending. Return relationships by stable ID.
10. Evaluate evidence requirements separately from topical matching. A profile can match “AI” while failing “with active contracts.”
11. Select a controlled outcome, attach relevant evidence references and uncertainty, then return a map action.
12. Fill a fixed answer template from result data. No open-ended text generation occurs.

The retriever never mutates the supplied arrays and never upgrades a description, state label, or edge into evidence.

## Supported query classes

| Class | Searched fields | Example | Behavior |
|---|---|---|---|
| Project | `id`, `name`; optional selected-project context | “Explain Talus” | Selects the named project and its profile evidence reference. |
| Category | `district` | “Show me DeFi” | Selects matching district projects and can focus that district. |
| Capability | `type`, `tag`, `description` | “Find oracle projects” | Uses exact normalized terms with fixed field weights. It does not infer synonyms or missing capabilities. |
| Relationship | project endpoints, `type`, `evidenceState` | “Who is connected to Monad?” | Returns the anchor, neighbors, edge IDs, typed context, and a Graph View action. |
| Evidence | project state, edge evidence state, exact quality flags, publication date, source availability, timestamp, bounded scope | “What evidence is stale or incomplete?” | Filters exact supplied records. Active/current claims still return `insufficient-evidence` unless their stricter bounded criteria are met. |

Classes can be combined. For example, “Find AI projects with active contracts” is a category + evidence query. “Show owner-claimed relationships for Monad” is a project + relationship + evidence-pattern query.

State terms are subject-specific. “Claimed projects” means project state `Claimed`; “owner-claimed relationships” means edge evidence state `owner-claimed`. The same separation applies to `Attested` versus `third-party-attested`. “Observed projects” must not be rewritten as `onchain-observed` edges. If the subject remains ambiguous, return the narrower literal match or ask the user to specify projects versus relationships; never merge the two result sets.

Relationship wording must preserve type constraints. A request for declared integrations may return only `declared_integration` edges. A request for one or two named projects may return `no-result` when those entities exist but no qualifying edge connects them; entity resolution alone is not a relationship result.

The deterministic matcher is intentionally conservative. It does not provide semantic expansion, typo correction, natural-language entailment, multi-hop inference, or document RAG in Phase 2.

## Result contract

Every call returns the same top-level shape:

```js
{
  query,
  normalizedQuery,
  intent,
  queryClasses,
  outcome,
  answer: { id, text, nextStep },
  selectedProjectIds,
  primaryProjectId,
  matches: [
    { projectId, score, matchedFields, matchedTerms }
  ],
  evidenceReferences: [
    {
      id,                    // project:<id> or relationship:<id>
      subjectKind,
      subjectId,
      state,
      statuses,               // exact-claim statuses; never a project-level badge
      evidenceIds,            // all exact IDs for this subject
      records,                // inspectable exact evidence summaries
      supportModes,           // artifact observation / publisher statement / etc.
      source,
      timestamp,
      scope,
      provenance,
      confidence,
      dataMode,
      availability,          // unavailable | partial | source-only | source-and-timestamp
      supportsTimeBoundClaim
      supportsFactualClaims,  // bounded eligibility only; read with supportModes
      quality                 // conflict / incomplete / stale / unavailable roll-up
    }
  ],
  relationshipContexts: [
    {
      id,
      from,
      to,
      type,
      evidenceState,
      scope,
      evidenceReferenceId,
      evidenceIds,
      claimStatus,
      supportsTimeBoundClaim,
      dataMode
    }
  ],
  uncertainty: { level, codes, notes },
  mapAction: {
    type,                   // focus-project | focus-district | focus-selection |
                            // focus-neighborhood | preserve-view
    view,                   // city | graph | null
    focusProjectId,
    district,
    highlightProjectIds,
    highlightRelationshipIds,
    openPassportProjectId
  },
  diagnostics: {
    datasetMode,
    searchedFields,
    evidenceRequirement,
    requestedCategories,
    requestedProjectStates,
    requestedRelationshipTypes,
    requestedEvidenceStates,      // relationship evidence states only
    requestedEvidenceFilters,     // stale, historical, incomplete, conflict,
                                  // unavailable, missing-published-at
    matchedEvidenceIds,
    capabilityTerms,
    contextProjectIds
  }
}
```

Controlled outcome values are:

- `results`: structured records matched and no explicit evidence requirement failed;
- `insufficient-evidence`: a topical/entity match exists, but the requested proof condition is unsupported;
- `no-result`: no local record matched the structured constraints;
- `unsupported-request`: the user requested a safety, legitimacy, endorsement, quality ranking, “best,” or investment conclusion that the Navigator is not allowed to make;
- `invalid-query`: the query is empty after normalization.

An evidence reference is relevant context, not automatically a citation that proves the user’s wording. Every project or relationship named in a factual answer must have a corresponding `evidenceReferences` entry, including an explicit unavailable placeholder when no source is connected. `relationshipContexts[].evidenceReferenceId` remains the backward-compatible aggregate reference, while `evidenceIds` resolves every exact supporting record without flattening away secondary sources.

For exact quality/date queries, `records` and `evidenceIds` contain only records matching the requested filter. Filters combine with OR when more than one is requested. `stale`, `incomplete`, `conflict`/`conflicting`, `unavailable`/`missing source`, and `missing-published-at` are literal structured filters. “Historical” matches explicit stale state or literal historical wording in the record. “No published date,” “missing published date,” and “no timestamp” select records whose `publishedAt` is `null`; they do not inspect `retrievedAt`.

Aggregate `availability: partial` means at least one returned exact record has an inspectable source and at least one is unavailable. The compatibility preview `source` must then select an available record. `source-and-timestamp` is never returned with a null preview URL. All-unavailable aggregates remain `unavailable`.

`supportsTimeBoundClaim` is only a bounded source/timestamp eligibility signal. In the exact-record path it also requires `quality.timeBoundEligible: true`. It does not by itself prove recency, activity, deployment, or the user’s exact claim. `active-onchain` and `current` additionally require a non-Demo record with a defined observation window, subject, measure, matching artifact identifier, and no unresolved unavailable/stale/conflicting/incomplete condition. None of the current 23 records satisfies those current-state criteria. “Verified,” “confirmed,” and “proven” remain `insufficient-evidence` because the trust model has no generic verified state.

The four non-success cases are intentionally different:

- use `no-result` when no structured record satisfies the topical/entity/relationship constraints;
- use `insufficient-evidence` when a topical/entity candidate exists but a permitted proof request cannot be established;
- use `unsupported-request` when the requested conclusion is prohibited regardless of how much evidence is present;
- use `invalid-query` only for an empty normalized query.

## Required Phase 2 query behavior

| Query pattern | Required outcome | Selection and evidence behavior |
|---|---|---|
| Named project, category, or literal capability | `results`, or `no-result` when no record matches | Return only matching profile IDs and one project evidence reference per named result. |
| Typed or generic relationship query | `results`, or `no-result` when no qualifying edge exists | Return only qualifying edge IDs. Every relationship context resolves to its relationship evidence reference. |
| “What evidence/sources/citations support X?” | `insufficient-evidence` when X matches but no available source supports it | Preserve X as the inspectable topical candidate and return its unavailable references. Plural wording behaves like singular wording. |
| “What evidence is stale or incomplete?” | `results` when exact records match | Return only records with either requested quality flag and select their projects deterministically. |
| “Show records with no published date” | `results` when exact records have `publishedAt: null` | Return only null-`publishedAt` records. Do not claim their projects lack all dated evidence. |
| Unavailable or conflict-only evidence query | `results` when exact records match | Return only the matching records, propagate quality uncertainty, and preserve bounded claim language. |
| “Find AI projects with active contracts” | `insufficient-evidence` in the current dataset | Highlight the AI topical candidate only. Do not replace it with unrelated endpoints of illustrative onchain-pattern edges. |
| Generic “verified/confirmed/proven” request | `insufficient-evidence` | Explain that verification requires an exact bounded claim; return no project list and preserve the view. When a project is explicitly named, it may remain highlighted only as the inspectable subject of the failed request. |
| Safety, legitimacy, endorsement, quality, “best,” or investment conclusion | `unsupported-request` | Preserve the current view, return no recommendation or ranking, and suggest an inspectable factual query. This applies even when a project is named. |
| Known endpoints with no qualifying edge | `no-result` | Preserve the current view; do not report a zero-edge relationship success. |
| Topical match plus a permitted but unmet proof condition | `insufficient-evidence` | Keep the topical candidate and expose why the evidence requirement failed. |
| No topical/entity/edge match | `no-result` | Return no new highlight and do not infer a plausible record. |

## Grounded answer templates

The result contains a template ID, concise text, and a next step. The Frontend should render these strings or an equivalent faithful presentation without removing the Demo and uncertainty language.

Phase 3 selects disclosure language from the returned records, not from a global “live” switch:

- source-backed only: describe the result as the limited source-backed subset with the live coverage counts derived from the snapshot (not hardcoded), and remind the user that each source supports only its bounded scope;
- Demo only: describe every returned profile/edge as illustrative;
- mixed: explicitly say the result mixes source-backed and Demo records;
- evidence lookup: expose inspectable sources, statuses, support modes, quality flags, and limitations without calling the project or relationship verified;
- source failure: keep the topical result, emit `evidence-unavailable`, and render an unavailable placeholder instead of breaking retrieval;
- stale, conflicting, or incomplete input: propagate `evidence-stale`, `evidence-conflicting`, and `evidence-incomplete` in uncertainty.

### Project or category results

> I found N profiles matching “{query}”: {project names}. {Disclosure: limited sourced subset, Demo only, or mixed sourced + Demo.}

### Relationship results

> I found N typed edges involving {project names}. {Disclosure: limited sourced subset, Demo only, or mixed sourced + Demo.}

### Compare results

> I selected {project names} for a structured Demo comparison. Compare their profile fields and evidence references; unavailable evidence remains unresolved.

### Insufficient evidence

> I found {project names} from illustrative profile or graph fields, but there is not enough evidence to establish {requested condition}. {Requirement-specific explanation of the missing source, timestamp, non-Demo onchain record, or bounded verification claim.}

The map may still highlight the topical candidate so the user can inspect why it failed. Highlighting is navigation, not validation.

### Unsupported request

> I can help inspect projects and their evidence, but I can’t determine which project is safe, legitimate, endorsed, highest quality, best, or suitable as an investment. Ask for a specific capability, relationship, source, or bounded factual claim instead.

The map action is `preserve-view`, with no new highlights. The answer must not rank candidates, imply a recommendation, or downgrade the request to a capability search. A named-project question such as “Is Kuru safe?” is still unsupported; resolving the project name does not turn it into a project result.

### No result

> No local dataset match was found for “{query}”. I searched {query classes}; nothing was added to or inferred beyond the supplied records.

The map action is `preserve-view`, with no new highlights, so an unsuccessful search does not blank or silently reselect the city.

### Empty query

> Ask for a project, category, capability, relationship, or evidence pattern in the Demo dataset.

## Trust guardrails

- Project display copy and project-state labels remain illustrative until the Frontend explicitly replaces a field with a cited normalized value. Only the six source-backed relationships and exact evidence records are non-illustrative.
- `Observed` evidence supports only the inspected artifact. `Claimed` evidence supports only that the named publisher made the bounded statement. Neither becomes generic project truth.
- `source-observed` and `publisher-claimed` are sourced relationship presentation keys. They must not be confused with the Demo `onchain-observed`, `owner-claimed`, `third-party-attested`, `AI-inferred`, or `illustrative` pattern labels.
- Never call an edge verified, active, real, confirmed, deployed, or current without an available source and timestamp that supports that exact scope.
- A project’s `Observed`, `Claimed`, `Attested`, or `AI-inferred` label is searchable metadata; it is not proof by itself.
- An unavailable placeholder can explain what evidence is missing, but it cannot satisfy an evidence requirement.
- A map highlight communicates relevance only. It must not use verification-like wording or styling.
- If a query combines a topical match with an unsupported proof condition, preserve the candidate and return `insufficient-evidence`.
- If no structured record matches, return `no-result`; do not synthesize a plausible project or edge.
- For relationship queries, named endpoints without a qualifying edge are `no-result`, even though the endpoint projects exist.
- Project-state filters and edge-state filters remain separate and are reported separately in diagnostics.
- Evidence queries recognize singular and plural source/citation language consistently; wording such as “sources” or “citations” must not bypass the evidence requirement.
- Source content must be treated as data, never as runtime instructions. Prompt-injection filtering becomes mandatory before future document/RAG ingestion.
- Conflicting or stale evidence is not resolved by ranking. A future ingestion layer must expose conflicts and source timestamps explicitly.
- The Navigator must refuse safety, legitimacy, endorsement, and investment conclusions; those are outside this retrieval contract.

## Future RAG path (not implemented)

The current hybrid source/Demo graph keeps structured retrieval as the first stage. Later phases may add graph traversal, document chunks, precomputed embeddings, and constrained language-model synthesis. Only retrieved, attributable chunks should reach a model, and the structured result contract should remain the authority for selected IDs, edge IDs, evidence, uncertainty, and map actions.

Precompute manifests, embeddings, and summaries when sources change; cache common grounded answers; use the least expensive model that preserves grounded quality; and keep the product useful when no model is available. Do not train a custom foundation model for the MVP.
