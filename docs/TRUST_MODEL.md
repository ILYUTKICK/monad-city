# Monad City — Trust and Evidence Model

## Principle

AI may summarize and infer. It must not silently convert inference into verification.

## Phase 3.5 review gate

The local evidence workspace and the source-backed runtime snapshot are different layers. A
candidate record can use exactly one workflow status:

- `proposed`: entered but not ready for review;
- `needs-review`: structurally complete and awaiting a maintainer decision;
- `approved`: accepted for the record's exact bounded scope and eligible for the runtime snapshot;
- `rejected`: reviewed and excluded from the runtime snapshot;
- `stale`: withdrawn from the current runtime snapshot pending refresh or a superseding record.

Only `approved` records may appear in the source-backed runtime view. Proposed, needs-review,
rejected, and stale workflow records remain inspectable in the candidate workspace but cannot
be projected as sourced relationships or Navigator citations. These lowercase workflow statuses
are independent from claim status (`Observed`, `Claimed`, `Attested`, `AI-inferred`) and from
quality flags (`conflict`, `incomplete`, `stale`, `unavailable`, `timeBoundEligible`). For example,
an approved record may retain `quality.stale: true` as usable historical evidence; it still may
support only that historical scope and must surface the warning.

The checked-in Phase 3.5 snapshot is a manually reviewed static snapshot. It has a version,
`createdAt`, and `reviewedAt`; it is not a live indexer. Updating claim content, source identity,
scope, provenance, identifiers, or limitations requires a new immutable evidence ID with explicit
revision lineage. Review status and `reviewedAt` may change on the same candidate without changing
the evidentiary payload. The validator rejects reuse of an ID for changed evidence content.

Every sourced relationship must have one or more evidence IDs resolving to approved records in
the same snapshot. Demo relationships remain separate and carry a deterministic unavailable
placeholder reference (`demo:relationship:<id>:unavailable`); that reference supports only the
fact that no evidence is connected.

## Phase 3.6 promotion gate

Review approval and runtime promotion are separate maintainer decisions. An approved JSON
snapshot becomes eligible for the application only after all of these checks pass:

1. the snapshot validates as approved-only and every relationship resolves to approved evidence;
2. a maintainer inspects the diff and explicitly confirms the exact snapshot `version`,
   `reviewedAt`, and canonical SHA-256;
3. the local promotion command creates a new version-named generated module using exclusive file
   creation;
4. the active import in `src/evidence.js` is changed in a normal reviewed code diff;
5. the build verifies byte-independent canonical equality between the checked-in JSON snapshot
   and the generated runtime object.

The active `phase-3.5-v2` snapshot has canonical SHA-256
`8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58`. The digest identifies the
exact reviewed snapshot payload; it is not an evidence confidence score, project verification,
endorsement, signature, or source-freshness claim.

There is no moving `latest` module. A promoted file is named `<snapshot-version>.generated.js`,
is deeply frozen at runtime, and cannot be overwritten by the workflow. Promotion never opens or
fetches a source, changes review status, approves a record, or automatically switches the active
runtime import. A version change therefore remains explicit, local, reproducible, and human-gated.

## Phase 3.7 review governance policy

Phase 3.7 uses review policy `phase-3.7-review-policy-v1`. It adds cadence and reviewer-action
provenance without changing the active `phase-3.5-v2` evidence payload, its 22 approved records,
its six approved sourced relationships, or canonical SHA-256
`8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58`. The immutable v1 pair
remains the rollback boundary.

The policy keeps six conditions separate:

- `reviewDue` is a derived governance condition. At a caller-supplied `asOf` instant it means the
  applicable review interval has elapsed. It does not edit the record or its review status.
- `quality.stale: true` is an immutable evidence-payload warning that a record is historical or
  outdated for some scope. An approved record may retain it and remain usable for its exact
  historical proposition.
- `reviewStatus: stale` is an explicit human withdrawal decision. It removes a candidate from the
  approved projection; the workflow must never derive it from time alone.
- `reviewStatus: rejected` is an explicit human decision that a candidate is not accepted for its
  proposed scope. Rejection is not the same as an approved record later being withdrawn as stale.
- an unavailable source means the referenced source could not be inspected at the review instant.
  It is a source-access finding, not proof that the underlying claim is false and not an automatic
  rejection or stale decision.
- a conflicting source means named evidence disagrees or uses incompatible identity, network,
  address, role, or scope. Conflict must remain visible and bounded; it is not automatically
  resolved by source count, reviewer metadata, or approval.

