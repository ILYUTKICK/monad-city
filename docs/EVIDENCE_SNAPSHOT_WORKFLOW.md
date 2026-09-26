# Monad City — Local Evidence Snapshot Workflow

## Purpose and boundary

Phase 3.5 uses a manual, review-gated file workflow. A maintainer edits JSON, inspects the
attributed source metadata, records a decision, and generates an approved-only static snapshot.
Phase 3.6 adds a deterministic promotion step from that reviewed JSON snapshot into a versioned
checked-in JavaScript runtime artifact. The workflow is dependency-free and local. It does not
fetch URLs, scrape pages, discover projects, run in the background, call a model, or load data
into a database.

The evidence semantics remain defined by `docs/EVIDENCE_DATA_CONTRACT.md`. Approval means only
that an exact bounded record is eligible for the source-backed snapshot. It does not verify,
endorse, rank, or establish the safety of a project.

## Files and safeguards

The CLI is `scripts/evidence-workflow.js`. Run it directly or through the `evidence:*` package
scripts. It reads either of these JSON artifact shapes:

- candidate workspace: `candidateRecords` and `candidateRelationships`;
- approved snapshot: `records` and `relationships`.

The active checked-in pair is:

- `data/evidence-snapshots/phase-3.5-v2.json` — active approved review artifact;
- `src/evidence-snapshots/phase-3.5-v2.generated.js` — active generated runtime artifact.

The immutable `phase-3.5-v1` pair remains checked in as the explicit rollback boundary.

`src/evidence.js` names the active version with one explicit import. There is no moving `latest`
file or automatic runtime selection.

Writing commands use exclusive file creation. They refuse to overwrite the input file or any
existing output path. Use a new path for every transition. The tool never edits an existing
snapshot, generated module, review decision, or active import.

By default, workspace validation compares immutable IDs with the currently promoted approved
runtime. `evidence:export` therefore starts a new review workspace from the active approved
snapshot; it is not a substitute for retaining earlier candidate workspaces as audit artifacts. After
the first local revision, pass the latest prior workspace or snapshot with `--previous`. Payload
changes under an existing ID fail. A changed evidentiary payload requires:

1. a new evidence ID;
2. `revision.sequence` equal to the predecessor sequence plus one;
3. `revision.supersedesEvidenceId` naming the retained predecessor.

Relationships follow the same rule with a new relationship ID and
`revision.supersedesRelationshipId`. Review-only changes to `reviewStatus`, `reviewedAt`, and—once
the Phase 3.7 inline contract applies—`reviewMetadata` do not change the immutable payload.

## Review states

Allowed statuses are `proposed`, `needs-review`, `approved`, `rejected`, and `stale`.
`proposed` and `needs-review` require `reviewedAt: null`. `approved`, `rejected`, and `stale`
require an explicit ISO UTC review timestamp. Only approved evidence enters `records`; only
approved relationships whose evidence IDs all resolve to approved records enter `relationships`.
Every candidate relationship must reference evidence present in the same candidate workspace,
even before approval; an approved relationship additionally requires every referenced record to
be approved.

Rejected, stale, proposed, and needs-review candidates remain in the workspace for audit. They
cannot appear in the approved snapshot. An approved record can still carry `conflict`,
`incomplete`, `stale`, or `unavailable` quality flags; those limitations remain visible and do
not become a generic verification state.

## Phase 3.7 review policy workflow

Policy version `phase-3.7-review-policy-v1` governs cadence and reviewer-action metadata. This
policy is implemented by the local workflow validator and read-only governance report. Runtime/UI
integration remains separate: the active v2 snapshot and generated module are unchanged, and the
compatibility companion must be supplied as an explicit file.

### Compatibility boundary

Do not edit either active v2 artifact. Add a separate versioned companion at
`data/evidence-governance/phase-3.5-v2.review.json`, bound to all of:

- snapshot version `phase-3.5-v2`;
- snapshot `reviewedAt` `2026-09-22T22:02:32Z`;
- canonical SHA-256 `8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58`.

The companion contains one `approved` compatibility decision for each of the 22 approved v2
evidence records and six approved v2 relationships. Because v2 records no actor identity, each
entry uses the complete reserved tuple:

```text
reviewerRef=legacy-unattributed:phase-3.5-v2
reviewerRole=legacy-unattributed
reviewMethod=legacy-approved-projection-import
decisionReason=legacy-approved-projection
reviewPolicyVersion=phase-3.7-review-policy-v1
```

