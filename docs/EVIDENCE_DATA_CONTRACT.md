# Monad City — Review-Gated Evidence Snapshot Contract

## Boundary

Phase 3.5 keeps the bounded Phase 3 slice for exactly six existing IDs: `monad`, `kuru`, `aPriori`, `magma`, `switchboard`, and `pyth`. The active `phase-3.5-v2` approved projection contains 22 exact evidence records and six relationships. The controlled refresh workspace contained 24 evidence candidates and eight relationship candidates, including two stale evidence predecessors and two stale relationship predecessors; its decisions and diff are recorded in the refresh matrix and Worklog, while candidate workspaces remain separate audit artifacts. Phase 3.6 adds a separate, explicit promotion gate between an approved JSON snapshot and the checked-in runtime module. All other project fields and unsupported edges remain Demo/illustrative.

This is a manual static snapshot workflow, not a generic verification layer. It does not implement live sync, scraping, automatic discovery, wallet claims, attestations, safety scoring, a database/backend, or an external model.

## Snapshot envelope and exports

The checked-in artifacts are deliberately separate:

- `data/evidence-snapshots/phase-3.5-v2.json`: the active approved, human-reviewed JSON snapshot;
- `src/evidence-snapshots/phase-3.5-v2.generated.js`: the active deterministic, deeply frozen runtime module generated from that exact JSON payload;
- the versioned `phase-3.5-v1` JSON/module pair: the preserved explicit rollback boundary;
- `src/evidence.js`: the explicit active-version import and compatibility/validation exports;
- `evidenceSnapshot`: the immutable runtime envelope with `schemaVersion`, `version`, `createdAt`, `reviewedAt`, `dataMode`, approved `records`, and approved `relationships` only;
- `evidenceRecords`: backward-compatible alias for `evidenceSnapshot.records`, never for candidates;
- `relationshipProposals`: alias for `evidenceSnapshot.relationships`; the evidence and edge projections cannot select different snapshot versions.

The active checked-in envelope is `phase-3.5-v2`, created and reviewed at `2026-09-22T22:02:32Z` after the controlled six-entity refresh. Its canonical SHA-256 is `8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58`. Timestamps are ISO 8601 UTC. A future maintainer must use a new snapshot version and version-named generated module when the approved projection changes. The hash identifies the exact payload; it is not a trust or confidence value.

Allowed review statuses are exactly:

| Review status | Meaning | Runtime eligible |
|---|---|---:|
| `proposed` | Candidate entered but not yet ready for a decision. | No |
| `needs-review` | Structurally valid candidate awaiting maintainer review. | No |
| `approved` | Accepted only for its bounded claim and scope. | Yes |
| `rejected` | Reviewed and excluded. | No |
| `stale` | Removed from the current projection pending refresh/supersession. | No |

Workflow review status is not claim status and is not evidence quality. An `approved` record can
still be `Claimed`, carry conflicts/incompleteness, or be historically stale in `quality`. Approval
means only that the exact record may be included and displayed with all of its limitations.

## Phase 3.7 governance companion

The versioned policy identifier is exactly `phase-3.7-review-policy-v1`. The smallest truthful
compatibility layer for the unchanged active snapshot is one companion file at
`data/evidence-governance/phase-3.5-v2.review.json`. This path is an implementation contract for the
next workflow phase; the companion is not present merely because this document defines it.

The companion must have this exact shape:

```json
{
  "kind": "monad-city-evidence-review-governance",
  "schemaVersion": "1",
  "reviewPolicyVersion": "phase-3.7-review-policy-v1",
  "snapshotBinding": {
    "version": "phase-3.5-v2",
    "canonicalSha256": "8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58",
    "reviewedAt": "2026-09-22T22:02:32Z"
  },
  "evidenceDecisions": [],
  "relationshipDecisions": []
}
```

The validator must require exact equality between all three `snapshotBinding` values and the
loaded snapshot/digest before using any decision. The v2 companion must contain exactly one
decision for each of the 22 approved evidence IDs and one for each of the six approved relationship
IDs, with no missing, duplicate, or extra subject. It must not contain claim text, source payloads,
quality overrides, evidence-ID overrides, or relationship overrides. Binding failure invalidates
the whole companion; it must never fall back to version-only matching.

Each array entry has exactly these fields:

```json
{
  "subjectId": "E-EXAMPLE-001",
  "decision": "approved",
  "reviewerRef": "legacy-unattributed:phase-3.5-v2",
  "reviewerRole": "legacy-unattributed",
  "reviewedAt": "2026-09-22T22:02:32Z",
  "reviewMethod": "legacy-approved-projection-import",
  "decisionReason": "legacy-approved-projection",
  "reviewPolicyVersion": "phase-3.7-review-policy-v1"
}
```

The reserved v2 values state only that the existing approved projection is being mapped into the
new governance schema without actor attribution. They do not claim that a newly identified person
performed the 2026 review. For this compatibility import, `decision` must equal the subject's
existing `reviewStatus`, `reviewedAt` must equal its existing `reviewedAt`, and every decision must
use the reserved legacy reviewer, role, method, reason, and policy version shown above.

### Controlled reviewer metadata

All six metadata fields are mandatory for `approved`, `rejected`, and `stale` decisions and absent
for `proposed` and `needs-review` candidates:

- `reviewerRef` is an opaque non-authority identifier matching exactly
  `^(reviewer:r-[0-9a-f]{16}|legacy-unattributed:phase-3\.5-v2)$`. Future reviewer references use a
  randomly assigned 16-character lowercase hexadecimal token after `reviewer:r-`; they must not be
  derived from or presented as a personal name, organization, email address, wallet address,
  domain, signature, credential, or authority. The reserved legacy value is valid only in the v2
  companion.
- `reviewerRole` is exactly one of `evidence-reviewer`, `relationship-reviewer`, or
  `legacy-unattributed`. Role labels describe the action performed; they confer no authority.
- `reviewedAt` is a canonical ISO 8601 UTC instant with seconds and `Z`, matching
  `YYYY-MM-DDTHH:mm:ssZ`. It must equal the subject's existing top-level `reviewedAt` when used in
  a compatibility companion or future inline decision.
- `reviewMethod` is exactly one of `manual-source-and-payload-inspection`,
  `manual-artifact-and-payload-inspection`, `manual-cross-source-inspection`,
  `manual-relationship-evidence-inspection`, `manual-governance-withdrawal`, or
  `legacy-approved-projection-import`.
- `decisionReason` is a controlled code from the decision tables below. Free-form reason strings
  are not accepted. Claim nuance remains in bounded scope, conflicts, quality flags, and
  limitations rather than in an unvalidated reason field.
- `reviewPolicyVersion` must equal the envelope policy version and, for this policy, exactly
  `phase-3.7-review-policy-v1`.

Reviewer metadata describes only the review action. It is not source provenance and does not prove
that a source is truthful, current, available, endorsed, safe, legitimate, active, controlled by a
project, or valid onchain. A canonical snapshot hash proves artifact equality only and does not
upgrade reviewer metadata into a signature.

The companion/inline `decision` value is exactly `approved`, `rejected`, or `stale` and must equal
the subject's `reviewStatus`. `proposed` and `needs-review` have no decision metadata. No alias,
case normalization, default, or additional value is permitted.

Allowed evidence decision/reason combinations are exact:

| Decision | Allowed `decisionReason` |
|---|---|
| `approved` | `scope-supported`, `historical-scope-supported`, `supported-with-limitations`, `legacy-approved-projection` |
| `rejected` | `source-does-not-support-scope`, `identity-or-network-mismatch`, `provenance-insufficient`, `candidate-duplicate`, `candidate-withdrawn` |
| `stale` | `superseded`, `source-unavailable-after-review`, `source-conflict-unresolved`, `scope-no-longer-inspectable`, `review-overdue-withdrawal` |

Allowed relationship decision/reason combinations are exact:

| Decision | Allowed `decisionReason` |
|---|---|
| `approved` | `evidence-resolved`, `evidence-resolved-with-limitations`, `legacy-approved-projection` |
| `rejected` | `evidence-does-not-support-relationship`, `endpoint-or-type-mismatch`, `candidate-duplicate`, `candidate-withdrawn` |
| `stale` | `superseded`, `supporting-evidence-withdrawn`, `relationship-scope-no-longer-inspectable`, `review-overdue-withdrawal` |

`legacy-approved-projection` is allowed only with the complete reserved legacy metadata tuple and
only for a subject already approved in the bound v2 snapshot. `manual-governance-withdrawal` is
allowed only with a `stale` decision and either `review-overdue-withdrawal` or `superseded`.
Evidence-review methods are invalid for relationship subjects; the relationship method is invalid
for evidence subjects. A non-legacy evidence decision requires `reviewerRole: evidence-reviewer`;
a non-legacy relationship decision requires `reviewerRole: relationship-reviewer`.