Expiry creates `reviewDue` only. A due approved record remains approved in the already promoted
snapshot until a human records `approved`, `rejected`, or `stale` in a new review artifact. A new
promotion must not silently carry a due item forward: it requires an explicit decision under the
current policy. Unavailability, conflict, or other quality findings may lead a reviewer to retain a
bounded approved historical record with warnings, create an immutable successor, reject a new
candidate, or explicitly mark a prior candidate stale. None of those outcomes is automatic.

### Review intervals

Intervals are exact elapsed UTC days from the review action's `reviewedAt` value. Evidence cadence
starts with the exact `evidenceType` / source-reference row and adds any applicable warning
intervals; the shortest interval wins, so a warning cannot postpone a shorter base cadence.

| Evidence/source class | Interval |
|---|---:|
| Source unavailable at the governed payload (`source.available: false` or `quality.unavailable: true`) | 7 days |
| Conflicting evidence (`quality.conflict: true`) | 30 days |
| Incomplete evidence (`quality.incomplete: true`) | 60 days |
| `official-directory-listing` or `project-address-publication` on a mutable URL | 30 days |
| `project-declared-relationship` on a mutable URL | 60 days |
| `project-declared-relationship` in a pinned publisher snapshot | 60 days |
| `network-configuration` or `project-documentation` on a mutable URL | 90 days |
| `official-launch-record` on a mutable URL | 180 days |
| `protocol-registry-snapshot` with a pinned snapshot | 365 days |
| `explorer-transaction` with a stable artifact URL | 365 days |

An evidence type/reference combination absent from this table is a policy-validation error, not a
license to choose a convenient default. `quality.stale` does not shorten the interval by itself:
it already bounds the record to historical scope. A relationship is due at the earlier of its own
type interval—30 days for `ecosystem_membership`, 60 days for `declared_integration`—and the
earliest `nextReviewAt` of any referenced evidence record.

Reviewer metadata records the review action only. It consists of `reviewerRef`, `reviewerRole`,
`reviewedAt`, `reviewMethod`, `decisionReason`, and `reviewPolicyVersion`, with the exact controlled
values and validation rules defined in `docs/EVIDENCE_DATA_CONTRACT.md`. It does not authenticate a
person, organization, source, signature, publisher, or wallet and does not prove source truth,
endorsement, safety, legitimacy, activity, freshness, or onchain validity.

For compatibility, Phase 3.7 should add a versioned governance companion bound to the exact v2
version and hash rather than mutate v2. The companion may truthfully use a reserved unattributed
legacy reference for v2 decisions because the existing snapshot does not identify a reviewer. It
must not invent a person's name, organization, signature, authority, or endorsement. Future
snapshots place the same metadata inline on each explicit evidence and relationship decision; the
compatibility companion is not a second evidence source and cannot change claim payloads.

## Project states

### Observed

The system directly inspected a named public artifact: for example, a transaction, deployed contract, repository snapshot, directory entry, official announcement, or documented event. `Observed` applies only to the exact artifact and bounded claim in the evidence record.

Observed does not mean trustworthy, endorsed, safe, current, or controlled by the project whose name appears in a source or explorer label.

### Claimed

An identifiable publisher made the bounded statement recorded in the evidence. The publisher may be a project documentation/site owner, or—when separately proven—a wallet or authorized representative.

Project-documentation `Claimed` records prove only that the named publisher made the statement. They are not wallet claims and do not prove control of a signing identity, contract ownership, quality, legality, safety, current operation, or endorsement. A signed owner claim must preserve its signer and verification method as separate provenance; even then it proves control of the signing identity only.

### Attested

A defined third party or peer provided an attestation with an identifiable source and timestamp.

The UI must name the attestor and scope of the attestation. “Attested” must never be a generic green check without context.

The Phase 3 curated slice contains no real `Attested` record. Official-directory inclusion, registry presence, cross-source agreement, and explorer labels do not become attestations merely because a third party published them.

### AI-inferred

The model proposed a category, description, similarity, or relationship from available evidence. This is useful for discovery but is not proof.

AI-inferred records must set factual-support eligibility to false. They may route discovery or suggest follow-up research, but cannot satisfy a factual answer or upgrade another evidence state.

## Relationship types

- `onchain_interaction`: contract/event evidence shows an interaction.
- `declared_integration`: project documentation explicitly names the integration.
- `owner_claimed`: a project representative submitted the relationship.
- `third_party_attestation`: a named external attestor confirmed it.
- `semantic_similarity`: AI or embedding-based suggestion; never render as verified.
- `ecosystem_membership`: project appears in a curated or official directory.

## Evidence object

Every non-illustrative claim should be representable as:

```json
{
  "id": "E-PROJECT-REL-001",
  "projectId": "project-a",
  "relatedProjectIds": ["project-b"],
  "claim": "Project A documentation names Project B as an integration.",
  "evidenceType": "project-declared-relationship",
  "status": "Claimed",
  "source": {
    "kind": "documentation-html",
    "url": "https://example.com/docs/integrations",
    "title": "Integration documentation",
    "publisher": "Project A",
    "available": true,
    "immutable": false
  },
  "retrievedAt": "2026-09-08T12:00:00Z",
  "publishedAt": null,
  "network": { "name": "Monad mainnet", "chainId": 143 },
  "scope": "One-sided project declaration only.",
  "provenanceNotes": "Retrieved from Project A documentation.",
  "limitations": ["No reciprocal confirmation was found."],
  "quality": {
    "conflict": false,
    "incomplete": false,
    "stale": false,
    "unavailable": false,
    "timeBoundEligible": false
  },
  "supportsFactualClaims": true,
  "dataMode": "sourced-limited"
}
```

The evidence object is a reference to support, not a truth flag. Its fields have separate jobs:

- `source` identifies where a user can inspect the support;
- `retrievedAt` records when the system retrieved the item; `publishedAt` records the source or exact onchain artifact timestamp only when available and is otherwise `null`;
- `scope` states the narrow proposition the item can support;
- `provenance` identifies who or what produced the record;
- `confidence` describes an assessment method only when that method is defined. It is not a substitute for source, scope, or provenance.

Every factual proposition surfaced by the Navigator must resolve to an explicit evidence reference ID. In Demo mode that reference may point to an unavailable placeholder, but the placeholder supports only the statement that evidence is unavailable. It does not support the illustrative project description, category, state, relationship, integration, deployment, activity, quality, safety, or legitimacy.

Evidence availability and evidentiary support are distinct:

- an available URL shows that a source can be inspected;
- an available URL plus a parseable timestamp shows source/timestamp completeness;
- neither condition proves that the source supports the user’s exact wording;
- support additionally requires matching subject identity, claim type, network or environment where relevant, bounded `scope`, and any claim-specific fields such as contract address, transaction, event, attestor, or signer.

For time-bound terms such as `active`, `live`, `current`, `recent`, or `latest`, a timestamp alone is insufficient. The evidence scope must define the measured event and time window. A deployment record can support “deployed” but does not, by itself, support “active.”

## Phase 3 limited-real-evidence slice

`src/evidence.js` contains a curated `sourced-limited` slice for exactly six existing entity IDs: `monad`, `kuru`, `aPriori`, `magma`, `switchboard`, and `pyth`. It is an evidence dataset and a set of relationship proposals, not a generic project-verification layer.

The following rules are mandatory for Architecture and UI integration:

- Evidence status belongs to an exact claim. A project must never receive a generic “verified,” “approved,” “legitimate,” or “safe” badge because one or more records exist.
- `Claimed` project documentation remains publisher-attributable wording. It is not an `owner_claimed` wallet relationship unless signer identity and verification provenance exist.
- `Observed` explorer records support only the exact transaction, contract address, decoded function/event, status, and timestamp shown. They are not endorsement, code audit, ownership proof, or open-ended activity evidence.
- No real record in this slice is `Attested`; Architecture must not synthesize an Attested state from directory inclusion, registry presence, or source agreement.
- No factual record is `AI-inferred`. An AI-inferred proposal must remain non-factual and unable to satisfy evidence-reference requirements.
- `publishedAt` is a parseable ISO timestamp or `null`, never the string `unavailable`. A normalized day-level timestamp must disclose its precision.
- Sourced records keep explicit `conflict`, `incomplete`, `stale`, `unavailable`, and `timeBoundEligible` flags. Absence of a warning flag is not a positive trust judgment.
- Monad protocol-registry URLs are immutable commit permalinks at ingestion. A moving `main` URL is provenance for future refresh only, never the runtime source for an existing evidence record.
- Kuru router roles remain conflicted: `0x0d3a…FFa2` is the only candidate, with “Flow Router” / `KuruFlowRouterV2` wording preserved; registry-only `0x465D…7040` is held and must not be exposed as current.
- Pyth address claims remain bounded and dated. `E-PYTH-CAP-001` is stale candidate history and is
  absent from the approved runtime; no positive replacement contract-address claim was invented.
  The remaining approved Pyth records support only their exact membership, push-feed, registry,
  and historical artifact scopes.