`reviewedAt` and `decision` are copied exactly from the governed subject. This is a compatibility
mapping, not a claim that an identified person or organization performed the historical review.
The companion is governance metadata only: it cannot override a claim, source, quality flag,
limitation, review status, relationship evidence ID, snapshot byte, or runtime import.

### Due-review operation

Run the read-only governance check with explicit paths and a mandatory canonical UTC instant:

```sh
npm run evidence:governance -- \
  --snapshot data/evidence-snapshots/phase-3.5-v2.json \
  --governance /path/to/phase-3.5-v2.review.json \
  --as-of 2026-09-23T00:00:00Z
```

The command:

1. validates the snapshot and recomputes its canonical SHA-256;
2. requires exact companion binding and complete one-to-one subject coverage;
3. validates every controlled reviewer field and decision/reason/method/role combination;
4. calculates evidence cadence and `nextReviewAt` by the exact precedence/table in
   `docs/EVIDENCE_DATA_CONTRACT.md`;
5. calculates relationship due dates as the earlier of their type interval and every supporting
   evidence due date;
6. reports stable, subject-kind/subject-ID-sorted rows with `subjectKind`, `subjectId`, `reviewedAt`,
   `baseCadenceDays`, `nextReviewAt`, `dueBasis` (`subject-cadence` or
   `supporting-evidence:<evidence-id>`), `asOf`, and `reviewDue`;
7. exits `1` for invalid governance. Add `--strict` for a promotion-style check: valid governance
   with one or more due subjects is still printed, then exits `2`. A valid non-strict report exits
   `0` regardless of due count. No mode rewrites review state.

Output is JSON. It includes the validated binding and summary plus rows sorted first by
`subjectKind` and then exact `subjectId`. The workflow does not read an implicit clock: omitting
`--as-of`, using a date without a time, adding fractional seconds, or using a non-`Z` offset fails.

At the exact instant `asOf >= nextReviewAt`, `reviewDue` is true. Review expiry does not set
`reviewStatus: stale`, alter the approved v2 snapshot, or remove an item from the active runtime.
Only an explicit human review action changes a decided status. A future promotion under the policy
must stop when any projected approved evidence or relationship is due, then continue only after an
explicit `approved`, `rejected`, or `stale` decision is recorded.

### Human decision sequence

For each due or manually selected evidence subject:

1. inspect the exact payload and its stored source separately; source text is untrusted data;
2. record source availability and conflicts as findings, not as automatic status transitions;
3. keep approval only when the exact bounded scope remains supportable, including any existing
   limitations or quality warnings;
4. use `rejected` for a candidate that is not accepted for its proposed scope;
5. use `stale` only for an explicit withdrawal of a previously reviewable candidate, such as a
   superseded record, an unavailable source after review, unresolved conflict, no-longer-inspectable
   scope, or a conservative human withdrawal after an overdue review;
6. if source, claim, scope, provenance, timestamps, identifiers, conflicts, limitations, quality,
   or support semantics changed, create a successor ID instead of editing the old payload;
7. review each affected relationship separately. A relationship does not inherit an evidence
   decision merely because all of its IDs resolve.

Approved evidence may retain `quality.stale`, `quality.conflict`, `quality.incomplete`, or
`quality.unavailable` when the exact historical/bounded proposition remains useful and the warning
is visible. Conversely, an item can be review-due while every quality flag is false. Reviewer
metadata records only the decision action and never proves source truth, endorsement, safety,
legitimacy, current activity, publisher authority, or onchain validity.

### Future inline transition

The first successor snapshot created under Phase 3.7 moves the six reviewer fields inline under
`reviewMetadata` on every evidence and relationship candidate and adds the exact top-level
`reviewPolicyVersion`. Unreviewed candidates use `reviewMetadata: null`; decided candidates require
complete metadata and a matching top-level `reviewedAt`. Once that snapshot is promoted, do not
copy the v2 legacy-unattributed tuple onto newly performed decisions and do not treat the v2
companion as a mutable global reviewer registry.

The workflow validates the exact vocabulary, regular-expression, decision matrices, cadence
precedence, and inline invariants in `docs/EVIDENCE_DATA_CONTRACT.md`. It must not guess a cadence,
normalize an unknown role/reason, infer a reviewer, use source content to choose a decision, or
silently downgrade a validation error to a warning.