### Cadence and deterministic due calculation

Every evidence record must first match one exact `evidenceType` / `source.referenceType` base row
below. Then build a candidate interval set containing the base-row days, plus 7 days when
`source.available` is false or `quality.unavailable` is true, plus 30 days when
`quality.conflict` is true, and plus 60 days when `quality.incomplete` is true. `cadenceDays` is
the minimum member of that set. This makes warnings able to accelerate review but never postpone a
shorter source-type cadence.

| `evidenceType` | Required `source.referenceType` | Days |
|---|---|---:|
| `official-directory-listing` | `mutable-url` | 30 |
| `project-address-publication` | `mutable-url` | 30 |
| `project-declared-relationship` | `mutable-url` | 60 |
| `network-configuration` | `mutable-url` | 90 |
| `project-documentation` | `mutable-url` | 90 |
| `official-launch-record` | `mutable-url` | 180 |
| `protocol-registry-snapshot` | `pinned-snapshot` | 365 |
| `explorer-transaction` | `stable-artifact-url` | 365 |

Any pair absent from the table is a validation error even when a warning flag is true.
`quality.stale` does not alter cadence: it is
a payload warning that continues to constrain supported scope. For an evidence subject,
`nextReviewAt = reviewedAt + days * 86_400_000` milliseconds. There is no calendar-month math,
timezone conversion, or rounding.

Relationship base cadence is 30 days for `ecosystem_membership` and 60 days for
`declared_integration`. Any other sourced relationship type is a validation error under this
policy. Calculate both `relationshipReviewedAt + baseDays * 86_400_000` and every referenced
evidence subject's `nextReviewAt`; the relationship `nextReviewAt` is the earliest of those
instants.

The calculation requires a canonical caller-supplied `asOf` UTC instant. It must not default to
file modification time, snapshot creation time, machine locale, or an implicit clock in a
reproducibility check. `reviewDue` is exactly `asOf >= nextReviewAt`. Missing/invalid governance,
an unresolved evidence ID, or an unsupported cadence combination is a validation error and a
conservative due result for display; it never changes `reviewStatus`. `nextReviewAt` and
`reviewDue` are derived output and must not be serialized as authoritative decision fields.

At a future promotion gate, every projected approved evidence and relationship subject must have a
valid latest decision under the snapshot envelope's policy and `reviewDue` must be false at the
explicit promotion `asOf`. A due subject is not automatically stale; the gate pauses until a human
records an explicit new `approved`, `rejected`, or `stale` decision. Only approved decisions enter
the next runtime projection.

### Future inline contract

The compatibility companion applies only to the immutable v2 pair. The first new snapshot produced
under this policy must set top-level `reviewPolicyVersion: phase-3.7-review-policy-v1` and give each
evidence record and relationship a `reviewMetadata` object containing the six controlled fields
above. `proposed` and `needs-review` candidates use `reviewMetadata: null` and `reviewedAt: null`.
Decided candidates require non-null metadata, and `reviewMetadata.reviewedAt` must equal the legacy
top-level `reviewedAt` field. `reviewMetadata.reviewPolicyVersion` must equal the snapshot/workspace
policy version.

The review action may change `reviewStatus`, top-level `reviewedAt`, and `reviewMetadata` on the same
candidate. It may not change the immutable evidentiary payload. A newly discovered availability,
conflict, scope, source, identifier, or quality fact therefore requires a successor ID and normal
revision lineage; the prior record may then receive an explicit stale decision. Relationship
evidence-ID or scope changes likewise require a relationship successor. This preserves the
existing no-silent-overwrite rule.

## Phase 5.1 entity expansion

Phase 5.1 (Batch 1) deliberately expands the entity set beyond the six curated slice. The
controlled vocabulary lives in `src/evidence.js`:

- `CURATED_PROJECT_IDS` remains exactly the six source-curated entities of the phase-3.5 refresh;
- `BATCH1_PROJECT_IDS` lists the 30 intake proposal ids approved into the `phase-3.5-v3`
  snapshot (selection: `data/research/batch-1-selection-2026-09-27.json`);
- `KNOWN_PROJECT_IDS` is the union and is the only set the workflow and runtime validators
  accept for `projectId`, `relatedProjectIds`, and relationship endpoints.

Two invariants replace the v2 "exactly six" equality without weakening it: every curated
project must stay represented in the approved projection, and every represented project must
be a known entity. Exact projection size stays pinned per snapshot version in
`EXPECTED_SNAPSHOT_COUNTS` (v2: 22 records / 6 relationships; v3: 52 / 6). Adding entities
beyond this list still requires a new versioned snapshot and a contract change.