- The prototype `aPriori` ID remains a legacy compatibility label scoped to current Capricorn/aprMON evidence. The `apr.io` redirect does not prove every historical aPriori claim and does not authorize a silent entity rename.
- Six approved source-backed relationship records are integrated through the active promoted snapshot. Any new or non-approved relationship remains a candidate and cannot enter runtime until review and promotion succeed. Unsupported relationships remain `demo`/illustrative.
- Demo project and relationship records remain available as an explicit fallback and must stay visibly labeled when no sourced record supports the requested claim.

## Static Demo relationship contract

Phase 1 uses typed relationship records even though the current dataset is illustrative. Every relationship record must contain:

- `type`: one of the relationship types defined above;
- `evidenceState`: `onchain-observed`, `owner-claimed`, `third-party-attested`, `AI-inferred`, or `illustrative`;
- `source`: a source object, including an explicit unavailable placeholder when no source is connected;
- `timestamp`: an ISO timestamp for real evidence, or `null` for a Demo placeholder;
- `scope`: a bounded statement describing exactly what the evidence would support;
- `provenance`: who or what produced the record, or an explicit Demo-only placeholder;
- `confidence`: an evidence confidence value, or `not-assessed` when no evidence exists;
- `dataMode`: `demo` for every Demo relationship record.

The five Phase 1 relationship evidence states mean:

- `onchain-observed`: contract or event evidence would be required. In Demo mode this is only a presentation pattern unless a source and timestamp exist.
- `owner-claimed`: a signed or attributable representative claim would be required. It proves control of that identity only, not safety or quality.
- `third-party-attested`: a named attestor, scope, source, and timestamp would be required. A generic green check is not sufficient.
- `AI-inferred`: a model or similarity system proposed the edge. It is useful for discovery and is never proof.
- `illustrative`: the edge exists only to demonstrate the interface and asserts no factual ecosystem relationship.

The Demo relationship layer intentionally uses unavailable evidence placeholders. The active hybrid graph also contains six separately labelled approved `sourced-limited` relationships from the promoted snapshot; those records never upgrade or relabel the remaining Demo edges:

```json
{
  "type": "onchain_interaction",
  "evidenceState": "onchain-observed",
  "source": {
    "kind": "placeholder",
    "title": "No source connected",
    "url": null,
    "available": false
  },
  "timestamp": null,
  "scope": "Demonstrates how an onchain-observed edge would appear; no contract or event evidence is connected.",
  "provenance": {
    "kind": "illustrative-placeholder",
    "label": "Demo dataset",
    "actor": null
  },
  "confidence": "not-assessed",
  "dataMode": "demo"
}
```

An evidence-state label never upgrades a Demo placeholder into verification. The UI must pair these records with `Demo pattern`, `Illustrative`, `No source connected`, or equivalent language.

## State separation

Project states and relationship evidence states are different vocabularies and must not be collapsed during search or presentation:

- `Observed`, `Claimed`, `Attested`, and `AI-inferred` describe a project-profile claim pattern;
- `onchain-observed`, `owner-claimed`, `third-party-attested`, `AI-inferred`, and `illustrative` describe an edge evidence pattern;
- “Claimed projects” filters project state `Claimed`; “owner-claimed relationships” filters edge state `owner-claimed`;
- “Attested projects” filters project state `Attested`; “third-party-attested relationships” filters edge state `third-party-attested`;
- ambiguous state language must not silently substitute an edge pattern for a project state, or vice versa.

In the current Demo dataset, state filtering can retrieve illustrative records, but no state label satisfies a proof requirement.

## UI requirements

- Show the state and the meaning of the state together.
- Let users open the source behind important claims.
- Use different visual language for proof and inference.
- Never use a single trust score as a replacement for evidence.
- Keep demo data visibly marked as demo/illustrative.

## Threats

- project websites can contain inaccurate or adversarial text;
- documentation can contain prompt injection;
- wallet ownership can be confused with real-world identity;
- self-reported integrations can be overstated;
- stale data can look current;
- similar names can cause entity confusion;
- an AI summary can hallucinate unsupported facts.

## MVP safety behavior

- whitelist source domains for seeded projects;
- store source URLs and retrieval timestamps;
- quote or link evidence for high-impact answers;
- refuse to call a project safe or legitimate;
- refuse endorsements, quality rankings, “best” recommendations, and investment conclusions rather than treating them as ordinary capability searches;
- say “not enough evidence” when the graph is incomplete;
- keep every unsupported project claim and relationship marked illustrative; only the six approved
  `sourced-limited` relationships and exact claims joined to their evidence IDs may appear as
  source-backed;
- preserve the `demo` fallback alongside the curated `sourced-limited` slice.