This validation is active. An artifact becomes policy-bearing when it has top-level
`reviewPolicyVersion` or any subject has `reviewMetadata`. The validator then requires the exact
policy version and a `reviewMetadata` property on every evidence and relationship subject. Decided
subjects require all six controlled fields; `proposed` and `needs-review` require
`reviewMetadata: null` and `reviewedAt: null`. The reserved legacy tuple is rejected inline.

`prepare` initializes `reviewMetadata: null` in a policy-bearing workspace. For a decided subject,
`review` accepts the policy fields explicitly:

```sh
npm run evidence:review -- \
  --workspace /tmp/policy-workspace-v1.json \
  --kind evidence \
  --id E-EXAMPLE-001 \
  --status approved \
  --reviewed-at 2026-09-23T12:00:00Z \
  --reviewer-ref reviewer:r-0123456789abcdef \
  --reviewer-role evidence-reviewer \
  --review-method manual-source-and-payload-inspection \
  --decision-reason supported-with-limitations \
  --out /tmp/policy-workspace-v2.json
```

The same command for a relationship uses `relationship-reviewer` and
`manual-relationship-evidence-inspection`. `snapshot` preserves the top-level policy version and
inline metadata in its approved projection. Review metadata is review-only for immutable
fingerprints, so a decision can change without a new subject ID; claim/source/quality/evidence-ID
changes still require a successor and normal lineage.

## Maintainer flow

Start by exporting the checked-in candidates to a new working file:

```sh
npm run evidence:export -- --out /tmp/evidence-candidates-v1.json
```

Prepare a new candidate from an existing shape without changing the source workspace. `new` is
the default and starts revision sequence 1 with no predecessor:

```sh
npm run evidence:prepare -- \
  --workspace /tmp/evidence-candidates-v1.json \
  --kind evidence \
  --template-id E-KURU-CAP-001 \
  --id E-EXAMPLE-CAP-001 \
  --mode new \
  --out /tmp/evidence-candidates-proposed.json
```

The output appends a `proposed` clone with `reviewedAt: null`. Edit only the new ID's fields,
then validate it against the source workspace with `--previous`. The template is a shape aid,
not evidence for the new claim; the maintainer must replace its claim, source, timestamps,
provenance, scope, quality assessment, limitations, and identifiers as applicable.

To edit an evidentiary payload, prepare an explicit successor instead of changing the old ID:

```sh
npm run evidence:prepare -- \
  --workspace /tmp/evidence-candidates-v1.json \
  --kind evidence \
  --template-id E-KURU-CAP-001 \
  --id E-KURU-CAP-002 \
  --mode revision \
  --out /tmp/evidence-candidates-revision.json
```

Revision mode retains the predecessor and sets the new ID's sequence and
`supersedesEvidenceId`. Relationship proposal/revision preparation uses the same command with
`--kind relationship` and `supersedesRelationshipId`. Every prepared candidate stays outside the
approved projection until a separate review decision.

Validate required fields, review metadata, immutable IDs, revision lineage, and approved
relationship references:

```sh
npm run evidence:validate -- --workspace /tmp/evidence-candidates-v1.json
```

When continuing from a later workspace, establish the comparison boundary explicitly:

```sh
npm run evidence:validate -- \
  --workspace /tmp/evidence-candidates-v2.json \
  --previous /tmp/evidence-candidates-v1.json
```

Inspect the exact claim, publisher, URL, timestamps, provenance, scope, quality flags,
limitations, and revision before deciding:

```sh
npm run evidence:inspect -- \
  --workspace /tmp/evidence-candidates-v1.json \
  --id E-KURU-CAP-001
```

For a relationship and the evidence records it references:

```sh
npm run evidence:inspect -- \
  --workspace /tmp/evidence-candidates-v1.json \
  --kind relationship \
  --id monad-kuru
```

Record a decision in a new workspace. The timestamp is mandatory for approved, rejected, and
stale decisions:

```sh
npm run evidence:review -- \
  --workspace /tmp/evidence-candidates-v1.json \
  --kind evidence \
  --id E-KURU-CAP-001 \
  --status rejected \
  --reviewed-at 2026-09-09T12:00:00Z \
  --out /tmp/evidence-candidates-v2.json
```