Every `phase-3.5-v3` subject carries its phase-3.7 decision inline under `reviewMetadata`
(future inline contract above); the v2 compatibility companion continues to govern only the
immutable v2 pair. Batch-1 records are directory-listing observations only: entering the
snapshot never makes a project verified, endorsed, ranked, safe, or active, and TVL-based
batch composition is not a city signal.

## Exact evidence record

The approved JSON snapshot is the promotion authority for exact runtime source records. The generated module must be canonically identical to it. Every record contains:

```js
{
  id,
  projectId,
  relatedProjectIds,
  claim,
  evidenceType,
  status,                 // Observed | Claimed | Attested | AI-inferred
  source: {
    kind,
    title,
    url,
    publisher,
    available,
    referenceType,        // mutable-url | pinned-snapshot | stable-artifact-url
    presentationMutable
  },
  retrievedAt,
  publishedAt,            // ISO timestamp or null
  network,
  scope,
  provenanceNotes,
  provenance: {
    kind,                  // manual-curation in the current snapshot
    notes
  },
  limitations,
  quality: {
    conflict,
    incomplete,
    stale,
    unavailable,
    timeBoundEligible
  },
  identifiers,
  conflicts,
  supportMode,
  supportedProposition,
  supportsFactualClaims,
  dataMode,               // sourced-limited
  reviewStatus,           // proposed | needs-review | approved | rejected | stale
  reviewedAt,             // ISO timestamp for decisions; null while unreviewed
  revision: {
    sequence,
    supersedesEvidenceId  // null for sequence 1
  }
}
```

`supportsFactualClaims` is a compatibility eligibility bit, not a truth flag. It may be interpreted only with `supportMode` and `supportedProposition`:

| Status | Support mode | Maximum support |
|---|---|---|
| `Observed` | `artifact-observation-only` | Only the exact inspected artifact and bounded scope. |
| `Claimed` | `publisher-statement-only` | Only that the named publisher made the bounded statement. |
| `Attested` | `scoped-attestation-only` | Only the named attestor's scoped statement. No Phase 3 record uses this. |
| `AI-inferred` | `discovery-only` | Discovery/routing only; never factual support. No factual Phase 3 record uses this. |

Status applies to a claim, never to a project as a whole. A record must not produce a generic verified, safe, legitimate, endorsed, active, or current badge.

`retrievedAt` is always required. `publishedAt` is always present but may be `null` when the
publisher exposes no exact date. A missing property, the string `unavailable`, or substituting
retrieval time for publication time is invalid. Source URL, publisher, provenance, network, bounded
scope, explicit quality flags, and limitations are required before a candidate can pass validation.

## Immutable IDs and revisions

Evidence IDs identify immutable evidentiary payloads. A maintainer may change `reviewStatus`,
`reviewedAt`, and—under the Phase 3.7 inline contract—`reviewMetadata` on a candidate as it moves
through review. Any change to its claim, source, timestamps,
network/scope, provenance, quality facts, limitations, identifiers, conflicts, or support semantics
requires a new evidence ID. The new record sets `revision.sequence` to the predecessor sequence plus
one and `revision.supersedesEvidenceId` to the old ID. The old record remains in history; it is never
silently overwritten.

`assertNoSilentOverwrite(previousRecords, nextRecords)` compares stable evidence fingerprints while
ignoring review-only metadata. `validateRevisionLineage(records, previousRecords)` requires a real,
same-project predecessor and consecutive sequence. These dependency-free helpers live in
`src/evidence-contract.js` for the local workflow.

## Source references

Source availability and reference stability are separate:

- `mutable-url` means the page and its presentation can change;
- `pinned-snapshot` means the runtime URL identifies the ingested commit snapshot;
- `stable-artifact-url` means the URL stably identifies an artifact such as a transaction hash, while `presentationMutable: true` acknowledges that the explorer page, labels, or rendering can still change.

A transaction URL is therefore not described as an immutable webpage. Its hash and block timestamp are the stable artifact identifiers.

Unavailable sources retain their evidence ID and bounded metadata where possible, set `source.available: false` and `quality.unavailable: true`, and degrade to explicit uncertainty. They do not disappear and do not break retrieval.

## Quality states

All five quality flags are explicit booleans. `false` means no issue was recorded during this ingestion; it is not a positive trust judgment.

- `unavailable`: the referenced source could not be inspected now;
- `stale`: the record remains useful historically but is outdated for some requested scope;
- `conflict`: another named record disagrees or uses incompatible wording;
- `incomplete`: required context or corroboration is missing;
- `timeBoundEligible`: the record can support its exact dated artifact statement, not an open-ended current-state claim.

The retriever rolls these flags up into `evidenceReferences[].quality` and emits `evidence-unavailable`, `evidence-stale`, `evidence-conflicting`, and `evidence-incomplete` uncertainty codes.

Exact evidence queries recognize these deterministic filters:

- `stale` checks `quality.stale`; `historical` checks that flag or literal historical wording in the record;
- `incomplete` checks `quality.incomplete`;
- `conflict` and `conflicting` check `quality.conflict`;
- `unavailable`, `missing source`, and `no source` check the source plus `quality.unavailable`;
- `no published date`, `missing published date`, and `no timestamp` check `publishedAt === null`.

Multiple requested filters use OR semantics. Returned aggregate references contain only matching exact records, and `diagnostics.matchedEvidenceIds` lists those returned IDs in stable order. A project selected by a quality/date query is context for its matching records; the filter is not a project-level conclusion.

Current/recent/latest requests require all of the following: a non-Demo record, inspectable source, eligible timestamp, defined observation window, named subject, named measure, and no unresolved unavailable/stale/conflicting/incomplete condition. Active-onchain requests additionally require an onchain relationship and a transaction or event identifier. The current slice intentionally satisfies neither generic current nor active criteria.

## Relationship layers

`src/data.js` exports three arrays:

- `demoRelationships`: the original 15 records, unchanged as explicit fallback;
- `sourcedRelationships`: the six approved proposals adapted to the runtime relationship shape;
- `relationships`: the 17-edge active hybrid graph.

The hybrid join is deterministic:

1. preserve original Demo order;
2. replace a Demo record when a sourced proposal has the same stable ID, or when its revision
   explicitly names that Demo ID in `supersedesRelationshipId`;
3. append sourced IDs that are new to the graph in stable ID order;
4. reject duplicate active IDs.

Four Demo positions are replaced: `monad-apriori`, `monad-magma`, and `monad-switchboard` by
same-ID sourced records, plus `monad-kuru` by sourced successor `monad-kuru-002`. Two sourced IDs
are added: `monad-pyth-002` and `magma-switchboard`. The remaining 11 active edges are Demo-only.

Every sourced relationship keeps these concepts separate:

- `type`: `ecosystem_membership` or `declared_integration`;
- `claimStatus`: `Observed` or publisher-attributed `Claimed`;
- `evidenceState`: compatibility presentation key `source-observed` or `publisher-claimed`;
- `dataMode`: `sourced-limited`;
- `evidenceIds`: every exact supporting evidence ID.
- `reviewStatus`: must be `approved` in the runtime graph.

Ecosystem membership is never encoded as an onchain interaction, owner claim, or attestation. Publisher-attributed documentation is never encoded as a signed `owner_claimed` relationship.

The legacy flat `source`, `timestamp`, and `provenance` fields on sourced relationships are a primary-evidence preview for the current UI. `compatibilityEvidencePreview` names the primary and omitted IDs. Evidence-aware consumers must join every `evidenceIds` entry; the flat preview is not authoritative.

## Demo fallback

Demo project evidence and Demo relationships keep unavailable placeholders with `dataMode: demo`. Every Demo relationship has an explicit deterministic reference of the form `demo:relationship:<relationship-id>:unavailable`. A placeholder supports only the statement that evidence is unavailable. It does not support the illustrative description, category, project-state pattern, relationship, deployment, activity, quality, or legitimacy.

The labels `onchain-observed`, `owner-claimed`, `third-party-attested`, `AI-inferred`, and `illustrative` remain Demo presentation patterns. They must not be confused with exact-claim `Observed`/`Claimed` status or the sourced relationship presentation keys.

## Navigator join

The Phase 2 call remains valid:

```js
retrieveNavigator({ query, projects, relationships, contextProjectIds, limit });
```

Phase 3 consumers add the optional exact records:

```js
retrieveNavigator({
  query,
  projects,
  relationships,
  evidenceRecords,
  contextProjectIds,
  limit,
});
```