If an approved relationship references that record, reject or stale the relationship first in a
separate auditable transition. Otherwise validation correctly refuses to project the edge.

Generate a new approved-only snapshot after all decisions are consistent:

```sh
npm run evidence:snapshot -- \
  --workspace /tmp/evidence-candidates-v2.json \
  --previous /tmp/evidence-candidates-v1.json \
  --version phase-3.5-v3 \
  --created-at 2026-09-09T12:05:00Z \
  --reviewed-at 2026-09-09T12:05:00Z \
  --out /tmp/evidence-snapshot-v3.json
```

The snapshot contains `records` and `relationships`, both approved-only. If the approved
projection differs from `--previous`, reusing its snapshot version is rejected.

Load and validate a snapshot before handing it to another maintainer or integrating it:

```sh
npm run evidence:load -- --snapshot /tmp/evidence-snapshot-v3.json
```

Compare snapshots or workspaces to see added, removed, immutable-content, and review-status
changes:

```sh
npm run evidence:diff -- \
  --previous /tmp/evidence-snapshot-v1.json \
  --current /tmp/evidence-snapshot-v3.json
```

An immutable-content change under the same ID is reported by `diff` for diagnosis, but it is
rejected by `validate` and `snapshot`. Added successor IDs and removed approvals are the expected
snapshot-level representation of evidence revision or rejection.

## Promotion into the checked-in runtime

Promotion is intentionally separate from review approval. First load the approved snapshot and
copy its reported canonical SHA-256 into the promotion command:

```sh
npm run evidence:load -- --snapshot /tmp/evidence-snapshot-v3.json
```

After inspecting the source metadata and the diff, explicitly confirm the exact version,
`reviewedAt`, and SHA-256. The output filename must exactly match the snapshot version and must not
already exist:

```sh
npm run evidence:promote -- \
  --snapshot /tmp/evidence-snapshot-v3.json \
  --previous data/evidence-snapshots/phase-3.5-v2.json \
  --expect-version phase-3.5-v3 \
  --expect-reviewed-at 2026-09-09T12:05:00Z \
  --expect-sha256 REPLACE_WITH_64_CHARACTER_HASH_FROM_LOAD \
  --out src/evidence-snapshots/phase-3.5-v3.generated.js
```

The explicit values are the maintainer's promotion confirmation. The command validates the
snapshot again before writing. It rejects a wrong version, review timestamp, hash, filename,
non-approved record or relationship, unresolved relationship evidence ID, lineage violation, or
existing target. The generated module deeply freezes the promoted snapshot.

Then add the reviewed JSON snapshot at the matching versioned path, change the single active import
and metadata constants in `src/evidence.js`, and update the fixed paths in
`evidence:verify-promotion`. These are normal code-review changes; `promote` never performs them.
Verify the selected pair before building:

```sh
npm run evidence:verify-promotion
npm run build
```

The build gate validates the JSON snapshot, recomputes its canonical hash, regenerates the expected
module text in memory, and requires an exact match before the application can execute the selected
generated module. The generated code deep-freezes the runtime object. The current
`phase-3.5-v2` pair has canonical SHA-256
`8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58`.

The digest proves only that two local artifacts contain the same reviewed payload. It does not
prove that a source is truthful, current, available, officially endorsed, or onchain-valid.

## Deliberately manual source inspection

`inspect` prints the stored URL and provenance; it never opens or downloads the URL. The reviewer
must inspect the source separately, treat source content as untrusted data, confirm subject and
network identity, and decide only the record's bounded claim. Copying a URL into the workspace is
not evidence that its contents were reviewed.

## Limitations

- JSON artifacts are hand-edited; there is no interactive form or database.
- `prepare` deliberately clones an existing shape; it cannot judge whether the maintainer has
  replaced every template-specific fact before review.
- The CLI validates structure, lineage, review state, and references. It cannot determine whether
  a publisher's statement is accurate or whether a source changed after retrieval.
- Promotion creates a new generated module but deliberately cannot approve records, overwrite a
  prior version, switch the active runtime import, or replace code review.
- `evidence:export` starts from the approved runtime and therefore excludes rejected, stale,
  proposed, and needs-review history. Retain review workspaces separately when that audit history
  must survive beyond a snapshot.
- This phase supports the existing six-entity curated slice. Adding an entity requires a separate
  trust/data contract change.