Each returned aggregate reference keeps its stable Phase 2 ID (`project:<id>` or `relationship:<id>`) and fields, then adds `evidenceIds`, `records`, `statuses`, `supportModes`, `supportsFactualClaims`, and rolled-up `quality`. Each exact nested record contains its inspectable source, status, support mode, bounded proposition, timestamps, limitations, and quality flags.

Aggregate availability has four values:

- `source-and-timestamp`: at least one returned exact record has an inspectable source and eligible timestamp;
- `source-only`: returned records have inspectable sources but no eligible timestamp;
- `partial`: at least one returned record has an inspectable source and at least one is unavailable;
- `unavailable`: every returned record is unavailable.

For `partial`, the flat compatibility `source` preview is selected from an available exact record. `source-and-timestamp` always has a non-null preview URL. Consumers must still inspect every nested record because the aggregate value is not a completeness or truth score.

`relationshipContexts[].evidenceReferenceId` remains backward compatible. `relationshipContexts[].evidenceIds` is the authoritative one-to-many join.

Answer behavior is record-aware:

- sourced-only results say they cover a limited source-backed subset, with coverage counts derived from the active snapshot rather than a hardcoded entity count;
- Demo-only results remain explicitly illustrative;
- mixed results disclose both modes;
- evidence queries expose sources without implying verification;
- no-result and unsupported requests preserve the current view.

## Runtime validation

`validateEvidenceContract()` runs when `src/evidence.js` loads and checks the active promoted snapshot metadata and digest shape together with the 22-record/six-project contract, exact fields, review metadata, revision lineage, approved-only runtime projection, source semantics, support modes, quality flags, pinned registry URL, transaction artifact references, Pyth address separation, held Kuru router handling, six approved proposals, and approved evidence-ID resolution.

`npm run evidence:verify-promotion` validates the checked-in JSON as approved-only, recomputes the
canonical SHA-256, regenerates the expected module text in memory, and requires the checked-in
module to match exactly before it can be executed by the application. The deterministic module
deep-freezes the snapshot, records, and relationships. `npm run build` runs this gate before
copying assets to `dist/`.

`promote` requires exact `--expect-version`, `--expect-reviewed-at`, and `--expect-sha256` values.
It rejects unsafe/mismatched version names, stale confirmations, wrong hashes, non-approved
snapshots, wrong output filenames, and any existing output target. It creates a new artifact but
never edits the active import or overwrites an older version.

`validateCandidateEvidenceRecord(record)` is the reusable record-level gate. It rejects missing source
URLs, required retrieval timestamps, provenance, publishers, limitations, invalid review states, and
conflict flags without details. Nullable `publishedAt` remains valid. `buildApprovedEvidenceSnapshot`
and `projectApprovedRelationships` produce the conservative runtime projections.

`evidenceContractFixtures` provides deterministic proposed, needs-review, approved, rejected, and
stale variants plus missing-source-URL, missing-timestamp, missing-provenance, conflict, and
same-ID overwrite cases. Fixtures are validation inputs only and never enter either candidate or
runtime counts.

`validateDataContract(projects)` checks project placeholders, the 15-record Demo fallback, six sourced edges, 17 unique active IDs, endpoint validity, evidence-ID resolution, source/data-mode separation, and membership semantics.

`runNavigatorDeterministicChecks(...)` covers source-backed project and relationship queries, multiple evidence IDs, mixed mode, stale-or-incomplete filtering, null-`publishedAt` filtering, conflict-only and unavailable-only filtering, partial aggregate availability, unsupported and no-result behavior, preserve-view actions, and conservative active/current handling.

## Frontend integration expectations

The Frontend should:

1. import `evidenceRecords` and pass it to every `retrieveNavigator` call;
2. render `relationship.dataMode`, `claimStatus`, and `evidenceIds` rather than hard-coded `Demo` relationship copy;
3. render every `evidenceReferences[].records` item, including its exact status, publisher, URL, bounded scope, timestamps, limitations, and quality flags;
4. keep project display copy and project-state labels marked Demo until each field is explicitly replaced by cited normalized data;
5. label the global dataset as hybrid/limited, not fully live or verified;
6. show unavailable, stale, conflicting, and incomplete states without hiding the record;
7. handle aggregate `availability: partial` as “some sources unavailable,” use the provided non-null preview URL, and render the per-record states rather than treating the aggregate as fully sourced;
8. keep Kuru's held router out of current-address UI and preserve both Pyth address states;
9. preserve the existing selection, focus, no-result, and responsive behavior.
10. read snapshot version/date from `evidenceSnapshot` and never infer source-backed state from the presence of an unapproved candidate.
